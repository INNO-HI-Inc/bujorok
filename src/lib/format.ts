/** 12345 -> "12,345원" */
export function formatKRW(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

/** 금액을 "5만" 같은 축약형으로 */
export function formatKRWShort(n: number): string {
  if (n >= 100000000) return `${trimNum(n / 100000000)}억원`;
  if (n >= 10000) return `${trimNum(n / 10000)}만원`;
  return formatKRW(n);
}

function trimNum(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

/** "50,000" · "5만" · "5.5만" · "50000원" 등을 숫자로 */
export function parseAmount(input: string): number {
  const s = input.replace(/[,\s원]/g, '');
  if (!s) return 0;
  const man = s.match(/^(\d+(?:\.\d+)?)만$/);
  if (man) return Math.round(parseFloat(man[1]) * 10000);
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/** "2026-05-24" -> "2026년 5월 24일" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${y}년 ${m}월 ${d}일`;
}

export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 파일 이름에 못 쓰는 문자 제거 */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, ' ').trim() || '부조록';
}
