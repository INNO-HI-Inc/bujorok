import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Entry, EventRecord, EventType, Relation } from '../types';
import { EVENT_TYPE_LABEL, HOST_LABEL, MONEY_LABEL, RELATIONS, RELATION_LABEL } from '../types';
import {
  deleteEntry,
  deleteEvent,
  getEvent,
  getImage,
  listEntries,
  putEntries,
  putEntry,
  putImage,
  uid,
} from '../lib/db';
import { formatDate, formatKRW, parseAmount } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { ignorePair, mergedEntry, suggestMerges, type MergePair } from '../lib/dedupe';
import type { RecognizedItem } from '../lib/anthropic';
import { useApp } from '../state/AppContext';
import { EntryTable } from '../components/EntryTable';
import { MergeSuggestions } from '../components/MergeSuggestions';
import { ScanPanel } from '../components/ScanPanel';
import { StatsPanel } from '../components/StatsPanel';
import { MessagesPanel } from '../components/MessagesPanel';
import { PurchaseModal } from '../components/PurchaseModal';
import { Modal } from '../components/Modal';

type Tab = 'ledger' | 'scan' | 'stats' | 'messages';

const THEME_CLASS: Record<EventType, string> = {
  wedding: '',
  funeral: 'theme-funeral',
  doljanchi: 'theme-doljanchi',
  other: 'theme-other',
};

