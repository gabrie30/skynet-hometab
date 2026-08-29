function resolvePath(obj, path) {
  if (!path || path === '$') return obj;
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function interpolate(template, item) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = item[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

function xmlText(el, tagName) {
  const node = el.getElementsByTagName(tagName)[0];
  return node?.textContent?.trim() || '';
}

function xmlAttr(el, tagName, attr) {
  const node = el.getElementsByTagName(tagName)[0];
  return node?.getAttribute(attr) || '';
}

function parseRssFeed(xmlText_) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText_, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Invalid RSS/Atom XML');

  const rssItems = doc.getElementsByTagName('item');
  if (rssItems.length > 0) {
    return Array.from(rssItems).map((item) => ({
      name: xmlText(item, 'title'),
      description: xmlText(item, 'description').replace(/<[^>]*>/g, '').slice(0, 200),
      url: xmlText(item, 'link'),
      pubDate: xmlText(item, 'pubDate'),
    }));
  }

  const atomEntries = doc.getElementsByTagName('entry');
  if (atomEntries.length > 0) {
    return Array.from(atomEntries).map((entry) => ({
      name: xmlText(entry, 'title'),
      description: (xmlText(entry, 'summary') || xmlText(entry, 'content')).replace(/<[^>]*>/g, '').slice(0, 200),
      url: xmlAttr(entry, 'link', 'href') || xmlText(entry, 'link'),
      pubDate: xmlText(entry, 'updated') || xmlText(entry, 'published'),
    }));
  }

  return [];
}

async function fetchRssSource(source) {
  const res = await fetch(source.fetchUrl, { headers: source.headers || {} });
  if (!res.ok) throw new Error(`Feed error: ${res.status}`);
  const text = await res.text();
  return parseRssFeed(text);
}

async function fetchWithPagination(source) {
  const allItems = [];
  let url = source.fetchUrl;
  const pType = source.paginationType || 'none';

  const buildHeaders = () => {
    const h = { ...source.headers };
    if (!h['Content-Type']) h['Content-Type'] = 'application/json';
    return h;
  };

  if (pType === 'none') {
    const res = await fetch(url, { headers: buildHeaders() });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const items = resolvePath(data, source.resultPath);
    if (Array.isArray(items)) allItems.push(...items);
    return allItems;
  }

  if (pType === 'link-header') {
    let nextUrl = url;
    while (nextUrl) {
      const res = await fetch(nextUrl, { headers: buildHeaders() });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const items = resolvePath(data, source.resultPath);
      if (Array.isArray(items)) allItems.push(...items);
      nextUrl = parseNextLink(res.headers.get('Link'));
    }
    return allItems;
  }

  if (pType === 'offset') {
    let offset = 0;
    const limit = 100;
    const sep = url.includes('?') ? '&' : '?';
    while (true) {
      const pageUrl = `${url}${sep}offset=${offset}&limit=${limit}`;
      const res = await fetch(pageUrl, { headers: buildHeaders() });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const items = resolvePath(data, source.resultPath);
      if (!Array.isArray(items) || items.length === 0) break;
      allItems.push(...items);
      if (items.length < limit) break;
      offset += limit;
    }
    return allItems;
  }

  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const items = resolvePath(data, source.resultPath);
  if (Array.isArray(items)) allItems.push(...items);
  return allItems;
}

export async function fetchGenericSource(source) {
  if (source.sourceFormat === 'rss') {
    return fetchRssSource(source);
  }

  const rawItems = await fetchWithPagination(source);

  return rawItems.map((item) => ({
    name: item[source.nameField] || JSON.stringify(item).slice(0, 60),
    description: source.descriptionField ? (item[source.descriptionField] || '') : '',
    url: source.urlTemplate ? interpolate(source.urlTemplate, item) : '',
  }));
}
