// Server Component: purely static markup, so it's rendered once on the server and passed into
// the client Workspace as a prop/slot instead of living inside the "use client" boundary.
export function BrandHeader() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image doesn't optimize .ico files */}
      <img src="/favicon.ico" alt="" className="size-8 shrink-0" />
      <div className="min-w-0">
        <h1 className="truncate font-display text-base font-extrabold leading-none lg:text-lg">FOOTYSCORES · PARIS 2024 QA</h1>
        <p className="mt-1 truncate text-xs uppercase tracking-20 text-muted-foreground">Reference endpoint workspace · live Olympic data</p>
      </div>
    </div>
  );
}
