/**
 * authStore.js — Lightweight Reactive Module Auth Store
 * Handles JWT storage, session hydration, decoded payload caching, and subscription notifications.
 */

const AUTH_KEY = 'dogfood_auth_session';

class AuthStore {
  constructor() {
    this.subscribers = new Set();
    this.session = this.loadSession();
    this.selectedEventId = this.session?.eventId || null;
  }

  loadSession() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.token && !this.isExpired(parsed.token)) {
        return parsed;
      }
      this.clearSession();
      return null;
    } catch {
      return null;
    }
  }

  decodeJwt(token) {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  isExpired(token) {
    const payload = this.decodeJwt(token);
    if (!payload || !payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  }

  getSession() {
    return this.session;
  }

  getUser() {
    if (!this.session) return null;
    return this.session.user || {
      name: this.session.name,
      username: this.session.username || this.session.name,
      email: this.session.email,
      phone: this.session.phone,
      userId: this.session.userId,
      role: this.getRole()
    };
  }

  getPhone() {
    return this.session?.phone || this.session?.user?.phone || null;
  }

  setPhone(phone) {
    if (!this.session) {
      this.session = { role: 'VISITOR', name: 'Visitor Voter', phone };
    } else {
      this.session.phone = phone;
      if (this.session.user) this.session.user.phone = phone;
    }
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(this.session));
    } catch {
      // storage fallback
    }
    this.notify();
  }

  getRole() {
    if (!this.session) return 'GUEST';
    if (this.session.role) return this.session.role;
    if (this.session.rolesByEvent && typeof this.session.rolesByEvent === 'object') {
      const roles = Object.values(this.session.rolesByEvent);
      if (roles.length > 0) return roles[0];
    }
    return 'PARTICIPANT';
  }

  isAdmin() {
    return this.getRole() === 'ADMIN';
  }

  isOrganizer(eventId = null) {
    if (this.isAdmin()) return true;
    if (this.getRole() === 'ORGANIZER') return true;
    const targetEvent = eventId || this.getEventId();
    if (targetEvent && this.session?.rolesByEvent) {
      const role = this.session.rolesByEvent[targetEvent] || this.session.rolesByEvent[String(targetEvent)];
      return role === 'ORGANIZER' || role === 'ADMIN';
    }
    return false;
  }

  isJudge(eventId = null) {
    if (this.isAdmin()) return true;
    if (this.getRole() === 'JUDGE') return true;
    const targetEvent = eventId || this.getEventId();
    if (targetEvent && this.session?.rolesByEvent) {
      const role = this.session.rolesByEvent[targetEvent] || this.session.rolesByEvent[String(targetEvent)];
      return role === 'JUDGE' || role === 'ADMIN';
    }
    return false;
  }

  isParticipant(eventId = null) {
    if (this.isAdmin()) return true;
    if (this.getRole() === 'PARTICIPANT') return true;
    const targetEvent = eventId || this.getEventId();
    if (targetEvent && this.session?.rolesByEvent) {
      const role = this.session.rolesByEvent[targetEvent] || this.session.rolesByEvent[String(targetEvent)];
      return role === 'PARTICIPANT' || role === 'ADMIN';
    }
    return false;
  }

  getToken() {
    return this.session ? this.session.token : null;
  }

  getEventId() {
    if (this.session && this.session.eventId) return this.session.eventId;
    return this.selectedEventId || null;
  }

  setEventId(eventId) {
    const val = eventId ? String(eventId) : null;
    this.selectedEventId = val;
    if (this.session) {
      this.session.eventId = val;
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(this.session));
      } catch {
        // storage error fallback
      }
    }
    this.notify();
  }

  getRolesByEvent() {
    return this.session?.rolesByEvent || {};
  }

  addEventRole(eventId, role = 'PARTICIPANT') {
    if (!this.session) return;
    if (!this.session.rolesByEvent || typeof this.session.rolesByEvent !== 'object') {
      this.session.rolesByEvent = {};
    }
    const strId = String(eventId);
    this.session.rolesByEvent[eventId] = role.toUpperCase();
    this.session.rolesByEvent[strId] = role.toUpperCase();
    if (!this.session.eventId) {
      this.session.eventId = strId;
    }
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(this.session));
    } catch {
      // storage error fallback
    }
    this.notify();
  }

  isRegisteredForEvent(eventId) {
    if (!this.session || !eventId) return false;
    const strId = String(eventId);
    const roles = this.session.rolesByEvent;
    if (!roles || typeof roles !== 'object') return false;
    return Boolean(roles[eventId] || roles[strId]);
  }

  isAuthenticated() {
    return !!(this.session && this.session.token && !this.isExpired(this.session.token));
  }

  setSession(data) {
    let resolvedRole = data.role;
    if (!resolvedRole && data.rolesByEvent && typeof data.rolesByEvent === 'object') {
      resolvedRole = Object.values(data.rolesByEvent)[0];
    }
    if (!resolvedRole) resolvedRole = 'PARTICIPANT';

    const userObj = data.user || {};
    const username = data.username || userObj.username || 'User';
    const email = data.email || userObj.email || '';
    const userId = data.userId || userObj.id || data.id || 'usr-1';

    const detectedEventId = (data.eventId !== undefined) ? data.eventId : (data.rolesByEvent && Object.keys(data.rolesByEvent).length > 0 ? Object.keys(data.rolesByEvent)[0] : null);

    this.session = {
      token: data.token,
      role: resolvedRole.toUpperCase(),
      name: data.name || username,
      username,
      email,
      userId,
      eventId: detectedEventId,
      rolesByEvent: data.rolesByEvent || (detectedEventId ? { [detectedEventId]: resolvedRole.toUpperCase() } : {}),
      user: { id: userId, username, email }
    };
    if (detectedEventId) {
      this.selectedEventId = detectedEventId;
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(this.session));
    this.notify();
  }

  clearSession() {
    this.session = null;
    this.selectedEventId = null;
    localStorage.removeItem(AUTH_KEY);
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.session);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this.session);
      } catch (err) {
        console.error('[authStore] subscriber error:', err);
      }
    }
  }

  // Pre-seeded quick test accounts matching monorepo backend seed personas (DataSeeder)
  getTestAccounts() {
    return [
      { role: 'ORGANIZER', name: 'Organizer', email: 'organizer@dogfood.local', username: 'organizer', password: 'organizer_pass123' },
      { role: 'JUDGE', name: 'Judge A', email: 'judge_a@dogfood.local', username: 'judge_a', password: 'judge_a_pass123' },
      { role: 'JUDGE', name: 'Judge B', email: 'judge_b@dogfood.local', username: 'judge_b', password: 'judge_b_pass123' },
      { role: 'PARTICIPANT', name: 'Participant', email: 'participant@dogfood.local', username: 'participant', password: 'participant_pass123' }
    ];
  }

  async quickSwitch(account, apiInstance) {
    if (!apiInstance) {
      throw new Error('API client is required for authentication');
    }
    const res = await apiInstance.login(account.email, account.password);
    if (!res || !res.token) {
      throw new Error('Authentication response did not contain a valid token');
    }
    const detectedEventId = (res.rolesByEvent && Object.keys(res.rolesByEvent).length > 0) ? Object.keys(res.rolesByEvent)[0] : null;
    const resolvedRole = account.role || (detectedEventId && res.rolesByEvent ? res.rolesByEvent[detectedEventId] : null) || 'VISITOR';
    const decoded = this.decodeJwt(res.token);
    const resolvedUserId = res.user?.id || (decoded && (decoded.userId || decoded.id)) || null;
    this.setSession({
      token: res.token,
      role: resolvedRole,
      name: account.name,
      email: account.email,
      username: account.username,
      userId: resolvedUserId,
      rolesByEvent: res.rolesByEvent || (detectedEventId ? { [detectedEventId]: resolvedRole } : {}),
      eventId: detectedEventId
    });
    return true;
  }
}

export const authStore = new AuthStore();
export default authStore;
