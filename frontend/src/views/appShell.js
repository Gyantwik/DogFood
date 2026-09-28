import { h, $, $$, notify, escapeHtml } from '../lib/dom.js';
import { authStore } from '../store/authStore.js';
import { api } from '../api/client.js';
import { checkRouteAccess } from '../components/requireRole.js';

let cachedEvents = [];

export function setupAppShell() {
  // Update auth-dependent UI whenever session changes
  authStore.subscribe((session) => {
    updateNavAuthUI(session);
    updateSidebarAuthUI(session);
    updateEventDropdowns(session?.eventId);
    updateMobileNavUI(session);
    updateTopNavLinks(session);
  });

  // Health poll
  setInterval(async () => {
    const res = await api.checkHealth();
    const badge = document.getElementById('healthBadge');
    if (badge) {
      badge.className = `health-badge ${res.ok ? 'online' : 'offline'}`;
      badge.innerHTML = `<i></i><span>${res.ok ? 'API Online' : 'Offline Mode'}</span>`;
    }
  }, 10000);

  // Initialize event selectors
  initEventSelectors();

  // Initialize mobile navigation drawer
  initMobileDrawer();

  // Handle Home link clicks when already at landing
  document.addEventListener('click', (e) => {
    const homeLink = e.target.closest('a[href="#/"], a[data-r="home"]');
    if (homeLink) {
      const hash = window.location.hash || '#/';
      const isLanding = hash === '#/' || hash === '' || hash === '#top';
      if (isLanding) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });
}

export async function refreshEventSelectors(selectEventId = null) {
  await initEventSelectors();
  if (selectEventId) {
    authStore.setEventId(selectEventId);
    updateEventDropdowns(selectEventId);
  }
}

async function initEventSelectors() {
  const desktopSelect = document.getElementById('eventSelectDropdown');
  const mobileSelect = document.getElementById('mobileEventSelect');

  try {
    const res = await api.getEvents();
    cachedEvents = Array.isArray(res) ? res : (res?.data || []);
    
    const populate = (selectEl) => {
      if (!selectEl) return;
      selectEl.innerHTML = '<option value="">Choose a hackathon</option>' +
        cachedEvents.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name || `Event ${e.id}`)}</option>`).join('');
    };

    populate(desktopSelect);
    populate(mobileSelect);

    const activeId = authStore.getEventId();
    updateEventDropdowns(activeId);

    const onSelectChange = (e) => {
      const selectedId = e.target.value || null;
      authStore.setEventId(selectedId);
      updateEventDropdowns(selectedId);
      const evObj = cachedEvents.find(ev => String(ev.id) === String(selectedId));
      notify(selectedId ? `Active event set to: ${evObj?.name || selectedId}` : 'Cleared active event selection', 'info');
      
      // Refresh current route to apply new event context across all in-app routes
      const hash = window.location.hash || '#/';
      const isPublicLanding = hash === '#/' || hash === '' || hash === '#top' || hash.startsWith('#steps') || hash.startsWith('#seats') || hash.startsWith('#lab') || hash.startsWith('#selfhost') || hash.startsWith('#faq') || hash.startsWith('#story') || hash.startsWith('#core') || hash.startsWith('#features') || hash.startsWith('#gallery-section') || hash.startsWith('#end') || hash.startsWith('#community-voting') || hash.startsWith('#verification-hub') || hash.startsWith('#embed-snippet');
      if (!isPublicLanding) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        window.dispatchEvent(new CustomEvent('app:eventChanged', { detail: { eventId: selectedId } }));
      }
      updateMobileNavUI(authStore.getSession());
    };

    desktopSelect?.addEventListener('change', onSelectChange);
    mobileSelect?.addEventListener('change', onSelectChange);
  } catch (err) {
    console.warn('Unable to load events for app shell selector:', err);
  }
}

function updateEventDropdowns(eventId) {
  const desktopSelect = document.getElementById('eventSelectDropdown');
  const mobileSelect = document.getElementById('mobileEventSelect');
  const statusPill = document.getElementById('eventStatusPill');

  const val = eventId ? String(eventId) : '';
  if (desktopSelect) desktopSelect.value = val;
  if (mobileSelect) mobileSelect.value = val;

  if (statusPill) {
    if (eventId) {
      const ev = cachedEvents.find(e => String(e.id) === String(eventId));
      const evStatus = ev?.status || 'Active';
      const isClosed = evStatus.toUpperCase() === 'CLOSED';
      statusPill.style.display = 'inline-flex';
      statusPill.className = isClosed ? 'live-pill closed-pill' : 'live-pill';
      statusPill.innerHTML = `<i></i><span>${escapeHtml(evStatus)}</span>`;
    } else {
      statusPill.style.display = 'none';
    }
  }
}

function initMobileDrawer() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const closeBtn = document.getElementById('mobileNavClose');
  const drawer = document.getElementById('mobileNavDrawer');
  const backdrop = document.getElementById('mobileNavBackdrop');

  function openDrawer() {
    drawer?.classList.add('open');
    backdrop?.classList.add('open');
    drawer?.setAttribute('aria-hidden', 'false');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    closeBtn?.focus();
  }

  function closeDrawer() {
    drawer?.classList.remove('open');
    backdrop?.classList.remove('open');
    drawer?.setAttribute('aria-hidden', 'true');
    toggleBtn?.setAttribute('aria-expanded', 'false');
  }

  toggleBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) {
      closeDrawer();
      toggleBtn?.focus();
    }
  });

  // Close drawer upon clicking any navigation link
  drawer?.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) closeDrawer();
  });
}

function updateMobileNavUI(session) {
  const linksContainer = document.getElementById('mobileNavLinks');
  const footerContainer = document.getElementById('mobileNavFooter');
  if (!linksContainer) return;

  const currentEventId = authStore.getEventId();
  const routes = [
    { label: 'Home', href: '#/', roleReq: null },
    { label: 'Public Gallery', href: '#/gallery', roleReq: null },
    { label: 'My Team', href: '#/teams', roleReq: '#/teams' },
    { label: 'Submit Project', href: '#/submit', roleReq: '#/submit' },
    { label: 'Judge Queue', href: '#/judge', roleReq: '#/judge' },
    { label: 'Organizer Dashboard', href: '#/dashboard', roleReq: '#/dashboard' },
    { label: 'Leaderboard Results', href: '#/results', roleReq: null }
  ];

  if (currentEventId) {
    routes.push({ label: 'Event Details', href: `#/events/${currentEventId}`, roleReq: null });
  }

  linksContainer.innerHTML = routes
    .filter(r => !r.roleReq || checkRouteAccess(r.roleReq).allowed)
    .map(r => `
      <a class="mobile-nav-link" href="${r.href}">
        <span>${escapeHtml(r.label)}</span>
        <span style="color:var(--mute);font-size:0.8rem">&rarr;</span>
      </a>
    `).join('');

  if (footerContainer) {
    if (session && session.token) {
      footerContainer.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <b style="color:#FFF;font-size:0.95rem;display:block">${escapeHtml(session.name)}</b>
            <span class="rolebadge ${session.role}">${session.role}</span>
          </div>
          <button class="btn ghost sm" id="mobileLogoutBtn" type="button">Sign Out</button>
        </div>
      `;
      document.getElementById('mobileLogoutBtn')?.addEventListener('click', () => {
        authStore.clearSession();
        notify('Signed out successfully');
        window.location.hash = '#/';
      });
    } else {
      footerContainer.innerHTML = `
        <a class="btn main sm" href="#/login" style="width:100%;text-align:center;display:block">Sign In / Register</a>
      `;
    }
  }
}

function updateNavAuthUI(session) {
  const authNavBtn = document.getElementById('authNavBtn');
  const userRoleBadge = document.getElementById('navUserRoleBadge');
  if (!authNavBtn) return;

  const isAuth = !!(session && session.token);
  document.body.classList.toggle('authenticated', isAuth);

  if (isAuth) {
    authNavBtn.innerHTML = `<span>Sign Out</span>`;
    authNavBtn.title = `Signed in as ${escapeHtml(session.name || 'User')}`;
    authNavBtn.onclick = () => {
      authStore.clearSession();
      notify('Signed out successfully');
      window.location.hash = '#/';
    };
    if (userRoleBadge) {
      userRoleBadge.textContent = session.role;
      userRoleBadge.className = `rolebadge ${session.role}`;
      userRoleBadge.style.display = 'inline-block';
    }
  } else {
    authNavBtn.innerHTML = `<span>Sign In</span>`;
    authNavBtn.title = '';
    authNavBtn.onclick = () => {
      window.location.hash = '#/login';
    };
    if (userRoleBadge) userRoleBadge.style.display = 'none';
  }
}

function updateSidebarAuthUI(session) {
  const userBox = document.getElementById('userBox');
  if (!userBox) return;

  if (session && session.token) {
    userBox.innerHTML = `
      <b>${escapeHtml(session.name)}</b>
      <span class="rolebadge ${session.role}">${session.role}</span>
      <button class="btn ghost sm" id="sidebarLogoutBtn" type="button" style="margin-top:12px;width:100%">Sign Out</button>
    `;
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
      authStore.clearSession();
      notify('Signed out successfully');
      window.location.hash = '#/';
    });
  } else {
    userBox.innerHTML = `
      <a class="btn main sm" href="#/login" style="width:100%;text-align:center;display:block">Sign In / Register</a>
    `;
  }

  // Role-based sidebar link visibility
  updateSidebarLinks(session);
}

function updateSidebarLinks(session) {
  const role = session?.role || '';
  const sidebarNav = document.querySelector('.side nav');
  if (!sidebarNav) return;

  const links = sidebarNav.querySelectorAll('a[data-r]');
  links.forEach(link => {
    const route = link.getAttribute('data-r');
    switch (route) {
      case 'teams':
      case 'submit':
        // Only participants (and admins) can have teams and submit projects
        link.style.display = (role === 'PARTICIPANT' || role === 'ADMIN' || !role) ? '' : 'none';
        break;
      case 'judge':
        // Only judges (and admins) see the judge queue
        link.style.display = (role === 'JUDGE' || role === 'ADMIN' || !role) ? '' : 'none';
        break;
      case 'dashboard':
        // Only organizers (and admins) see the dashboard
        link.style.display = (role === 'ORGANIZER' || role === 'ADMIN' || !role) ? '' : 'none';
        break;
      default:
        // Gallery, Results — always visible
        link.style.display = '';
        break;
    }
  });
}

function updateTopNavLinks(session) {
  const role = session?.role || '';
  const applinksNav = document.querySelector('.applinks');
  if (!applinksNav) return;

  const links = applinksNav.querySelectorAll('a[data-r]');
  links.forEach(link => {
    const route = link.getAttribute('data-r');
    switch (route) {
      case 'teams':
      case 'submit':
        link.style.display = (role === 'PARTICIPANT' || role === 'ADMIN' || !role) ? '' : 'none';
        break;
      case 'judge':
        link.style.display = (role === 'JUDGE' || role === 'ADMIN' || !role) ? '' : 'none';
        break;
      case 'dashboard':
        link.style.display = (role === 'ORGANIZER' || role === 'ADMIN' || !role) ? '' : 'none';
        break;
      default:
        link.style.display = '';
        break;
    }
  });
}
