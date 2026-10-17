const KEY = 'netflix-web.library.v1';
const MAX_BYTES = 524288;
const messages = {
  synced: 'Biblioteca salva na sua conta.', pending: 'Salvando alterações na sua conta…',
  offline: 'Sem sincronização. Suas alterações serão reenviadas quando possível.',
  conflict: 'A biblioteca mudou em outro aparelho. Escolha qual versão manter.',
};
const snapshot = raw => raw ? JSON.parse(raw) : null;
function validRaw(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_BYTES) return false;
  try { const state = JSON.parse(raw);return state?.version === 1 && Array.isArray(state.profiles) && state.profiles.length >= 1 && state.profiles.length <= 5; } catch { return false; }
}

export async function createLibrarySync({ client, userId, storage = globalThis.localStorage, onStatus = () => {} }) {
  if (!client?.from || typeof userId !== 'string' || !userId || userId.length > 256) throw new TypeError('Conta indisponível para sincronização.');
  const localKey = `${KEY}.${userId}`, metaKey = `${localKey}.sync`;
  let raw = null, revision = 0, dirty = false, hydrated = false, conflict = false, disposed = false, timer = null, inFlight = null;
  let current = { state: 'synced', message: messages.synced };
  const emit = state => { current = { state, message: messages[state] };try { onStatus({ ...current }); } catch {} };
  try {
    const stored = storage?.getItem(localKey);
    raw = validRaw(stored) ? stored : null;
    let meta = null;
    try { meta = JSON.parse(storage?.getItem(metaKey) || 'null'); } catch {}
    revision = Number.isSafeInteger(meta?.revision) && meta.revision >= 0 ? meta.revision : 0;
    dirty = Boolean(raw && (meta?.dirty !== false || !meta));
  } catch { dirty = Boolean(raw); }
  const save = () => {
    if (!storage?.setItem) throw new Error('Armazenamento local indisponível.');
    // Mark dirty before replacing raw state, so an interrupted write cannot look clean.
    storage.setItem(metaKey, JSON.stringify({ revision, dirty: true }));
    if (raw === null) { if (storage.removeItem) storage.removeItem(localKey);else storage.setItem(localKey, ''); } else storage.setItem(localKey, raw);
    storage.setItem(metaKey, JSON.stringify({ revision, dirty }));
  };
  const safelySave = () => { try { save();return true; } catch { return false; } };
  const query = async builder => {
    const controller = new AbortController();
    if (typeof builder.abortSignal === 'function') builder = builder.abortSignal(controller.signal);
    let timeout;
    try {
      return await Promise.race([Promise.resolve(builder), new Promise((_, reject) => {
        timeout = setTimeout(() => { controller.abort();reject(new Error('Tempo de sincronização excedido.')); }, 8000);
      })]);
    } finally { clearTimeout(timeout); }
  };
  const remote = async () => {
    const result = await query(client.from('cinema_libraries').select('state,revision').eq('user_id', userId).maybeSingle());
    if (result.error) throw new Error('Biblioteca remota indisponível.');
    if (!result.data) return { raw: null, revision: 0 };
    const value = JSON.stringify(result.data.state);
    if (!validRaw(value) || !Number.isSafeInteger(result.data.revision) || result.data.revision < 1) throw new Error('Biblioteca remota inválida.');
    return { raw: value, revision: result.data.revision };
  };
  const reconcile = async () => {
    const value = await remote();
    hydrated = true;
    if (dirty && value.revision !== revision) { conflict = true;emit('conflict');return; }
    if (!dirty) { raw = value.raw;revision = value.revision;safelySave(); }
    emit(dirty ? 'pending' : 'synced');
  };
  const schedule = () => {
    clearTimeout(timer);
    if (!disposed && dirty && !conflict) timer = setTimeout(() => { void flush(); }, 900);
  };
  async function flush() {
    clearTimeout(timer);timer = null;
    if (disposed || conflict) return { ...current };
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        if (!hydrated) await reconcile();
        if (conflict || !dirty || raw === null) return { ...current };
        const sent = raw, expected = revision;
        const row = { state: snapshot(sent), revision: expected + 1 };
        emit('pending');
        const builder = expected === 0
          ? client.from('cinema_libraries').insert({ ...row, user_id: userId })
          : client.from('cinema_libraries').update(row).eq('user_id', userId).eq('revision', expected);
        const result = await query(builder.select('state,revision').maybeSingle());
        if (result.error?.code === '23505' || (!result.error && !result.data)) {
          conflict = true;emit('conflict');return { ...current };
        }
        if (result.error || result.data?.revision !== expected + 1) throw new Error('Não foi possível sincronizar.');
        revision = result.data.revision;
        dirty = raw !== sent;
        safelySave();
        emit(dirty ? 'pending' : 'synced');
      } catch { emit('offline'); }
      return { ...current };
    })();
    try { return await inFlight; } finally { inFlight = null;if (dirty && current.state === 'pending') schedule(); }
  }
  const wrapper = {
    getItem(key) { return key === KEY ? raw : storage?.getItem(`${key}.${userId}`) ?? null; },
    setItem(key, value) {
      if (disposed) throw new Error('Sincronização encerrada.');
      if (key !== KEY) { storage?.setItem(`${key}.${userId}`, value);return; }
      if (!validRaw(value)) throw new TypeError('Biblioteca inválida ou muito grande.');
      raw = value;dirty = true;
      const persisted = safelySave();
      if (!conflict) emit('pending');
      schedule();
      if (!persisted) throw new Error('Alteração mantida nesta sessão; armazenamento local indisponível.');
    },
  };
  async function resolveConflict(choice) {
    if (!['local', 'remote'].includes(choice)) throw new TypeError('Escolha local ou remote.');
    if (disposed) throw new Error('Sincronização encerrada.');
    if (inFlight) await inFlight;
    try {
      const value = await remote();
      revision = value.revision;hydrated = true;
      if (choice === 'remote') { raw = value.raw;dirty = false;conflict = false;safelySave();emit('synced'); }
      else { conflict = false;dirty = raw !== null;safelySave();emit(dirty ? 'pending' : 'synced');await flush(); }
      return snapshot(raw);
    } catch { emit('offline');throw new Error('Não foi possível resolver agora. Tente novamente quando estiver conectado.'); }
  }
  const online = () => { void flush(); };
  const hidden = () => { if (globalThis.document?.visibilityState === 'hidden') void flush(); };
  try { await reconcile(); } catch { emit('offline'); }
  globalThis.addEventListener?.('online', online);
  globalThis.document?.addEventListener('visibilitychange', hidden);
  schedule();
  return {
    storage: wrapper, status: () => ({ ...current }), flush, resolveConflict,
    dispose() {
      disposed = true;clearTimeout(timer);
      globalThis.removeEventListener?.('online', online);
      globalThis.document?.removeEventListener('visibilitychange', hidden);
    },
  };
}
