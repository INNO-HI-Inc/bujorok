import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FREE_AI_LIMIT } from '../config';
import { recognizeEnvelopes, type RecognizedItem } from '../lib/anthropic';
import { processImageFile } from '../lib/image';
import { useApp } from '../state/AppContext';

type FileState = 'pending' | 'processing' | 'done' | 'error' | 'skipped';

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  state: FileState;
  resultCount?: number;
  error?: string;
}

interface ScanPanelProps {
  /** 이 행사에서 지금까지 AI로 인식한 항목 수 */
  aiCount: number;
  premium: boolean;
  onOpenPurchase: () => void;
  /** 프리미엄 실제 사용 시점(1회권 귀속) */
  claimPremium: () => boolean;
  /** 인식 결과 저장 (항목들 + 원본 썸네일) */
  onRecognized: (items: RecognizedItem[], thumbDataUrl: string) => Promise<void>;
}

let fileSeq = 0;

export function ScanPanel({
  aiCount,
  premium,
  onOpenPurchase,
  claimPremium,
  onRecognized,
}: ScanPanelProps) {
  const { apiKey, model } = useApp();
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [banner, setBanner] = useState<{ kind: 'warn' | 'error' | 'ok'; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = premium ? Infinity : Math.max(0, FREE_AI_LIMIT - aiCount);

  const addFiles = (list: FileList | File[]) => {
    const next: QueuedFile[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) continue;
      next.push({
        id: `f${++fileSeq}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        state: 'pending',
      });
    }
    if (next.length) setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const setFileState = (id: string, patch: Partial<QueuedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const run = async () => {
    setBanner(null);
    if (!apiKey) return;
    const queue = files.filter((f) => f.state === 'pending' || f.state === 'error');
    if (queue.length === 0) return;

    if (!premium && remaining <= 0) {
      setBanner({
        kind: 'warn',
        text: `무료 플랜은 행사당 AI 인식 ${FREE_AI_LIMIT}건까지입니다. 프리미엄으로 제한 없이 이용하세요.`,
      });
      return;
    }
    if (premium && !claimPremium()) {
      setBanner({ kind: 'error', text: '이 행사에서 프리미엄을 사용할 수 없습니다. (1회권이 다른 행사에 귀속됨)' });
      return;
    }

    setRunning(true);
    setProgress({ done: 0, total: queue.length });
    let addedTotal = 0;
    let quota = premium ? Infinity : remaining;

    for (let i = 0; i < queue.length; i++) {
      const qf = queue[i];
      if (quota <= 0) {
        setFileState(qf.id, { state: 'skipped', error: '무료 한도 도달' });
        setProgress({ done: i + 1, total: queue.length });
        continue;
      }
      setFileState(qf.id, { state: 'processing', error: undefined });
      try {
        const processed = await processImageFile(qf.file);
        let items = await recognizeEnvelopes(apiKey, model, processed);
        if (items.length > quota) {
          items = items.slice(0, quota);
          setBanner({
            kind: 'warn',
            text: `무료 한도(행사당 ${FREE_AI_LIMIT}건)에 도달해 일부 항목만 추가했습니다.`,
          });
        }
        if (items.length > 0) {
          await onRecognized(items, processed.thumbDataUrl);
          quota -= items.length;
          addedTotal += items.length;
        }
        setFileState(qf.id, { state: 'done', resultCount: items.length });
      } catch (err) {
        setFileState(qf.id, {
          state: 'error',
          error: err instanceof Error ? err.message : '알 수 없는 오류',
        });
      }
      setProgress({ done: i + 1, total: queue.length });
    }

    setRunning(false);
    if (addedTotal > 0) {
      setBanner((prev) =>
        prev?.kind === 'warn'
          ? prev
          : { kind: 'ok', text: `${addedTotal}건을 장부에 추가했습니다. '장부' 탭에서 검수해 주세요.` },
      );
    }
  };

  const pendingCount = files.filter((f) => f.state === 'pending' || f.state === 'error').length;

  if (!apiKey) {
    return (
      <div className="card card-pad fade-up">
        <h3 style={{ marginBottom: 8 }}>AI 인식을 시작하려면 API 키가 필요해요</h3>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, margin: '0 0 16px' }}>
          부조록은 서버 없이 <strong>내 Claude API 키</strong>로 브라우저에서 직접 인식합니다. 사진은
          Anthropic API 외 어디에도 전송되지 않으며, 장당 약 10~30원의 API 비용이 내 Anthropic 계정에
          과금됩니다.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/settings" className="btn btn-accent">
            설정에서 API 키 입력하기
          </Link>
          <a
            className="btn btn-ghost"
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
          >
            API 키 발급받기 ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      {!premium && (
        <div className="notice" style={{ marginBottom: 14 }}>
          무료 플랜: 이 행사에서 AI 인식 <strong className="num">{aiCount}</strong> /{' '}
          {FREE_AI_LIMIT}건 사용.{' '}
          <button
            onClick={onOpenPurchase}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--accent)',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: 'inherit',
            }}
          >
            프리미엄으로 무제한 이용 →
          </button>
        </div>
      )}

      <div
        className={dragging ? 'dropzone dragging' : 'dropzone'}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <div className="big">봉투·장부 사진을 올려주세요</div>
        <div>클릭해서 선택하거나 여러 장을 끌어다 놓으세요 (JPG · PNG · HEIC 변환본)</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <p className="hint">
        이미지는 브라우저에서 최대 1568px로 축소·압축 후 전송됩니다 · 사진 1장당 약 10~30원의 API
        비용 발생 · 세로쓰기 봉투, 한자 이름·금액(金 五萬원整)도 판독합니다
      </p>

      {files.length > 0 && (
        <>
          <div className="thumb-grid">
            {files.map((f) => (
              <div className="thumb" key={f.id}>
                <img src={f.previewUrl} alt={f.file.name} />
                {!running && f.state !== 'processing' && (
                  <button className="remove" onClick={() => removeFile(f.id)} aria-label="제거">
                    ✕
                  </button>
                )}
                {f.state === 'processing' && <span className="state">판독 중…</span>}
                {f.state === 'done' && <span className="state ok">{f.resultCount}건 인식</span>}
                {f.state === 'error' && <span className="state err">실패</span>}
                {f.state === 'skipped' && <span className="state err">한도 초과</span>}
              </div>
            ))}
          </div>

          {running && (
            <div style={{ margin: '16px 0 6px' }}>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="hint">
                {progress.done} / {progress.total}장 처리 중 — 순차적으로 판독하고 있어요
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-accent" onClick={run} disabled={running || pendingCount === 0}>
              {running ? '판독 중…' : `인식 시작 (${pendingCount}장)`}
            </button>
            {!running && files.some((f) => f.state === 'done') && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                  setFiles([]);
                }}
              >
                목록 비우기
              </button>
            )}
          </div>
        </>
      )}

      {banner && (
        <div className={`notice ${banner.kind === 'ok' ? '' : banner.kind}`} style={{ marginTop: 14 }}>
          {banner.text}
        </div>
      )}

      {files.some((f) => f.state === 'error') && !running && (
        <div className="notice error" style={{ marginTop: 10 }}>
          {files
            .filter((f) => f.state === 'error')
            .map((f) => `${f.file.name}: ${f.error}`)
            .join(' · ')}
        </div>
      )}
    </div>
  );
}
