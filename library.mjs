const KEY = 'netflix-web.library.v1';
const COLORS = new Set(['red', 'blue', 'teal', 'gold', 'violet']);
const own = (object, key) => Object.hasOwn(object, key);
const copy = value => JSON.parse(JSON.stringify(value));
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const emptyProfile = (id, name, color, kids) => ({id, name, color, kids, savedIds: [], ratings: Object.create(null), progress: Object.create(null), preferences: {autoplay: true, muted: true}, readNotices: []});
const publicProfile = ({id, name, color, kids}) => ({id, name, color, kids});

export function createLibrary(storage, {catalogIds = []} = {}) {
  const catalog = new Set(catalogIds);
  const allowed = id => validId(id) && (!catalog.size || catalog.has(id));
  let error = null;
  let clock = 0;
  let sequence = 0;
  let state = {version: 1, activeProfileId: 'default', profiles: [emptyProfile('default', 'Você', 'red', false)]};
  const uniqueIds = (values, predicate = validId) => Array.isArray(values) ? [...new Set(values.filter(predicate))] : [];
  try {
    const raw = storage?.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.version === 1 && Array.isArray(parsed.profiles)) {
      const profiles = [];
      for (const input of parsed.profiles) {
        if (!input || !validId(input.id) || profiles.some(p => p.id === input.id) || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 24 || !COLORS.has(input.color)) continue;
        const p = emptyProfile(input.id, input.name.trim(), input.color, input.kids === true);
        p.savedIds = uniqueIds(input.savedIds, allowed);
        p.readNotices = uniqueIds(input.readNotices);
        if (input.ratings && typeof input.ratings === 'object') for (const [id, value] of Object.entries(input.ratings)) if (allowed(id) && [-1, 1, 2].includes(value)) p.ratings[id] = value;
        if (input.progress && typeof input.progress === 'object') for (const [id, value] of Object.entries(input.progress)) {
          if (!allowed(id) || !value || !finite(value.seconds) || !finite(value.duration) || value.duration <= 0 || !finite(value.updatedAt) || value.updatedAt < 0) continue;
          p.progress[id] = {seconds: Math.max(0, Math.min(value.seconds, value.duration)), duration: value.duration, updatedAt: value.updatedAt};
          clock = Math.max(clock, value.updatedAt);
        }
        for (const key of ['autoplay', 'muted']) if (typeof input.preferences?.[key] === 'boolean') p.preferences[key] = input.preferences[key];
        profiles.push(p);
        if (profiles.length === 5) break;
      }
      if (profiles.length) state = {version: 1, activeProfileId: profiles.some(p => p.id === parsed.activeProfileId) ? parsed.activeProfileId : profiles[0].id, profiles};
    }
  } catch { error = 'Não foi possível carregar os dados salvos.'; }
  const persist = () => {
    try {
      if (!storage || typeof storage.setItem !== 'function') throw new Error('Storage unavailable');
      storage.setItem(KEY, JSON.stringify(state));
    } catch { error = 'Não foi possível salvar neste navegador. Suas alterações continuam nesta sessão.'; }
  };
  const active = () => state.profiles.find(p => p.id === state.activeProfileId);
  const movieId = id => { if (!validId(id)) throw new TypeError('ID de título inválido.'); if (!allowed(id)) throw new RangeError('Título desconhecido.'); };
  const profileById = id => {
    if (!validId(id)) throw new TypeError('ID de perfil inválido.');
    const p = state.profiles.find(item => item.id === id);
    if (!p) throw new RangeError('Perfil desconhecido.');
    return p;
  };
  const noticeIds = ids => {
    if (!Array.isArray(ids) || ids.some(id => !validId(id))) throw new TypeError('Notificações inválidas.');
    return [...new Set(ids)];
  };
  return {
    setCatalogIds(ids) { catalog.clear();for(const id of ids)if(validId(id))catalog.add(id); },
    snapshot: () => copy(state),
    activeProfile: () => publicProfile(active()),
    setActiveProfile(id) { const p = profileById(id); state.activeProfileId = p.id; persist(); return publicProfile(p); },
    saveProfile(input) {
      if (!input || typeof input !== 'object' || typeof input.name !== 'string') throw new TypeError('Nome inválido.');
      const name = input.name.trim();
      if (!name || name.length > 24) throw new RangeError('O nome deve ter de 1 a 24 caracteres.');
      if (!COLORS.has(input.color)) throw new RangeError('Cor inválida.');
      if (input.kids !== undefined && typeof input.kids !== 'boolean') throw new TypeError('Perfil infantil inválido.');
      let p;
      if (input.id !== undefined) p = profileById(input.id);
      else {
        if (state.profiles.length >= 5) throw new RangeError('Limite de cinco perfis.');
        let id;
        do { id = `profile-${Date.now().toString(36)}-${++sequence}`; } while (state.profiles.some(p => p.id === id));
        p = emptyProfile(id, name, input.color, input.kids === true);
        state.profiles.push(p);
      }
      Object.assign(p, {name, color: input.color, kids: input.kids === true});
      persist(); return publicProfile(p);
    },
    deleteProfile(id) {
      profileById(id);
      if (state.profiles.length === 1) throw new RangeError('Mantenha pelo menos um perfil.');
      state.profiles = state.profiles.filter(p => p.id !== id);
      if (state.activeProfileId === id) state.activeProfileId = state.profiles[0].id;
      persist();
    },
    toggleSaved(id) {
      movieId(id); const p = active(); const exists = p.savedIds.includes(id);
      p.savedIds = exists ? p.savedIds.filter(value => value !== id) : [...p.savedIds, id];
      persist(); return !exists;
    },
    isSaved(id) { movieId(id); return active().savedIds.includes(id); },
    savedIds: () => [...active().savedIds],
    rate(id, value) {
      movieId(id);
      if (value !== null && ![-1, 1, 2].includes(value)) throw new RangeError('Avaliação inválida.');
      if (value === null) delete active().ratings[id]; else active().ratings[id] = value;
      persist();
    },
    getRating(id) { movieId(id); return own(active().ratings, id) ? active().ratings[id] : null; },
    recordProgress(id, seconds, duration) {
      movieId(id);
      if (!finite(seconds) || !finite(duration)) throw new TypeError('Tempo inválido.');
      if (duration <= 0) return null;
      clock = Math.max(Date.now(), clock + 1);
      active().progress[id] = {seconds: Math.max(0, Math.min(seconds, duration)), duration, updatedAt: clock};
      persist(); return copy(active().progress[id]);
    },
    progress(id) { movieId(id); return own(active().progress, id) ? copy(active().progress[id]) : null; },
    continueWatching: () => Object.entries(active().progress).filter(([, p]) => p.seconds > 0 && p.seconds / p.duration < .95).sort((a, b) => b[1].updatedAt - a[1].updatedAt).map(([id]) => id),
    preferences: () => ({...active().preferences}),
    setPreferences(patch) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Preferências inválidas.');
      for (const [key, value] of Object.entries(patch)) if (!['autoplay', 'muted'].includes(key) || typeof value !== 'boolean') throw new TypeError('Preferência inválida.');
      Object.assign(active().preferences, patch); persist(); return {...active().preferences};
    },
    markNoticesRead(ids) { const clean = noticeIds(ids); active().readNotices = [...new Set([...active().readNotices, ...clean])]; persist(); },
    unreadNotices(ids) { return noticeIds(ids).filter(id => !active().readNotices.includes(id)); },
    lastError: () => error,
  };
}
