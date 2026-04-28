const API_BASE = import.meta.env.VITE_API_BASE_URL;

function readCookie(name) {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function requireApiBase() {
  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL is required');
  }

  return API_BASE.replace(/\/$/, '');
}

async function request(path, { method = 'GET', body, includeCsrf = false, headers = {} } = {}) {
  const base = requireApiBase();
  const mergedHeaders = {
    'X-API-Version': '1',
    ...headers
  };

  if (body !== undefined) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  if (includeCsrf) {
    const csrfToken = readCookie('csrf_token');

    if (csrfToken) {
      mergedHeaders['X-CSRF-Token'] = csrfToken;
    }
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers: mergedHeaders,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    if (contentType.includes('application/json')) {
      const errorBody = await response.json().catch(() => null);
      errorMessage = errorBody?.message || errorMessage;
    }

    throw new Error(errorMessage);
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export function getApiBase() {
  return API_BASE ? API_BASE.replace(/\/$/, '') : '';
}

export function startWebLogin() {
  const base = requireApiBase();
  window.location.assign(`${base}/api/auth/github?mode=web`);
}

export function getCurrentUser() {
  return request('/api/auth/me');
}

export function logoutUser() {
  return request('/api/auth/logout', { method: 'POST', includeCsrf: true });
}

export function refreshSession() {
  return request('/api/auth/refresh', { method: 'POST', includeCsrf: true });
}

export function listProfiles(params = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  return request(`/api/profiles${query.toString() ? `?${query.toString()}` : ''}`);
}

export function searchProfiles(queryText, params = {}) {
  const query = new URLSearchParams({ q: queryText, ...params });
  return request(`/api/profiles/search?${query.toString()}`);
}

export function getProfileById(profileId) {
  return request(`/api/profiles/${profileId}`);
}

export function createProfile(name) {
  return request('/api/profiles', {
    method: 'POST',
    body: { name },
    includeCsrf: true
  });
}

export async function exportProfiles(params = {}) {
  const base = requireApiBase();
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  const response = await fetch(`${base}/api/profiles/export${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
    headers: {
      'X-API-Version': '1'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || 'Failed to export profiles');
  }

  return response.blob();
}
