import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { EventRecord, EventType } from '../types';
import { EVENT_TYPE_LABEL, HOST_LABEL } from '../types';
import { listEvents, listEntries, putEvent, putEntries, uid } from '../lib/db';
import { buildDemoEvent } from '../lib/demoData';
import { formatDate, formatKRWShort, todayISO } from '../lib/format';
import { Modal } from '../components/Modal';

interface EventWithStats extends EventRecord {
  count: number;
  total: number;
}

const THEME_CLASS: Record<EventType, string> = {
  wedding: '',
  funeral: 'theme-funeral',
  doljanchi: 'theme-doljanchi',
  other: 'theme-other',
};

export function HomePage() {
  const [events, setEvents] = useState<EventWithStats[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const navigate = useNavigate();

  const reload = async () => {
    const evs = await listEvents();
    const withStats = await Promise.all(
      evs.map(async (ev) => {
        const entries = await listEntries(ev.id);
        return { ...ev, count: entries.length, total: entries.reduce((s, e) => s + e.amount, 0) };
      }),
    );
    setEvents(withStats);
  };

  useEffect(() => {
    void reload();
  }, []);

  const startDemo = async () => {
    setDemoBusy(true);
    try {
      const existing = (await listEvents()).find((e) => e.demo);
      if (existing) {
        navigate(`/event/${existing.id}`);
        return;
      }
      const { event, entries } = buildDemoEvent();
      await putEvent(event);
      await putEntries(entries);
      navigate(`/event/${event.id}`);
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <div>
      <section className="hero">
        <div className="hero-vertical" aria-hidden>
          扶助錄
        </div>
        <div className="hero-body fade-up">
          <h1>
            봉투 속 마음을,
            <br />
            기록으로<span className="accent-dot">.</span>
          </h1>
          <p className="hero-lede">
            결혼식·장례식이 끝나면 남는 손글씨 봉투와 장부. 사진만 찍어 올리면 AI가 이름·금액·소속을
            읽어 디지털 장부로 만들어 드립니다. 한자 이름도, 세로쓰기도, <em>金 五萬원整</em> 같은
            한자 금액도 알아서 판독합니다.
          </p>
          <div className="hero-actions">
            <button className="btn btn-seal btn-lg" onClick={() => setCreating(true)}>
              새 행사 만들기
            </button>
            <button className="btn btn-ghost btn-lg" onClick={startDemo} disabled={demoBusy}>
              {demoBusy ? '준비 중…' : 'API 키 없이 데모 체험'}
            </button>
          </div>
          <div className="privacy-pill">
            <span className="dot" />
            서버 없음 — 모든 데이터는 이 기기 브라우저에만 저장됩니다&nbsp;
            <Link to="/privacy">자세히</Link>
          </div>
        </div>
      </section>

      <div className="section-title">
        <h2>내 행사</h2>
        <span className="sub">행사별로 장부가 분리됩니다</span>
      </div>

      {events === null ? (
        <div className="empty-state">불러오는 중…</div>
      ) : events.length === 0 ? (
        <div className="empty-state fade-up">
          <div className="glyph">簿</div>
          <p>
            아직 행사가 없습니다. <strong>새 행사 만들기</strong>로 시작하거나, 데모로 먼저
            둘러보세요.
          </p>
        </div>
      ) : (
        <div className="event-grid">
          {events.map((ev, i) => (
            <Link
              to={`/event/${ev.id}`}
              className={`card event-card fade-up d${Math.min(i, 3)} ${THEME_CLASS[ev.type]}`}
              key={ev.id}
            >
              <span className="type-badge">
                {EVENT_TYPE_LABEL[ev.type]}
                {ev.demo ? ' · 데모' : ''}
              </span>
              <h3>{ev.name}</h3>
              <div className="meta">
                {formatDate(ev.date)} · {HOST_LABEL[ev.type]} {ev.host}
              </div>
              <div className="figures">
                <div>
                  <div className="label">건수</div>
                  <div className="value num">{ev.count}건</div>
                </div>
                <div>
                  <div className="label">총액</div>
                  <div className="value num">{ev.total > 0 ? formatKRWShort(ev.total) : '—'}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="section-title">
        <h2>이렇게 진행돼요</h2>
      </div>
      <div className="feature-row">
        <div className="feature-cell fade-up">
          <div className="no">一</div>
          <h3>사진 촬영·업로드</h3>
          <p>봉투와 장부를 폰으로 찍어 여러 장 한꺼번에 올립니다. 이미지는 브라우저에서 압축돼요.</p>
        </div>
        <div className="feature-cell fade-up d1">
          <div className="no">二</div>
          <h3>AI 판독 · 검수</h3>
          <p>
            이름·금액·소속을 자동 추출하고, 애매한 항목은 노란 표시로 알려줘 빠르게 검수할 수
            있어요. 한자 이름은 중복 병합까지 제안합니다.
          </p>
        </div>
        <div className="feature-cell fade-up d2">
          <div className="no">三</div>
          <h3>엑셀 · 답례 문자</h3>
          <p>
            통계를 확인하고 CSV/엑셀로 내보내거나, 관계별 존댓말 답례 문자를 한 번에 만들어
            보내세요.
          </p>
        </div>
      </div>

      {creating && <CreateEventModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<EventType>('wedding');
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [host, setHost] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async () => {
    if (!name.trim()) {
      setError('행사 이름을 입력해 주세요.');
      return;
    }
    if (!host.trim()) {
      setError(`${HOST_LABEL[type]} 이름을 입력해 주세요.`);
      return;
    }
    const event: EventRecord = {
      id: uid(),
      name: name.trim(),
      type,
      date: date || todayISO(),
      host: host.trim(),
      createdAt: Date.now(),
    };
    await putEvent(event);
    navigate(`/event/${event.id}`);
  };

  return (
    <Modal title="새 행사 만들기" onClose={onClose}>
      <div className="form-grid">
        <div className="field">
          <label>행사 유형</label>
          <div className="type-radio">
            {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={type === t ? 'selected' : ''}
                onClick={() => setType(t)}
              >
                {EVENT_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>행사 이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'funeral' ? '예: 故 김O수님 발인' : '예: 민준 · 서연 결혼식'}
            autoFocus
          />
        </div>
        <div className="field">
          <label>날짜</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>{HOST_LABEL[type]} 이름</label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder={type === 'funeral' ? '예: 김철수' : '예: 김민준 · 이서연'}
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
            만들기
          </button>
        </div>
      </div>
    </Modal>
  );
}
