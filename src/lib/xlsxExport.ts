import * as XLSX from 'xlsx';
import type { Entry, EventRecord } from '../types';
import { EVENT_TYPE_LABEL, HOST_LABEL, RELATION_LABEL } from '../types';
import { formatDate, safeFileName } from './format';

/**
 * 프리미엄: 서식이 적용된 .xlsx 내보내기 (SheetJS)
 * - 제목/요약 행 병합, 열 너비, 금액 숫자 서식(#,##0"원"), 자동 필터, 합계 행
 */
export function downloadXlsx(event: EventRecord, entries: Entry[]): void {
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const header = ['이름', '원문 표기', '금액', '관계', '소속·단서', '메모', '확인 필요'];
  const body = entries.map((e) => [
    e.name,
    e.nameOriginal ?? '',
    e.amount,
    RELATION_LABEL[e.relation],
    e.affiliation ?? '',
    e.memo ?? '',
    e.confidence === 'low' ? 'Y' : '',
  ]);

  const aoa: (string | number)[][] = [
    [`${event.name} 부조록`],
    [
      `${EVENT_TYPE_LABEL[event.type]} · ${formatDate(event.date)} · ${HOST_LABEL[event.type]} ${event.host} · 총 ${entries.length}건`,
    ],
    [],
    header,
    ...body,
    [],
    ['합계', '', total, '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 13 },
    { wch: 8 },
    { wch: 26 },
    { wch: 26 },
    { wch: 10 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ];
  ws['!autofilter'] = { ref: `A4:G${4 + body.length}` };

  // 금액 열 숫자 서식
  const amountRows = [...body.map((_, i) => 4 + i), 5 + body.length];
  for (const r of amountRows) {
    const addr = XLSX.utils.encode_cell({ r, c: 2 });
    const cell = ws[addr] as XLSX.CellObject | undefined;
    if (cell && typeof cell.v === 'number') cell.z = '#,##0"원"';
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '부조록');
  XLSX.writeFile(wb, `${safeFileName(event.name)} 부조록.xlsx`);
}
