import { h, $, notify, escapeHtml } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export function renderSubmit(container, eventId = null) {
  if (!eventId) {
    container.innerHTML = `
<section class="view enter" id="v-submit-no-event">
  <div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:48px 32px">
    <div style="font-size:2.8rem;margin-bottom:12px">🎯</div>
    <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Please choose an event first</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem">
      You need to select an active hackathon event before submitting your project.
    </p>
    <a class="btn main" href="#/gallery">Browse Active Events &rarr;</a>
  </div>
</section>
`;
    return;
  }

  // Role guard: Organizers and Judges cannot submit projects
  const submitSession = authStore.getSession();
  const submitRole = submitSession?.role || '';
  if (submitRole === 'ORGANIZER' || submitRole === 'JUDGE') {
    const isOrg = submitRole === 'ORGANIZER';
    container.innerHTML = `
<section class="view enter" id="v-submit-wrong-role">
  <div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:48px 32px">
    <div style="font-size:2.8rem;margin-bottom:12px">${isOrg ? '🏗️' : '⚖️'}</div>
    <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Submissions are for participants</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem;max-width:48ch;margin-left:auto;margin-right:auto">
      You are signed in as <b>${escapeHtml(submitSession.name)}</b> with the <b>${submitRole}</b> role.
      ${isOrg ? 'Organizers manage and review submissions from the Dashboard.' : 'Judges evaluate submissions from the Judge Queue.'}
    </p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a class="btn main" href="${isOrg ? '#/dashboard' : '#/judge'}">${isOrg ? 'Go to Dashboard' : 'Go to Judge Queue'} &rarr;</a>
      <a class="btn ghost" href="#/gallery">Browse Gallery</a>
    </div>
  </div>
</section>
`;
    return;
  }

  container.innerHTML = `
<section class="view enter" id="v-submit">
  <div class="vh row">
    <div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
        <span class="bdg ok" id="deadlinePill">Checking deadline...</span>
        <span class="bdg" id="subStatusPill" style="display:none">DRAFT</span>
        <span class="bdg" id="subVersionPill" style="display:none">v1</span>
      </div>
      <h2 class="vt">Submit your project</h2>
      <p class="vs" id="submitSubtitle">Save drafts anytime. Once submitted, you can continue updating your build until the deadline.</p>
    </div>
    <div>
      <a class="btn ghost sm" href="#/events/${eventId}/teams">&larr; Team settings</a>
    </div>
  </div>

  <div id="draftSaveWarningBanner" style="display:none;background:rgba(255,122,144,0.12);border:1px solid rgba(255,122,144,0.4);border-radius:14px;padding:16px 20px;margin:20px 0;max-width:760px">
    <b style="color:var(--bad);display:block;font-size:0.95rem;margin-bottom:4px">⚠️ Server save failed</b>
    <p style="color:var(--text);font-size:0.88rem;line-height:1.5;margin:0">
      Your draft was saved locally on this device only. It has <b>NOT</b> been saved to the hackathon server.
      Please retry server save before leaving this page.
    </p>
  </div>

  <div class="card" style="max-width:760px;margin:20px 0;padding:32px">
    <form id="submissionForm">
      <div class="fld">
        <label for="pTitle">Project title *</label>
        <input id="pTitle" type="text" placeholder="e.g. Orbit Engine" required>
      </div>

      <div class="fld">
        <label for="pTagline">Tagline *</label>
        <input id="pTagline" type="text" placeholder="One sentence summary of what you built" required>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
        <div class="fld">
          <label for="pTrack">Track *</label>
          <select id="pTrack">
            <option value="Infra">Infra</option>
            <option value="AI">AI</option>
            <option value="Web">Web</option>
            <option value="Data">Data</option>
          </select>
        </div>
        <div class="fld">
          <label for="pTech">Tech stack (comma separated)</label>
          <input id="pTech" type="text" placeholder="Rust, Postgres, Vanilla JS">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
        <div class="fld">
          <label for="pRepo">GitHub repository URL *</label>
          <input id="pRepo" type="url" placeholder="https://github.com/team/project" required>
        </div>
        <div class="fld">
          <label for="pDemo">Live demo URL</label>
          <input id="pDemo" type="url" placeholder="https://project.example.com">
        </div>
      </div>

      <!-- Extended Media & Showcase Links -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
        <div class="fld">
          <label for="pThumb">Thumbnail image URL</label>
          <input id="pThumb" type="url" placeholder="https://example.com/cover.png">
        </div>
        <div class="fld">
          <label for="pLive">Live project URL</label>
          <input id="pLive" type="url" placeholder="https://app.example.com">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
        <div class="fld">
          <label for="pVideo">Hosted demo video URL (YouTube, Loom, etc.)</label>
          <input id="pVideo" type="url" placeholder="https://youtube.com/watch?v=...">
        </div>
        <div class="fld">
          <label for="pGallery">Gallery image URLs (comma-separated)</label>
          <input id="pGallery" type="text" placeholder="https://img1.png, https://img2.png">
        </div>
      </div>

      <div class="fld">
        <label for="pDesc">Full description</label>
        <textarea id="pDesc" rows="5" placeholder="Explain the architecture, problems solved, and how to test your build..."></textarea>
      </div>

      <!-- Dynamic Event-Specific Custom Questions -->
      <div id="customQuestionsContainer" style="display:none;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">
        <h4 style="font-size:1.05rem;margin-bottom:6px">Event-specific questions</h4>
        <p style="color:var(--mute);font-size:0.85rem;margin-bottom:14px">The organizer has requested additional answers for this hackathon.</p>
        <div id="customQuestionsList" style="display:grid;gap:14px"></div>
      </div>

      <!-- Pre-Flight Submission Readiness Checklist Card -->
      <div id="readinessCard" style="margin-top:24px;padding:20px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:1.1rem">📋</span>
            <b style="font-size:0.95rem">Pre-Flight Submission Readiness Checklist</b>
          </div>
          <button type="button" class="btn ghost sm" id="checkServerReadinessBtn" style="font-size:0.75rem;padding:3px 8px">⚡ Server Pre-Flight Check</button>
        </div>
        <div id="readinessList" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;font-size:0.84rem">
          <div id="chkTitle" style="display:flex;align-items:center;gap:8px;color:var(--mute)"><span>○</span> Project Title</div>
          <div id="chkTagline" style="display:flex;align-items:center;gap:8px;color:var(--mute)"><span>○</span> Tagline</div>
          <div id="chkTrack" style="display:flex;align-items:center;gap:8px;color:var(--mute)"><span>○</span> Track Selection</div>
          <div id="chkRepo" style="display:flex;align-items:center;gap:8px;color:var(--mute)"><span>○</span> Repository URL</div>
          <div id="chkDesc" style="display:flex;align-items:center;gap:8px;color:var(--mute)"><span>○</span> Description</div>
          <div id="chkWindow" style="display:flex;align-items:center;gap:8px;color:var(--mute)"><span>○</span> Window Open</div>
          <div id="chkReg" style="display:flex;align-items:center;gap:8px;color:var(--mute)"><span>○</span> Registered</div>
        </div>
        <div id="readinessStatusMsg" style="margin-top:12px;font-size:0.82rem;color:var(--mute);padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">
          Fill in the required fields above to complete pre-flight readiness.
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:28px;padding-top:20px;border-top:1px solid var(--line);flex-wrap:wrap;gap:12px">
        <button class="btn ghost sm" id="saveDraftBtn" type="button">Save draft</button>
        <button class="btn main" id="submitProjectBtn" type="submit">Submit project &rarr;</button>
      </div>
    </form>
  </div>
</section>
`;

  const form = document.getElementById('submissionForm');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  let currentSubmissionId = null;
  let currentVersionNumber = 1;
  let countdownTimerId = null;
  let customQuestions = [];
  let userTeam = null;
  let isTeamLeader = true;
  let isWindowClosed = false;
  let isWindowNotStarted = false;

  const draftKey = `dogfood_draft_${eventId}`;

  function updateReadinessUI() {
    const title = document.getElementById('pTitle')?.value?.trim() || '';
    const tagline = document.getElementById('pTagline')?.value?.trim() || '';
    const track = document.getElementById('pTrack')?.value?.trim() || '';
    const repo = document.getElementById('pRepo')?.value?.trim() || '';
    const desc = document.getElementById('pDesc')?.value?.trim() || '';

    const hasTitle = title.length >= 3;
    const hasTagline = tagline.length >= 5;
    const hasTrack = Boolean(track);
    const hasRepo = Boolean(repo && (repo.startsWith('http://') || repo.startsWith('https://')));
    const hasDesc = desc.length >= 10;
    const isWindowOpen = !isWindowClosed && !isWindowNotStarted;
    const isRegistered = authStore.isRegisteredForEvent(eventId) || Boolean(userTeam);

    setItemState('chkTitle', hasTitle, 'Project Title');
    setItemState('chkTagline', hasTagline, 'Tagline');
    setItemState('chkTrack', hasTrack, `Track (${track || 'None'})`);
    setItemState('chkRepo', hasRepo, 'Repository URL');
    setItemState('chkDesc', hasDesc, 'Description');
    setItemState('chkWindow', isWindowOpen, isWindowOpen ? 'Window Open' : (isWindowClosed ? 'Window Closed' : 'Not Started'));
    setItemState('chkReg', isRegistered, isRegistered ? 'Registered' : 'Registration Verified');

    const allRequiredMet = hasTitle && hasTagline && hasTrack && hasRepo && isWindowOpen;
    const statusMsg = document.getElementById('readinessStatusMsg');
    if (statusMsg) {
      if (allRequiredMet) {
        statusMsg.innerHTML = '<span style="color:var(--ok);font-weight:600">✓ All required criteria satisfied. Ready for submission.</span>';
      } else {
        const missing = [];
        if (!hasTitle) missing.push('Title (min 3 chars)');
        if (!hasTagline) missing.push('Tagline (min 5 chars)');
        if (!hasTrack) missing.push('Track');
        if (!hasRepo) missing.push('Valid Git Repo URL (http/https)');
        if (!isWindowOpen) missing.push('Open Submission Window');
        statusMsg.innerHTML = `<span style="color:var(--warn)">Pending requirements: ${missing.join(', ')}</span>`;
      }
    }
  }

  function setItemState(id, isMet, label) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isMet) {
      el.style.color = 'var(--ok)';
      el.innerHTML = `<span style="color:var(--ok);font-weight:700">✓</span> ${escapeHtml(label)}`;
    } else {
      el.style.color = 'var(--mute)';
      el.innerHTML = `<span>○</span> ${escapeHtml(label)}`;
    }
  }

  function populateFields(d) {
    if (!d) return;
    if (d.id || d.submissionId || d.projectId) {
      currentSubmissionId = d.id || d.submissionId || d.projectId;
    }
    if (d.versionNumber) {
      currentVersionNumber = d.versionNumber;
    }
    const pTitle = document.getElementById('pTitle');
    const pTagline = document.getElementById('pTagline');
    const pTrack = document.getElementById('pTrack');
    const pTech = document.getElementById('pTech');
    const pRepo = document.getElementById('pRepo');
    const pDemo = document.getElementById('pDemo');
    const pDesc = document.getElementById('pDesc');

    const titleVal = d.title || d.name || '';
    if (titleVal && pTitle) pTitle.value = titleVal;
    if (d.tagline && pTagline) pTagline.value = d.tagline;

    const trackVal = d.track || d.tr;
    if (trackVal && pTrack) {
      if (pTrack.options && !Array.from(pTrack.options).some(o => o.value === trackVal)) {
        const opt = document.createElement('option');
        opt.value = trackVal;
        opt.textContent = trackVal;
        pTrack.appendChild(opt);
      }
      pTrack.value = trackVal;
    }

    const techVal = d.techStack || d.tech_stack || d.te;
    if (techVal && pTech) {
      pTech.value = Array.isArray(techVal) ? techVal.join(', ') : techVal;
    }

    const repoVal = d.repoUrl || d.repo_url;
    if (repoVal && pRepo) pRepo.value = repoVal;

    const demoVal = d.demoUrl || d.demo_url;
    if (demoVal && pDemo) pDemo.value = demoVal;

    const descVal = d.description || d.desc || d.d;
    if (descVal && pDesc) pDesc.value = descVal;

    if (d.thumbnailUrl || d.thumbnail) {
      const el = document.getElementById('pThumb');
      if (el) el.value = d.thumbnailUrl || d.thumbnail;
    }
    if (d.liveLink || d.liveUrl) {
      const el = document.getElementById('pLive');
      if (el) el.value = d.liveLink || d.liveUrl;
    }
    if (d.demoVideoUrl || d.videoUrl) {
      const el = document.getElementById('pVideo');
      if (el) el.value = d.demoVideoUrl || d.videoUrl;
    }
    if (d.galleryImages) {
      const el = document.getElementById('pGallery');
      if (el) {
        if (Array.isArray(d.galleryImages)) {
          el.value = d.galleryImages.join(', ');
        } else if (typeof d.galleryImages === 'string') {
          try {
            const parsed = JSON.parse(d.galleryImages);
            el.value = Array.isArray(parsed) ? parsed.join(', ') : d.galleryImages;
          } catch {
            el.value = d.galleryImages;
          }
        }
      }
    }

    if (d.customAnswers) {
      let answersObj = {};
      if (typeof d.customAnswers === 'string') {
        try { answersObj = JSON.parse(d.customAnswers); } catch {}
      } else if (typeof d.customAnswers === 'object') {
        answersObj = d.customAnswers;
      }
      Object.entries(answersObj).forEach(([k, val]) => {
        const el = document.getElementById(`cq_${k}`);
        if (el) el.value = String(val);
      });
    }
  }

  function lockAllFormInputs() {
    const ids = ['pTitle', 'pTagline', 'pTrack', 'pTech', 'pRepo', 'pDemo', 'pDesc', 'pThumb', 'pLive', 'pVideo', 'pGallery', 'saveDraftBtn', 'submitProjectBtn'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
    customQuestions.forEach(q => {
      const el = document.getElementById(`cq_${q.questionKey}`);
      if (el) el.disabled = true;
    });
  }

  function renderCustomQuestionsList(questions) {
    const container = document.getElementById('customQuestionsContainer');
    const list = document.getElementById('customQuestionsList');
    if (!container || !list) return;

    if (!Array.isArray(questions) || questions.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    list.innerHTML = questions.map(q => {
      const isParagraph = q.questionType === 'PARAGRAPH';
      const isUrl = q.questionType === 'URL';
      return `
        <div class="fld" style="margin-bottom:0">
          <label for="cq_${escapeHtml(q.questionKey)}">${escapeHtml(q.prompt)} ${q.required ? '*' : ''}</label>
          ${isParagraph 
            ? `<textarea id="cq_${escapeHtml(q.questionKey)}" rows="3" ${q.required ? 'required' : ''} placeholder="Your answer..."></textarea>`
            : `<input id="cq_${escapeHtml(q.questionKey)}" type="${isUrl ? 'url' : 'text'}" ${q.required ? 'required' : ''} placeholder="${isUrl ? 'https://...' : 'Your answer...'}">`
          }
        </div>
      `;
    }).join('');
  }

  // Hydrate authoritative draft from backend and query event metadata
  (async () => {
    let isLocked = false;
    userTeam = null;
    isTeamLeader = true;
    const currentUser = authStore.getUser() || {};
    const currentUserId = currentUser.userId || currentUser.id;

    // Snapshot localStorage BEFORE any async work to avoid race conditions
    const savedDraftSnapshot = localStorage.getItem(draftKey);

    // Fetch submission and event metadata concurrently
    let serverSub = null;
    let ev = null;
    try {
      const [subRes, evRes] = await Promise.all([
        api.getMySubmission(eventId).catch(() => null),
        api.getEvent(eventId).catch(() => null)
      ]);
      serverSub = subRes?.data || subRes;
      ev = evRes?.data || evRes;
    } catch {}

    // Populate immediately with server submission or local draft
    const hasServerSub = Boolean(serverSub && (serverSub.id || serverSub.submissionId || serverSub.title || serverSub.name));
    if (hasServerSub) {
      currentSubmissionId = serverSub.id || serverSub.submissionId || serverSub.projectId;
      populateFields(serverSub);
    } else if (savedDraftSnapshot) {
      try {
        const d = JSON.parse(savedDraftSnapshot);
        populateFields(d);
        const subPill = document.getElementById('subStatusPill');
        if (subPill) {
          subPill.textContent = 'LOCAL DRAFT';
          subPill.className = 'bdg warn';
          subPill.style.display = 'inline-block';
        }
        notify('Restored local draft');
      } catch {}
    }

    // Team leadership check
    if (currentUserId) {
      try {
        const tRes = await api.getTeams(eventId);
        const teams = Array.isArray(tRes) ? tRes : (tRes?.data || []);
        userTeam = teams.find(t => {
          const isLeader = currentUserId && String(t.leaderId) === String(currentUserId);
          const isMember = t.members?.some(m =>
            (currentUserId && (String(m.userId) === String(currentUserId) || String(m.id) === String(currentUserId)))
          );
          return isLeader || isMember;
        });

        if (userTeam) {
          isTeamLeader = Boolean(currentUserId && String(userTeam.leaderId) === String(currentUserId));
        }
      } catch {}
    }

    // Load custom questions for this event in background and populate previous answers
    try {
      api.getCustomQuestions(eventId).then(qsRes => {
        const qs = Array.isArray(qsRes) ? qsRes : (qsRes?.data || []);
        customQuestions = qs;
        renderCustomQuestionsList(customQuestions);

        const curData = serverSub || (savedDraftSnapshot ? JSON.parse(savedDraftSnapshot) : null);
        if (curData && curData.customAnswers) {
          let answersObj = {};
          if (typeof curData.customAnswers === 'string') {
            try { answersObj = JSON.parse(curData.customAnswers); } catch {}
          } else if (typeof curData.customAnswers === 'object') {
            answersObj = curData.customAnswers;
          }
          Object.entries(answersObj).forEach(([k, val]) => {
            const el = document.getElementById(`cq_${k}`);
            if (el) el.value = String(val);
          });
        }
      }).catch(() => {});
    } catch {}

    // Load dynamic event tracks in background without wiping out previous selected track
    try {
      api.getTracks(eventId).then(trRes => {
        const tracks = Array.isArray(trRes) ? trRes : (trRes?.data || []);
        if (tracks.length > 0) {
          const trackSelect = document.getElementById('pTrack');
          if (trackSelect) {
            const currentSelectedTrack = (serverSub && (serverSub.track || serverSub.tr)) || trackSelect.value;
            trackSelect.innerHTML = tracks.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join('');
            if (currentSelectedTrack) {
              if (trackSelect.options && !Array.from(trackSelect.options).some(o => o.value === currentSelectedTrack)) {
                const opt = document.createElement('option');
                opt.value = currentSelectedTrack;
                opt.textContent = currentSelectedTrack;
                trackSelect.appendChild(opt);
              }
              trackSelect.value = currentSelectedTrack;
            }
          }
        }
      }).catch(() => {});
    } catch {}

    // Evaluate Event Lifecycle & Deadlines
    const deadlinePill = document.getElementById('deadlinePill');
    const subPill = document.getElementById('subStatusPill');
    const submitSubtitle = document.getElementById('submitSubtitle');
    const submitBtn = document.getElementById('submitProjectBtn');

    const now = new Date();
    const deadline = ev?.submissionDeadline ? new Date(ev.submissionDeadline) : null;
    const subStart = ev?.submissionStart ? new Date(ev.submissionStart) : (ev?.registrationEnd ? new Date(ev.registrationEnd) : null);
    const isClosed = ev?.status === 'CLOSED' || (deadline && now > deadline);
    const notStartedYet = subStart && now < subStart;
    isWindowClosed = isClosed;
    isWindowNotStarted = notStartedYet;

    function updateCountdown() {
      const curNow = new Date();
      if (!deadline) {
        if (deadlinePill) {
          deadlinePill.className = 'bdg ok';
          deadlinePill.textContent = 'SUBMISSIONS OPEN';
        }
        return;
      }
      const diffMs = deadline - curNow;
      if (diffMs <= 0 || ev?.status === 'CLOSED') {
        isWindowClosed = true;
        if (deadlinePill) {
          deadlinePill.className = 'bdg bad';
          deadlinePill.textContent = '🔴 SUBMISSIONS CLOSED';
        }
        if (countdownTimerId) clearInterval(countdownTimerId);
        updateReadinessUI();
        return;
      }
      const totalSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (diffMs < 2 * 60 * 60 * 1000) {
        if (deadlinePill) {
          deadlinePill.className = 'bdg warn';
          deadlinePill.textContent = `🟡 CLOSING SOON: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
      } else {
        if (deadlinePill) {
          deadlinePill.className = 'bdg ok';
          const rem = days > 0 ? `${days}d ${hours}h left` : `${hours}h ${mins}m left`;
          deadlinePill.textContent = `🟢 OPEN · ${rem}`;
        }
      }
    }

    if (isClosed) {
      isLocked = true;
      if (deadlinePill) {
        deadlinePill.className = 'bdg bad';
        deadlinePill.textContent = '🔴 SUBMISSIONS CLOSED';
      }
      if (serverSub && serverSub.status === 'SUBMITTED') {
        if (subPill) {
          subPill.textContent = 'SUBMITTED (LOCKED)';
          subPill.className = 'bdg ok';
          subPill.style.display = 'inline-block';
        }
        const verPill = document.getElementById('subVersionPill');
        if (verPill) {
          verPill.textContent = `v${currentVersionNumber}`;
          verPill.className = 'bdg bad';
          verPill.style.display = 'inline-block';
        }
        if (submitSubtitle) {
          submitSubtitle.textContent = deadline
            ? `Deadline passed on ${deadline.toUTCString()}. Version ${currentVersionNumber} is locked and can no longer be edited.`
            : 'Submissions are currently closed for this hackathon.';
        }
      } else {
        if (submitSubtitle) {
          submitSubtitle.textContent = deadline
            ? `Deadline: ${deadline.toUTCString()} · Submissions are closed.`
            : 'Submissions are currently closed for this hackathon.';
        }
      }
      lockAllFormInputs();
      if (saveDraftBtn) saveDraftBtn.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submissions Closed';
      }
    } else if (notStartedYet) {
      isLocked = true;
      if (deadlinePill) {
        deadlinePill.className = 'bdg warn';
        deadlinePill.textContent = 'SUBMISSIONS NOT OPEN';
      }
      if (submitSubtitle) {
        submitSubtitle.textContent = `Registration phase active. Project submissions will open on ${subStart.toLocaleString()}.`;
      }
      lockAllFormInputs();
      if (saveDraftBtn) saveDraftBtn.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submissions Not Open';
      }
    } else {
      // SUBMISSION WINDOW IS ACTIVE (Before deadline)
      updateCountdown();
      countdownTimerId = setInterval(updateCountdown, 1000);

      let timeRemainingStr = '';
      if (deadline) {
        const diffMs = deadline - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        timeRemainingStr = diffDays > 0 ? `${diffDays} day${diffDays > 1 ? 's' : ''} remaining` : `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
      }

      // Check Team Leadership
      if (userTeam && !isTeamLeader) {
        isLocked = true;
        const warningBanner = document.getElementById('draftSaveWarningBanner');
        if (warningBanner) {
          warningBanner.style.display = 'block';
          warningBanner.style.background = 'rgba(255,200,60,0.12)';
          warningBanner.style.borderColor = 'rgba(255,200,60,0.4)';
          warningBanner.innerHTML = `
            <b style="color:var(--warn);display:block;font-size:0.95rem;margin-bottom:4px">👥 Team Member View (Read-Only)</b>
            <p style="color:var(--text);font-size:0.88rem;line-height:1.5;margin:0">
              You are viewing this submission as a member of team <b>${escapeHtml(userTeam.name)}</b>.
              Only the <b>Team Leader</b> has authority to submit or edit project submissions for your team.
            </p>
          `;
        }
        if (submitSubtitle) {
          submitSubtitle.textContent = `Team submission is managed by your team leader. Team members have read-only access.`;
        }
        lockAllFormInputs();
        if (saveDraftBtn) saveDraftBtn.style.display = 'none';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Only team leader can submit';
        }
      } else {
        // Participant or Leader: Form is fully editable before the deadline
        if (serverSub && serverSub.status === 'SUBMITTED') {
          if (subPill) {
            subPill.textContent = 'SUBMITTED';
            subPill.className = 'bdg ok';
            subPill.style.display = 'inline-block';
          }
          const verPill = document.getElementById('subVersionPill');
          if (verPill) {
            verPill.textContent = `v${currentVersionNumber}`;
            verPill.className = 'bdg';
            verPill.style.display = 'inline-block';
          }
          if (submitSubtitle) {
            submitSubtitle.textContent = `Submitted on ${new Date(serverSub.updatedAt || serverSub.createdAt).toLocaleString()}. You can still edit and update your submitted project until the deadline${timeRemainingStr ? ` (${timeRemainingStr})` : ''}. Editing Version ${currentVersionNumber + 1} (preserving project URL and ID #${currentSubmissionId}).`;
          }
          if (submitBtn) {
            submitBtn.textContent = 'Update submission \u2192';
          }
          if (saveDraftBtn) {
            saveDraftBtn.style.display = 'none';
          }
          notify('Loaded your submitted project. All fields remain editable until the deadline.', 'info');
        } else if (serverSub && serverSub.status === 'DRAFT') {
          if (subPill) {
            subPill.textContent = 'DRAFT';
            subPill.className = 'bdg warn';
            subPill.style.display = 'inline-block';
          }
          const verPill = document.getElementById('subVersionPill');
          if (verPill) {
            verPill.textContent = `v${currentVersionNumber}`;
            verPill.className = 'bdg';
            verPill.style.display = 'inline-block';
          }
          if (submitSubtitle) {
            submitSubtitle.textContent = `Draft saved on server. You can edit and submit your project before the deadline${timeRemainingStr ? ` (${timeRemainingStr})` : ''}.`;
          }
          if (submitBtn) {
            submitBtn.textContent = 'Submit project \u2192';
          }
          if (saveDraftBtn) {
            saveDraftBtn.style.display = 'inline-flex';
          }
          notify('Restored saved draft from server');
        } else {
          if (submitSubtitle) {
            submitSubtitle.textContent = `Save drafts anytime. Once submitted, you can continue updating your build until the deadline${timeRemainingStr ? ` (${timeRemainingStr})` : ''}.`;
          }
          if (submitBtn) {
            submitBtn.textContent = 'Submit project \u2192';
          }
          if (saveDraftBtn) {
            saveDraftBtn.style.display = 'inline-flex';
          }
        }
      }
    }

    // Attach input listeners for live readiness checklist feedback
    ['pTitle', 'pTagline', 'pTrack', 'pRepo', 'pDesc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateReadinessUI);
        el.addEventListener('change', updateReadinessUI);
      }
    });
    updateReadinessUI();

    // Wire up Server Pre-Flight Check button
    const serverReadinessBtn = document.getElementById('checkServerReadinessBtn');
    if (serverReadinessBtn) {
      serverReadinessBtn.addEventListener('click', async () => {
        serverReadinessBtn.disabled = true;
        serverReadinessBtn.textContent = 'Checking...';
        try {
          const check = await api.getSubmissionReadiness(eventId, currentSubmissionId);
          const data = check?.data || check;
          if (data && data.ready) {
            notify('Server Readiness Check: 100% Ready for evaluation!', 'success');
          } else {
            notify(`Server Readiness Check: ${data?.message || 'Missing required fields'}`, 'warn');
          }
        } catch (err) {
          notify(`Readiness check error: ${err.message}`, 'error');
        } finally {
          serverReadinessBtn.disabled = false;
          serverReadinessBtn.textContent = '⚡ Server Pre-Flight Check';
        }
      });
    }
  })();

  function getPayload(status = 'SUBMITTED') {
    const tech = document.getElementById('pTech').value.split(',').map(t => t.trim()).filter(Boolean);
    const repo = document.getElementById('pRepo').value.trim();
    const demo = document.getElementById('pDemo').value.trim();
    const live = document.getElementById('pLive')?.value?.trim() || '';
    const video = document.getElementById('pVideo')?.value?.trim() || '';
    const thumb = document.getElementById('pThumb')?.value?.trim() || '';
    const galleryVal = document.getElementById('pGallery')?.value?.trim() || '';
    const galleryImages = galleryVal ? galleryVal.split(',').map(s => s.trim()).filter(Boolean) : [];

    const customAnswers = {};
    customQuestions.forEach(q => {
      const el = document.getElementById(`cq_${q.questionKey}`);
      if (el) {
        customAnswers[q.questionKey] = el.value.trim();
      }
    });

    const titleVal = document.getElementById('pTitle').value.trim();
    return {
      title: titleVal || (status === 'DRAFT' ? 'Untitled Draft' : ''),
      tagline: document.getElementById('pTagline').value.trim(),
      track: document.getElementById('pTrack').value,
      techStack: tech,
      repoUrl: repo,
      demoUrl: demo || live,
      liveLink: live || demo,
      demoVideoUrl: video,
      thumbnailUrl: thumb,
      galleryImages,
      customAnswers,
      description: document.getElementById('pDesc').value.trim(),
      status,
      updatedAt: new Date().toISOString()
    };
  }

  saveDraftBtn.addEventListener('click', async () => {
    if (userTeam && !isTeamLeader) {
      notify('Only the team leader can save drafts for the team', 'error');
      return;
    }
    const payload = getPayload('DRAFT');
    const warningBanner = document.getElementById('draftSaveWarningBanner');
    saveDraftBtn.disabled = true;

    try {
      let res;
      if (currentSubmissionId) {
        res = await api.updateSubmission(currentSubmissionId, payload);
      } else {
        res = await api.submitProject(eventId, payload);
      }
      const saved = res?.data || res;
      if (saved && saved.id) currentSubmissionId = saved.id;
      if (saved && saved.versionNumber) currentVersionNumber = saved.versionNumber;

      if (warningBanner) warningBanner.style.display = 'none';
      const subPill = document.getElementById('subStatusPill');
      if (subPill) {
        subPill.textContent = 'DRAFT';
        subPill.className = 'bdg warn';
        subPill.style.display = 'inline-block';
      }
      const verPill = document.getElementById('subVersionPill');
      if (verPill) {
        verPill.textContent = `v${currentVersionNumber}`;
        verPill.className = 'bdg';
        verPill.style.display = 'inline-block';
      }

      localStorage.setItem(draftKey, JSON.stringify(payload));
      updateReadinessUI();
      notify('Draft successfully saved to server!', 'success');
    } catch (err) {
      // Local backup in case server rejected
      localStorage.setItem(draftKey, JSON.stringify(payload));
      if (warningBanner) warningBanner.style.display = 'block';
      notify(`Draft save failed: server rejected update. Your draft was saved locally on this device only. It has NOT been saved to the hackathon server.`, 'warn');
    } finally {
      saveDraftBtn.disabled = false;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (userTeam && !isTeamLeader) {
      notify('Only the team leader can submit the project for the team', 'error');
      return;
    }
    const payload = getPayload('SUBMITTED');
    const submitBtn = document.getElementById('submitProjectBtn');
    submitBtn.disabled = true;

    try {
      let res;
      if (currentSubmissionId) {
        res = await api.updateSubmission(currentSubmissionId, payload);
      } else {
        res = await api.submitProject(eventId, payload);
      }
      const data = res?.data || res;
      if (data && data.id) {
        currentSubmissionId = data.id;
      }
      if (data && data.versionNumber) {
        currentVersionNumber = data.versionNumber;
      } else {
        currentVersionNumber += 1;
      }
      localStorage.removeItem(draftKey);

      const subPill = document.getElementById('subStatusPill');
      if (subPill) {
        subPill.textContent = 'SUBMITTED';
        subPill.className = 'bdg ok';
        subPill.style.display = 'inline-block';
      }
      const submitVerPill = document.getElementById('subVersionPill');
      if (submitVerPill) {
        submitVerPill.textContent = `v${currentVersionNumber}`;
        submitVerPill.className = 'bdg';
        submitVerPill.style.display = 'inline-block';
      }
      const submitSubtitle = document.getElementById('submitSubtitle');
      if (submitSubtitle) {
        submitSubtitle.textContent = `Submitted on ${new Date().toLocaleString()}. You can still edit and update your submitted project until the deadline. Editing Version ${currentVersionNumber + 1} (preserving project URL and ID #${currentSubmissionId}).`;
      }
      const saveDraftBtn = document.getElementById('saveDraftBtn');
      if (saveDraftBtn) {
        saveDraftBtn.style.display = 'none';
      }
      submitBtn.textContent = 'Update submission \u2192';
      submitBtn.disabled = false;
      updateReadinessUI();
      notify(`Project updated to version ${currentVersionNumber} (preserving project identity and public URL)`, 'success');
    } catch (err) {
      notify(`Submission failed: ${err.message}`, 'error');
      submitBtn.disabled = false;
    }
  });
}
