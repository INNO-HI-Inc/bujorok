import type { MergePair } from '../lib/dedupe';
import { formatKRW } from '../lib/format';

interface MergeSuggestionsProps {
  pairs: MergePair[];
  onMerge: (pair: MergePair) => void;
  onIgnore: (pair: MergePair) => void;
}

export function MergeSuggestions({ pairs, onMerge, onIgnore }: MergeSuggestionsProps) {
  if (pairs.length === 0) return null;
  return (
    <div className="merge-banner fade-up">
      <h4>중복 의심 항목 {pairs.length}건 — 같은 분일 수 있어요</h4>
      {pairs.map((pair) => (
        <div className="merge-item" key={`${pair.a.id}:${pair.b.id}`}>
          <span className="names">
            <b>
              {pair.a.name}
              {pair.a.nameOriginal ? `(${pair.a.nameOriginal})` : ''}
            </b>{' '}
            {formatKRW(pair.a.amount)} ↔{' '}
            <b>
              {pair.b.name}
              {pair.b.nameOriginal ? `(${pair.b.nameOriginal})` : ''}
            </b>{' '}
            {formatKRW(pair.b.amount)} · {pair.reason}
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button className="icon-btn" style={{ fontWeight: 700 }} onClick={() => onMerge(pair)}>
              하나로 병합
            </button>
            <button className="icon-btn" onClick={() => onIgnore(pair)}>
              다른 사람이에요
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
