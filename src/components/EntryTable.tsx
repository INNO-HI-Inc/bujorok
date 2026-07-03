import { useState } from 'react';
import type { Entry, Relation } from '../types';
import { RELATIONS, RELATION_LABEL } from '../types';
import { formatKRW, parseAmount } from '../lib/format';

interface EntryTableProps {
  entries: Entry[];
  onUpdate: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onShowImage: (imageId: string) => void;
}

export function EntryTable({ entries, onUpdate, onDelete, onShowImage }: EntryTableProps) {
  return (
    <div className="table-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th style={{ width: '15%' }}>이름</th>
            <th style={{ width: '13%', textAlign: 'right' }}>금액</th>
            <th style={{ width: '9%' }}>관계</th>
            <th>소속 · 단서</th>
            <th>메모</th>
            <th style={{ width: 170, textAlign: 'right' }}></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onShowImage={onShowImage}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RowProps {
  entry: Entry;
  onUpdate: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onShowImage: (imageId: string) => void;
}

function EntryRow({ entry, onUpdate, onDelete, onShowImage }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: entry.name,
    nameOriginal: entry.nameOriginal ?? '',
    amount: String(entry.amount),
    relation: entry.relation as Relation,
    affiliation: entry.affiliation ?? '',
    memo: entry.memo ?? '',
  });

  const startEdit = () => {
    setDraft({
      name: entry.name,
      nameOriginal: entry.nameOriginal ?? '',
      amount: String(entry.amount),
      relation: entry.relation,
      affiliation: entry.affiliation ?? '',
      memo: entry.memo ?? '',
    });
    setEditing(true);
  };

  const save = () => {
    onUpdate({
      ...entry,
      name: draft.name.trim() || '이름없음',
      nameOriginal: draft.nameOriginal.trim() || undefined,
      amount: parseAmount(draft.amount),
      relation: draft.relation,
      affiliation: draft.affiliation.trim() || undefined,
      memo: draft.memo.trim() || undefined,
      confidence: 'high', // 사람이 검수·수정했으므로 확인 완료 처리
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <tr>
        <td>
          <input
            className="edit-input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="이름"
            autoFocus
          />
          <input
            className="edit-input"
            style={{ marginTop: 4 }}
            value={draft.nameOriginal}
            onChange={(e) => setDraft({ ...draft, nameOriginal: e.target.value })}
            placeholder="원문(한자 등)"
          />
        </td>
        <td>
          <input
            className="edit-input"
            style={{ textAlign: 'right' }}
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            placeholder="예: 5만 또는 50000"
            inputMode="numeric"
          />
        </td>
        <td>
          <select
            className="edit-input"
            value={draft.relation}
            onChange={(e) => setDraft({ ...draft, relation: e.target.value as Relation })}
          >
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {RELATION_LABEL[r]}
              </option>
            ))}
          </select>
        </td>
        <td>
          <input
            className="edit-input"
            value={draft.affiliation}
            onChange={(e) => setDraft({ ...draft, affiliation: e.target.value })}
            placeholder="소속·관계 단서"
          />
        </td>
        <td>
          <input
            className="edit-input"
            value={draft.memo}
            onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
            placeholder="메모"
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
          />
        </td>
        <td>
          <div className="row-actions">
            <button className="icon-btn" onClick={save} style={{ fontWeight: 700 }}>
              저장
            </button>
            <button className="icon-btn" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={entry.confidence === 'low' ? 'low' : undefined}>
      <td className="name-cell">
        <strong>{entry.name}</strong>
        {entry.nameOriginal && <span className="original">{entry.nameOriginal}</span>}
      </td>
      <td className="amount num">{entry.amount > 0 ? formatKRW(entry.amount) : '—'}</td>
      <td>
        <span className="rel-chip">{RELATION_LABEL[entry.relation]}</span>
      </td>
      <td className="muted">{entry.affiliation ?? ''}</td>
      <td className="muted">{entry.memo ?? ''}</td>
      <td>
        <div className="row-actions">
          {entry.confidence === 'low' && (
            <button
              className="icon-btn"
              title="검수 완료로 표시"
              onClick={() => onUpdate({ ...entry, confidence: 'high' })}
            >
              확인✓
            </button>
          )}
          {entry.imageId && (
            <button className="icon-btn" onClick={() => onShowImage(entry.imageId!)}>
              원본
            </button>
          )}
          <button className="icon-btn" onClick={startEdit}>
            편집
          </button>
          <button
            className="icon-btn danger"
            onClick={() => {
              if (window.confirm(`'${entry.name}' 항목을 삭제할까요?`)) onDelete(entry.id);
            }}
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}
