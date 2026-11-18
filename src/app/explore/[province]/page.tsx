import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CityVoxelScene } from "@/components/voxel/CityVoxelScene";
import { DATA_CHECKED, ZIMBABWE_PROVINCES, getProvinceBySlug } from "@/data/zimbabwe-provinces";
import { ZIMBABWE_PLACES, getPlaceByCampusSlug } from "@/data/zimbabwe-places";
import { preloadWorld } from "@/lib/world-files";

export function generateStaticParams() {
  const provinceParams = ZIMBABWE_PROVINCES.map((p) => ({ province: p.slug }));
  const campusParams = ZIMBABWE_PLACES.filter((p) => p.has3DCampus && p.campusSlug).map((p) => ({
    province: p.campusSlug!,
  }));
  return [...provinceParams, ...campusParams];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string }>;
}) {
  const { province } = await params;
  const campus = getPlaceByCampusSlug(province);
  if (campus) {
    return {
      title: `${campus.name} 3D Voxel Map`,
      description: `Walk and explore ${campus.name} (${campus.city}, ${campus.province}) in interactive 3D OpenStreetMap voxels.`,
    };
  }
  const profile = getProvinceBySlug(province);
  if (!profile) return { title: "Explore Zimbabwe 3D" };
  return {
    title: `${profile.capital} (${profile.province}) 3D Voxel Map`,
    description: `Explore ${profile.capital}, ${profile.province} in interactive 3D voxels built from real OpenStreetMap geometry, universities, landmarks, street view & walking pedestrians.`,
  };
}

export default async function ExploreProvincePage({
  params,
}: {
  params: Promise<{ province: string }>;
}) {
  const { province } = await params;
  const campus = getPlaceByCampusSlug(province);
  if (campus) {
    preloadWorld(campus.campusSlug!);
    return (
      <div className="min-h-screen bg-[#0c0e0c]">
        <Navbar />
        <CityVoxelScene provinceSlug={campus.provinceSlug} campusSlug={campus.campusSlug} />
      </div>
    );
  }

  const profile = getProvinceBySlug(province);
  if (!profile) notFound();
  preloadWorld(profile.slug);

  return (
    <div className="min-h-screen bg-[#0c0e0c]">
      <Navbar />
      <CityVoxelScene provinceSlug={profile.slug} />
      <p className="mx-auto max-w-7xl px-4 py-4 font-mono-tech text-[10px] leading-relaxed text-[#a4aaa2] sm:px-6">
        {profile.capital} · {profile.populationLabel} · Airport: {profile.airport.name}.{" "}
        {profile.airport.note} Rent: {profile.rentMonthlyRange}.
        {profile.salePriceRange && <> Houses for sale: {profile.salePriceRange}.</>} Sources (checked{" "}
        {DATA_CHECKED}):{" "}
        {profile.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && " · "}
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e9e5db] underline decoration-[#2b302b] underline-offset-2 hover:decoration-[#ffd200]"
            >
              {s.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
