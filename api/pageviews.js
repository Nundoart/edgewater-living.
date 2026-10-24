// A separate Edgewater namespace: never import another site's or historical counts.
const KEY = 'edgewater-living.vercel.app/pageviews-since-2026-10-24-71ca4f93';
const SINCE = '2026-10-24';
const ORIGIN = 'https://edgewater-living.vercel.app';

module.exports = async function pageviews(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Preview deployments and cross-site requests must never increment production.
  if (req.method === 'POST' &&
      (req.headers.host !== new URL(ORIGIN).host || req.headers.origin !== ORIGIN ||
       (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'))) {
    return res.status(403).json({ error: 'Counting is restricted to the public site' });
  }
  try {
    // No retries: a timeout may occur after the provider has recorded the view.
    const options = {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000)
    };
    if (req.method === 'POST') {
      const recorded = await fetch(`https://hits.sh/${KEY}.svg`, options);
      if (!recorded.ok) throw new Error('Counter unavailable');
      await recorded.text();
    }
    const response = await fetch(`https://hits.sh/api/urns/${KEY}`, options);
    if (!response.ok) throw new Error('Counter unavailable');
    const count = (await response.json()).total;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid count');
    return res.status(200).json({ count, since: SINCE, metric: 'pageviews' });
  } catch {
    return res.status(503).json({ count: null, since: SINCE, error: 'Counter unavailable' });
  }
};
