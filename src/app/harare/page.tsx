import { Navbar } from "@/components/Navbar";
import { CityVoxelScene } from "@/components/voxel/CityVoxelScene";
import { preloadWorld } from "@/lib/world-files";

export const metadata = {
  title: "Harare 3D Voxel Map",
  description:
    "Explore Central Harare (RBZ Tower, Eastgate Centre, Africa Unity Square, The Avenues, Harare Kopje, Avondale & Mbare) in interactive 3D voxels built from OpenStreetMap.",
};

export default async function HararePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  preloadWorld("harare");
  return (
    <div className="min-h-screen bg-[#0c0e0c]">
      <Navbar />
      <CityVoxelScene provinceSlug="harare" initialView={params.view} />
    </div>
  );
}
