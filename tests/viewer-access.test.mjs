import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = process.env.CINEMA_TEST_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.CINEMA_TEST_PUBLISHABLE_KEY;
const admin = process.env.CINEMA_TEST_ADMIN_JWT;
const viewer = process.env.CINEMA_TEST_VIEWER_JWT;

test('live viewer access: login required for published catalogue and media; signup grants no administration', {
  skip: !(url && key && admin && viewer) && 'Requires dedicated live project and two temporary confirmed sessions',
}, async () => {
  const id = randomUUID();
  const imagePath = `cover/${id}.png`;
  const route = `/rest/v1/cinema_videos?id=eq.${id}`;
  async function api(path, token, { body, headers, ...options } = {}) {
    return fetch(`${url}${path}`, {
      ...options,
      headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      ...(body === undefined ? {} : { body }),
    });
  }
  const json = (path, token, method, body) => api(path, token, { method, headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body) });
  const sign = token => json(`/storage/v1/object/sign/cinema-media/${imagePath}`, token, 'POST', { expiresIn: 60 });
  const rejectedOrNoRows = async (response, message) => {
    assert.ok(response.status >= 400 || JSON.stringify(await response.json()) === '[]', message);
  };
  try {
    const inserted = await json('/rest/v1/cinema_videos', admin, 'POST', {
      id, title: 'Viewer access integration fixture',
      video_path: `video/${id}.mp4`, image_path: imagePath, status: 'published',
    });
    assert.equal(inserted.status, 201, 'Admin can publish the temporary fixture');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const uploaded = await api(`/storage/v1/object/cinema-media/${imagePath}`, admin, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png });
    assert.ok(uploaded.ok, 'Admin can upload the fixture cover');

    const anonymous = await api(`${route}&select=id,title`, undefined);
    assert.ok(anonymous.ok);
    assert.deepEqual(await anonymous.json(), [], 'Anon must not receive published titles');
    assert.ok((await sign(undefined)).status >= 400, 'Anon cannot create signed links for published media');
    const publicRead = await api(`/storage/v1/object/public/cinema-media/${imagePath}`, undefined);
    assert.ok(publicRead.status >= 400, 'Bucket remains private');

    const visible = await api(`${route}&select=id`, viewer);
    assert.ok(visible.ok);
    assert.deepEqual(await visible.json(), [{ id }]);
    assert.ok((await sign(viewer)).ok, 'Confirmed viewer can sign published media');
    assert.equal(await (await json('/rest/v1/rpc/cinema_admin_access', viewer, 'POST', {})).json(), false, 'Viewer is not administrator');
    assert.ok((await api('/rest/v1/cinema_admins?select=email', viewer)).status >= 400, 'Viewer cannot read the allowlist');
    assert.ok((await json('/rest/v1/cinema_admins', viewer, 'POST', { email: 'unauthorised-viewer@example.invalid' })).status >= 400, 'Viewer cannot promote an account');
    await rejectedOrNoRows(await json(route, viewer, 'PATCH', { status: 'draft' }), 'Viewer cannot change publication state');
    await rejectedOrNoRows(await api(route, viewer, { method: 'DELETE', headers: { Prefer: 'return=representation' } }), 'Viewer cannot delete published videos');

    assert.ok((await json(route, admin, 'PATCH', { status: 'draft' })).ok);
    assert.deepEqual(await (await api(`${route}&select=id`, viewer)).json(), [], 'Viewer cannot read drafts');
    assert.ok((await sign(viewer)).status >= 400, 'Viewer cannot sign draft media');
    assert.deepEqual(await (await api(`${route}&select=id`, admin)).json(), [{ id }], 'Admin still reads drafts');
    assert.ok((await sign(admin)).ok, 'Admin still accesses private draft media');
  } finally {
    await api(route, admin, { method: 'DELETE' });
    await json('/storage/v1/object/cinema-media', admin, 'DELETE', { prefixes: [imagePath] });
  }
});
