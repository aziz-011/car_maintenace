/** Small line icons drawn on a 24px grid; they take the surrounding text colour. */
const PATHS = {
  gauge: 'M4 15a8 8 0 1 1 16 0 M12 15l4-5 M7.5 15h.01 M16.5 15h.01 M12 7.5v.01',
  fuel: 'M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15 M4 20h11 M8 8h3 M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20a2 2 0 0 0 4 0',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  plus: 'M12 5v14 M5 12h14',
  odometer: 'M3 7h18v10H3z M7 7v10 M11 7v10 M15 7v10 M19 10v4',
  oil: 'M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  chart: 'M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3',
  car: 'M5 17h14 M3 17v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4 M3 13h18 M7 17v2 M17 17v2 M7.5 14.5h.01 M16.5 14.5h.01',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
