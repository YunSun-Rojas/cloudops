import { useState } from 'react';
import type { ChartDatum } from '../types/cloud';
import { currency } from '../utils/format';

interface DonutChartProps {
  data: ChartDatum[];
  centerLabel: string;
  centerValue: string;
  formatValue?: (value: number) => string;
}

const polar = (cx: number, cy: number, r: number, angle: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arc = (cx: number, cy: number, r: number, start: number, end: number, width: number) => {
  const outerStart = polar(cx, cy, r, end);
  const outerEnd = polar(cx, cy, r, start);
  const innerStart = polar(cx, cy, r - width, end);
  const innerEnd = polar(cx, cy, r - width, start);
  const largeArc = end - start <= 180 ? 0 : 1;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${r - width} ${r - width} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

export default function DonutChart({
  data,
  centerLabel,
  centerValue,
  formatValue = currency,
}: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  let cursor = 0;
  const slices = data.map((item) => {
    const start = cursor;
    const sweep = (item.value / total) * 359.99;
    cursor += sweep;
    return { ...item, start, end: start + sweep, percent: (item.value / total) * 100 };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <svg viewBox="0 0 200 200" className="h-48 w-48 shrink-0" role="img" aria-label={centerLabel}>
        {slices.map((slice, index) => (
          <path
            key={slice.label}
            d={arc(100, 100, active === index ? 88 : 82, slice.start, slice.end, 30)}
            fill={slice.color}
            className="cursor-pointer transition-all duration-200"
            opacity={active === null || active === index ? 1 : 0.45}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <title>{`${slice.label}: ${formatValue(slice.value)}`}</title>
          </path>
        ))}
        <text
          x="100"
          y="94"
          textAnchor="middle"
          className="fill-current text-ink dark:text-night-ink"
          style={{ fontSize: '17px', fontWeight: 700 }}
        >
          {active === null ? centerValue : formatValue(slices[active].value)}
        </text>
        <text
          x="100"
          y="114"
          textAnchor="middle"
          className="fill-current text-muted"
          style={{ fontSize: '11px' }}
        >
          {active === null ? centerLabel : slices[active].label}
        </text>
      </svg>

      <ul className="w-full max-w-xs space-y-2">
        {slices.map((slice, index) => (
          <li
            key={slice.label}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-small transition-colors ${
              active === index ? 'bg-base dark:bg-night-bg' : ''
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: slice.color }} />
              <span className="truncate text-ink dark:text-night-ink">{slice.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-muted dark:text-night-muted">
              {slice.percent.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
