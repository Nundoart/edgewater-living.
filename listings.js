function qualifiesListing(h){try{const u=new URL(h.sourceUrl);return ['zillow.com','www.zillow.com'].includes(u.hostname)&&u.protocol==='https:'&&u.pathname.startsWith('/homedetails/')&&h.builder==='True Homes'&&h.city==='Lancaster'&&h.state==='SC'&&/^Edgewater(?:$| - )/.test(h.community)&&h.status==='Active'&&h.isNewConstruction===true&&(h.reportMatched===true||(h.listingAgent==='Kaylee Wilson'&&h.brokerage==='TLS Realty LLC'&&Number.isInteger(h.yearBuilt)&&h.yearBuilt>=2026))&&Number.isFinite(Date.parse(h.checkedAt))&&Date.now()-Date.parse(h.checkedAt)<48*60*60*1000;}catch{return false}}
// Keep eligibility separate from presentation so inventory checks stay unchanged.
(async () => {
  const grid = document.getElementById('listing-grid');
  const label = document.getElementById('listing-updated');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const money = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
  function listingMedia(home) {
    const media = el('div', 'listing-media');
    const fallback = () => media.replaceChildren(el('span', 'listing-photo-note', 'See listing photos on Zillow'));
    let imageUrl;
    try {
      const url = new URL(home.image);
      if (url.protocol === 'https:' && url.hostname === 'photos.zillowstatic.com') imageUrl = url.href;
    } catch { /* A missing photograph never hides a qualifying home. */ }
    if (imageUrl) {
      const image = el('img');
      image.src = imageUrl;
      image.alt = home.address + ' in Edgewater';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 750;
      image.height = 500;
      image.addEventListener('error', fallback, {once: true});
      media.append(image);
    } else fallback();
    media.append(el('span', 'listing-badge', 'New construction'));
    return media;
  }
  function renderHome(home) {
    const card = el('article', 'listing-card');
    const body = el('div', 'listing-body');
    const title = el('h3', '', home.address);
    body.append(el('span', 'eyebrow orange-text', 'TRUE HOMES' + (home.yearBuilt ? ' · ' + home.yearBuilt : '')), title,
      el('p', 'listing-community', home.community + ' · Lancaster, SC'),
      el('strong', 'listing-price', money.format(home.price)));
    const specs = el('div', 'listing-specs');
    for (const [value, name] of [[home.beds, 'beds'], [home.baths, 'baths'], [home.sqft.toLocaleString(), 'sq ft']]) {
      const stat = el('div');
      stat.append(el('strong', '', value), el('span', '', name));
      specs.append(stat);
    }
    body.append(specs);
    if (home.priceSource) body.append(el('p', 'fine', 'Price source: ' + home.priceSource + (home.reportDate ? ' · ' + home.reportDate : '')));
    const contact = el('a', 'button orange', 'Ask Blake about this home →');
    contact.href = 'mailto:linebergerm01@gmail.com?subject=' + encodeURIComponent('Edgewater home: ' + home.address + (home.mls ? ' (MLS ' + home.mls + ')' : ''));
    contact.setAttribute('aria-label', 'Ask Blake about ' + home.address);
    const attribution = home.sourceAttribution || (home.listingAgent && home.brokerage ? 'Listed by ' + home.listingAgent + ', ' + home.brokerage : 'See Zillow for current listing attribution.');
    const source = el('a', 'listing-source', 'View on Zillow →');
    source.href = home.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener';
    source.setAttribute('aria-label', 'View ' + home.address + ' on Zillow (opens a new tab)');
    body.append(contact, el('p', 'fine', attribution), source);
    card.append(listingMedia(home), body);
    return card;
  }
  try {
    const response = await fetch('/listings.json', {cache: 'no-cache'});
    if (!response.ok) throw Error('load');
    const data = await response.json();
    const age = Date.now() - Date.parse(data.checkedAt);
    if (!Number.isFinite(age) || age > 48 * 60 * 60 * 1000) throw Error('stale');
    const homes = data.listings.filter(qualifiesListing);
    label.textContent = homes.length + ' matching listings · Checked ' + new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York'}).format(new Date(data.checkedAt)) + ' ET';
    grid.replaceChildren(...homes.map(renderHome));
    if (!homes.length) label.textContent += ' · Contact Blake for current options.';
  } catch {
    label.textContent = 'We’re checking available True Homes in Edgewater against Zillow. Contact Blake for current options.';
    const contact = el('a', 'button orange', 'Request available homes →');
    contact.href = 'mailto:linebergerm01@gmail.com?subject=Current%20Edgewater%20TLS%20Realty%20homes';
    grid.replaceChildren(contact);
  }
})();
