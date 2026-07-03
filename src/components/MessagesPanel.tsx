import { useEffect, useMemo, useState } from 'react';
import type { Entry, EventRecord } from '../types';
import { RELATION_LABEL } from '../types';
import { buildThankMessage, messageContext } from '../lib/messages';
import { refineMessage } from '../lib/anthropic';
import { formatKRW } from '../lib/format';
import { useApp } from '../state/AppContext';

interface MessagesPanelProps {
  event: EventRecord;
  entries: Entry[];
  premium: boolean;
  claimPremium: () => boolean;
  onOpenPurchase: () => void;
}

export function MessagesPanel({
  event,
  entries,
  premium,
  claimPremium,
  onOpenPurchase,
}: MessagesPanelProps) {
  const { apiKey, model } = useApp();
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [refining, setRefining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targets = useMemo(
    () => entries.filter((e) => e.name !== '판독불가'),
    [entries],
  );

  useEffect(() => {
    // 항목이 바뀌면 템플릿 기반 초안 생성 (수동 편집분은 유지)
    setTexts((prev) => {
      const next: Record<string, string> = {};
      for (const e of targets) next[e.id] = prev[e.id] ?? buildThankMessage(event, e);
      return next;
    });
  }, [targets, event]);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    } catch {
      setError('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  const copyAll = async () => {
    const all = targets
      .map((e) => `[${e.name}]\n${texts[e.id] ?? ''}`)
      .join('\n\n────────────\n\n');
    await copy('__all__', all);
  };

  const refine = async (entry: Entry) => {
    if (!apiKey) return;
    setError(null);
    setRefining(entry.id);
    try {
      const refined = await refineMessage(
        apiKey,
        model,
        texts[entry.id] ?? buildThankMessage(event, entry),
        messageContext(event, entry),
      );
      setTexts((prev) => ({ ...prev, [entry.id]: refined }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 다듬기에 실패했습니다.');
    } finally {
      setRefining(null);
    }
  };

  // ── 프리미엄 잠금 화면 ──────────────────────
  if (!premium) {
    const sample = targets[0];
    return (
      <div className="locked-panel fade-up">
        <div className="blurred">
          <div className="msg-list">
            {[0, 1].map((i) => {
              const e = targets[i] ?? sample;
              return (
                <div className="card msg-card" key={i}>
                  <div className="head">
                    <span className="who">{e ? e.name : '홍길동'}님</span>
                  </div>
                  <div className="msg-body">
                    {e ? buildThankMessage(event, e) : '따뜻한 답례 문자가 여기에 생성됩니다.'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="locked-overlay">
          <div className="inner card card-pad">
            <h3>답례 문자 자동 생성은 프리미엄 기능이에요</h3>
            <p>
              행사 유형과 관계(가족·친척·회사·친구)에 맞춰 톤을 달리한 존댓말 문자를 한 번에
              생성하고, 개별·전체 복사할 수 있어요.
              {event.type === 'funeral' && ' 조문 감사 인사는 격식체로 작성됩니다.'}
            </p>
            <button className="btn btn-seal btn-lg" onClick={onOpenPurchase}>
              프리미엄 알아보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="empty-state fade-up">
        <div className="glyph">禮</div>
        <p>답례 문자를 만들 항목이 아직 없어요. 먼저 봉투를 인식하거나 항목을 추가해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div className="toolbar">
        <div className="stats-inline">
          <span>
            <strong className="num">{targets.length}</strong>명에게 보낼 답례 문자
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            관계·금액대에 따라 톤이 자동 조정됩니다
          </span>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={copyAll}>
            {copied === '__all__' ? '복사됨 ✓' : '전체 복사'}
          </button>
        </div>
      </div>

      {error && (
        <div className="notice error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div className="msg-list">
        {targets.map((entry) => {
          const claimAndRefine = () => {
            if (!claimPremium()) return;
            void refine(entry);
          };
          return (
            <div className="card msg-card" key={entry.id}>
              <div className="head">
                <span className="who">
                  {entry.name}님
                  <span className="sub">
                    {RELATION_LABEL[entry.relation]}
                    {entry.affiliation ? ` · ${entry.affiliation}` : ''} · {formatKRW(entry.amount)}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  {apiKey && (
                    <button
                      className="icon-btn"
                      onClick={claimAndRefine}
                      disabled={refining !== null}
                    >
                      {refining === entry.id ? 'AI 다듬는 중…' : 'AI로 더 자연스럽게'}
                    </button>
                  )}
                  <button
                    className="icon-btn"
                    style={{ fontWeight: 700 }}
                    onClick={() => copy(entry.id, texts[entry.id] ?? '')}
                  >
                    {copied === entry.id ? '복사됨 ✓' : '복사'}
                  </button>
                </span>
              </div>
              <div className="msg-body">{texts[entry.id]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
