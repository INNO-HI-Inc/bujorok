import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { LICENSE_PUBLIC_KEY_HEX } from './publicKey';

// @noble/ed25519 v2는 해시 함수 주입이 필요 (WebCrypto 비의존 — 어디서나 동작)
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/**
 * 오프라인 Ed25519 서명 검증 라이선스.
 * 키 포맷: BUJO-<base64url(JSON payload)>-<base64url(signature)>
 * payload = { product, plan, issuedTo?, exp?, iat? }
 */
export type Plan = 'event' | 'lifetime';

export interface LicensePayload {
  product: string;
  plan: Plan;
  issuedTo?: string;
  exp?: string; // YYYY-MM-DD
  iat?: string;
}

export interface StoredLicense {
  key: string;
  payload: LicensePayload;
}

const PREFIX = 'BUJO-';
const SIG_B64_LEN = 86; // Ed25519 서명 64바이트 → base64url(패딩 없음) 86자
const LS_KEY = 'bujorok.license';
const LS_BOUND = 'bujorok.licenseBoundEvent';

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  let bin: string;
  try {
    bin = atob(b64);
  } catch {
    throw new Error('라이선스 키 형식이 올바르지 않습니다.');
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 키를 파싱하고 서명·유효기간을 검증. 실패 시 한국어 메시지로 throw */
export function verifyLicenseKey(rawKey: string): LicensePayload {
  const key = rawKey.trim();
  if (!key.startsWith(PREFIX)) {
    throw new Error('라이선스 키는 BUJO- 로 시작해야 합니다.');
  }
  const rest = key.slice(PREFIX.length);
  if (rest.length < SIG_B64_LEN + 2 || rest[rest.length - SIG_B64_LEN - 1] !== '-') {
    throw new Error('라이선스 키가 손상되었습니다. 전체를 정확히 붙여넣어 주세요.');
  }
  const payloadB64 = rest.slice(0, rest.length - SIG_B64_LEN - 1);
  const sigB64 = rest.slice(-SIG_B64_LEN);

  const sig = b64urlToBytes(sigB64);
  const message = new TextEncoder().encode(payloadB64);
  const pub = ed.etc.hexToBytes(LICENSE_PUBLIC_KEY_HEX);

  let valid = false;
  try {
    valid = ed.verify(sig, message, pub);
  } catch {
    valid = false;
  }
  if (!valid) throw new Error('서명 검증에 실패했습니다. 유효하지 않은 라이선스 키입니다.');

  let payload: LicensePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64))) as LicensePayload;
  } catch {
    throw new Error('라이선스 내용을 읽을 수 없습니다.');
  }
  if (payload.product !== 'bujorok') {
    throw new Error('이 키는 부조록용 라이선스가 아닙니다.');
  }
  if (payload.plan !== 'event' && payload.plan !== 'lifetime') {
    throw new Error('알 수 없는 라이선스 플랜입니다.');
  }
  if (payload.exp) {
    const expiry = new Date(`${payload.exp}T23:59:59`);
    if (Number.isFinite(expiry.getTime()) && expiry.getTime() < Date.now()) {
      throw new Error(`라이선스가 ${payload.exp}에 만료되었습니다.`);
    }
  }
  return payload;
}

export function getStoredLicense(): StoredLicense | null {
  const key = localStorage.getItem(LS_KEY);
  if (!key) return null;
  try {
    return { key, payload: verifyLicenseKey(key) };
  } catch {
    return null;
  }
}

export function storeLicense(rawKey: string): StoredLicense {
  const payload = verifyLicenseKey(rawKey);
  localStorage.setItem(LS_KEY, rawKey.trim());
  return { key: rawKey.trim(), payload };
}

export function removeStoredLicense(): void {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_BOUND);
}

export function getBoundEventId(): string | null {
  return localStorage.getItem(LS_BOUND);
}

export function bindEvent(eventId: string): void {
  localStorage.setItem(LS_BOUND, eventId);
}

/**
 * 해당 행사에서 프리미엄이 활성인지.
 * - lifetime: 항상 true
 * - event(1회권): 아직 어느 행사에도 묶이지 않았거나, 이 행사에 묶여 있으면 true
 */
export function isPremiumFor(license: StoredLicense | null, eventId?: string): boolean {
  if (!license) return false;
  if (license.payload.plan === 'lifetime') return true;
  const bound = getBoundEventId();
  if (!bound) return true;
  return eventId !== undefined && bound === eventId;
}

/** 프리미엄 기능을 실제 사용하는 시점에 호출 — 1회권이면 이 행사에 귀속 */
export function claimPremiumFor(license: StoredLicense | null, eventId: string): boolean {
  if (!license) return false;
  if (license.payload.plan === 'lifetime') return true;
  const bound = getBoundEventId();
  if (!bound) {
    bindEvent(eventId);
    return true;
  }
  return bound === eventId;
}
