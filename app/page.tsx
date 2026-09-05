import type { Metadata } from "next";

import { Workspace } from "@/components/workspace";

export const metadata: Metadata = {
  title: "FootyScores | Paris 2024 QA Workspace",
  description: "Interactive tool for generating and reviewing Paris 2024 football API reference endpoints.",
  openGraph: {
    title: "FootyScores Paris 2024 QA Workspace",
    description: "A QA workspace for Olympic football API reference generation.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function Page() {
  return <Workspace />;
}
