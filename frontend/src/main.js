/**
 * main.js — Main Application Entrypoint for Dogfood Full-Stack
 * Initializes app shell, hash router, live health connectivity check, and ambient effects.
 */

import { setupAppShell } from './views/appShell.js';
import { router } from './router/router.js';
import { api } from './api/client.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Setup shell & navigation listeners
  setupAppShell();

  // 2. Initialize router
  router.init();

  // 3. Initial health check
  const healthRes = await api.checkHealth();
  const badge = document.getElementById('healthBadge');
  if (badge) {
    badge.className = `health-badge ${healthRes.ok ? 'online' : 'offline'}`;
    badge.innerHTML = `<i></i><span>${healthRes.ok ? 'Backend Online' : 'Offline Mode'}</span>`;
  }

  // 4. Mouse glow ambient effect
  const amb = document.getElementById('amb');
  if (amb && !window.matchMedia('(pointer: coarse)').matches) {
    let ax = window.innerWidth / 2, ay = window.innerHeight / 2, tx = ax, ty = ay;
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
    }, { passive: true });

    (function loop() {
      ax += (tx - ax) * 0.1;
      ay += (ty - ay) * 0.1;
      amb.style.transform = `translate(${ax}px, ${ay}px)`;
      requestAnimationFrame(loop);
    })();
  }

  // 5. Scroll reveal observer
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
});
