import type { Entry } from '../types';

export interface MergePair {
  a: Entry;
  b: Entry;
  reason: string;
}

function normalize(name: string): string {
  return name.replace(/\s+/g, '').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i, ...new Array<number>(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

export function pairKey(a: Entry, b: Entry): string {
  return [a.id, b.id].sort().join(':');
}

const IGNORE_KEY = 'bujorok.mergeIgnored';

function loadIgnored(): Set<string> {
  try {
    const raw = localStorage.getItem(IGNORE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function ignorePair(a: Entry, b: Entry): void {
  const set = loadIgnored();
  set.add(pairKey(a, b));
  localStorage.setItem(IGNORE_KEY, JSON.stringify([...set]));
}

/**
 * 유사 이름 중복 병합 제안.
 * - 공백 제거 후 동일한 이름 ("김 철수" ↔ "김철수")
 * - 원문(한자) 표기가 같은 항목 ("金哲洙")
 * - 편집 거리 1 이내의 이름 ("김철수" ↔ "김철순")
 */
export function suggestMerges(entries: Entry[]): MergePair[] {
  const ignored = loadIgnored();
  const pairs: MergePair[] = [];
  const candidates = entries.filter((e) => e.name !== '판독불가');

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (ignored.has(pairKey(a, b))) continue;

      const na = normalize(a.name);
      const nb = normalize(b.name);
      let reason: string | null = null;

      if (na === nb) {
        reason = '이름이 동일합니다';
      } else if (
        a.nameOriginal &&
        b.nameOriginal &&
        normalize(a.nameOriginal) === normalize(b.nameOriginal)
      ) {
        reason = '원문(한자) 표기가 동일합니다';
      } else if (a.nameOriginal && normalize(a.nameOriginal) === nb) {
        reason = '한자 표기와 한글 이름이 일치합니다';
      } else if (b.nameOriginal && normalize(b.nameOriginal) === na) {
        reason = '한자 표기와 한글 이름이 일치합니다';
      } else if (na.length >= 2 && nb.length >= 2 && levenshtein(na, nb) === 1) {
        reason = '이름이 한 글자만 다릅니다';
      }

      if (reason) pairs.push({ a, b, reason });
    }
  }
  return pairs.slice(0, 8);
}

/** 병합: a를 기준으로 b의 정보를 흡수한 항목을 반환 (b는 삭제 대상) */
export function mergedEntry(a: Entry, b: Entry): Entry {
  const keep = a.confidence === 'high' || b.confidence !== 'high' ? a : b;
  const drop = keep === a ? b : a;
  const memoParts = [keep.memo, drop.memo].filter(Boolean);
  return {
    ...keep,
    nameOriginal: keep.nameOriginal ?? drop.nameOriginal,
    affiliation: keep.affiliation ?? drop.affiliation,
    memo: memoParts.length ? memoParts.join(' / ') : undefined,
    amount: Math.max(keep.amount, drop.amount),
    imageId: keep.imageId ?? drop.imageId,
  };
}
