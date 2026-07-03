import type { Entry, EventRecord } from '../types';
import { uid } from './db';

/**
 * 데모 모드: API 키 없이 전체 플로우를 체험할 수 있는 내장 샘플 데이터.
 * 봉투 20건 — 한자 이름, 회사 동료, 친척, 판독 애매 건, 중복 병합 데모 포함.
 */
export function buildDemoEvent(): { event: EventRecord; entries: Entry[] } {
  const event: EventRecord = {
    id: uid(),
    name: '민준 · 서연 결혼식 (데모)',
    type: 'wedding',
    date: '2026-05-23',
    host: '김민준 · 이서연',
    createdAt: Date.now(),
    demo: true,
  };

  type Row = [
    name: string,
    original: string | undefined,
    amount: number,
    relation: Entry['relation'],
    affiliation: string | undefined,
    confidence: Entry['confidence'],
    memo?: string,
  ];

  const rows: Row[] = [
    ['김철수', '金哲洙', 100000, 'company', '삼성전자 경영지원팀 부장', 'high'],
    ['김철수', undefined, 100000, 'company', '경영지원팀', 'low', '장부 기재분 — 봉투와 중복 의심'],
    ['이영희', undefined, 50000, 'friend', '신부 대학 동창', 'high'],
    ['박민수', '朴珉洙', 100000, 'company', '김앤장 법률사무소', 'high'],
    ['최은정', undefined, 50000, 'friend', '신부 회사 동기', 'high'],
    ['정대현', '鄭大鉉', 300000, 'relative', '큰아버지', 'high'],
    ['강선미', undefined, 200000, 'relative', '이모', 'high'],
    ['윤성호', '尹聖浩', 50000, 'company', '총무팀', 'low', '금액 흐림 — 五万 추정'],
    ['한지민', undefined, 50000, 'friend', '등산 동호회', 'high'],
    ['오세훈', '吳世勳', 100000, 'company', '거래처 (주)한빛물산 대표', 'high'],
    ['임수진', undefined, 30000, 'other', '어머니 지인 (성당)', 'high'],
    ['신동엽', '申東燁', 100000, 'relative', '외삼촌', 'high'],
    ['배유나', undefined, 50000, 'friend', '고등학교 동창', 'high'],
    ['조현우', '趙賢祐', 50000, 'company', '개발1팀 대리', 'high'],
    ['송미란', undefined, 100000, 'family', '고모', 'high'],
    ['홍성기', '洪性基', 50000, 'other', '아버지 친구 (향우회)', 'low', '이름 두 번째 글자 확인 필요'],
    ['서정원', '徐廷源', 200000, 'relative', '작은아버지', 'high'],
    ['노상현', '盧相鉉', 30000, 'other', undefined, 'low', '봉투 뒷면 세로쓰기'],
    ['황보라', undefined, 50000, 'friend', '신부 대학 후배', 'high'],
    ['백종현', '白鍾賢', 500000, 'family', '신랑 형', 'high'],
  ];

  const base = Date.now() - rows.length * 1000;
  const entries: Entry[] = rows.map(
    ([name, nameOriginal, amount, relation, affiliation, confidence, memo], i) => ({
      id: uid(),
      eventId: event.id,
      name,
      nameOriginal,
      amount,
      relation,
      affiliation,
      memo,
      confidence,
      source: 'demo',
      createdAt: base + i * 1000,
    }),
  );

  return { event, entries };
}
