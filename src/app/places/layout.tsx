import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Places",
  description:
    "Zimbabwe's universities, monuments and natural wonders, with links to their 3D OpenStreetMap views.",
};

export default function PlacesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
