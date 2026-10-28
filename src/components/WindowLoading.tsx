interface WindowLoadingProps {
  label?: string;
  embedded?: boolean;
}

export function WindowLoading({ label = "Loading window", embedded = false }: WindowLoadingProps) {
  return <div role="status" aria-label={label} className={`actone-window-loading${embedded ? " actone-window-loading-embedded" : ""}`}>
    <div aria-hidden="true" className="actone-window-loading-logo" />
  </div>;
}
