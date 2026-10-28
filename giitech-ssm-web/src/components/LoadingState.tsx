import { RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><RefreshCw className="animate-spin text-accent1" size={17} aria-hidden="true" />{label}</div>;
}
