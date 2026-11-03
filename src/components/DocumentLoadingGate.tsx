import { useEffect, useState, type ReactNode } from "react";
import { WindowLoading } from "./WindowLoading";

interface DocumentLoadingGateProps {
  ready: boolean;
  children: ReactNode;
  onPresented?: () => void;
}

/** Key this boundary by document so the loading frame paints before editor setup. */
export function DocumentLoadingGate({ ready, children, onPresented }: DocumentLoadingGateProps) {
  const [mountEditor, setMountEditor] = useState(false);
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (!painted) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => { timer = setTimeout(() => onPresented?.(), 0); });
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [painted, onPresented]);
  useEffect(() => {
    if (!mountEditor || !ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => setPainted(true), 0);
    });
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [mountEditor, ready]);
  useEffect(() => {
    if (!ready) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setMountEditor(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [ready]);
  return <>
    {ready && mountEditor && children}
    {(!ready || !painted) && <WindowLoading embedded spinning label="Loading document" />}
  </>;
}
