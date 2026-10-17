import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibrarySync } from '../dist/library-sync.mjs';
import { createLibrary } from '../dist/library.mjs';

const KEY = 'netflix-web.library.v1';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
function disk() { const map = new Map();return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }; }
function backend() {
  const rows = new Map();let offline = false, writes = 0;
  const client = user => ({ from(table) {
    assert.equal(table, 'cinema_libraries');
    let operation = 'read', payload, filters = {};
    const builder = {
      select() { return builder; }, eq(key, value) { filters[key] = value;return builder; },
      insert(value) { operation = 'insert';payload = value;return builder; },
      update(value) { operation = 'update';payload = value;return builder; },
      maybeSingle() { return builder; }, abortSignal() { return builder; },
      then(resolve, reject) { return Promise.resolve().then(() => {
        if (offline) throw new Error('offline');
        const id = operation === 'insert' ? payload.user_id : filters.user_id;
        if (id !== user) return { data: null, error: { code: '42501' } };
        const row = rows.get(id);
        if (operation === 'read') return { data: clone(row), error: null };
        if (operation === 'insert' && row) return { data: null, error: { code: '23505' } };
        if (operation === 'update' && (!row || row.revision !== filters.revision)) return { data: null, error: null };
        writes++;const next = { ...clone(payload), user_id: id };rows.set(id, next);
        return { data: clone(next), error: null };
      }).then(resolve, reject); },
    };
    return builder;
  } });
  return { rows, client, setOffline(value) { offline = value; }, writes: () => writes };
}
const state = name => ({ version: 1, activeProfileId: 'default', profiles: [{ id: 'default', name, color: 'red', kids: false, savedIds: [], ratings: {}, progress: {}, preferences: { autoplay: true, muted: true }, readNotices: [] }] });

