import type { Entry, EventRecord, EventType, Relation } from '../types';
import { formatDate } from './format';

/**
 * 답례 문자 템플릿 엔진.
 * 행사 유형 × 관계 × 금액대에 따라 톤을 차등 적용합니다.
 * - 조문 감사: 격식체 (배상/올림)
 * - 친구: 부드러운 존댓말
 * - 회사: 정중한 비즈니스 존댓말
 */

type AmountBand = 'small' | 'mid' | 'large';

function band(amount: number): AmountBand {
  if (amount >= 200000) return 'large';
  if (amount >= 100000) return 'mid';
  return 'small';
}

function callName(entry: Entry): string {
  return `${entry.name}님`;
}

export function buildThankMessage(event: EventRecord, entry: Entry): string {
  const type: EventType = event.type;
  const rel: Relation = entry.relation;
  const b = band(entry.amount);
  const name = callName(entry);
  const host = event.host;
  const date = formatDate(event.date);

  if (type === 'funeral') {
    // 조문 감사 인사 — 전통 격식체
    const gratitude =
      b === 'large'
        ? '보내주신 과분한 정성과 깊은 애도에 몸 둘 바를 모르겠습니다.'
        : b === 'mid'
          ? '보내주신 정중한 조의와 위로에 큰 힘을 얻었습니다.'
          : '보내주신 따뜻한 위로의 마음에 큰 힘을 얻었습니다.';
    const relLine =
      rel === 'company'
        ? '바쁘신 업무 중에도 마음을 보태주시어 더욱 감사드립니다.'
        : rel === 'friend'
          ? '먼 걸음과 마음을 아끼지 않아 주신 정, 오래 기억하겠습니다.'
          : rel === 'family' || rel === 'relative'
            ? '가족의 슬픔을 함께해 주시어 더없이 큰 위안이 되었습니다.'
            : '경황없는 중에 보내주신 마음, 잊지 않겠습니다.';
    return (
      `삼가 인사드립니다. ${name}.\n` +
      `지난 ${date} 저희 상사(喪事)에 조의를 표해 주시고 부의를 보내주신 데 대해 삼가 감사의 말씀을 올립니다. ${gratitude} ${relLine}\n` +
      `일일이 찾아뵙고 인사드려야 마땅하나 경황이 없어 글로 먼저 예를 갖춤을 너그러이 헤아려 주시기 바랍니다.\n` +
      `상주 ${host} 배상`
    );
  }

  if (type === 'wedding') {
    const gratitude =
      b === 'large'
        ? '보내주신 과분한 마음에 어떻게 감사를 전해야 할지 모르겠습니다.'
        : b === 'mid'
          ? '보내주신 큰 마음, 소중히 간직하겠습니다.'
          : '보내주신 따뜻한 마음, 감사히 받았습니다.';
    if (rel === 'friend') {
      return (
        `${name}, 저희 결혼식에 마음 보태주셔서 정말 고마워요.\n` +
        `${gratitude} 덕분에 ${date}이 더 행복하고 든든한 하루였어요.\n` +
        `자리 잡는 대로 꼭 한번 뵙고 맛있는 밥 대접할게요. 늘 고맙습니다!\n` +
        `${host} 드림`
      );
    }
    if (rel === 'company') {
      return (
        `${name}, 안녕하세요. ${host}입니다.\n` +
        `바쁘신 와중에도 저희 결혼을 축하해 주시고 축의까지 보내주셔서 진심으로 감사드립니다. ${gratitude}\n` +
        `보내주신 격려 잊지 않고, 앞으로 더 성실한 모습으로 보답하겠습니다.\n` +
        `${host} 드림`
      );
    }
    // 가족·친척·기타
    return (
      `${name}께 감사 인사드립니다.\n` +
      `저희 두 사람의 결혼을 축복해 주시고 귀한 마음까지 보태주셔서 진심으로 감사드립니다. ${gratitude}\n` +
      `보내주신 사랑 잊지 않고 서로 아끼며 예쁘게 살겠습니다. 늘 건강하시기를 기원합니다.\n` +
      `${host} 올림`
    );
  }

  if (type === 'doljanchi') {
    const gratitude =
      b === 'large'
        ? '보내주신 과분한 사랑에 깊이 감사드립니다.'
        : '보내주신 따뜻한 마음, 감사히 받았습니다.';
    if (rel === 'friend') {
      return (
        `${name}, 우리 아이 첫 생일을 함께 축하해 주셔서 정말 고마워요.\n` +
        `${gratitude} 덕분에 ${date}이 오래 기억될 하루가 되었어요.\n` +
        `아이 크는 모습 종종 전할게요. 조만간 꼭 봬요!\n` +
        `${host} 드림`
      );
    }
    return (
      `${name}, 안녕하세요. ${host}입니다.\n` +
      `저희 아이의 첫 생일을 축하해 주시고 귀한 마음을 보내주셔서 진심으로 감사드립니다. ${gratitude}\n` +
      `보내주신 축복처럼 밝고 건강하게 키우겠습니다. 늘 평안하시기를 바랍니다.\n` +
      `${host} 드림`
    );
  }

  // 기타 행사
  const gratitude =
    b === 'large'
      ? '보내주신 과분한 정성에 깊이 감사드립니다.'
      : '보내주신 따뜻한 마음, 감사히 받았습니다.';
  return (
    `${name}, 안녕하세요. ${host}입니다.\n` +
    `지난 ${date} 저희 일에 마음을 보태주셔서 진심으로 감사드립니다. ${gratitude}\n` +
    `받은 마음 잊지 않고 꼭 보답하겠습니다. 늘 건강하시기 바랍니다.\n` +
    `${host} 드림`
  );
}

/** AI 다듬기용 상황 설명 */
export function messageContext(event: EventRecord, entry: Entry): string {
  const typeLabel =
    event.type === 'wedding'
      ? '결혼식 축의금'
      : event.type === 'funeral'
        ? '장례식 부의금(조문 감사, 격식체 필수)'
        : event.type === 'doljanchi'
          ? '돌잔치 축하금'
          : '경조사 부조금';
  const relLabel =
    entry.relation === 'friend'
      ? '친구(부드러운 존댓말)'
      : entry.relation === 'company'
        ? '회사 관계(정중한 존댓말)'
        : '가족·친척(따뜻한 존댓말)';
  return `${typeLabel}에 대한 답례 문자. 받는 사람: ${entry.name}(${relLabel}). 보내는 사람: ${event.host}.`;
}
