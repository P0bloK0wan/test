const SITE_ORIGIN = 'https://cinema-netflix-rea.woodsy-sloth-2178.chatgpt.site';
const TMDB_ORIGIN = 'https://api.themoviedb.org';
const TOKEN_PATTERN = /^[A-Za-z0-9._-]{1,512}$/;

function allowedOrigin(origin) {
  if ([SITE_ORIGIN, 'https://p0blok0wan.github.io'].includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.origin === origin;
  } catch { return false; }
}

export function brazilianClassification(releaseDates) {
  const brazil = releaseDates?.results?.find(item => item.iso_3166_1 === 'BR');
  for (const type of [3, 4, 5, 6, 2, 1]) {
    for (const release of brazil?.release_dates ?? []) {
      if (release.type !== type) continue;
      const cert = String(release.certification ?? '').trim().toUpperCase();
      if (cert === 'L' || cert === 'LIVRE') return 0;
      if (['10', '12', '14', '16', '18'].includes(cert)) return Number(cert);
    }
  }
  return null;
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createMetadataHandler({ env, fetch: request = globalThis.fetch } = {}) {
  const readEnv = name => typeof env === 'function' ? env(name) : env?.[name];
  return async function handle(req) {
    const origin = req.headers.get('Origin');
    const cors = origin && allowedOrigin(origin) ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    } : {};
    const reply = (status, body) => new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
    });
    if (origin && !allowedOrigin(origin)) return reply(403, { error: 'Origem não permitida.' });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply(405, { error: 'Use uma solicitação POST.' });
    const auth = req.headers.get('Authorization') ?? '';
    if (auth.length > 8192 || !/^Bearer [^\s]+$/i.test(auth)) return reply(401, { error: 'Faça login como administrador.' });
    try {
      const base = readEnv('SUPABASE_URL')?.replace(/\/$/, '');
      const anonKey = readEnv('SUPABASE_ANON_KEY');
      const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
      if (!base || !anonKey || !serviceKey) throw new HttpError(503, 'Integração temporariamente indisponível.');
      const supabase = async (path, { service = false, body, method = 'POST' } = {}) => request(`${base}${path}`, {
        method,
        headers: { apikey: service ? serviceKey : anonKey, Authorization: service ? `Bearer ${serviceKey}` : auth, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10000), redirect: 'error',
      });
      const user = await supabase('/auth/v1/user', { method: 'GET' });
      if (!user.ok) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
      const userData = await user.json();
      if (!userData?.id) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
      const access = await supabase('/rest/v1/rpc/cinema_admin_access', { body: {} });
      if (!access.ok || await access.json() !== true) throw new HttpError(403, 'Acesso exclusivo de administrador.');
      const raw = await req.text();
      if (raw.length > 8192) throw new HttpError(400, 'Solicitação muito grande.');
      let data;
      try { data = JSON.parse(raw); } catch { throw new HttpError(400, 'Solicitação inválida.'); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Solicitação inválida.');
      if (!['status', 'configure', 'search', 'details'].includes(data.action)) throw new HttpError(400, 'Ação inválida.');
      const tmdb = async (path, token, params = {}) => {
        const url = new URL(`/3${path}`, TMDB_ORIGIN);
        for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
        const headers = { Accept: 'application/json' };
        if (/^[a-fA-F0-9]{32}$/.test(token)) url.searchParams.set('api_key', token);
        else headers.Authorization = `Bearer ${token}`;
        const response = await request(url.href, { headers, signal: AbortSignal.timeout(10000), redirect: 'error' });
        if (response.status === 429) throw new HttpError(429, 'Muitas consultas. Aguarde um pouco e tente novamente.');
        if ([401, 403].includes(response.status)) throw new HttpError(400, 'Credencial TMDB inválida ou sem permissão.');
        if (response.status === 404) throw new HttpError(404, 'Filme não encontrado no TMDB.');
        if (!response.ok) throw new HttpError(502, 'Não foi possível consultar o TMDB agora.');
        return response.json();
      };
      if (data.action === 'configure') {
        const token = data.token === null ? null : typeof data.token === 'string' ? data.token.trim() : undefined;
        if (token !== null && (typeof token !== 'string' || !TOKEN_PATTERN.test(token))) throw new HttpError(400, 'Informe uma credencial TMDB válida.');
        if (token !== null) await tmdb('/configuration', token);
        const saved = await supabase('/rest/v1/rpc/cinema_configure_tmdb', { body: { p_token: token } });
        if (!saved.ok) throw new HttpError(502, 'Não foi possível salvar a configuração.');
        return reply(200, { configured: await saved.json() === true });
      }
      if (data.action === 'search' && (typeof data.query !== 'string' || data.query.trim().length < 2 || data.query.trim().length > 160)) throw new HttpError(400, 'Pesquise um título entre 2 e 160 caracteres.');
      if (data.action === 'details' && (!Number.isSafeInteger(data.id) || data.id <= 0)) throw new HttpError(400, 'Identificador de filme inválido.');
      const secret = await supabase('/rest/v1/rpc/cinema_metadata_secret', { service: true, body: {} });
      if (!secret.ok) throw new HttpError(503, 'Não foi possível consultar a configuração.');
      const token = await secret.json();
      const configured = typeof token === 'string' && TOKEN_PATTERN.test(token);
      if (data.action === 'status') return reply(200, { configured });
      if (!configured) throw new HttpError(409, 'Configure sua credencial TMDB no painel primeiro.');
      if (data.action === 'search') {
        const result = await tmdb('/search/movie', token, { query: data.query.trim(), language: 'pt-BR', region: 'BR', include_adult: 'false' });
        const results = (Array.isArray(result.results) ? result.results : []).filter(movie => Number.isSafeInteger(movie.id) && movie.id > 0 && movie.adult !== true).slice(0, 8).map(movie => ({
          id: movie.id, title: String(movie.title ?? '').slice(0, 160), originalTitle: String(movie.original_title ?? '').slice(0, 160),
          year: /^\d{4}/.test(movie.release_date ?? '') ? Number(movie.release_date.slice(0, 4)) : null,
          overview: String(movie.overview ?? '').slice(0, 4000),
        }));
        return reply(200, { results });
      }
      const movie = await tmdb(`/movie/${data.id}`, token, { language: 'pt-BR', append_to_response: 'release_dates,credits' });
      return reply(200, { movie: {
        title: String(movie.title ?? '').slice(0, 160), synopsis: String(movie.overview ?? '').slice(0, 4000),
        year: /^\d{4}/.test(movie.release_date ?? '') ? Number(movie.release_date.slice(0, 4)) : null,
        minutes: Number.isSafeInteger(movie.runtime) && movie.runtime > 0 ? movie.runtime : null,
        genres: (Array.isArray(movie.genres) ? movie.genres : []).map(item => String(item.name ?? '')).filter(Boolean).slice(0, 12),
        director: (movie.credits?.crew ?? []).filter(item => item.job === 'Director').map(item => String(item.name ?? '')).filter(Boolean).join(', ').slice(0, 200),
        age: brazilianClassification(movie.release_dates),
      } });
    } catch (error) {
      return reply(error instanceof HttpError ? error.status : 503, { error: error instanceof HttpError ? error.message : 'Serviço temporariamente indisponível. Tente novamente.' });
    }
  };
}

if (typeof Deno !== 'undefined') {
  Deno.serve(createMetadataHandler({ env: name => Deno.env.get(name) }));
}
