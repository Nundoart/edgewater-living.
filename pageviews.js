(() => {
  const value = document.getElementById('pageview-count');
  if (!value || window.edgewaterPageviewStarted) return;
  window.edgewaterPageviewStarted = true;
  const readOnly = new URLSearchParams(location.search).get('counter') === 'read' ||
    location.origin !== 'https://edgewater-living.vercel.app';
  // One request per document load; fragment navigation and bfcache returns do not add views.
  // No cookies, local storage, visitor IDs, beacon fallback, or automatic retry.
  fetch('/api/pageviews', {
    method: readOnly ? 'GET' : 'POST', cache: 'no-store', credentials: 'omit',
    signal: AbortSignal.timeout(10000)
  }).then(async response => {
    if (!response.ok) throw new Error('Counter unavailable');
    const data = await response.json();
    if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Invalid count');
    value.textContent = data.count.toLocaleString('en-US');
  }).catch(() => { value.textContent = 'Unavailable'; });
})();
