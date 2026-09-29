/**
 * router.js — Client Hash Router for Dogfood Full-Stack Application
 * Handles:
 * - Hash parsing and parameterized routes (#/events/:id, #/events/:id/submit, #/judge/:assignmentId, etc.)
 * - Automatic view switching between scrollable landing and dedicated app screens
 * - RBAC route guard execution with clear access-denied rendering
 * - Active link updates in sidebar and header
 */

import { renderLanding } from '../views/landingView.js';
import { renderGallery } from '../views/galleryView.js';
import { renderEventDetail } from '../views/eventDetailView.js';
import { renderSubmit } from '../views/submitView.js';
import { renderTeams } from '../views/teamsView.js';
import { renderDashboard } from '../views/dashboardView.js';
import { renderJudge } from '../views/judgeView.js';
import { renderResults } from '../views/resultsView.js';
import { renderAuth } from '../views/authView.js';
import { renderProfile } from '../views/profileView.js';
import { renderSystem } from '../views/systemView.js';
import { renderEmbedGallery } from '../views/embedGalleryView.js';
import { renderVerification } from '../views/verificationView.js';
import { checkRouteAccess, renderAccessDenied, renderChooseEventState } from '../components/requireRole.js';
import { authStore } from '../store/authStore.js';
import { notify } from '../lib/dom.js';

class Router {
  constructor() {
    this.routes = [];
    this.currentHash = null;
    this.landingContainer = null;
    this.appContentContainer = null;
  }

