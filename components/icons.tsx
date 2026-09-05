import * as React from "react";

type IconProps = React.SVGAttributes<SVGSVGElement>;

function createIcon(name: string, children: React.ReactNode) {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  ));
  Icon.displayName = name;
  return Icon;
}

export const AlertTriangle = createIcon(
  "AlertTriangle",
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
);

export const Check = createIcon("Check", <path d="M20 6 9 17l-5-5" />);

export const ChevronDown = createIcon("ChevronDown", <path d="m6 9 6 6 6-6" />);

export const ChevronUp = createIcon("ChevronUp", <path d="m18 15-6-6-6 6" />);

export const ChevronRight = createIcon("ChevronRight", <path d="m9 18 6-6-6-6" />);

export const Clipboard = createIcon(
  "Clipboard",
  <>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </>,
);

export const Copy = createIcon(
  "Copy",
  <>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </>,
);

export const Download = createIcon(
  "Download",
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </>,
);

export const GitCompareArrows = createIcon(
  "GitCompareArrows",
  <>
    <circle cx="5" cy="6" r="3" />
    <path d="M12 6h5a2 2 0 0 1 2 2v7" />
    <path d="m15 9-3-3 3-3" />
    <circle cx="19" cy="18" r="3" />
    <path d="M12 18H7a2 2 0 0 1-2-2V9" />
    <path d="m9 15 3 3-3 3" />
  </>,
);

export const LoaderCircle = createIcon("LoaderCircle", <path d="M21 12a9 9 0 1 1-6.219-8.56" />);

export const Play = createIcon("Play", <polygon points="6 3 20 12 6 21 6 3" />);

export const RefreshCw = createIcon(
  "RefreshCw",
  <>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </>,
);

export const Search = createIcon(
  "Search",
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>,
);

export const SlidersHorizontal = createIcon(
  "SlidersHorizontal",
  <>
    <line x1="21" x2="14" y1="4" y2="4" />
    <line x1="10" x2="3" y1="4" y2="4" />
    <line x1="21" x2="12" y1="12" y2="12" />
    <line x1="8" x2="3" y1="12" y2="12" />
    <line x1="21" x2="16" y1="20" y2="20" />
    <line x1="12" x2="3" y1="20" y2="20" />
    <line x1="14" x2="14" y1="2" y2="6" />
    <line x1="8" x2="8" y1="10" y2="14" />
    <line x1="16" x2="16" y1="18" y2="22" />
  </>,
);

export const Menu = createIcon(
  "Menu",
  <>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </>,
);

export const X = createIcon(
  "X",
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);