test('hydrates remote before library creation, preserves full state and isolates account caches', async () => {
  const db = backend(), local = disk(), statuses = [];
  const original = state('Remoto');original.profiles[0].savedIds = ['movie'];original.profiles[0].progress.movie = { seconds: 20, duration: 100, updatedAt: 1 };
  db.rows.set(A, { user_id: A, state: original, revision: 3 });
  local.setItem(KEY, JSON.stringify(state('Legado global')));
  const sync = await createLibrarySync({ client: db.client(A), userId: A, storage: local, onStatus: status => statuses.push(status) });
  try {
    const library = createLibrary(sync.storage);
    assert.equal(library.activeProfile().name, 'Remoto');
    assert.deepEqual(library.savedIds(), ['movie']);
    assert.equal(library.progress('movie').seconds, 20);
    assert.equal(sync.status().state, 'synced');
    assert.equal(statuses.at(-1).state, 'synced');
    assert.ok(local.getItem(`${KEY}.${A}`));
    const other = await createLibrarySync({ client: db.client(B), userId: B, storage: local });
    try { assert.equal(other.storage.getItem(KEY), null); } finally { other.dispose(); }
    assert.equal(JSON.parse(local.getItem(KEY)).profiles[0].name, 'Legado global');
  } finally { sync.dispose(); }
});
test('debounced progress writes coalesce and next device hydrates saved changes', async () => {
  const db = backend(), sync = await createLibrarySync({ client: db.client(A), userId: A, storage: disk() });
  try {
    const library = createLibrary(sync.storage);
    library.toggleSaved('movie');
    for (let seconds = 1; seconds <= 12; seconds++) library.recordProgress('movie', seconds, 100);
    assert.equal(sync.status().state, 'pending');
    assert.equal(db.writes(), 0, 'No per-second immediate write');
    await sync.flush();
    assert.equal(db.writes(), 1);
    assert.equal(sync.status().state, 'synced');
    const next = await createLibrarySync({ client: db.client(A), userId: A, storage: disk() });
    try { const restored = createLibrary(next.storage);assert.equal(restored.progress('movie').seconds, 12);assert.deepEqual(restored.savedIds(), ['movie']); } finally { next.dispose(); }
  } finally { sync.dispose(); }
});
test('offline unsynced changes survive reload and flush after connection returns', async () => {
  const db = backend(), local = disk();
  let sync = await createLibrarySync({ client: db.client(A), userId: A, storage: local });
  const library = createLibrary(sync.storage);library.toggleSaved('offline-movie');
  db.setOffline(true);await sync.flush();
  assert.equal(sync.status().state, 'offline');sync.dispose();
  sync = await createLibrarySync({ client: db.client(A), userId: A, storage: local });
  try {
    assert.equal(sync.status().state, 'offline');
    assert.deepEqual(createLibrary(sync.storage).savedIds(), ['offline-movie']);
    db.setOffline(false);await sync.flush();
    assert.equal(sync.status().state, 'synced');
    assert.deepEqual(db.rows.get(A).state.profiles[0].savedIds, ['offline-movie']);
  } finally { sync.dispose(); }
});
test('concurrent initial inserts become explicit conflict and local resolution uses latest revision', async () => {
  const db = backend();
  const first = await createLibrarySync({ client: db.client(A), userId: A, storage: disk() });
  const second = await createLibrarySync({ client: db.client(A), userId: A, storage: disk() });
  try {
    first.storage.setItem(KEY, JSON.stringify(state('Primeiro')));
    second.storage.setItem(KEY, JSON.stringify(state('Segundo')));
    await first.flush();await second.flush();
    assert.equal(second.status().state, 'conflict');
    assert.equal(db.rows.get(A).state.profiles[0].name, 'Primeiro');
    await second.flush();assert.equal(db.writes(), 1, 'Conflict blocks silent overwrites');
    const chosen = await second.resolveConflict('local');
    assert.equal(chosen.profiles[0].name, 'Segundo');
    assert.equal(db.rows.get(A).revision, 2);
    assert.equal(second.status().state, 'synced');
  } finally { first.dispose();second.dispose(); }
});
test('compare-and-swap update conflict preserves local draft until remote choice', async () => {
  const db = backend();db.rows.set(A, { user_id: A, state: state('Original'), revision: 1 });
  const local = disk(), sync = await createLibrarySync({ client: db.client(A), userId: A, storage: local });
  try {
    sync.storage.setItem(KEY, JSON.stringify(state('Alteração local')));
    db.rows.set(A, { user_id: A, state: state('Outro aparelho'), revision: 2 });
    await sync.flush();
    assert.equal(sync.status().state, 'conflict');
    assert.equal(JSON.parse(sync.storage.getItem(KEY)).profiles[0].name, 'Alteração local');
    const chosen = await sync.resolveConflict('remote');
    assert.equal(chosen.profiles[0].name, 'Outro aparelho');
    assert.equal(sync.status().state, 'synced');
    assert.equal(JSON.parse(local.getItem(`${KEY}.${A}.sync`)).dirty, false);
  } finally { sync.dispose(); }
});
test('dirty offline cache detects newer remote on initialization without discarding local', async () => {
  const db = backend(), local = disk();
  local.setItem(`${KEY}.${A}`, JSON.stringify(state('Offline')));
  local.setItem(`${KEY}.${A}.sync`, JSON.stringify({ revision: 2, dirty: true }));
  db.rows.set(A, { user_id: A, state: state('Servidor'), revision: 3 });
  const sync = await createLibrarySync({ client: db.client(A), userId: A, storage: local });
  try { assert.equal(sync.status().state, 'conflict');assert.equal(JSON.parse(sync.storage.getItem(KEY)).profiles[0].name, 'Offline');assert.equal(db.writes(), 0); } finally { sync.dispose(); }
});
test('invalid metadata does not discard valid local library, and disposed adapters reject changes', async () => {
  const db = backend(), local = disk();
  local.setItem(`${KEY}.${A}`, JSON.stringify(state('Ainda salvo')));local.setItem(`${KEY}.${A}.sync`, 'invalid');
  const sync = await createLibrarySync({ client: db.client(A), userId: A, storage: local });
  assert.equal(JSON.parse(sync.storage.getItem(KEY)).profiles[0].name, 'Ainda salvo');
  await sync.flush();assert.equal(db.rows.get(A).state.profiles[0].name, 'Ainda salvo');
  assert.throws(() => sync.storage.setItem(KEY, '{bad json'), /inválida/);
  await assert.rejects(() => sync.resolveConflict('merge'), /local ou remote/);
  sync.dispose();assert.throws(() => sync.storage.setItem(KEY, JSON.stringify(state('Depois'))), /encerrada/);
});
