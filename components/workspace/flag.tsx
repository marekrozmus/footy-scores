import { NOC_TO_ISO2 } from "@/lib/odf/flags";

export function Flag({ noc, className = "" }: { noc: string; className?: string }) {
  const code = NOC_TO_ISO2[noc];
  if (!code) return <span aria-hidden="true" className={`inline-block h-3 w-4 shrink-0 rounded-sm bg-border ${className}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w20/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={16}
      height={12}
      className={`h-3 w-4 shrink-0 rounded-sm object-cover ring-1 ring-border ${className}`}
    />
  );
}
