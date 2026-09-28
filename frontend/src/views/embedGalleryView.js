/**
 * embedGalleryView.js — Clean Widget Mode for Embeddable Hackathon Gallery (T4)
 * Minimalist, iframe-friendly, responsive layout without heavy navbars.
 */

import { escapeHtml, sanitizeUrl, notify } from '../lib/dom.js';
import { api } from '../api/client.js';

export async function renderEmbedGallery(container, eventId = 1) {
  const targetEventId = eventId || 1;

  container.innerHTML = `
    <div class="embed-widget" style="padding:16px;max-width:1200px;margin:0 auto;font-family:var(--font);color:var(--text);background:var(--bg)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--line)">
        <div>
          <span class="bdg ok" style="font-size:0.75rem">DOGFOOD WIDGET</span>
          <h2 id="embedEventTitle" style="font-size:1.3rem;margin:4px 0 0">Hackathon Project Showcase</h2>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="search" id="embedSearch" placeholder="Search projects..." style="height:36px;border-radius:8px;border:1px solid var(--line);background:var(--glass2);color:var(--text);padding:0 10px;font-size:0.85rem" />
          <select id="embedTrack" style="height:36px;border-radius:8px;border:1px solid var(--line);background:var(--glass2);color:var(--text);padding:0 8px;font-size:0.85rem">
            <option value="All">All Tracks</option>
          </select>
        </div>
      </div>

      <div id="embedGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
        <div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--mute)">Loading projects...</div>
      </div>

      <!-- Detail Modal -->
      <div id="embedModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:9999;align-items:center;justify-content:center;padding:16px">
        <div id="embedModalCard" class="card" style="max-width:650px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;position:relative">
          <!-- Content populated dynamically -->
        </div>
      </div>
    </div>
  `;

  const grid = document.getElementById('embedGrid');
  const searchInput = document.getElementById('embedSearch');
  const trackSelect = document.getElementById('embedTrack');
  const titleEl = document.getElementById('embedEventTitle');
  const modal = document.getElementById('embedModal');
  const modalCard = document.getElementById('embedModalCard');

  let allProjects = [];

  try {
    const eventRes = await api.getEvent(targetEventId);
    if (eventRes && eventRes.name) {
      titleEl.textContent = eventRes.name;
    }
  } catch (ignored) {}

  try {
    const res = await api.getSubmissions(targetEventId);
    allProjects = Array.isArray(res) ? res : (res?.data || []);

    // Populate track filter
    const tracks = new Set();
    allProjects.forEach(p => { if (p.track) tracks.add(p.track); });
    tracks.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      trackSelect.appendChild(opt);
    });

    renderCards();
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--bad)">Failed to load projects: ${escapeHtml(err.message)}</div>`;
  }

  function renderCards() {
    const q = (searchInput?.value || '').toLowerCase().trim();
    const track = trackSelect?.value || 'All';

    const filtered = allProjects.filter(p => {
      const matchTrack = track === 'All' || p.track === track;
      const matchQ = !q || (p.title || '').toLowerCase().includes(q) || (p.tagline || '').toLowerCase().includes(q);
      return matchTrack && matchQ;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--mute)">No matching projects found.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => `
      <div class="card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between;border-radius:12px;background:var(--glass2)">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span class="bdg ok" style="font-size:0.7rem">${escapeHtml(p.track || 'General')}</span>
            <span class="bdg" style="font-size:0.7rem;background:rgba(255,255,255,0.06)">${escapeHtml(p.status || 'SUBMITTED')}</span>
          </div>
          <h3 style="font-size:1.1rem;margin-bottom:4px">${escapeHtml(p.title)}</h3>
          <p style="color:var(--c);font-size:0.82rem;font-weight:600;margin-bottom:8px">${escapeHtml(p.tagline || '')}</p>
          <p style="color:var(--mute);font-size:0.8rem;line-height:1.4;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(p.description || '')}</p>
        </div>
        <div style="margin-top:12px">
          <button class="btn ghost sm embed-view-btn" data-pid="${p.id}" style="width:100%">View Details &rarr;</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.embed-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-pid');
        const proj = allProjects.find(item => String(item.id) === String(pid));
        if (proj) openEmbedModal(proj);
      });
    });
  }

  function openEmbedModal(p) {
    const safeDemo = sanitizeUrl(p.demoUrl);
    const safeRepo = sanitizeUrl(p.repoUrl);
    const hasDemo = p.demoUrl && safeDemo !== '#';
    const hasRepo = p.repoUrl && safeRepo !== '#';

    modalCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <span class="bdg ok">${escapeHtml(p.track || 'General')}</span>
          <h2 style="font-size:1.6rem;margin-top:6px">${escapeHtml(p.title)}</h2>
          <p style="color:var(--c);font-weight:600;font-size:0.95rem">${escapeHtml(p.tagline || '')}</p>
        </div>
        <button id="closeEmbedModalBtn" style="padding:4px 10px;border-radius:8px;background:var(--glass);border:1px solid var(--line);cursor:pointer;font-size:1.1rem">&times;</button>
      </div>
      <div style="margin:14px 0">
        <b style="font-size:0.8rem;color:var(--mute);text-transform:uppercase">About</b>
        <p style="color:var(--text);line-height:1.6;font-size:0.92rem;margin-top:4px;white-space:pre-line">${escapeHtml(p.description || '')}</p>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
        ${hasDemo ? `<a class="btn main sm" href="${escapeHtml(safeDemo)}" target="_blank" rel="noopener">Live Demo &rarr;</a>` : ''}
        ${hasRepo ? `<a class="btn ghost sm" href="${escapeHtml(safeRepo)}" target="_blank" rel="noopener">Source Code</a>` : ''}
      </div>
    `;

    modal.style.display = 'flex';
    document.getElementById('closeEmbedModalBtn')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  searchInput?.addEventListener('input', renderCards);
  trackSelect?.addEventListener('change', renderCards);
}
