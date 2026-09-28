/**
 * authView.js — Authentication & Role Switcher
 * Login/Signup card with 1-click test personas.
 */

import { h, $, notify } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export function renderAuth(container, mode = 'login') {
  const isLogin = mode === 'login';

  container.innerHTML = `
<section class="view enter" id="v-auth">
  <div style="max-width:440px;margin:0 auto 16px;display:flex;justify-content:flex-start">
    <a href="#/" class="btn ghost sm" style="display:inline-flex;align-items:center;gap:6px">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      &larr; Back to Home
    </a>
  </div>

  <div class="vh" style="text-align:center">
    <h2 class="vt">${isLogin ? 'Sign in' : 'Create account'}</h2>
    <p class="vs" style="margin:6px auto 0">Organizers, judges and participants sign in here. Anyone can browse the gallery without an account.</p>
  </div>

  <div class="card authcard">
    <form id="authForm">
      ${!isLogin ? `
        <div class="fld">
          <label for="authUsername">Username *</label>
          <input id="authUsername" type="text" placeholder="alexrivera" required autocomplete="username">
        </div>

        <div class="fld">
          <label for="authEmail">Email *</label>
          <input id="authEmail" type="email" placeholder="alex@example.com" required autocomplete="email">
        </div>
      ` : `
        <div class="fld">
          <label for="authUser">Email or Username *</label>
          <input id="authUser" type="text" placeholder="organizer@dogfood.local or organizer" required autocomplete="username">
        </div>
      `}

      <div class="fld">
        <label for="authPass">Password *</label>
        <input id="authPass" type="password" placeholder="••••••••" required autocomplete="${isLogin ? 'current-password' : 'new-password'}">
      </div>

      ${!isLogin ? `
        <div style="font-size:0.84rem;color:var(--mute);margin:10px 0 16px;line-height:1.5">
          New accounts start as participants. Event organizers can assign event-specific roles.
        </div>
      ` : ''}

      <p class="autherr" id="authErrorMsg"></p>
      <button class="btn main" id="authSubmitBtn" type="submit" style="width:100%;justify-content:center">
        ${isLogin ? 'Sign in &rarr;' : 'Create account &rarr;'}
      </button>

      <div style="margin-top:18px;text-align:center;font-size:0.92rem;color:var(--mute)">
        ${isLogin ? `Don't have an account? <a href="#/signup" style="color:var(--c);font-weight:700">Sign up</a>` : `Already have an account? <a href="#/login" style="color:var(--c);font-weight:700">Sign in</a>`}
      </div>
    </form>

    <!-- Developer Test Accounts Collapsible Section -->
    <details class="dev-accounts-accordion" style="margin-top:24px;border-top:1px solid var(--line);padding-top:14px">
      <summary style="font-size:0.8rem;font-weight:700;color:var(--mute);cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px">
        <span>🛠️ Developer test accounts (Seeded fast-switch)</span>
      </summary>
      <div class="quick-persona" style="margin-top:12px">
        <button class="persona-btn" type="button" data-persona="0">
          Devon Vance
          <small>ORGANIZER</small>
        </button>
        <button class="persona-btn" type="button" data-persona="1">
          Dr. Ada Vance
          <small>JUDGE A</small>
        </button>
        <button class="persona-btn" type="button" data-persona="2">
          Prof. Cai Evans
          <small>JUDGE B</small>
        </button>
        <button class="persona-btn" type="button" data-persona="3">
          Alex Rivera
          <small>PARTICIPANT</small>
        </button>
      </div>
    </details>
  </div>
</section>
`;

  const form = document.getElementById('authForm');
  const errEl = document.getElementById('authErrorMsg');
  const btn = document.getElementById('authSubmitBtn');
  const testAccounts = authStore.getTestAccounts();

  document.querySelectorAll('.persona-btn').forEach(b => {
    b.addEventListener('click', async () => {
      const idx = parseInt(b.getAttribute('data-persona'), 10);
      const acc = testAccounts[idx];
      b.disabled = true;
      notify(`Authenticating as ${acc.name}...`);
      
      try {
        await authStore.quickSwitch(acc, api);
        notify(`Signed in as ${acc.name} [${acc.role}]`, 'success');
        const dest = acc.role === 'ORGANIZER' ? '#/dashboard' : acc.role === 'JUDGE' ? '#/judge' : '#/gallery';
        window.location.hash = dest;
      } catch (err) {
        notify(`Failed to sign in as ${acc.name}: ${err.message}`, 'error');
        errEl.textContent = err.message || 'Authentication failed.';
      } finally {
        b.disabled = false;
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    btn.disabled = true;

    try {
      let res;
      let identifier = '';
      if (isLogin) {
        identifier = document.getElementById('authUser').value.trim();
        const password = document.getElementById('authPass').value;
        res = await api.login(identifier, password);
      } else {
        const username = document.getElementById('authUsername').value.trim();
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPass').value;
        identifier = username;
        res = await api.signup({ username, email, password });
      }

      const token = res.token || res.accessToken || res.jwt;
      if (token) {
        const userObj = res.user || {};
        const role = (res.rolesByEvent && Object.values(res.rolesByEvent)[0]) || res.role || 'PARTICIPANT';

        const detectedEventId = res.eventId || (res.rolesByEvent && Object.keys(res.rolesByEvent).length > 0 ? Object.keys(res.rolesByEvent)[0] : null);
        const decoded = authStore.decodeJwt(token);
        const resolvedUserId = userObj.id || (decoded && (decoded.userId || decoded.id)) || null;

        authStore.setSession({
          token,
          role,
          name: userObj.username || identifier,
          username: userObj.username || identifier,
          email: userObj.email || identifier,
          userId: resolvedUserId,
          rolesByEvent: res.rolesByEvent || (detectedEventId ? { [detectedEventId]: role } : {}),
          eventId: detectedEventId
        });

        // Hydrate full profile from /api/auth/me
        try {
          const me = await api.getMe();
          if (me) {
            const meUser = me.user || me;
            const meRole = (me.rolesByEvent && Object.values(me.rolesByEvent)[0]) || role;
            const meEventId = me.eventId || (me.rolesByEvent && Object.keys(me.rolesByEvent).length > 0 ? Object.keys(me.rolesByEvent)[0] : null) || detectedEventId;
            const finalUserId = meUser.id || resolvedUserId || null;
            authStore.setSession({
              token,
              role: meRole,
              name: meUser.username || identifier,
              username: meUser.username || identifier,
              email: meUser.email || identifier,
              userId: finalUserId,
              rolesByEvent: me.rolesByEvent || (meEventId ? { [meEventId]: meRole } : {}),
              eventId: meEventId
            });
          }
        } catch (meErr) {
          console.warn('[auth] getMe warning:', meErr.message);
        }
      }

      const activeRole = authStore.getRole();
      notify(`Welcome back, ${authStore.getUser()?.name || identifier}!`, 'success');

      if (activeRole === 'ORGANIZER') {
        window.location.hash = '#/dashboard';
      } else if (activeRole === 'JUDGE') {
        window.location.hash = '#/judge';
      } else {
        window.location.hash = '#/gallery';
      }
    } catch (err) {
      console.error('[auth] Error:', err);
      errEl.textContent = err.message || 'Authentication failed. Please check your credentials.';
      btn.disabled = false;
    }
  });
}
