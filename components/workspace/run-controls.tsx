import { Button } from "@/components/button";
import { LoaderCircle, Menu, Play, RefreshCw, X } from "@/components/icons";

export function RunControls({
  running,
  menuOpen,
  onMenuOpenChange,
  onReset,
  onRun,
}: {
  running: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onReset: () => void;
  onRun: () => void;
}) {
  return (
    <>
      <div className="hidden items-center gap-2 lg:flex lg:w-auto">
        <Button variant="consoleOutline" size="sm" className="min-h-11 text-xs" onClick={onReset}><RefreshCw />Reset</Button>
        <Button variant="console" size="sm" className="min-h-11 text-xs" onClick={onRun} disabled={running}>{running ? <LoaderCircle className="animate-spin" /> : <Play />}{running ? "Running…" : "Load & generate"}</Button>
      </div>
      <Button variant="consoleOutline" size="sm" className="min-h-11 px-3 lg:hidden" aria-label="Open workspace menu" aria-expanded={menuOpen} aria-controls="workspace-menu" onClick={() => onMenuOpenChange(true)}><Menu className="size-5" /></Button>

      {menuOpen && (
        <div className="lg:hidden">
          <button aria-label="Close workspace menu" onClick={() => onMenuOpenChange(false)} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm" />
          <div id="workspace-menu" role="dialog" aria-modal="true" aria-label="Workspace menu" className="animate-rise fixed inset-y-0 right-0 z-50 w-72 max-w-[80vw] border-l border-border bg-panel-raised p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <h3 className="font-display text-sm font-bold uppercase">Workspace</h3>
              <Button variant="ghost" size="sm" className="min-h-11 px-3 text-xs" onClick={() => onMenuOpenChange(false)}><X />Close</Button>
            </div>
            <div className="mt-4 grid gap-3">
              <Button variant="consoleOutline" size="sm" className="min-h-11 w-full justify-start text-xs" onClick={() => { onMenuOpenChange(false); onReset(); }}><RefreshCw />Reset</Button>
              <Button variant="console" size="sm" className="min-h-11 w-full justify-start text-xs" onClick={() => { onMenuOpenChange(false); onRun(); }} disabled={running}>{running ? <LoaderCircle className="animate-spin" /> : <Play />}{running ? "Running…" : "Load & generate"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
