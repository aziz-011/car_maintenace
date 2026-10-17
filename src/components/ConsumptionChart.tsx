import { useEffect, useRef, useState } from 'react';
import type { ConsumptionSegment } from '../stats';
import { fmtDate, fmtKm, fmtNum } from '../format';

const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

/** Line chart of L/100km per full-tank segment, with a hover tooltip. */
export function ConsumptionChart({ segments }: { segments: ConsumptionSegment[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);

  // Draw in real pixels so text stays readable at any width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [segments.length]);

  if (segments.length < 2) {
    return <p className="empty">Log at least three full-tank fill-ups to see a consumption trend.</p>;
  }

  const H = W < 480 ? 180 : 220;
  const values = segments.map((s) => s.litersPer100km);
  const min = Math.floor(Math.min(...values) - 0.5);
  const max = Math.ceil(Math.max(...values) + 0.5);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (segments.length - 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;
  const ticks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * i) / 3);
  const path = segments.map((s, i) => `${i ? 'L' : 'M'}${x(i)},${y(s.litersPer100km)}`).join(' ');
  const active = hover !== null ? segments[hover] : null;

  return (
    <figure className="chart">
      <figcaption>Consumption per full tank (L/100 km)</figcaption>
      <div className="chart-wrap" ref={wrapRef}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fuel consumption over time">
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="axis" x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
                {fmtNum(t)}
              </text>
            </g>
          ))}
          <text className="axis" x={PAD.left} y={H - 8}>
            {fmtDate(segments[0].date)}
          </text>
          <text className="axis" x={W - PAD.right} y={H - 8} textAnchor="end">
            {fmtDate(segments[segments.length - 1].date)}
          </text>
          {hover !== null && (
            <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} />
          )}
          <path className="series-line" d={path} />
          {segments.map((s, i) => (
            <circle
              key={s.entryId}
              className="series-dot"
              cx={x(i)}
              cy={y(s.litersPer100km)}
              r={hover === i ? 5 : 4}
            />
          ))}
          {/* Wide invisible hit targets, one column per point. */}
          {segments.map((s, i) => (
            <rect
              key={s.entryId}
              x={x(i) - innerW / (segments.length - 1) / 2}
              y={PAD.top}
              width={innerW / (segments.length - 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onTouchStart={() => setHover(i)}
            />
          ))}
        </svg>
        {active && hover !== null && (
          <div
            className="tooltip"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              top: `${(y(active.litersPer100km) / H) * 100}%`,
            }}
          >
            <strong>{fmtNum(active.litersPer100km)} L/100 km</strong>
            <span>{fmtDate(active.date)}</span>
            <span>
              {fmtKm(active.distance)} · {fmtNum(active.liters)} L
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
