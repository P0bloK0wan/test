import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Opt-in live integration test. Use a dedicated test project and short-lived
// administrator + ordinary viewer sessions. Never put these values in Git.
const url = process.env.CINEMA_TEST_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.CINEMA_TEST_PUBLISHABLE_KEY;
const admin = process.env.CINEMA_TEST_ADMIN_JWT;
const viewer = process.env.CINEMA_TEST_VIEWER_JWT;

test('live RLS: published catalogue is public; only verified allowlisted admin can publish', {
  skip: !(url && key && admin && viewer) && 'Requires dedicated live project and two temporary test sessions',
}, async () => {
  const id = randomUUID();
  const imagePath = `cover/${id}.png`;
  const videoPath = `video/${id}.mp4`;
  const route = '/rest/v1/cinema_videos';
  async function api(path, token, options = {}) {
    const headers = { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
    return fetch(`${url}${path}`, { ...options, headers });
  }
  async function json(path, token, method, data) {
    return api(path, token, { method, headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(data) });
  }
  const fixture = {
    id, title: 'RLS integration fixture', synopsis: 'Temporary security test',
    video_path: videoPath, image_path: imagePath, status: 'draft',
  };
  const sign = token => json(`/storage/v1/object/sign/cinema-media/${imagePath}`, token, 'POST', { expiresIn: 3600 });
  try {
    assert.equal(await (await api('/rest/v1/rpc/cinema_admin_access', admin, { method: 'POST' })).json(), true);
    assert.equal(await (await api('/rest/v1/rpc/cinema_admin_access', viewer, { method: 'POST' })).json(), false);
    for (const token of [undefined, viewer]) {
      assert.ok((await json(route, token, 'POST', fixture)).status >= 400, 'Unauthorised insertion must fail');
      assert.ok((await api('/rest/v1/cinema_admins?select=email', token)).status >= 400, 'Allowlist is not client-readable');
    }
    const inserted = await json(route, admin, 'POST', fixture);
    assert.equal(inserted.status, 201, 'Verified allowlisted administrator can create a draft');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const objectRoute = `/storage/v1/object/cinema-media/${imagePath}`;
    for (const token of [undefined, viewer]) {
      assert.ok((await api(objectRoute, token, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png })).status >= 400, 'Viewer cannot upload');
    }
    assert.ok((await api(objectRoute, admin, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png })).ok, 'Admin can upload private draft cover');
    for (const token of [undefined, viewer]) {
      assert.deepEqual(await (await api(`${route}?id=eq.${id}&select=id`, token)).json(), [], 'Draft must not be listed');
      assert.ok((await sign(token)).status >= 400, 'Draft media cannot be signed');
      const update = await json(`${route}?id=eq.${id}`, token, 'PATCH', { status: 'published' });
      assert.ok(update.status >= 400 || JSON.stringify(await update.json()) === '[]', 'Viewer cannot publish');
    }
    assert.ok((await json(`${route}?id=eq.${id}`, admin, 'PATCH', { status: 'published' })).ok);
    assert.deepEqual(await (await api(`${route}?id=eq.${id}&select=id,title`, undefined)).json(), [{ id, title: fixture.title }], 'Guest can discover published titles');
    assert.ok((await sign(undefined)).ok, 'Guest can sign published media for playback');
    assert.deepEqual(await (await api(`${route}?id=eq.${id}&select=id`, viewer)).json(), [{ id }]);
    assert.ok((await sign(viewer)).ok, 'Authenticated viewer can sign published cover');
    assert.ok((await json(`${route}?id=eq.${id}`, admin, 'PATCH', { status: 'draft' })).ok);
    assert.ok((await sign(undefined)).status >= 400, 'Unpublishing prevents new guest signatures');
    assert.deepEqual(await (await api(`${route}?id=eq.${id}&select=id`, undefined)).json(), [], 'Unpublished title is hidden from guests');
    assert.ok((await sign(viewer)).status >= 400, 'Unpublishing prevents new viewer signatures');
    assert.deepEqual(await (await api(`${route}?id=eq.${id}&select=id`, viewer)).json(), [], 'Unpublished title is hidden from viewers');
    assert.ok((await sign(admin)).ok, 'Admin retains draft access');
  } finally {
    await api(`${route}?id=eq.${id}`, admin, { method: 'DELETE' });
    await json('/storage/v1/object/cinema-media', admin, 'DELETE', { prefixes: [imagePath, videoPath] });
  }
});
