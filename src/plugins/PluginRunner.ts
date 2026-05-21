import {
  buildTypeConstants,
  lineToPluginInfo,
  type PluginAPIMessage,
  type PluginInitMessage,
  type PluginAPIResponse,
  type PluginEventMessage,
} from "./PluginAPI";
import { FountainDocument, LineType } from "../parser/FountainParser";

export interface PluginEditorBridge {
  getText: () => string;
  getParsedDoc: () => FountainDocument;
  getSelectedRange: () => { location: number; length: number };
  setSelectedRange: (loc: number, len: number) => void;
  addString: (str: string, index: number) => void;
  replaceRange: (loc: number, len: number, str: string) => void;
  scrollTo: (index: number) => void;
  scrollToLine: (index: number) => void;
  scrollToScene: (index: number) => void;
}

export class PluginRunner {
  name: string;
  private worker: Worker;
  private bridge: PluginEditorBridge;
  private _isResident = false;
  private _isTerminated = false;
  onTerminate?: () => void;

  constructor(name: string, source: string, bridge: PluginEditorBridge) {
    this.name = name;
    this.bridge = bridge;

    this.worker = new Worker(
      new URL("./pluginWorker.ts", import.meta.url),
      { type: "module" }
    );

    this.worker.onmessage = (e: MessageEvent) => {
      const data = e.data;
      if (data.type === "api_call") {
        this.handleAPICall(data as PluginAPIMessage);
      } else if (data.type === "end") {
        this.terminate();
      } else if (data.type === "makeResident") {
        this._isResident = true;
      }
    };

    this.worker.onerror = (err) => {
      console.error(`[Plugin "${name}" Error]`, err.message);
    };

    const initMsg: PluginInitMessage = {
      type: "init",
      source,
      typeConstants: buildTypeConstants(),
    };
    this.worker.postMessage(initMsg);
  }

  get isResident() { return this._isResident; }
  get isTerminated() { return this._isTerminated; }

  private handleAPICall(msg: PluginAPIMessage) {
    try {
      const result = this.executeAPIMethod(msg.method, msg.args);
      const response: PluginAPIResponse = {
        type: "api_response",
        callId: msg.callId,
        result,
      };
      this.worker.postMessage(response);
    } catch (err: any) {
      const response: PluginAPIResponse = {
        type: "api_response",
        callId: msg.callId,
        error: err.message || String(err),
      };
      this.worker.postMessage(response);
    }
  }

  private executeAPIMethod(method: string, args: any[]): any {
    switch (method) {
      case "getText":
        return this.bridge.getText();
      case "getLines":
        return this.bridge.getParsedDoc().lines.map(lineToPluginInfo);
      case "getOutline":
        return this.bridge.getParsedDoc().lines
          .filter(l => l.isOutlineElement || l.type === LineType.synopse)
          .map(lineToPluginInfo);
      case "getScenes":
        return this.bridge.getParsedDoc().lines
          .filter(l => l.type === LineType.heading)
          .map((l, i) => ({
            text: l.text,
            sceneNumber: l.sceneNumber,
            color: l.color,
            lineIndex: i,
            storylines: l.storylines,
          }));
      case "selectedRange":
        return this.bridge.getSelectedRange();
      case "setSelectedRange":
        this.bridge.setSelectedRange(args[0], args[1]);
        return null;
      case "addString":
        this.bridge.addString(args[0], args[1]);
        return null;
      case "replaceRange":
        this.bridge.replaceRange(args[0], args[1], args[2]);
        return null;
      case "scrollTo":
        this.bridge.scrollTo(args[0]);
        return null;
      case "scrollToLine":
        this.bridge.scrollToLine(args[0]);
        return null;
      case "scrollToScene":
        this.bridge.scrollToScene(args[0]);
        return null;
      default:
        throw new Error(`Unknown API method: ${method}`);
    }
  }

  sendEvent(name: string, data?: any) {
    if (this._isTerminated) return;
    const msg: PluginEventMessage = { type: "event", name, data };
    this.worker.postMessage(msg);
  }

  terminate() {
    if (this._isTerminated) return;
    this._isTerminated = true;
    this.worker.terminate();
    this.onTerminate?.();
  }
}