  init() {
    this.landingContainer = document.getElementById('landingContainer');
    this.appContentContainer = document.getElementById('appContent');

    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  async handleRoute() {
    const rawHash = window.location.hash || '#/';
    const normalizedHash = rawHash.split('?')[0];
    this.currentHash = normalizedHash;

    const isPublicLanding = normalizedHash === '#/' || normalizedHash === '' || normalizedHash === '#top' || normalizedHash.startsWith('#steps') || normalizedHash.startsWith('#seats') || normalizedHash.startsWith('#lab') || normalizedHash.startsWith('#selfhost') || normalizedHash.startsWith('#faq') || normalizedHash.startsWith('#story') || normalizedHash.startsWith('#core') || normalizedHash.startsWith('#features') || normalizedHash.startsWith('#gallery') || normalizedHash.startsWith('#community-voting') || normalizedHash.startsWith('#results-preview') || normalizedHash.startsWith('#verification-hub') || normalizedHash.startsWith('#embed-snippet') || normalizedHash.startsWith('#end');

    if (normalizedHash === '#/embed/gallery') {
      document.body.classList.add('embed-mode');
      const qs = rawHash.includes('?') ? rawHash.split('?')[1] : '';
      const params = new URLSearchParams(qs);
      const evId = params.get('event') || authStore.getEventId() || 1;
      this.appContentContainer.innerHTML = '';
      await renderEmbedGallery(this.appContentContainer, evId);
      return;
    } else {
      document.body.classList.remove('embed-mode');
    }

    if (isPublicLanding) {
      document.body.classList.remove('in-app');
      if (this.landingContainer.children.length === 0) {
        renderLanding(this.landingContainer);
      }
      this.updateActiveNavLinks(normalizedHash);
      if (normalizedHash.startsWith('#') && normalizedHash !== '#/' && normalizedHash !== '#' && normalizedHash !== '#top') {
        const targetId = normalizedHash.replace('#', '');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Switch to Dedicated App Shell mode
    document.body.classList.add('in-app');

    // Sync active event ID if route is parameterized by event (#/events/:id/*)
    const eventPrefixMatch = normalizedHash.match(/^#\/events\/([^/]+)/);
    if (eventPrefixMatch && eventPrefixMatch[1]) {
      authStore.setEventId(eventPrefixMatch[1]);
    }

    // Route Guard check
    const access = checkRouteAccess(normalizedHash);
    if (!access.allowed) {
      if (access.reason === 'UNAUTHENTICATED') {
        notify('Please sign in to access this screen', 'info');
        window.location.hash = '#/login';
        return;
      }
      if (access.reason === 'NO_EVENT_SELECTED') {
        renderChooseEventState(this.appContentContainer, 'Please choose an active event first to access this screen.');
        this.updateActiveNavLinks(normalizedHash);
        return;
      }
      if (access.reason === 'FORBIDDEN') {
        renderAccessDenied(this.appContentContainer, access.requiredRoles);
        this.updateActiveNavLinks(normalizedHash);
        return;
      }
    }

    // Render corresponding view
    this.appContentContainer.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'instant' });

    const eventSubmitMatch = normalizedHash.match(/^#\/events\/([^/]+)\/submit$/);
    const eventTeamsMatch = normalizedHash.match(/^#\/events\/([^/]+)\/teams$/);
    const eventResultsMatch = normalizedHash.match(/^#\/events\/([^/]+)\/results$/);
    const eventDashboardMatch = normalizedHash.match(/^#\/events\/([^/]+)\/dashboard$/);
    const eventGalleryMatch = normalizedHash.match(/^#\/events\/([^/]+)\/gallery$/);
    const eventDetailMatch = normalizedHash.match(/^#\/events\/([^/]+)$/);
    const judgeAssignmentMatch = normalizedHash.match(/^#\/judge\/([^/]+)$/);
    const activeEventId = authStore.getEventId();

    if (normalizedHash === '#/login') {
      renderAuth(this.appContentContainer, 'login');
    } else if (normalizedHash === '#/signup') {
      renderAuth(this.appContentContainer, 'signup');
    } else if (eventGalleryMatch) {
      await renderGallery(this.appContentContainer, eventGalleryMatch[1]);
    } else if (normalizedHash === '#/gallery') {
      await renderGallery(this.appContentContainer, activeEventId);
    } else if (eventSubmitMatch) {
      renderSubmit(this.appContentContainer, eventSubmitMatch[1]);
    } else if (normalizedHash === '#/submit') {
      renderSubmit(this.appContentContainer, activeEventId);
    } else if (eventTeamsMatch) {
      await renderTeams(this.appContentContainer, eventTeamsMatch[1]);
    } else if (normalizedHash === '#/teams') {
      await renderTeams(this.appContentContainer, activeEventId);
    } else if (eventResultsMatch) {
      await renderResults(this.appContentContainer, eventResultsMatch[1]);
    } else if (eventDashboardMatch) {
      await renderDashboard(this.appContentContainer, eventDashboardMatch[1]);
    } else if (eventDetailMatch) {
      await renderEventDetail(this.appContentContainer, eventDetailMatch[1]);
    } else if (normalizedHash === '#/dashboard') {
      await renderDashboard(this.appContentContainer, activeEventId);
    } else if (judgeAssignmentMatch) {
      await renderJudge(this.appContentContainer, judgeAssignmentMatch[1]);
    } else if (normalizedHash === '#/judge') {
      await renderJudge(this.appContentContainer, null);
    } else if (normalizedHash === '#/results') {
      await renderResults(this.appContentContainer, activeEventId);
    } else if (normalizedHash === '#/profile') {
      await renderProfile(this.appContentContainer, activeEventId);
    } else if (normalizedHash === '#/system') {
      renderSystem(this.appContentContainer);
    } else if (normalizedHash === '#/verify' || normalizedHash.startsWith('#/verify')) {
      await renderVerification(this.appContentContainer);
    } else {
      // Default fallback
      await renderGallery(this.appContentContainer, activeEventId);
    }

    this.updateActiveNavLinks(normalizedHash);
  }

  updateActiveNavLinks(hash) {
    document.querySelectorAll('.side a[data-r], .applinks a[data-r]').forEach(link => {
      const routeKey = link.getAttribute('data-r');
      let isCurrent = false;
      if (routeKey === 'home') {
        isCurrent = hash === '#/' || hash === '' || hash === '#top' || hash.startsWith('#steps') || hash.startsWith('#seats') || hash.startsWith('#lab') || hash.startsWith('#selfhost') || hash.startsWith('#faq');
      } else {
        isCurrent = hash.includes(routeKey);
      }
      link.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });
  }
}

export const router = new Router();
export default router;
