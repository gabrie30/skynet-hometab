function headers(token, baseUrl) {
  const h = {
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
  if (token) h.Authorization = `token ${token}`;
  if (baseUrl && !baseUrl.includes('api.github.com')) {
    h['X-GitHub-Api-Version'] = '2022-11-28';
  }
  return h;
}

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function fetchAllPages(url, token, baseUrl, onPage) {
  const items = [];
  let nextUrl = url;
  let page = 0;

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers: headers(token, baseUrl) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error: ${res.status}`);
    }
    const data = await res.json();
    items.push(...data);
    page++;
    if (onPage) onPage({ page, itemsSoFar: items.length });
    nextUrl = parseNextLink(res.headers.get('Link'));
  }

  return items;
}

function normalizeRepo(repo) {
  return {
    name: repo.full_name || repo.name,
    description: repo.description || '',
    url: repo.html_url,
    language: repo.language || '',
    archived: !!repo.archived,
    private: !!repo.private,
    stars: repo.stargazers_count || 0,
    updatedAt: repo.updated_at || '',
  };
}

export async function fetchGitHubSource(source, { onPage } = {}) {
  const token = source.token || '';
  const base = (source.baseUrl || 'https://api.github.com').replace(/\/+$/, '');
  const results = [];

  if (source.org) {
    const orgUrl = `${base}/orgs/${encodeURIComponent(source.org)}/repos?per_page=100&sort=updated`;
    const orgRepos = await fetchAllPages(orgUrl, token, base, onPage);
    results.push(...orgRepos);
  }

  if (source.includeUserRepos) {
    const userUrl = `${base}/user/repos?per_page=100&sort=updated&affiliation=owner`;
    const userRepos = await fetchAllPages(userUrl, token, base, onPage);
    const existingUrls = new Set(results.map((r) => r.html_url));
    for (const repo of userRepos) {
      if (!existingUrls.has(repo.html_url)) results.push(repo);
    }
  }

  return results.map(normalizeRepo);
}
