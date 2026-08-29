const API = 'https://api.github.com';
const FILENAME = 'skynet-config.json';
const DESCRIPTION = 'Skynet Chrome Tab - Config Backup';

function headers(token) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

export async function backupToGist(token, appData, existingGistId, resourceSources) {
  const payload = { ...appData };
  if (resourceSources) {
    payload.resourceSources = resourceSources;
  }
  const body = {
    description: DESCRIPTION,
    public: false,
    files: { [FILENAME]: { content: JSON.stringify(payload, null, 2) } },
  };

  const url = existingGistId ? `${API}/gists/${existingGistId}` : `${API}/gists`;
  const method = existingGistId ? 'PATCH' : 'POST';

  const res = await fetch(url, { method, headers: headers(token), body: JSON.stringify(body) });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }

  const gist = await res.json();
  return { id: gist.id, url: gist.html_url };
}

export async function restoreFromGist(token, gistId) {
  const res = await fetch(`${API}/gists/${gistId}`, { headers: headers(token) });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }

  const gist = await res.json();
  const file = gist.files[FILENAME];
  if (!file) {
    throw new Error(`Gist does not contain ${FILENAME}`);
  }

  const data = JSON.parse(file.content);
  if (!data.profiles || !data.activeProfileId) {
    throw new Error('Gist config is not in the expected format');
  }

  const { resourceSources, ...appData } = data;
  return { appData, resourceSources: resourceSources || null };
}
