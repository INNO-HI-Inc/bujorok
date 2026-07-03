import type { Entry, EventRecord, Relation } from '../types';
import { RELATIONS, RELATION_LABEL } from '../types';
import { CountUp } from './CountUp';
import { DonutChart, type DonutDatum } from './DonutChart';
import { formatKRW } from '../lib/format';

/** 결혼(온기 있는 전통색) vs 장례(차분한 무채색) 팔레트 */
const WARM_COLORS = ['#9e3b47', '#c0764f', '#a8853c', '#5b7161', '#8b8069'];
const MUTED_COLORS = ['#3e3a35', '#5a554e', '#767066', '#948d80', '#b3ab9d'];

interface Band {
  label: string;
  test: (amount: number) => boolean;
}

const BANDS: Band[] = [
  { label: '3만 이하', test: (a) => a > 0 && a <= 30000 },
  { label: '5만', test: (a) => a > 30000 && a <= 50000 },
  { label: '10만', test: (a) => a > 50000 && a <= 100000 },
  { label: '20만', test: (a) => a > 100000 && a <= 200000 },
  { label: '20만 초과', test: (a) => a > 200000 },
];

interface StatsPanelProps {
  event: EventRecord;
  entries: Entry[];
}

export function StatsPanel({ event, entries }: StatsPanelProps) {
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const count = entries.length;
  const avg = count > 0 ? Math.round(total / count) : 0;
  const lowCount = entries.filter((e) => e.confidence === 'low').length;

  const colors = event.type === 'funeral' ? MUTED_COLORS : WARM_COLORS;

  const byRelation: DonutDatum[] = RELATIONS.map((rel: Relation, i) => ({
    label: RELATION_LABEL[rel],
    value: entries.filter((e) => e.relation === rel).reduce((s, e) => s + e.amount, 0),
    color: colors[i % colors.length],
  }));

  const bandCounts = BANDS.map((b) => entries.filter((e) => b.test(e.amount)).length);
  const maxBand = Math.max(1, ...bandCounts);

  return (
    <div className="fade-up">
      <div className="stat-cards">
        <div className="card stat-card">
          <div className="label">총 건수</div>
          <div className="value">
            <CountUp value={count} format={(n) => `${n.toLocaleString('ko-KR')}건`} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="label">총액</div>
          <div className="value">
            <CountUp value={total} format={(n) => formatKRW(n)} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="label">평균</div>
          <div className="value">
            <CountUp value={avg} format={(n) => formatKRW(n)} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="label">확인 필요</div>
          <div className="value" style={lowCount > 0 ? { color: 'var(--warn-edge)' } : undefined}>
            <CountUp value={lowCount} format={(n) => `${n}건`} />
          </div>
        </div>
      </div>

      <div className="chart-row">
        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>관계별 합계</h3>
          <DonutChart
            data={byRelation}
            centerLabel="총액"
            centerValue={total >= 10000 ? `${Math.round(total / 10000).toLocaleString('ko-KR')}만원` : formatKRW(total)}
          />
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>금액대 분포</h3>
          <div className="bars">
            {BANDS.map((b, i) => (
              <div className="bar-row" key={b.label}>
                <span className="label">{b.label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(bandCounts[i] / maxBand) * 100}%` }}
                  />
                </div>
                <span className="num" style={{ color: 'var(--ink-2)' }}>
                  {bandCounts[i]}건
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
