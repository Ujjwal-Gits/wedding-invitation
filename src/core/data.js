// Loads the invitation data. With ?id=<slug> it comes from the studio server
// (/api/invitations/<slug>/public); otherwise the demo in src/config.js is used.
// Every theme must `await loadInvitation()` before rendering.
import { config } from '../config.js';

const SLUG = /^[a-z0-9-]{3,64}$/;

export async function loadInvitation() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id || !SLUG.test(id)) return config;
  try {
    const res = await fetch(`/api/invitations/${id}/public`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      for (const key of Object.keys(config)) delete config[key];
      Object.assign(config, data);
    }
  } catch (err) {
    console.warn('Could not load the invitation; showing the demo.', err);
  }
  return config;
}

export { config };
