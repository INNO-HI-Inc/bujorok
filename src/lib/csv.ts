import type { Entry, EventRecord } from '../types';
import { RELATION_LABEL } from '../types';
import { safeFileName } from './format';

function escapeCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function buildCsv(entries: Entry[]): string {
  const header = ['이름', '원문 표기', '금액(원)', '관계', '소속·단서', '메모', '확인 필요'];
  const rows = entries.map((e) => [
    e.name,
    e.nameOriginal ?? '',
    String(e.amount),
    RELATION_LABEL[e.relation],
    e.affiliation ?? '',
    e.memo ?? '',
    e.confidence === 'low' ? 'Y' : '',
  ]);
  return [header, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n');
}

export function downloadCsv(event: EventRecord, entries: Entry[]): void {
  const csv = '﻿' + buildCsv(entries); // BOM: 엑셀 한글 호환
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `${safeFileName(event.name)} 부조록.csv`);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
