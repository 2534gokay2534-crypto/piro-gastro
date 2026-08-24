/**
 * Prototipteki ikon setinin birebir aynısı — aynı SVG yolları.
 * Yeni ikon eklemek için PATHS'e bir satır eklemek yeterli.
 */
const PATHS: Record<string, string> = {
  snow: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/>',
  flame:
    '<path d="M12 22c4 0 7-2.8 7-7 0-4.5-4-6.5-4-11 0 0-3 2-3 5 0 2-1.5 2.5-2.5 1.5C8 9 8 7 8 7c-1.6 1.7-3 4-3 8 0 4.2 3 7 7 7z"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  pizza:
    '<path d="M12 2L2 20a30 30 0 0020 0z"/><circle cx="10" cy="11" r="1.2"/><circle cx="14" cy="14" r="1.2"/>',
  bread:
    '<path d="M4 10c0-3 3.6-5 8-5s8 2 8 5c0 1.4-1.2 2-2 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6c-.8 0-2-.6-2-2z"/>',
  knife: '<path d="M3 17L15 5c2 2 3 4 3 6l-8 8H3z"/><path d="M14 16l6 6"/>',
  drop: '<path d="M12 2.7S5.5 10 5.5 14.5a6.5 6.5 0 1013 0C18.5 10 12 2.7 12 2.7z"/>',
  wind: '<path d="M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h9a2.5 2.5 0 11-2.5 2.5"/>',
  layers: '<path d="M12 2l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/>',
  cup: '<path d="M4 8h13v6a5 5 0 01-5 5H9a5 5 0 01-5-5z"/><path d="M17 9h2.5a2.5 2.5 0 010 5H17M5 3.5c0 1 1 1 1 2M9 3.5c0 1 1 1 1 2M13 3.5c0 1 1 1 1 2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  tag: '<path d="M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 005.3 5.2l-9 9a2.8 2.8 0 11-4-4l9-9z"/><path d="M6 6l3 3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  cart: '<path d="M2 3h3l2.6 12.4A2 2 0 009.6 17h8.8a2 2 0 002-1.6L22 7H6"/><circle cx="10" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
};

export default function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const d = PATHS[name] ?? PATHS.box;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
