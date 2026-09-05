import { ChevronDown } from "@/components/icons";

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative flex min-h-10 items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-xs hover:border-muted-foreground focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
      <span className="text-muted-foreground">{label}</span>
      <select className="cursor-pointer appearance-none bg-transparent pr-5 font-medium text-foreground outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} className="bg-popover" value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </label>
  );
}
