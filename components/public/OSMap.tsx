// components/public/OSMap.tsx
//
// Shared Google Maps embed — the free consumer "Embed a map" iframe
// (google.com/maps?...&output=embed), NOT the paid Maps Embed/JavaScript API.
// It needs no API key and no billing-enabled project, same as clicking
// Share > Embed a map on maps.google.com. Used by both the footer's mini-map
// and the homepage Location section so the pin/address never drifts apart.

// ── Akiro's location in Dili, Timor-Leste ────────────────────────────────────
// Change these values to update the pin everywhere it's shown.
export const MAP_LAT     = -8.5596;
export const MAP_LNG     = 125.5789;
export const MAP_ZOOM    = 16;
export const MAP_ADDRESS = "Rua Formosa, Dili, Timor-Leste";

/** Public "open in Google Maps" link for the given pin — free, no API key. */
export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function OSMap({
  lat = MAP_LAT,
  lng = MAP_LNG,
  zoom = MAP_ZOOM,
  height = 220,
}: {
  lat?: number;
  lng?: number;
  zoom?: number;
  height?: number | string;
}) {
  const src = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height,
        borderRadius: 20,
        border: "1.5px solid rgba(36,150,214,0.2)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, display: "block" }}
        loading="lazy"
        title="Akiro Laundry location"
        aria-label="Map showing Akiro Laundry location in Dili, Timor-Leste"
      />
      {/* Branded overlay pin label */}
      <a
        href={googleMapsLink(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 left-3 flex items-center gap-2 rounded-2xl px-3 py-2 backdrop-blur-sm transition-opacity hover:opacity-90"
        style={{
          background: "rgba(10,31,46,0.82)",
          border: "1px solid rgba(36,150,214,0.3)",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2496d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="font-display text-[11px] font-extrabold text-white">Open in Maps ↗</span>
      </a>
    </div>
  );
}
