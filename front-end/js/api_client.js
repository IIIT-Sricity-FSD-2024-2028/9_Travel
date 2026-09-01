(function () {
  const API_BASE_URL = window.API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname || 'localhost'}:3000` : 'http://localhost:3000');

  function getSession() {
    try {
      const tabSession = JSON.parse(sessionStorage.getItem('dd_session') || 'null');
      if (tabSession && tabSession.email) return tabSession;
      return JSON.parse(localStorage.getItem('dd_session') || '{}');
    } catch {
      return {};
    }
  }

  function getRoleHeader() {
    const pathname = (typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '');
    const session = getSession();
    const rawRole = String(session.role || session.displayRole || '').toLowerCase().trim();

    if (pathname.includes('/superuser/') || pathname.includes('/superadmin/')) {
      return 'Super User';
    }

    if (rawRole === 'superuser' || rawRole === 'super user' || rawRole === 'super_admin' || rawRole === 'super admin') {
      return 'Super User';
    }
    if (rawRole === 'partner' || rawRole === 'travel partner') {
      return 'Travel Partner';
    }
    if (rawRole === 'vendor') {
      return 'Vendor';
    }
    if (rawRole === 'guide' || rawRole === 'tour guide') {
      return 'Tour Guide';
    }
    if (rawRole === 'support' || rawRole === 'support executive') {
      return 'Support Executive';
    }
    if (rawRole === 'traveler' || rawRole === 'traveller') {
      return 'Traveler';
    }

    return 'Super User';
  }

  async function request(path, options = {}) {
    const session = getSession();
    const authRequest = String(path).startsWith('/auth/');
    const headers = {
      'Content-Type': 'application/json',
      'x-role': getRoleHeader(),
      ...(!authRequest && session.email ? { 'x-user-email': session.email } : {}),
      ...(options.headers || {}),
    };

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    } catch {
      throw new Error('Cannot reach the backend API. Start the NestJS backend on http://localhost:3000.');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
      throw new Error(message || `Request failed: ${response.status}`);
    }
    return payload;
  }

  window.ApiClient = {
    request,
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' }),
  };
})();
