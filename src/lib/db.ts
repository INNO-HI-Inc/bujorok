import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Entry, EventRecord, ImageRecord } from '../types';

interface BujorokDB extends DBSchema {
  events: { key: string; value: EventRecord };
  entries: { key: string; value: Entry; indexes: { 'by-event': string } };
  images: { key: string; value: ImageRecord; indexes: { 'by-event': string } };
}

let dbPromise: Promise<IDBPDatabase<BujorokDB>> | null = null;

function db(): Promise<IDBPDatabase<BujorokDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BujorokDB>('bujorok', 1, {
      upgrade(d) {
        d.createObjectStore('events', { keyPath: 'id' });
        const entries = d.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('by-event', 'eventId');
        const images = d.createObjectStore('images', { keyPath: 'id' });
        images.createIndex('by-event', 'eventId');
      },
    });
  }
  return dbPromise;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── 행사 ──────────────────────────────────────────────
export async function listEvents(): Promise<EventRecord[]> {
  const all = await (await db()).getAll('events');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getEvent(id: string): Promise<EventRecord | undefined> {
  return (await db()).get('events', id);
}

export async function putEvent(ev: EventRecord): Promise<void> {
  await (await db()).put('events', ev);
}

/** 행사와 그에 속한 항목·이미지 전체 삭제 */
export async function deleteEvent(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['events', 'entries', 'images'], 'readwrite');
  const entryKeys = await tx.objectStore('entries').index('by-event').getAllKeys(id);
  for (const k of entryKeys) await tx.objectStore('entries').delete(k);
  const imageKeys = await tx.objectStore('images').index('by-event').getAllKeys(id);
  for (const k of imageKeys) await tx.objectStore('images').delete(k);
  await tx.objectStore('events').delete(id);
  await tx.done;
}

// ── 항목 ──────────────────────────────────────────────
export async function listEntries(eventId: string): Promise<Entry[]> {
  const all = await (await db()).getAllFromIndex('entries', 'by-event', eventId);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function putEntry(entry: Entry): Promise<void> {
  await (await db()).put('entries', entry);
}

export async function putEntries(entries: Entry[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('entries', 'readwrite');
  for (const e of entries) await tx.store.put(e);
  await tx.done;
}

export async function deleteEntry(id: string): Promise<void> {
  await (await db()).delete('entries', id);
}

// ── 이미지 ────────────────────────────────────────────
export async function putImage(img: ImageRecord): Promise<void> {
  await (await db()).put('images', img);
}

export async function getImage(id: string): Promise<ImageRecord | undefined> {
  return (await db()).get('images', id);
}

/** 모든 로컬 데이터 삭제 */
export async function wipeAll(): Promise<void> {
  const d = await db();
  const tx = d.transaction(['events', 'entries', 'images'], 'readwrite');
  await tx.objectStore('events').clear();
  await tx.objectStore('entries').clear();
  await tx.objectStore('images').clear();
  await tx.done;
}
