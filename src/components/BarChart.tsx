import { useState } from 'react';
import type { ChartDatum } from '../types/cloud';
import { compactCurrency } from '../utils/format';

interface BarChartProps {
  data: ChartDatum[];
  formatValue?: (value: number) => string;
  height?: number;
}

export default function BarChart({ data, formatValue = compactCurrency, height = 220 }: BarChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div>
      <div
        className="flex items-end justify-between gap-2 sm:gap-4"
        style={{ height }}
        role="img"
        aria-label="Grafico de barras"
      >
        {data.map((item, index) => {
          const ratio = item.value / max;
          return (
            <div
              key={item.label}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            >
              <span
                className={`mb-1 text-center text-[11px] font-semibold transition-opacity ${
                  active === index ? 'opacity-100' : 'opacity-0'
                } text-ink dark:text-night-ink`}
              >
                {formatValue(item.value)}
              </span>
              <div
                className="w-full origin-bottom cursor-pointer rounded-t-md transition-all duration-300 animate-grow"
                style={{
                  height: `${Math.max(ratio * 100, 3)}%`,
                  background: item.color,
                  opacity: active === null || active === index ? 1 : 0.5,
                }}
                title={`${item.label}: ${formatValue(item.value)}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between gap-2 sm:gap-4">
        {data.map((item) => (
          <p
            key={item.label}
            className="min-w-0 flex-1 truncate text-center text-[11px] text-muted dark:text-night-muted"
            title={item.label}
          >
            {item.label}
          </p>
        ))}
      </div>
    </div>
  );
}
