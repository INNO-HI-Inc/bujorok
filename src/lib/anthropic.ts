import type { Confidence } from '../types';
import type { ProcessedImage } from './image';

/**
 * 브라우저에서 사용자 본인의 Claude API 키(BYOK)로 Anthropic API를 직접 호출합니다.
 * 사진과 키는 api.anthropic.com 외 어디에도 전송되지 않습니다.
 */
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export const MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', desc: '기본값 · 판독 정확도 우선' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', desc: '더 빠르고 저렴함' },
] as const;

export const DEFAULT_MODEL: string = 'claude-sonnet-5';

export interface RecognizedItem {
  name: string;
  original?: string;
  amount: number;
  affiliation?: string;
  confidence: Confidence;
}

const RECOGNITION_PROMPT = `당신은 한국 경조사(결혼식·장례식·돌잔치)의 축의금/부의금 봉투와 손글씨 장부를 판독하는 전문가입니다.
이 사진에서 부조한 사람들의 정보를 모두 추출하세요.

규칙:
1. 이름: 한자로 적혀 있으면 한국 한자음으로 음차해 "name"에 한글로 적고, 원문 표기를 "original"에 그대로 적으세요. (예: 金哲洙 → name "김철수", original "金哲洙")
2. 금액: 반드시 숫자(원 단위)로 변환하세요. 한자·혼용 표기 해석 예시 — "金 五萬원整" = 50000, "金壹拾萬원整" = 100000, "参萬원" = 30000, "五万" = 50000, "일금 십만원" = 100000, "칠만원" = 70000.
3. 소속·관계 단서: 회사명, 부서, 직함, 지역, "친구", "동창", "OO 아버지" 같은 이름 외 정보를 "affiliation"에 적으세요. 없으면 생략하세요.
4. 세로쓰기 대응: 봉투 글씨는 세로로 쓰인 경우가 많습니다. 세로쓰기는 위→아래로 한 줄을 읽고, 줄은 오른쪽→왼쪽 순서로 읽으세요.
5. 신뢰도: 글자가 흐리거나 이름·금액이 불확실하면 "low", 명확하면 "high"로 표시하세요.
6. 사진 한 장에 봉투 여러 장 또는 장부 여러 줄이 있으면 전부 추출하세요.
7. 금액을 전혀 읽을 수 없으면 amount는 0, 이름을 전혀 읽을 수 없으면 name은 "판독불가"로 적고 confidence는 "low"로 하세요.

아래 형식의 JSON 배열만 출력하세요. 코드블록·설명 없이 배열만 출력합니다:
[{"name":"김철수","original":"金哲洙","amount":50000,"affiliation":"삼성전자 동료","confidence":"high"}]`;

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

async function callClaude(
  apiKey: string,
  model: string,
  content: ContentBlock[],
  maxTokens: number,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
      }),
    });
  } catch {
    throw new Error('네트워크 오류: Anthropic API에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.');
  }

  if (!res.ok) {
    let detail = '';
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      detail = err?.error?.message ?? '';
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new Error('API 키가 올바르지 않습니다. 설정에서 키를 확인해 주세요.');
    if (res.status === 429) throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. (Rate limit)');
    if (res.status === 400) throw new Error(`요청 오류: ${detail || '이미지 형식을 확인해 주세요.'}`);
    if (res.status >= 500) throw new Error('Anthropic 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.');
    throw new Error(`API 오류 (${res.status}) ${detail}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
  if (!text.trim()) throw new Error('모델이 응답을 반환하지 않았습니다. 다시 시도해 주세요.');
  return text;
}

/** 봉투/장부 사진 한 장을 판독해 항목 배열로 반환 */
export async function recognizeEnvelopes(
  apiKey: string,
  model: string,
  image: ProcessedImage,
): Promise<RecognizedItem[]> {
  const content: ContentBlock[] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType, data: image.base64 },
    },
    { type: 'text', text: RECOGNITION_PROMPT },
  ];
  const text = await callClaude(apiKey, model, content, 4096);
  return parseItems(text);
}

function parseItems(text: string): RecognizedItem[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('판독 결과를 해석할 수 없습니다. 사진을 더 선명하게 찍어 다시 시도해 주세요.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('판독 결과 형식이 올바르지 않습니다. 다시 시도해 주세요.');
  }
  if (!Array.isArray(parsed)) return [];
  const items: RecognizedItem[] = [];
  for (const raw of parsed) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : '판독불가';
    const amountNum = typeof r.amount === 'number' ? r.amount : Number(r.amount);
    const amount = Number.isFinite(amountNum) && amountNum > 0 ? Math.round(amountNum) : 0;
    const original =
      typeof r.original === 'string' && r.original.trim() && r.original.trim() !== name
        ? r.original.trim()
        : undefined;
    const affiliation =
      typeof r.affiliation === 'string' && r.affiliation.trim() ? r.affiliation.trim() : undefined;
    const confidence: Confidence =
      r.confidence === 'high' && name !== '판독불가' && amount > 0 ? 'high' : 'low';
    items.push({ name, original, amount, affiliation, confidence });
  }
  return items;
}

/** 답례 문자를 AI로 더 자연스럽게 다듬기 */
export async function refineMessage(
  apiKey: string,
  model: string,
  draft: string,
  context: string,
): Promise<string> {
  const prompt = `아래는 한국 경조사 답례 문자 초안입니다. 상황: ${context}

초안:
${draft}

이 문자를 같은 격식 수준을 유지하면서 더 자연스럽고 진심이 느껴지게 다듬어 주세요.
- 길이는 초안과 비슷하게 (3~5문장)
- 이름, 관계 맥락은 유지
- 과장된 표현이나 이모지는 넣지 마세요
- 다듬어진 문자 본문만 출력하세요. 따옴표나 설명 없이.`;
  const text = await callClaude(apiKey, model, [{ type: 'text', text: prompt }], 1024);
  return text.trim().replace(/^["'“]|["'”]$/g, '');
}
