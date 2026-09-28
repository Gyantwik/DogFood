/**
 * requireRole.js — Centralized Route Guard & RBAC Enforcer
 * Distinguishes cleanly between:
 * 1. Unauthenticated (redirects to #/login)
 * 2. Authenticated but unauthorized (shows informative role mismatch screen)
 */

import { authStore } from '../store/authStore.js';
import { h, notify } from '../lib/dom.js';

export const ROUTE_PERMISSIONS = {
  '#/dashboard': ['ORGANIZER', 'ADMIN'],
  '#/events/:id/dashboard': ['ORGANIZER', 'ADMIN'],
  '#/judge': ['JUDGE', 'ADMIN'],
  '#/judge/:assignmentId': ['JUDGE', 'ADMIN'],
  '#/events/:id/submit': ['PARTICIPANT', 'ADMIN'],
  '#/events/:id/teams': ['PARTICIPANT', 'ORGANIZER', 'ADMIN'],
  '#/system': ['ORGANIZER', 'ADMIN']
};

/**
 * Checks if the current user has permission for the given route
 * @param {string} routeHash
 * @returns {{ allowed: boolean, reason?: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NO_EVENT_SELECTED', requiredRoles?: string[] }}
 */
export function checkRouteAccess(routeHash) {
  let matchedRule = null;
  
  for (const [routePattern, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    const regex = new RegExp('^' + routePattern.replace(/:[^\s/]+/g, '([^/]+)') + '$');
    if (regex.test(routeHash)) {
      matchedRule = roles;
      break;
    }
  }

  if (!matchedRule) {
    return { allowed: true };
  }

  if (!authStore.isAuthenticated()) {
    return { allowed: false, reason: 'UNAUTHENTICATED', requiredRoles: matchedRule };
  }

  const session = authStore.getSession();
  const globalRole = authStore.getRole();

  // Extract eventId from route if present (e.g., #/events/2/submit -> eventId '2')
  const eventMatch = routeHash.match(/^#\/events\/([^/]+)/);
  const eventId = eventMatch ? eventMatch[1] : (session?.eventId || null);
  const eventRole = (eventId && session?.rolesByEvent) ? (session.rolesByEvent[eventId] || session.rolesByEvent[String(eventId)]) : null;

  const hasGlobalRole = matchedRule.includes(globalRole);
  const hasEventRole = Boolean(eventRole && matchedRule.includes(eventRole));
  const hasRoleInAnyEvent = session?.rolesByEvent ? Object.values(session.rolesByEvent).some(r => matchedRule.includes(r)) : false;

  if (!hasGlobalRole && !hasEventRole) {
    if (!eventId && hasRoleInAnyEvent) {
      return { allowed: false, reason: 'NO_EVENT_SELECTED', requiredRoles: matchedRule };
    }
    return { allowed: false, reason: 'FORBIDDEN', requiredRoles: matchedRule };
  }

  return { allowed: true };
}

/**
 * Renders the Access Denied screen into the given container
 * @param {HTMLElement} container
 * @param {string[]} requiredRoles
 */
export function renderAccessDenied(container, requiredRoles = []) {
  const currentRole = authStore.getRole();
  const userName = authStore.getUser()?.name || 'User';

  container.innerHTML = '';
  container.appendChild(
    h('section', { className: 'view enter', style: { padding: '40px 0', textAlign: 'center' } }, [
      h('div', { className: 'card', style: { maxWidth: '560px', margin: '0 auto', padding: '40px 30px' } }, [
        h('div', {
          style: {
            width: '64px',
            height: '64px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'rgba(255, 122, 144, 0.15)',
            border: '1px solid rgba(255, 122, 144, 0.4)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--bad)',
            fontSize: '1.8rem'
          },
          html: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'
        }),
        h('h2', { className: 'vt', style: { fontSize: '1.8rem', marginBottom: '8px' } }, 'Access Restricted'),
        h('p', { className: 'vs', style: { margin: '0 auto 20px', maxWidth: '42ch' } }, 
          `You are signed in as ${userName} with role [${currentRole}], but this screen requires role: ${requiredRoles.join(' or ')}.`
        ),
        h('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' } }, [
          h('a', { className: 'btn main sm', href: '#/login', onClick: () => notify('Sign in with a different account') }, 'Switch Account'),
          h('a', { className: 'btn ghost sm', href: '#/gallery' }, 'Back to Gallery')
        ])
      ])
    ])
  );
}

/**
 * Renders a clear choose-event state when a protected generic route has no selected event
 * @param {HTMLElement} container
 * @param {string} [message]
 */
export function renderChooseEventState(container, message = 'Please choose an event first to access this screen.') {
  container.innerHTML = '';
  container.appendChild(
    h('section', { className: 'view enter', style: { padding: '40px 0', textAlign: 'center' } }, [
      h('div', { className: 'card', style: { maxWidth: '560px', margin: '0 auto', padding: '40px 30px' } }, [
        h('div', { style: { fontSize: '2.8rem', marginBottom: '12px' } }, '🎯'),
        h('h2', { className: 'vt', style: { fontSize: '1.8rem', marginBottom: '8px' } }, 'Please choose an event first'),
        h('p', { className: 'vs', style: { margin: '0 auto 20px', maxWidth: '42ch' } }, message),
        h('a', { className: 'btn main sm', href: '#/gallery' }, 'Browse Active Events \u2192')
      ])
    ])
  );
}

