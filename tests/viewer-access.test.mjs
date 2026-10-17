import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = process.env.CINEMA_TEST_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.CINEMA_TEST_PUBLISHABLE_KEY;
const admin = process.env.CINEMA_TEST_ADMIN_JWT;
const viewer = process.env.CINEMA_TEST_VIEWER_JWT;

test('live viewer access: guests browse public videos; account libraries and administration remain private', {
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
    assert.deepEqual(await anonymous.json(), [{ id, title: 'Viewer access integration fixture' }], 'Guest can browse published titles');
    assert.ok((await sign(undefined)).ok, 'Guest can create signed links for published media');
    const publicRead = await api(`/storage/v1/object/public/cinema-media/${imagePath}`, undefined);
    assert.ok(publicRead.status >= 400, 'Bucket remains private');

    const visible = await api(`${route}&select=id`, viewer);
    assert.ok(visible.ok);
    assert.deepEqual(await visible.json(), [{ id }]);
    assert.ok((await sign(viewer)).ok, 'Confirmed viewer can sign published media');
    assert.equal(await (await json('/rest/v1/rpc/cinema_admin_access', viewer, 'POST', {})).json(), false, 'Viewer is not administrator');
    assert.ok((await api('/rest/v1/cinema_admins?select=email', viewer)).status >= 400, 'Viewer cannot read the allowlist');
    assert.ok((await json('/rest/v1/cinema_admins', viewer, 'POST', { email: 'unauthorised-viewer@example.invalid' })).status >= 400, 'Viewer cannot promote an account');
    for (const token of [undefined, viewer]) {
      await rejectedOrNoRows(await json(route, token, 'PATCH', { status: 'draft' }), 'Guest or viewer cannot change publication state');
      await rejectedOrNoRows(await api(route, token, { method: 'DELETE', headers: { Prefer: 'return=representation' } }), 'Guest or viewer cannot delete published videos');
    }
    assert.ok((await api('/rest/v1/cinema_libraries?select=user_id', undefined)).status >= 400, 'Guest has no account library privileges');
    const identity = await (await api('/auth/v1/user', viewer)).json();
    assert.ok(identity.id, 'Viewer has a real authenticated identity');
    const libraries = await api('/rest/v1/cinema_libraries?select=user_id', viewer);
    assert.ok(libraries.ok);
    const ownLibraries = await libraries.json();
    assert.ok(Array.isArray(ownLibraries) && ownLibraries.every(row => row.user_id === identity.id), 'Viewer cannot discover other account libraries');

    assert.ok((await json(route, admin, 'PATCH', { status: 'draft' })).ok);
    assert.deepEqual(await (await api(`${route}&select=id`, undefined)).json(), [], 'Guest cannot read drafts');
    assert.ok((await sign(undefined)).status >= 400, 'Guest cannot sign draft media');
    assert.deepEqual(await (await api(`${route}&select=id`, viewer)).json(), [], 'Viewer cannot read drafts');
    assert.ok((await sign(viewer)).status >= 400, 'Viewer cannot sign draft media');
    assert.deepEqual(await (await api(`${route}&select=id`, admin)).json(), [{ id }], 'Admin still reads drafts');
    assert.ok((await sign(admin)).ok, 'Admin still accesses private draft media');
  } finally {
    await api(route, admin, { method: 'DELETE' });
    await json('/storage/v1/object/cinema-media', admin, 'DELETE', { prefixes: [imagePath] });
  }
});
