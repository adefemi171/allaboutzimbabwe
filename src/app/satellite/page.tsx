import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SatellitePage } from "@/components/satellite/SatellitePage";

export const metadata: Metadata = {
  title: "Satellite view",
  description:
    "Which satellites passed over a place in Zimbabwe this week, worked out from public orbit data, with the pictures Sentinel, Landsat and the weather satellites took of it.",
};

// No footer: the globe and its panel fill the screen under the header.
export default function Page() {
  return (
    <div className="min-h-screen bg-[#0c0e0c]">
      <Navbar />
      <SatellitePage />
    </div>
  );
}
