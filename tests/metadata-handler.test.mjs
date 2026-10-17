import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetadataHandler, brazilianClassification } from '../supabase/functions/movie-metadata/index.mjs';

const secret = 'private-provider-token-do-not-leak';
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-key', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };
function fixture({ user = true, admin = true, token = secret, upstream = {}, upstreamStatus = 200, upstreamThrow = false } = {}) {
  const calls = [];
  const fetch = async (input, options = {}) => {
    const url = new URL(input);
    calls.push({ url, options });
    const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
    if (url.hostname === 'example.supabase.co') {
      if (url.pathname === '/auth/v1/user') return response(user ? { id: 'user-id' } : { message: secret }, user ? 200 : 401);
      if (url.pathname.endsWith('/cinema_admin_access')) return response(admin);
      if (url.pathname.endsWith('/cinema_metadata_secret')) {
        assert.equal(options.headers.Authorization, 'Bearer service-key');
        return response(token);
      }
      if (url.pathname.endsWith('/cinema_configure_tmdb')) return response(JSON.parse(options.body).p_token !== null);
    }
    assert.equal(url.origin, 'https://api.themoviedb.org', 'Provider host cannot be controlled by request data');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    if (upstreamThrow) throw new Error(`network leaked ${secret}`);
    return response(upstreamStatus === 200 ? upstream : { secret, malicious: 'provider response body' }, upstreamStatus);
  };
  const handler = createMetadataHandler({ env, fetch });
  const send = (body, { auth = 'Bearer user-jwt', origin, method = 'POST' } = {}) => handler(new Request('https://edge.example/movie-metadata', {
    method, headers: { ...(auth ? { Authorization: auth } : {}), ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  }));
  return { calls, send };
}

test('metadata rejects anonymous requests before any database/provider call', async () => {
  const f = fixture();
  assert.equal((await f.send({ action: 'status' }, { auth: null })).status, 401);
  assert.equal(f.calls.length, 0);
});
test('metadata validates JWT and administrator before reading secret', async () => {
  for (const [options, status, count] of [[{ user: false }, 401, 1], [{ admin: false }, 403, 2]]) {
    const f = fixture(options);
    const response = await f.send({ action: 'search', query: 'title' });
    assert.equal(response.status, status);
    assert.equal(f.calls.length, count);
    assert.ok(!(await response.text()).includes(secret));
  }
});
test('status only returns configured flag and refuses unconfigured search', async () => {
  const f = fixture();
  assert.deepEqual(await (await f.send({ action: 'status' })).json(), { configured: true });
  assert.ok(f.calls.every(call => call.url.hostname === 'example.supabase.co'));
  const empty = fixture({ token: null });
  assert.deepEqual(await (await empty.send({ action: 'status' })).json(), { configured: false });
  assert.equal((await empty.send({ action: 'search', query: 'title' })).status, 409);
});
test('search fixes provider URL, Portuguese params and output shape; caps results', async () => {
  const f = fixture({ upstream: { results: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, title: 'Título', original_title: 'Title', overview: 'Sinopse', release_date: '2025-01-01', provider_secret: secret })) } });
  const response = await f.send({ action: 'search', query: 'https://evil.example/movie' });
  const body = await response.json();
  assert.equal(body.results.length, 8);
  assert.deepEqual(body.results[0], { id: 1, title: 'Título', originalTitle: 'Title', overview: 'Sinopse', year: 2025 });
  const call = f.calls.at(-1);
  assert.equal(call.url.pathname, '/3/search/movie');
  assert.equal(call.url.searchParams.get('language'), 'pt-BR');
  assert.equal(call.url.searchParams.get('region'), 'BR');
  assert.equal(call.url.searchParams.get('include_adult'), 'false');
  assert.equal(call.options.headers.Authorization, `Bearer ${secret}`);
  assert.ok(!JSON.stringify(body).includes(secret));
});
test('details maps metadata and keeps missing Brazilian rating unknown', async () => {
  const f = fixture({ upstream: { title: 'Título', overview: 'Resumo', release_date: '2024-01-01', runtime: 98, genres: [{ name: 'Drama' }], credits: { crew: [{ job: 'Director', name: 'Pessoa' }] }, release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ type: 3, certification: 'G' }] }] } } });
  const body = await (await f.send({ action: 'details', id: 123 })).json();
  assert.deepEqual(body.movie, { title: 'Título', synopsis: 'Resumo', year: 2024, minutes: 98, genres: ['Drama'], director: 'Pessoa', age: null });
  assert.equal(f.calls.at(-1).url.pathname, '/3/movie/123');
  assert.equal(f.calls.at(-1).url.searchParams.get('append_to_response'), 'release_dates,credits');
});
test('Brazilian rating uses release priority, accepts Livre and rejects unknown/US', () => {
  const rating = releases => brazilianClassification({ results: [{ iso_3166_1: 'BR', release_dates: releases }] });
  assert.equal(rating([{ type: 4, certification: '16' }, { type: 3, certification: '12' }]), 12);
  assert.equal(rating([{ type: 3, certification: '' }, { type: 4, certification: 'Livre' }]), 0);
  assert.equal(rating([{ type: 3, certification: 'L' }]), 0);
  for (const value of ['G', 'PG', 'R', '0', 'unknown', '']) assert.equal(rating([{ type: 3, certification: value }]), null);
  assert.equal(brazilianClassification(), null);
});
test('configure validates provider before saving, supports API key and deletion', async () => {
  const f = fixture();
  const key = 'a'.repeat(32);
  assert.deepEqual(await (await f.send({ action: 'configure', token: key })).json(), { configured: true });
  const upstream = f.calls.find(call => call.url.hostname === 'api.themoviedb.org');
  assert.equal(upstream.url.pathname, '/3/configuration');
  assert.equal(upstream.url.searchParams.get('api_key'), key);
  assert.equal(upstream.options.headers.Authorization, undefined);
  assert.equal(JSON.parse(f.calls.at(-1).options.body).p_token, key);
  assert.deepEqual(await (await f.send({ action: 'configure', token: null })).json(), { configured: false });
  const bad = fixture({ upstreamStatus: 401 });
  const response = await bad.send({ action: 'configure', token: secret });
  assert.equal(response.status, 400);
  assert.ok(!bad.calls.some(call => call.url.pathname.endsWith('/cinema_configure_tmdb')));
  assert.ok(!(await response.text()).includes(secret));
});
test('invalid ids, query and token are rejected before privileged secret/upstream', async () => {
  for (const body of [{ action: 'details', id: '../configuration' }, { action: 'details', id: 0 }, { action: 'details', id: 1.2 }, { action: 'search', query: 'a' }, { action: 'search', query: 'a'.repeat(161) }, { action: 'configure', token: 'a'.repeat(513) }, { action: 'configure', token: 'abc\r\nAuthorization:x' }]) {
    const f = fixture();
    assert.equal((await f.send(body)).status, 400);
    assert.equal(f.calls.length, 2);
  }
});
test('provider rate limits and transport errors are sanitized without secret leaks', async () => {
  for (const [config, status] of [[{ upstreamStatus: 429 }, 429], [{ upstreamStatus: 500 }, 502], [{ upstreamThrow: true }, 503]]) {
    const f = fixture(config);
    const response = await f.send({ action: 'search', query: 'title' });
    assert.equal(response.status, status);
    const text = await response.text();
    assert.ok(!text.includes(secret));
    assert.ok(!text.includes('provider response body'));
    assert.ok(!text.includes('service-key'));
  }
});
test('CORS allows site and local preview only, never bypasses JWT', async () => {
  const f = fixture();
  const origin = 'https://cinema-netflix-rea.woodsy-sloth-2178.chatgpt.site';
  const preflight = await f.send({}, { origin, method: 'OPTIONS', auth: null });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await f.send({ action: 'status' }, { origin, auth: null })).status, 401);
  assert.equal((await f.send({ action: 'status' }, { origin: 'https://evil.example' })).status, 403);
  const local = await f.send({ action: 'status' }, { origin: 'http://127.0.0.1:4190' });
  assert.equal(local.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:4190');
  assert.equal((await f.send({ action: 'status' }, { origin: 'http://localhost.evil.example' })).status, 403);
});
