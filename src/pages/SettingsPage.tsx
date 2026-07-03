import { useState } from 'react';
import { MODELS } from '../lib/anthropic';
import { wipeAll } from '../lib/db';
import { useApp } from '../state/AppContext';
import { PurchaseModal } from '../components/PurchaseModal';

export function SettingsPage() {
  const {
    apiKey,
    setApiKey,
    model,
    setModel,
    license,
    activateLicense,
    deactivateLicense,
    boundEventId,
  } = useApp();

  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [licenseDraft, setLicenseDraft] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [licenseOk, setLicenseOk] = useState('');
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const saveKey = () => {
    setApiKey(keyDraft);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 1800);
  };

  const activate = () => {
    setLicenseError('');
    setLicenseOk('');
    try {
      const stored = activateLicense(licenseDraft);
      const p = stored.payload;
      setLicenseOk(
        `활성화 완료 — ${p.plan === 'lifetime' ? '평생권' : '행사 1회권'}${
          p.issuedTo ? ` (${p.issuedTo}님)` : ''
        }`,
      );
      setLicenseDraft('');
    } catch (err) {
      setLicenseError(err instanceof Error ? err.message : '라이선스 검증에 실패했습니다.');
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, marginBottom: 22 }}>설정</h1>

      {/* ── AI 인식 ─────────────────────────── */}
      <section className="settings-section fade-up">
        <div className="section-title" style={{ margin: '0 0 14px' }}>
          <h2>AI 인식 (BYOK)</h2>
          <span className="sub">내 Claude API 키로 브라우저에서 직접 호출</span>
        </div>
        <div className="card card-pad">
          <div className="field">
            <label>Anthropic API 키</label>
            <div className="key-row">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
              />
              <button className="btn btn-ghost" onClick={() => setShowKey((v) => !v)}>
                {showKey ? '숨기기' : '보기'}
              </button>
              <button className="btn btn-accent" onClick={saveKey}>
                {keySaved ? '저장됨 ✓' : '저장'}
              </button>
              {apiKey && (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setApiKey('');
                    setKeyDraft('');
                  }}
                >
                  키 삭제
                </button>
              )}
            </div>
            <p className="hint">
              키는 이 기기 브라우저(localStorage)에만 저장되며 Anthropic 외 어디에도 전송되지
              않습니다. 키 발급:{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
                console.anthropic.com ↗
              </a>
            </p>
          </div>

          <div className="field" style={{ marginTop: 18 }}>
            <label>인식 모델</label>
            <div style={{ display: 'grid', gap: 8 }}>
              {MODELS.map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    fontSize: 14.5,
                    fontWeight: 400,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="model"
                    checked={model === m.id}
                    onChange={() => setModel(m.id)}
                    style={{ width: 'auto' }}
                  />
                  <span>
                    <strong>{m.label}</strong>{' '}
                    <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>— {m.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 프리미엄 ─────────────────────────── */}
      <section className="settings-section fade-up d1">
        <div className="section-title" style={{ margin: '0 0 14px' }}>
          <h2>프리미엄 라이선스</h2>
          <span className="sub">오프라인 서명 검증 · 서버 없음</span>
        </div>
        <div className="card card-pad">
          {license ? (
            <>
              <div className="kv">
                <div className="row">
                  <span className="k">플랜</span>
                  <span>
                    <span className="badge badge-premium">
                      {license.payload.plan === 'lifetime' ? '평생권' : '행사 1회권'}
                    </span>
                  </span>
                </div>
                {license.payload.issuedTo && (
                  <div className="row">
                    <span className="k">구매자</span>
                    <span>{license.payload.issuedTo}</span>
                  </div>
                )}
                {license.payload.exp && (
                  <div className="row">
                    <span className="k">만료일</span>
                    <span>{license.payload.exp}</span>
                  </div>
                )}
                {license.payload.plan === 'event' && (
                  <div className="row">
                    <span className="k">귀속 행사</span>
                    <span>
                      {boundEventId
                        ? '프리미엄 기능을 처음 사용한 행사에 귀속되었습니다'
                        : '아직 귀속 전 — 프리미엄 기능을 처음 사용하는 행사에 귀속됩니다'}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 16 }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (window.confirm('라이선스를 이 기기에서 제거할까요?')) deactivateLicense();
                  }}
                >
                  라이선스 제거
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 12px' }}>
                결제 후 이메일로 받은 라이선스 키(<code>BUJO-…</code>)를 입력하면 프리미엄이
                해제됩니다.
              </p>
              <div className="key-row">
                <input
                  value={licenseDraft}
                  onChange={(e) => setLicenseDraft(e.target.value)}
                  placeholder="BUJO-eyJwcm9kdWN0IjoiYnVqb3JvayIs..."
                  autoComplete="off"
                />
                <button className="btn btn-accent" onClick={activate} disabled={!licenseDraft.trim()}>
                  활성화
                </button>
              </div>
              {licenseError && <div className="field-error">{licenseError}</div>}
              {licenseOk && <div className="field-ok">{licenseOk}</div>}
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-seal" onClick={() => setPurchaseOpen(true)}>
                  가격 보기 · 구매하기
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── 데이터 ──────────────────────────── */}
      <section className="settings-section fade-up d2">
        <div className="section-title" style={{ margin: '0 0 14px' }}>
          <h2>데이터</h2>
          <span className="sub">모든 데이터는 이 브라우저에만 있습니다</span>
        </div>
        <div className="card card-pad">
          <p style={{ margin: '0 0 14px' }}>
            행사·장부·사진 썸네일은 브라우저 IndexedDB에, API 키·라이선스는 localStorage에
            저장됩니다. 브라우저 데이터를 지우면 함께 삭제되니 중요한 장부는 CSV/엑셀로 내보내
            보관하세요.
          </p>
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (
                window.confirm(
                  '모든 행사·장부·사진 데이터를 삭제할까요? 되돌릴 수 없습니다. (API 키·라이선스는 유지)',
                )
              ) {
                await wipeAll();
                window.alert('모든 데이터를 삭제했습니다.');
              }
            }}
          >
            모든 장부 데이터 삭제
          </button>
        </div>
      </section>

      {purchaseOpen && <PurchaseModal onClose={() => setPurchaseOpen(false)} />}
    </div>
  );
}
