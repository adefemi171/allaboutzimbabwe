export const ALL_REGIONS = "ALL";

/** Filter chips for the distinct regions of `items`, with an "ALL" chip first. */
export function RegionChips({
  items,
  value,
  onChange,
}: {
  items: { region: string }[];
  value: string;
  onChange: (region: string) => void;
}) {
  const regions = [ALL_REGIONS, ...new Set(items.map((item) => item.region))];
  return (
    <div className="flex flex-wrap gap-1.5">
      {regions.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`rounded border px-2.5 py-1 font-mono-tech text-[11px] transition ${
            value === r
              ? "border-[#4cb82a] bg-[#4cb82a]/15 text-[#e9e5db]"
              : "border-[#2b302b] text-[#a4aaa2] hover:text-[#e9e5db]"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
