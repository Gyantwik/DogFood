/**
 * dom.js — Lightweight declarative DOM creation & manipulation helper
 * Pure vanilla helper without heavy framework overhead
 */

export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

/**
 * Escapes HTML characters in untrusted strings to prevent XSS.
 * @param {any} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates and sanitizes a URL to ensure safe protocols (http, https, /, #).
 * Rejects javascript:, data:, and other dangerous schemes.
 * @param {string} url
 * @returns {string}
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return '#';
}


/**
 * Creates a DOM Element with attributes, event listeners, and children
 * @param {string} tag
 * @param {Object} [props={}]
 * @param {Array<HTMLElement|string>|HTMLElement|string} [children=[]]
 * @returns {HTMLElement}
 */
export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'className' || key === 'class') {
        el.className = value;
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.assign(el.dataset, value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, value);
      } else if (key === 'html') {
        el.innerHTML = value;
      } else if (key === 'text') {
        el.textContent = value;
      } else if (typeof value === 'boolean') {
        if (value) el.setAttribute(key, '');
        else el.removeAttribute(key);
      } else if (value != null) {
        el.setAttribute(key, value);
      }
    }
  }

  const childList = Array.isArray(children) ? children : [children];
  for (const child of childList) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

/**
 * Animated UI notification toast
 */
let toastTimeout;
export function notify(message, type = 'info') {
  let toastEl = document.getElementById('toast2');
  if (!toastEl) {
    toastEl = h('div', { id: 'toast2', className: 'toast2', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(toastEl);
  }
  
  toastEl.textContent = message;
  toastEl.className = `toast2 show ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2800);
}

/**
 * Animated number counter helper
 */
export function countUp(el) {
  const to = parseFloat(el.getAttribute('data-count') || el.textContent);
  if (isNaN(to)) return;
  const dec = parseInt(el.getAttribute('data-dec') || '0', 10);
  const suf = el.getAttribute('data-suf') || '';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const format = (v) => v.toLocaleString(undefined, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  }) + suf;

  if (prefersReduced) {
    el.textContent = format(to);
    return;
  }

  const t0 = performance.now();
  const duration = 1500;
  function tick(now) {
    const q = Math.max(0, Math.min(1, (now - t0) / duration));
    const easeOutCubic = 1 - Math.pow(1 - q, 3);
    el.textContent = format(to * easeOutCubic);
    if (q < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Formats an ISO date-time string into a human-readable localized string
 * @param {string|Date} isoString
 * @returns {string}
 */
export function formatDateTime(isoString) {
  if (!isoString) return 'Not configured';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(isoString);
  }
}
