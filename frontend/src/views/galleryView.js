/**
 * galleryView.js — Master Public Project Gallery View
 * High-polish cards with hover lifts, gradient banners, real-time search, and detail modal.
 * Connects directly to real backend submissions and honest error/empty states.
 */

import { h, $, $$, notify, escapeHtml, sanitizeUrl } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export async function renderGallery(container, eventId = null) {
  if (!eventId) {
    container.innerHTML = `
<section class="view enter" id="v-gallery-discovery">
  <div class="vh row">
    <div>
      <h2 class="vt">Hackathon Events</h2>
      <p class="vs">Select an event below to view its project gallery.</p>
    </div>
    <div>
      <a class="btn ghost sm" href="#/" style="display:inline-flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        &larr; Home
      </a>
    </div>
  </div>
  <div id="eventsDiscoveryGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-top:24px">
    <div class="card" style="text-align:center;padding:40px;color:var(--mute)">
      Discovering active events...
    </div>
  </div>
</section>
`;
    const grid = document.getElementById('eventsDiscoveryGrid');
    try {
      const res = await api.getEvents();
      const events = Array.isArray(res) ? res : (res?.data || []);
      if (events.length > 0) {
        grid.innerHTML = events.map(evt => {
          const isReg = authStore.isRegisteredForEvent(evt.id);
          const isSelected = String(authStore.getEventId()) === String(evt.id);
          return `
          <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;padding:24px;border-color:${isSelected ? 'rgba(55,224,255,0.4)' : 'var(--line)'}">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                <span class="bdg ${evt.status === 'CLOSED' ? 'bad' : 'ok'}">${escapeHtml(evt.status || 'ACTIVE')}</span>
                ${isReg ? '<span class="bdg ok" style="font-size:0.75rem">&#10003; Registered</span>' : ''}
              </div>
              <h3 style="font-size:1.4rem;margin:10px 0 6px">${escapeHtml(evt.name)}</h3>
              <p style="color:var(--mute);font-size:0.92rem;line-height:1.5">${escapeHtml(evt.description || 'Join and view submissions for this hackathon event.')}</p>
            </div>
            <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
              <a class="btn main sm" href="#/events/${evt.id}/gallery">View Gallery &rarr;</a>
              <a class="btn ghost sm" href="#/events/${evt.id}">Details</a>
              ${!isReg && authStore.isAuthenticated() ? `<button class="btn ghost sm btn-quick-reg" data-event-id="${escapeHtml(evt.id)}" data-event-name="${escapeHtml(evt.name)}" type="button" style="border-color:var(--m);color:var(--m)">Register</button>` : ''}
            </div>
          </div>
        `;
        }).join('');

        grid.querySelectorAll('.btn-quick-reg').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const evId = e.currentTarget.getAttribute('data-event-id');
            const evName = e.currentTarget.getAttribute('data-event-name');
            btn.disabled = true;
            btn.textContent = 'Registering...';
            try {
              await api.registerForEvent(evId);
              authStore.addEventRole(evId, 'PARTICIPANT');
              notify(`Registered for ${evName}!`, 'success');
              await renderGallery(container, null);
            } catch (err) {
              notify(`Registration error: ${err.message}`, 'error');
              btn.disabled = false;
              btn.textContent = 'Register';
            }
          });
        });
      } else {
        grid.innerHTML = `
          <div class="card" style="grid-column:1/-1;text-align:center;padding:50px 20px">
            <h3>No events found</h3>
            <p style="color:var(--mute);margin-top:8px">No hackathon events are currently active.</p>
          </div>
        `;
      }
    } catch (err) {
      grid.innerHTML = `
        <div class="card" style="grid-column:1/-1;text-align:center;padding:48px 20px;border:1px solid rgba(255,122,144,0.3)">
          <h3 style="color:var(--bad)">Unable to discover events</h3>
          <p style="color:var(--mute);margin:8px 0">${err.message}</p>
        </div>
      `;
    }
    return;
  }

  container.innerHTML = `
<section class="view enter" id="v-gallery">
  <div class="vh row">
    <div>
      <h2 class="vt">Project gallery</h2>
      <p class="vs">Every submission from the event, open to the public.</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <a class="btn ghost sm" href="#/" style="display:inline-flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        &larr; Home
      </a>
      <a class="btn main sm" href="#/events/${eventId}/submit">+ Submit project</a>
    </div>
  </div>

  <div class="gbar">
    <div class="gsearch">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="gq" type="search" placeholder="Search projects, teams or tech stack..." aria-label="Search projects" autocomplete="off">
    </div>
    <select id="gtrackSelect" style="height:46px;border-radius:14px;border:1px solid var(--line);background:var(--glass);color:var(--text);padding:0 16px;font-weight:600">
      <option value="All">All tracks</option>
    </select>
    <select id="gsortSelect" style="height:46px;border-radius:14px;border:1px solid var(--line);background:var(--glass);color:var(--text);padding:0 16px;font-weight:600">
      <option value="top">Top scored / Ranked</option>
      <option value="new">Newest first</option>
      <option value="name">Alphabetical</option>
    </select>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;color:var(--mute);font-size:.94rem">
    <span id="gcount">Loading projects from backend...</span>
    <span style="font-size:.82rem;font-weight:600;color:var(--m)">● Live Public Feed</span>
  </div>

  <div class="ggrid" id="ggrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin-top:16px"></div>

  <!-- Project Modal -->
  <div class="modal-backdrop" id="projModal">
    <div class="modal-card" id="projModalCard"></div>
  </div>
</section>
`;

  const ggrid = document.getElementById('ggrid');
  const gq = document.getElementById('gq');
  const gtrackSelect = document.getElementById('gtrackSelect');
  const gsortSelect = document.getElementById('gsortSelect');
  const gcount = document.getElementById('gcount');
  const modal = document.getElementById('projModal');
  const modalCard = document.getElementById('projModalCard');

  let projects = [];

  async function loadProjects() {
    gcount.textContent = 'Loading projects from server...';
    ggrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--mute)">
        Loading project gallery...
      </div>
    `;

    try {
      const remote = await api.getSubmissions(eventId);
      if (Array.isArray(remote)) {
        projects = remote.map((p, i) => {
          let images = [];
          if (Array.isArray(p.galleryImages)) {
            images = p.galleryImages;
          } else if (typeof p.galleryImages === 'string' && p.galleryImages.trim()) {
            try {
              const parsed = JSON.parse(p.galleryImages);
              images = Array.isArray(parsed) ? parsed : [p.galleryImages];
            } catch {
              images = p.galleryImages.split(',').map(s => s.trim()).filter(Boolean);
            }
          }

          let answers = null;
          if (p.customAnswers) {
            if (typeof p.customAnswers === 'string') {
              try {
                answers = JSON.parse(p.customAnswers);
              } catch {
                answers = p.customAnswers;
              }
            } else {
              answers = p.customAnswers;
            }
          }

          return {
            id: p.id || p.submissionId || p.submission_id || p.projectId || `proj-${i}`,
            n: p.title || p.name || 'Untitled Project',
            t: p.tagline || '',
            tr: p.track || 'General',
            te: Array.isArray(p.techStack) ? p.techStack : (Array.isArray(p.tech_stack) ? p.tech_stack : []),
            s: p.avgScore || p.avg_score || p.score || 0.0,
            d: p.description || 'No description provided.',
            repoUrl: p.repoUrl || p.repo_url || '',
            demoUrl: p.demoUrl || p.demo_url || '',
            thumbnailUrl: p.thumbnailUrl || p.thumbnail || '',
            galleryImages: images,
            demoVideoUrl: p.demoVideoUrl || p.videoUrl || '',
            liveLink: p.liveLink || p.liveUrl || '',
            customAnswers: answers,
            teamName: p.teamName || '',
            status: p.status || 'SUBMITTED'
          };
        });
      } else {
        projects = [];
      }

      // Populate dynamic tracks
      const uniqueTracks = Array.from(new Set(projects.map(p => p.tr).filter(Boolean)));
      gtrackSelect.innerHTML = '<option value="All">All tracks</option>' + 
        uniqueTracks.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

      renderList();
    } catch (err) {
      gcount.textContent = 'Error loading projects';
      ggrid.innerHTML = `
        <div class="card" style="grid-column:1/-1;text-align:center;padding:48px 20px;border:1px solid rgba(255,122,144,0.3)">
          <div style="font-size:2.2rem;margin-bottom:10px">⚠️</div>
          <h3 style="font-size:1.4rem;color:var(--bad)">Unable to load gallery</h3>
          <p style="color:var(--mute);margin:8px 0 20px">${escapeHtml(err.message)}</p>
          <button class="btn ghost sm" id="retryGalleryBtn">Retry</button>
        </div>
      `;
      document.getElementById('retryGalleryBtn')?.addEventListener('click', loadProjects);
    }
  }

  function renderList() {
    const q = gq.value.trim().toLowerCase();
    const track = gtrackSelect.value;
    const sort = gsortSelect.value;

    let filtered = projects.filter(p => {
      if (track !== 'All' && p.tr !== track) return false;
      if (q) {
        const full = `${p.n} ${p.t} ${p.d} ${p.te.join(' ')} ${p.teamName || ''}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'top') filtered.sort((a, b) => b.s - a.s);
    else if (sort === 'name') filtered.sort((a, b) => a.n.localeCompare(b.n));

    gcount.textContent = `${filtered.length} of ${projects.length} projects`;
    ggrid.innerHTML = '';

    if (filtered.length === 0) {
      ggrid.innerHTML = `
        <div class="card" style="grid-column:1/-1;text-align:center;padding:56px 20px;border:1px dashed var(--line)">
          <h3 style="font-size:1.5rem">${projects.length === 0 ? 'No submissions yet' : 'No projects match your filter'}</h3>
          <p style="color:var(--mute);margin-top:6px">${projects.length === 0 ? 'Be the first to submit a project to this hackathon!' : 'Try a different search term or clear the filter.'}</p>
          ${projects.length === 0 ? `<a class="btn main sm" href="#/events/${eventId}/submit" style="margin-top:16px">+ Submit project</a>` : ''}
        </div>
      `;
      return;
    }

    filtered.forEach((p) => {
      const card = h('article', {
        className: 'gc',
        onClick: () => openModal(p)
      }, [
        h('div', { className: 'gcv', style: { position: 'relative', overflow: 'hidden', height: '140px', background: 'var(--glass2)' } }, [
          p.thumbnailUrl ? h('img', {
            src: sanitizeUrl(p.thumbnailUrl),
            alt: p.n,
            style: { width: '100%', height: '100%', objectFit: 'cover' },
            onError: (e) => { e.target.style.display = 'none'; }
          }) : h('div', {
            style: {
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(55,224,255,0.15), rgba(157,78,221,0.2))',
              fontSize: '2rem',
              fontWeight: '800',
              fontFamily: 'var(--display)',
              color: 'var(--c)'
            }
          }, p.n.substring(0, 2).toUpperCase()),
          h('span', { className: 'trk', style: { position: 'absolute', top: '10px', left: '10px' } }, p.tr),
          p.s > 0 ? h('span', {
            style: {
              position: 'absolute',
              right: '10px',
              top: '10px',
              padding: '2px 10px',
              borderRadius: '99px',
              background: 'rgba(0,0,0,0.65)',
              fontFamily: 'var(--mono)',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: 'var(--c)',
              border: '1px solid rgba(255,255,255,0.15)'
            }
          }, `★ ${p.s.toFixed(1)}`) : null
        ]),
        h('div', { className: 'gcb', style: { padding: '16px' } }, [
          h('h3', { style: { fontSize: '1.2rem', marginBottom: '4px' } }, p.n),
          h('p', { style: { color: 'var(--c)', fontWeight: '600', fontSize: '0.88rem', marginBottom: '8px' } }, p.t),
          p.d ? h('p', { style: { color: 'var(--mute)', fontSize: '0.82rem', lineHeight: '1.4', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' } }, p.d) : null,
          h('div', { className: 'gt', style: { marginBottom: '12px' } }, (p.te || []).slice(0, 4).map(t => h('span', {}, t))),
          h('button', {
            className: 'btn ghost sm view-proj-btn',
            style: { width: '100%', marginTop: '6px' },
            onClick: (e) => {
              e.stopPropagation();
              openModal(p);
            }
          }, 'View Project →')
        ])
      ]);
      ggrid.appendChild(card);
    });
  }

  function openModal(p) {
    const safeDemo = sanitizeUrl(p.demoUrl);
    const safeLive = sanitizeUrl(p.liveLink);
    const safeVideo = sanitizeUrl(p.demoVideoUrl);
    const safeRepo = sanitizeUrl(p.repoUrl);
    const safeThumb = p.thumbnailUrl ? sanitizeUrl(p.thumbnailUrl) : '';

    const hasLive = (p.liveLink && safeLive !== '#') || (p.demoUrl && safeDemo !== '#');
    const liveTarget = (p.liveLink && safeLive !== '#') ? safeLive : safeDemo;
    const hasVideo = p.demoVideoUrl && safeVideo !== '#';
    const hasRepo = p.repoUrl && safeRepo !== '#';

    // Gallery images
    let galleryHtml = '';
    if (Array.isArray(p.galleryImages) && p.galleryImages.length > 0) {
      const validImgs = p.galleryImages.map(img => sanitizeUrl(img)).filter(u => u !== '#');
      if (validImgs.length > 0) {
        galleryHtml = `
          <div style="margin:16px 0">
            <b style="font-size:.82rem;color:var(--mute);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Project Gallery</b>
            <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px">
              ${validImgs.map(img => `
                <a href="${escapeHtml(img)}" target="_blank" rel="noopener" style="flex:0 0 130px;height:90px;border-radius:10px;overflow:hidden;border:1px solid var(--line);display:block">
                  <img src="${escapeHtml(img)}" alt="Gallery image" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'">
                </a>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    // Custom answers
    let customAnswersHtml = '';
    if (p.customAnswers) {
      let entries = [];
      if (Array.isArray(p.customAnswers)) {
        entries = p.customAnswers.map(item => [item.question || item.prompt || item.key || 'Question', item.answer || item.value || '']);
      } else if (typeof p.customAnswers === 'object') {
        entries = Object.entries(p.customAnswers);
      }
      if (entries.length > 0) {
        customAnswersHtml = `
          <div style="margin:20px 0;padding-top:16px;border-top:1px solid var(--line)">
            <b style="font-size:.82rem;color:var(--mute);display:block;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Project Details & Questions</b>
            <div style="display:grid;gap:10px">
              ${entries.map(([q, a]) => `
                <div style="background:var(--glass2);border:1px solid var(--line);border-radius:10px;padding:12px 14px">
                  <b style="color:var(--c);font-size:0.86rem;display:block;margin-bottom:4px">${escapeHtml(String(q))}</b>
                  <div style="color:var(--text);font-size:0.92rem;line-height:1.5">${escapeHtml(String(a))}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    modalCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
            <span class="bdg ok">${escapeHtml(p.tr)} Track</span>
            ${p.teamName ? `<span class="bdg" style="background:rgba(55,224,255,0.1);color:var(--c)">Team: ${escapeHtml(p.teamName)}</span>` : ''}
            <span class="bdg" style="background:rgba(255,255,255,0.06)">${escapeHtml(p.status || 'SUBMITTED')}</span>
            ${p.s > 0 ? `<span class="bdg" style="background:rgba(255,200,0,0.15);color:#FFD700">★ ${p.s.toFixed(1)}</span>` : ''}
          </div>
          <h2 style="font-size:2.2rem;letter-spacing:-.03em">${escapeHtml(p.n)}</h2>
          <p style="color:var(--c);font-weight:700;margin-top:2px;font-size:1.05rem">${escapeHtml(p.t)}</p>
        </div>
        <button id="closeModalBtn" style="padding:6px 14px;border-radius:10px;background:var(--glass2);font-weight:800;font-size:1.2rem;border:1px solid var(--line);cursor:pointer">&times;</button>
      </div>

      ${safeThumb && safeThumb !== '#' ? `
        <div style="max-height:260px;overflow:hidden;border-radius:12px;margin:12px 0 16px;border:1px solid var(--line);background:#000">
          <img src="${escapeHtml(safeThumb)}" alt="${escapeHtml(p.n)}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}

      ${galleryHtml}

      <div style="margin:16px 0">
        <b style="font-size:.82rem;color:var(--mute);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">About the Project</b>
        <p style="color:var(--text);line-height:1.7;font-size:1rem;white-space:pre-line">${escapeHtml(p.d)}</p>
      </div>

      ${(p.te && p.te.length > 0) ? `
      <div style="margin:18px 0">
        <b style="font-size:.82rem;color:var(--mute);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Tech Stack</b>
        <div class="gt">${p.te.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
      </div>` : ''}

      ${customAnswersHtml}

      <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap">
        ${hasLive ? `<a class="btn main sm" href="${escapeHtml(liveTarget)}" target="_blank" rel="noopener">🌐 Open Live Demo &rarr;</a>` : ''}
        ${hasVideo ? `<a class="btn ghost sm" href="${escapeHtml(safeVideo)}" target="_blank" rel="noopener" style="border-color:var(--p);color:var(--p)">🎬 Hosted Demo Video</a>` : ''}
        ${hasRepo ? `<a class="btn ghost sm" href="${escapeHtml(safeRepo)}" target="_blank" rel="noopener">💻 View Source Repo</a>` : ''}
        <a class="btn ghost sm" href="#/events/${eventId}/submit" style="border-color:var(--c);color:var(--c)">✏️ Edit Details</a>
        <button class="btn ghost sm" id="modalScoreBtn" style="border-color:var(--v)">Score in Judge Queue &rarr;</button>
      </div>

      <!-- T3 Project Comments -->
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--line)" id="commentsSection">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <b style="font-size:.9rem;color:var(--text);display:flex;align-items:center;gap:6px">
            💬 Project Comments & Feedback
            <span class="bdg" id="commentsCountBadge" style="font-size:0.75rem">...</span>
          </b>
        </div>
        
        <form id="addCommentForm" style="background:var(--glass2);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px">
          <div style="display:flex;gap:12px;margin-bottom:10px;flex-wrap:wrap">
            <input type="text" id="commentAuthorInput" placeholder="Your name (defaults to username if signed in)" style="flex:1;min-width:180px;height:40px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 12px;font-size:0.9rem" />
            <button class="btn main sm" type="submit" id="submitCommentBtn">Post Comment &rarr;</button>
          </div>
          <textarea id="commentContentInput" placeholder="Share thoughtful feedback, praise, or questions (1-1000 characters)..." required maxlength="1000" rows="3" style="width:100%;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:10px 12px;font-size:0.9rem;resize:vertical"></textarea>
        </form>

        <div id="commentsList" style="display:flex;flex-direction:column;gap:12px">
          <div style="color:var(--mute);font-size:0.88rem;text-align:center;padding:16px">Loading comments...</div>
        </div>
      </div>
    `;

    modal.classList.add('open');
    document.getElementById('closeModalBtn')?.addEventListener('click', () => modal.classList.remove('open'));
    document.getElementById('modalScoreBtn')?.addEventListener('click', () => {
      modal.classList.remove('open');
      window.location.hash = '#/judge';
    });

    // Load & Render Comments
    async function loadComments() {
      const cList = document.getElementById('commentsList');
      const badge = document.getElementById('commentsCountBadge');
      if (!cList) return;
      try {
        const comments = await api.getComments(eventId, p.id);
        const list = Array.isArray(comments) ? comments : (comments?.data || []);
        if (badge) badge.textContent = String(list.length);
        if (list.length === 0) {
          cList.innerHTML = `<div style="color:var(--mute);font-size:0.88rem;text-align:center;padding:16px;background:rgba(255,255,255,0.02);border-radius:8px">No comments yet. Be the first to leave feedback!</div>`;
          return;
        }
        cList.innerHTML = list.map(c => {
          const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Just now';
          return `
            <div style="background:var(--glass2);border:1px solid var(--line);border-radius:10px;padding:14px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-weight:700;color:var(--c);font-size:0.9rem">${escapeHtml(c.authorName || 'Community Member')}</span>
                <span style="color:var(--mute);font-size:0.75rem">${escapeHtml(dateStr)}</span>
              </div>
              <div style="color:var(--text);font-size:0.92rem;line-height:1.5;white-space:pre-line">${escapeHtml(c.content)}</div>
            </div>
          `;
        }).join('');
      } catch (err) {
        if (cList) cList.innerHTML = `<div style="color:var(--bad);font-size:0.88rem;text-align:center;padding:12px">Could not load comments: ${escapeHtml(err.message)}</div>`;
      }
    }

    const form = document.getElementById('addCommentForm');
    const authorInput = document.getElementById('commentAuthorInput');
    const user = authStore.getUser();
    if (user && user.username && authorInput) {
      authorInput.value = user.username;
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const contentEl = document.getElementById('commentContentInput');
      const content = contentEl?.value?.trim();
      const author = authorInput?.value?.trim() || user?.username || 'Community Member';
      if (!content) return;
      const submitBtn = document.getElementById('submitCommentBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
      }
      try {
        await api.addComment(eventId, p.id, { authorName: author, content });
        notify('Comment posted!', 'success');
        if (contentEl) contentEl.value = '';
        await loadComments();
      } catch (err) {
        notify(`Failed to post comment: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post Comment →';
        }
      }
    });

    loadComments();
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  gq.addEventListener('input', renderList);
  gtrackSelect.addEventListener('change', renderList);
  gsortSelect.addEventListener('change', renderList);

  await loadProjects();
}
