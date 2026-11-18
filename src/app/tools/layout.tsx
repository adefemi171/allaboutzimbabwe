import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Calculators for Zimbabwe: move-in rent in USD, solar and inverter sizing for ZESA outages, and intercity transit options.",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
