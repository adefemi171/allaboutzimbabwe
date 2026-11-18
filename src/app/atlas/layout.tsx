import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Provinces",
  description:
    "Zimbabwe's 10 provinces side by side: capitals, rent ranges, power, internet and transit, each with a 3D map of its capital.",
};

export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
