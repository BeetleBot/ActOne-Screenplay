import type {
  PluginAPIMessage,
  PluginAPIResponse,
  PluginEventMessage,
  PluginInitMessage,
  PluginEndMessage,
  PluginResidentMessage,
} from "./PluginAPI";

let callIdCounter = 0;
const pendingCalls = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
const eventListeners: Record<string, Function[]> = {};
let isResident = false;

function generateCallId(): string {
  return `call_${++callIdCounter}_${Date.now()}`;
}

function callAPI(method: string, ...args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const callId = generateCallId();
    pendingCalls.set(callId, { resolve, reject });
    const msg: PluginAPIMessage = { type: "api_call", method, args, callId };
    self.postMessage(msg);
  });
}

function addEventListener(name: string, callback: Function) {
  if (!eventListeners[name]) eventListeners[name] = [];
  eventListeners[name].push(callback);
}

const Beat = {
  getText: () => callAPI("getText"),
  getLines: () => callAPI("getLines"),
  getOutline: () => callAPI("getOutline"),
  getScenes: () => callAPI("getScenes"),
  selectedRange: () => callAPI("selectedRange"),
  setSelectedRange: (loc: number, len: number) => callAPI("setSelectedRange", loc, len),
  addString: (str: string, index: number) => callAPI("addString", str, index),
  replaceRange: (loc: number, len: number, str: string) => callAPI("replaceRange", loc, len, str),
  scrollTo: (index: number) => callAPI("scrollTo", index),
  scrollToLine: (index: number) => callAPI("scrollToLine", index),
  scrollToScene: (index: number) => callAPI("scrollToScene", index),

  onTextChange: (cb: Function) => addEventListener("onTextChange", cb),
  onSelectionChange: (cb: Function) => addEventListener("onSelectionChange", cb),
  onOutlineChange: (cb: Function) => addEventListener("onOutlineChange", cb),

  makeResident: () => {
    isResident = true;
    const msg: PluginResidentMessage = { type: "makeResident" };
    self.postMessage(msg);
  },
  end: () => {
    const msg: PluginEndMessage = { type: "end" };
    self.postMessage(msg);
  },

  type: {} as Record<string, number>,
};

(self as any).Beat = Beat;

self.onmessage = (e: MessageEvent) => {
  const data = e.data;

  if (data.type === "init") {
    const initMsg = data as PluginInitMessage;
    Beat.type = initMsg.typeConstants;
    try {
      const fn = new Function(initMsg.source);
      fn();
    } catch (err: any) {
      console.error("[Drafter Plugin Error]", err.message || err);
    }
    if (!isResident) {
      setTimeout(() => {
        if (!isResident) {
          const msg: PluginEndMessage = { type: "end" };
          self.postMessage(msg);
        }
      }, 100);
    }
  } else if (data.type === "api_response") {
    const resp = data as PluginAPIResponse;
    const pending = pendingCalls.get(resp.callId);
    if (pending) {
      pendingCalls.delete(resp.callId);
      if (resp.error) {
        pending.reject(new Error(resp.error));
      } else {
        pending.resolve(resp.result);
      }
    }
  } else if (data.type === "event") {
    const evt = data as PluginEventMessage;
    const listeners = eventListeners[evt.name];
    if (listeners) {
      for (const cb of listeners) {
        try { cb(evt.data); } catch (err) {
          console.error("[Drafter Plugin Event Error]", err);
        }
      }
    }
  }
};
