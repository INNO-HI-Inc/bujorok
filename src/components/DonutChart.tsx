import { useEffect, useState } from 'react';
import { formatKRWShort } from '../lib/format';

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  centerLabel: string;
  centerValue: string;
}

const SIZE = 190;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const GAP = 2.5; // 조각 사이 여백(px)

export function DonutChart({ data, centerLabel, centerValue }: DonutChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const total = data.reduce((s, d) => s + d.value, 0);
  const visible = data.filter((d) => d.value > 0);

  let offset = 0;
  const segments = visible.map((d) => {
    const frac = total > 0 ? d.value / total : 0;
    const len = Math.max(0, frac * CIRC - (visible.length > 1 ? GAP : 0));
    const seg = { ...d, len, offset };
    offset += frac * CIRC;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={centerLabel}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--paper-2)"
          strokeWidth={STROKE}
        />
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${mounted ? s.len : 0} ${CIRC}`}
              strokeDashoffset={-s.offset}
              style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)' }}
            />
          ))}
        </g>
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          style={{ fontSize: 12, fill: 'var(--ink-3)', fontFamily: 'var(--sans)' }}
        >
          {centerLabel}
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          style={{ fontSize: 19, fontWeight: 700, fill: 'var(--ink)', fontFamily: 'var(--serif)' }}
        >
          {centerValue}
        </text>
      </svg>

      <div className="donut-legend">
        {visible.map((d) => (
          <div className="row" key={d.label}>
            <span className="k">
              <span className="swatch" style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="v num">
              {formatKRWShort(d.value)}
              <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 6 }}>
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </span>
          </div>
        ))}
        {visible.length === 0 && <span style={{ color: 'var(--ink-3)' }}>데이터가 없습니다</span>}
      </div>
    </div>
  );
}
