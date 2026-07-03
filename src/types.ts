export type EventType = 'wedding' | 'funeral' | 'doljanchi' | 'other';
export type Relation = 'family' | 'relative' | 'company' | 'friend' | 'other';
export type Confidence = 'high' | 'low';

export interface EventRecord {
  id: string;
  name: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  host: string; // 혼주·상주명
  createdAt: number;
  demo?: boolean;
}

export interface Entry {
  id: string;
  eventId: string;
  name: string; // 한글 이름 (한자는 음차)
  nameOriginal?: string; // 원문 표기 (한자 등)
  amount: number;
  relation: Relation;
  affiliation?: string; // 소속·관계 단서
  memo?: string;
  confidence: Confidence;
  imageId?: string;
  source: 'ai' | 'manual' | 'demo';
  createdAt: number;
}

export interface ImageRecord {
  id: string;
  eventId: string;
  dataUrl: string; // 썸네일(JPEG data URL)
  createdAt: number;
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  wedding: '결혼식',
  funeral: '장례식',
  doljanchi: '돌잔치',
  other: '기타 행사',
};

export const HOST_LABEL: Record<EventType, string> = {
  wedding: '혼주',
  funeral: '상주',
  doljanchi: '주인공',
  other: '주최',
};

export const RELATION_LABEL: Record<Relation, string> = {
  family: '가족',
  relative: '친척',
  company: '회사',
  friend: '친구',
  other: '기타',
};

export const RELATIONS: Relation[] = ['family', 'relative', 'company', 'friend', 'other'];

/** 행사 유형별 부조금 명칭 */
export const MONEY_LABEL: Record<EventType, string> = {
  wedding: '축의금',
  funeral: '부의금',
  doljanchi: '축하금',
  other: '부조금',
};