export function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { premiumFor, claimPremium } = useApp();

  const [event, setEvent] = useState<EventRecord | null | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tab, setTab] = useState<Tab>('ledger');
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    const ev = await getEvent(id);
    setEvent(ev ?? null);
    if (ev) setEntries(await listEntries(ev.id));
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 데모 행사는 전체 플로우 체험을 위해 프리미엄 개방
  const premium = !!event && (event.demo === true || premiumFor(event.id));
  const claim = useCallback(
    () => (event ? event.demo === true || claimPremium(event.id) : false),
    [event, claimPremium],
  );

  const aiCount = useMemo(() => entries.filter((e) => e.source === 'ai').length, [entries]);
  const total = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);
  const mergePairs = useMemo(() => suggestMerges(entries), [entries]);
  const lowCount = entries.filter((e) => e.confidence === 'low').length;

  if (event === undefined) return <div className="empty-state">불러오는 중…</div>;
  if (event === null || !id) {
    return (
      <div className="empty-state">
        <p>행사를 찾을 수 없습니다.</p>
        <Link to="/" className="btn btn-ghost">
          목록으로
        </Link>
      </div>
    );
  }

  const handleRecognized = async (items: RecognizedItem[], thumbDataUrl: string) => {
    const imageId = uid();
    await putImage({ id: imageId, eventId: event.id, dataUrl: thumbDataUrl, createdAt: Date.now() });
    const now = Date.now();
    const newEntries: Entry[] = items.map((item, i) => ({
      id: uid(),
      eventId: event.id,
      name: item.name,
      nameOriginal: item.original,
      amount: item.amount,
      relation: 'other',
      affiliation: item.affiliation,
      confidence: item.confidence,
      imageId,
      source: 'ai',
      createdAt: now + i,
    }));
    await putEntries(newEntries);
    await reload();
  };

  const handleUpdate = async (entry: Entry) => {
    await putEntry(entry);
    await reload();
  };

  const handleDelete = async (entryId: string) => {
    await deleteEntry(entryId);
    await reload();
  };

  const handleMerge = async (pair: MergePair) => {
    const merged = mergedEntry(pair.a, pair.b);
    const dropId = merged.id === pair.a.id ? pair.b.id : pair.a.id;
    await putEntry(merged);
    await deleteEntry(dropId);
    await reload();
  };

  const handleIgnorePair = async (pair: MergePair) => {
    ignorePair(pair.a, pair.b);
    await reload();
  };

  const handleShowImage = async (imageId: string) => {
    const img = await getImage(imageId);
    if (img) setViewImage(img.dataUrl);
  };

  const handleDeleteEvent = async () => {
    if (
      window.confirm(
        `'${event.name}' 행사와 장부 ${entries.length}건을 모두 삭제할까요? 되돌릴 수 없습니다.`,
      )
    ) {
      await deleteEvent(event.id);
      navigate('/');
    }
  };

  const exportXlsxGated = async () => {
    if (!premium || !claim()) {
      setPurchaseOpen(true);
      return;
    }
    // SheetJS는 무거우므로 내보내기 시점에만 로드 (코드 스플리팅)
    const { downloadXlsx } = await import('../lib/xlsxExport');
    downloadXlsx(event, entries);
  };

  return (
    <div className={THEME_CLASS[event.type]}>
      <Link to="/" className="backlink">
        ← 행사 목록
      </Link>

      <div className="event-head fade-up">
        <div>
          <h1>{event.name}</h1>
          <div className="meta">
            <span className="badge badge-accent">{EVENT_TYPE_LABEL[event.type]}</span>
            <span>{formatDate(event.date)}</span>
            <span>
              {HOST_LABEL[event.type]} {event.host}
            </span>
            {event.demo ? (
              <span className="badge badge-premium">데모 · 프리미엄 체험 개방</span>
            ) : premium ? (
              <span className="badge badge-premium">프리미엄</span>
            ) : (
              <span className="badge badge-free">무료 플랜</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteEvent}>
            행사 삭제
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button
          className={tab === 'ledger' ? 'tab active' : 'tab'}
          onClick={() => setTab('ledger')}
          role="tab"
        >
          장부<span className="count">{entries.length}</span>
        </button>
        <button
          className={tab === 'scan' ? 'tab active' : 'tab'}
          onClick={() => setTab('scan')}
          role="tab"
        >
          사진 인식
        </button>
        <button
          className={tab === 'stats' ? 'tab active' : 'tab'}
          onClick={() => setTab('stats')}
          role="tab"
        >
          통계
        </button>
        <button
          className={tab === 'messages' ? 'tab active' : 'tab'}
          onClick={() => setTab('messages')}
          role="tab"
        >
          답례 문자
        </button>
      </div>

      {tab === 'ledger' && (
        <div className="fade-up">
          <div className="toolbar">
            <div className="stats-inline">
              <span>
                <strong className="num">{entries.length}</strong>건
              </span>
              <span>
                {MONEY_LABEL[event.type]} 총액 <strong className="num">{formatKRW(total)}</strong>
              </span>
              {lowCount > 0 && (
                <span style={{ color: 'var(--warn-edge)', fontWeight: 600 }}>
                  확인 필요 {lowCount}건
                </span>
              )}
            </div>
            <div className="actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
                + 직접 추가
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => downloadCsv(event, entries)}
                disabled={entries.length === 0}
              >
                CSV 내보내기
              </button>
              <button
                className="btn btn-sm btn-accent"
                onClick={() => void exportXlsxGated()}
                disabled={entries.length === 0}
                title={premium ? '서식 적용 엑셀' : '프리미엄 기능'}
              >
                엑셀(.xlsx) {premium ? '' : '🔒'}
              </button>
            </div>
          </div>

          <MergeSuggestions pairs={mergePairs} onMerge={handleMerge} onIgnore={handleIgnorePair} />

          {entries.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">簿</div>
              <p>
                아직 장부가 비어 있어요. <strong>사진 인식</strong> 탭에서 봉투·장부 사진을 올리거나
                직접 추가해 보세요.
              </p>
              <button className="btn btn-accent" onClick={() => setTab('scan')}>
                사진 인식하러 가기
              </button>
            </div>
          ) : (
            <>
              <EntryTable
                entries={entries}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onShowImage={handleShowImage}
              />
              <p className="hint">
                노란 행은 AI가 확신하지 못한 항목입니다. 원본을 확인하고 편집하거나 '확인✓'을 눌러
                주세요.
              </p>
            </>
          )}
        </div>
      )}

      {tab === 'scan' && (
        <ScanPanel
          aiCount={aiCount}
          premium={premium}
          onOpenPurchase={() => setPurchaseOpen(true)}
          claimPremium={claim}
          onRecognized={handleRecognized}
        />
      )}

      {tab === 'stats' && <StatsPanel event={event} entries={entries} />}

      {tab === 'messages' && (
        <MessagesPanel
          event={event}
          entries={entries}
          premium={premium && claim()}
          claimPremium={claim}
          onOpenPurchase={() => setPurchaseOpen(true)}
        />
      )}

      {purchaseOpen && <PurchaseModal onClose={() => setPurchaseOpen(false)} />}

      {viewImage && (
        <Modal title="원본 사진" onClose={() => setViewImage(null)} wide>
          <div className="image-viewer">
            <img src={viewImage} alt="봉투 원본" />
          </div>
        </Modal>
      )}

      {adding && (
        <AddEntryModal
          onClose={() => setAdding(false)}
          onAdd={async (entry) => {
            await putEntry(entry);
            await reload();
            setAdding(false);
          }}
          eventId={event.id}
        />
      )}
    </div>
  );
}

// ── 직접 추가 모달 ─────────────────────────────
function AddEntryModal({
  eventId,
  onClose,
  onAdd,
}: {
  eventId: string;
  onClose: () => void;
  onAdd: (entry: Entry) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [relation, setRelation] = useState<Relation>('other');
  const [affiliation, setAffiliation] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    await onAdd({
      id: uid(),
      eventId,
      name: name.trim(),
      amount: parseAmount(amount),
      relation,
      affiliation: affiliation.trim() || undefined,
      confidence: 'high',
      source: 'manual',
      createdAt: Date.now(),
    });
  };

  return (
    <Modal title="항목 직접 추가" onClose={onClose}>
      <div className="form-grid">
        <div className="field">
          <label>이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="예: 김철수" />
        </div>
        <div className="field">
          <label>금액</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 5만 또는 50,000"
            inputMode="numeric"
          />
        </div>
        <div className="field">
          <label>관계</label>
          <select value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {RELATION_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>소속 · 단서 (선택)</label>
          <input
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            placeholder="예: 회사 동료, 큰아버지"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
        </div>
        {error && <div className="field-error">{error}</div>}
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-accent" onClick={() => void submit()}>
            추가
          </button>
        </div>
      </div>
    </Modal>
  );
}
