const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

function authorized(request, env) {
  const supplied = request.headers.get('X-Sync-Key') || '';
  return !!env.SYNC_KEY && supplied === env.SYNC_KEY;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/sync') return env.ASSETS.fetch(request);
    if (!authorized(request, env)) return json({ error: '同期キーが違います' }, 401);

    if (request.method === 'GET') {
      const row = await env.DB.prepare('SELECT revision, payload, updated_at FROM app_state WHERE id = ?')
        .bind('main').first();
      if (!row) return json({ exists: false, revision: 0, payload: null, updatedAt: null });
      return json({ exists: true, revision: row.revision, payload: JSON.parse(row.payload), updatedAt: row.updated_at });
    }

    if (request.method === 'PUT') {
      let body;
      try { body = await request.json(); } catch (_) { return json({ error: 'JSON形式が不正です' }, 400); }
      const expected = Number(body.expectedRevision);
      if (!Number.isInteger(expected) || expected < 0 || !body.payload) return json({ error: '保存データが不正です' }, 400);
      const payload = JSON.stringify(body.payload);
      const updatedAt = new Date().toISOString();

      if (expected === 0) {
        const inserted = await env.DB.prepare(
          'INSERT INTO app_state (id, revision, payload, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(id) DO NOTHING'
        ).bind('main', payload, updatedAt).run();
        if (inserted.meta.changes === 1) return json({ revision: 1, updatedAt });
      }

      const updated = await env.DB.prepare(
        'UPDATE app_state SET revision = revision + 1, payload = ?, updated_at = ? WHERE id = ? AND revision = ?'
      ).bind(payload, updatedAt, 'main', expected).run();
      if (updated.meta.changes !== 1) {
        const current = await env.DB.prepare('SELECT revision, updated_at FROM app_state WHERE id = ?').bind('main').first();
        return json({ error: '別の端末で更新されています', revision: current ? current.revision : 0, updatedAt: current ? current.updated_at : null }, 409);
      }
      return json({ revision: expected + 1, updatedAt });
    }

    return json({ error: 'Method Not Allowed' }, 405);
  }
};
