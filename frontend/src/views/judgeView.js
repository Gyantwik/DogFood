/**
 * judgeView.js — Judge Scoring Interface & Queue
 * Focus mode, weighted rubric sliders, checkmark microinteraction, COI modal.
 * Connects to real server-authorized queue & single-assignment endpoints with event scoping.
 */

import { h, $, $$, notify, escapeHtml, sanitizeUrl } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export async function renderJudge(container, targetAssignmentId = null) {
  let activeEventId = authStore.getEventId();

  container.innerHTML = `
<section class="view enter" id="v-judge">
  <div class="vh row">
    <div>
      <h2 class="vt">Judge scoring</h2>
      <p class="vs">One project at a time. Only your own assigned ballot is visible to you.</p>
    </div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <button class="btn ghost sm" id="refreshJudgeQueueBtn" type="button" style="border-color:var(--c);color:var(--c)">🔄 Refresh Queue</button>
      <button class="btn ghost sm" id="declareCoiBtn" style="border-color:var(--p)">Declare conflict of interest</button>
      <div class="qprog"><span id="jq">Loading queue...</span><div class="qbar" style="height:8px;border-radius:99px;background:rgba(255,255,255,.1);margin-top:8px;overflow:hidden"><i id="jqb" style="display:block;height:100%;width:100%;transform-origin:left;transform:scaleX(0);background:var(--grad);transition:transform .8s var(--ease)"></i></div></div>
    </div>
  </div>

  <!-- Judging Mode Switcher -->
  <div style="display:flex;align-items:center;gap:8px;margin:16px 0 14px;background:var(--glass2);padding:5px 8px;border-radius:12px;border:1px solid var(--line);width:fit-content">
    <button class="btn sm active" id="modeRubricTabBtn" type="button" style="display:flex;align-items:center;gap:6px">📋 Rubric Scoring</button>
    <button class="btn sm ghost" id="modePairwiseTabBtn" type="button" style="display:flex;align-items:center;gap:6px">⚔️ Pairwise Duel</button>
  </div>

  <!-- Clear COI Explanation Banner -->
  <div id="coiExplBanner" style="background:rgba(255,180,0,0.08);border:1px solid rgba(255,180,0,0.25);border-radius:14px;padding:14px 18px;margin:16px 0 20px;display:flex;align-items:flex-start;gap:12px;font-size:0.88rem;color:var(--text);line-height:1.5">
    <span style="font-size:1.3rem;line-height:1">⚖️</span>
    <div>
      <b style="color:var(--warn);display:block;margin-bottom:2px">Conflict of Interest (COI) Policy</b>
      Do not score this project if you have a personal, professional, academic, financial, team, or other relationship that could affect your impartiality. Declaring a conflict removes this project from your judging queue so the organizer can reassign it.
    </div>
  </div>

  <div id="judgeContentArea">
    <div style="padding:40px;text-align:center;color:var(--mute)">Loading assignments from server...</div>
  </div>

  <!-- Pairwise Judging Mode Arena -->
  <div id="pairwiseContentArea" style="display:none">
    <div style="padding:40px;text-align:center;color:var(--mute)">Loading pairwise matchup...</div>
  </div>

  <!-- Score Confirmation Modal -->
  <div class="modal-backdrop" id="scoreConfirmModal">
    <div class="modal-card">
      <h3 style="font-size:1.6rem">Submit this score?</h3>
      <p style="color:var(--mute);font-size:0.92rem;margin:6px 0 16px">Once submitted, this ballot cannot be edited.</p>
      
      <div style="background:var(--glass2);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--mute)">Project:</span>
          <b id="confirmProjectName" style="color:#FFF"></b>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="color:var(--mute)">Final weighted score:</span>
          <b id="confirmScoreValue" style="font-family:var(--display);font-size:1.8rem;color:var(--c)"></b>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px">
        <button class="btn ghost sm" id="cancelConfirmScoreBtn" type="button">Cancel</button>
        <button class="btn main sm" id="executeSubmitScoreBtn" type="button">Submit score &rarr;</button>
      </div>
    </div>
  </div>

  <!-- COI Modal -->
  <div class="modal-backdrop" id="coiModal">
    <div class="modal-card">
      <h3 style="font-size:1.6rem">Declare conflict of interest</h3>
      <p style="color:var(--mute);font-size:0.92rem;margin:6px 0 18px;line-height:1.5">
        Do not score this project if you have a personal, professional, academic, financial, team, or other relationship that could affect your impartiality. Declaring a conflict removes this project from your judging queue so the organizer can reassign it.
      </p>
      
      <div class="fld">
        <label for="coiReasonSelect">Reason *</label>
        <select id="coiReasonSelect">
          <option value="SAME_TEAM">Same Team / Past Teammate</option>
          <option value="SAME_ORGANIZATION">Same Organization / Company / University</option>
          <option value="PERSONAL_RELATIONSHIP">Personal Relationship / Close Friend</option>
          <option value="OTHER">Other Conflict</option>
        </select>
      </div>

      <div class="fld">
        <label for="coiNotes">Details (optional):</label>
        <input id="coiNotes" type="text" placeholder="Brief note">
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px">
        <button class="btn ghost sm" id="closeCoiBtn" type="button">Cancel</button>
        <button class="btn main sm" id="confirmCoiBtn" type="button" style="background:var(--bad)">Confirm & reassign</button>
      </div>
    </div>
  </div>

  <!-- View All Queue Modal -->
  <div class="modal-backdrop" id="viewAllJudgeQueueModal">
    <div class="modal-card" style="max-width:860px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1.5rem;margin:0">📋 All Assigned Projects</h3>
        <button class="btn ghost sm" id="closeViewAllJudgeQueueBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 14px">Browse all pending and completed evaluation ballots assigned to you.</p>

      <input type="text" id="filterJudgeQueueInput" placeholder="🔍 Search projects by title, track, or status..." style="width:100%;height:38px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 12px;font-size:0.9rem;margin-bottom:14px">

      <div id="allJudgeQueueListContainer" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px"></div>
    </div>
  </div>
</section>
`;

  const contentArea = document.getElementById('judgeContentArea');
  const coiBtn = document.getElementById('declareCoiBtn');
  let queue = [];
  let currentIndex = 0;
  let scoredCount = 0;
  let criteria = [];

  function mapProject(p) {
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
      id: p.submissionId || p.projectId || p.id,
      assignmentId: p.assignmentId || p.id,
      eventId: p.eventId || activeEventId,
      n: p.title || p.name || 'Assigned Project',
      tr: p.track || 'General',
      t: p.tagline || '',
      d: p.description || '',
      te: Array.isArray(p.techStack) ? p.techStack : ['General'],
      demoUrl: p.demoUrl || '',
      repoUrl: p.repoUrl || '',
      thumbnailUrl: p.thumbnailUrl || p.thumbnail || '',
      galleryImages: images,
      demoVideoUrl: p.demoVideoUrl || p.videoUrl || '',
      liveLink: p.liveLink || p.liveUrl || '',
      customAnswers: answers,
      teamName: p.teamName || '',
      status: p.status || p.submissionStatus || 'ASSIGNED'
    };
  }

  try {
    if (targetAssignmentId) {
      // Server-authorized single assignment fetch scoped to event
      const single = await api.getJudgeAssignment(targetAssignmentId, activeEventId);
      if (single) {
        queue = [mapProject(single)];
      }
    } else {
      // Server-authorized judge queue fetch scoped to event
      const remote = await api.getJudgeAssignments(activeEventId);
      if (Array.isArray(remote)) {
        queue = remote.map(mapProject);
      }
      try {
        const myScores = await api.getMyScores(activeEventId);
        if (Array.isArray(myScores) && myScores.length > 0) {
          const scoreMap = new Map();
          myScores.forEach(sc => {
            const key = String(sc.submissionId || sc.projectId || '');
            if (key) scoreMap.set(key, sc);
          });
          queue.forEach(p => {
            const sc = scoreMap.get(String(p.id));
            if (sc) {
              p.status = 'COMPLETED';
              if (p.rawScore == null) p.rawScore = sc.rawScore != null ? sc.rawScore : sc.score;
              if (!p.comment) p.comment = sc.comment || '';
              if (!p.criteria || Object.keys(p.criteria).length === 0) p.criteria = sc.criteria || {};
            }
          });
        }
      } catch {}
    }
  } catch (err) {
    if (coiBtn) coiBtn.style.display = 'none';
    const isNoEvent = err.message.includes('Event ID is required') || (!activeEventId && !targetAssignmentId && !queue.length);
    if (isNoEvent) {
      contentArea.innerHTML = `
        <div class="card" style="text-align:center;padding:50px 24px;margin-top:20px">
          <div style="font-size:2.8rem;margin-bottom:12px">⚖️</div>
          <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Please choose an event first</h2>
          <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem">
            Select an active hackathon event from the header to view your assigned judging queue.
          </p>
          <a class="btn main sm" href="#/gallery">Browse Active Events &rarr;</a>
        </div>
      `;
      return;
    }
    const isAccessDenied = err.message.includes('403') || err.message.includes('Access Denied') || err.message.includes('forbidden');
    contentArea.innerHTML = `
      <div class="card" style="text-align:center;padding:50px 24px;border:1px solid ${isAccessDenied ? 'rgba(255,122,144,0.4)' : 'var(--line)'};margin-top:20px">
        <div style="font-size:2.4rem;margin-bottom:12px">${isAccessDenied ? '🔒' : '⚠️'}</div>
        <h3 style="font-size:1.6rem;color:${isAccessDenied ? 'var(--bad)' : 'var(--text)'}">${isAccessDenied ? 'Access Restricted' : 'Unable to Load Assignment Queue'}</h3>
        <p style="color:var(--mute);max-width:48ch;margin:8px auto 20px">${escapeHtml(err.message)}</p>
        <a class="btn ghost sm" href="#/gallery">Back to Gallery</a>
      </div>
    `;
    return;
  }

  if (queue.length === 0) {
    if (coiBtn) coiBtn.style.display = 'none';
    document.getElementById('jq').textContent = 'Queue empty';
    
    let completedCount = 0;
    try {
      const myScores = await api.getMyScores(activeEventId);
      if (Array.isArray(myScores)) completedCount = myScores.length;
    } catch {}

    contentArea.innerHTML = `
      <div class="card" style="text-align:center;padding:50px 24px;margin-top:20px">
        <div style="font-size:2.6rem;margin-bottom:12px">${completedCount > 0 ? '🎉' : '📋'}</div>
        <h3 style="font-size:1.6rem">${completedCount > 0 ? 'All assigned reviews completed!' : 'No projects assigned'}</h3>
        <p style="color:var(--mute);max-width:48ch;margin:8px auto 20px">
          ${completedCount > 0 
            ? `You have evaluated and submitted scores for <b>${completedCount}</b> project(s). There are no pending reviews remaining in your queue.`
            : 'You currently have no pending judging assignments in this event.'
          }
        </p>
        <div style="padding:16px 20px;border-radius:14px;background:var(--glass2);border:1px solid var(--line);max-width:520px;margin:0 auto 24px;font-size:0.88rem;color:var(--mute);line-height:1.6;text-align:left">
          💡 <b>How judging assignments work:</b><br>
          &bull; Submitted projects must be assigned to judges by the <b>Organizer</b>.<br>
          &bull; Organizers can click <b>⚡ Auto-Assign Judges</b> in the Organizer Dashboard to instantly distribute submissions across all active judges.<br>
          &bull; Once assigned, projects appear here immediately for evaluation.
        </div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <a class="btn ghost sm" href="#/gallery">Explore Gallery</a>
          <a class="btn main sm" href="#/results">View Leaderboard &rarr;</a>
        </div>
      </div>
    `;
    return;
  }

  // Load real event-specific rubric from backend
  const rubricEventId = (queue.length > 0 && queue[0].eventId) ? String(queue[0].eventId) : (activeEventId || '1');

  try {
    const rawRubric = await api.getRubric(rubricEventId);
    const rubricData = Array.isArray(rawRubric) ? rawRubric : (rawRubric?.criteria || rawRubric?.data || []);
    if (!Array.isArray(rubricData) || rubricData.length === 0) {
      throw new Error(`Judging rubric is empty or not configured for event ${rubricEventId}.`);
    }
    criteria = rubricData.map(c => ({
      name: c.name,
      key: c.key || c.criterionKey || c.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      weight: Number(c.weight),
      minScore: c.minScore != null ? Number(c.minScore) : 1.0,
      maxScore: c.maxScore != null ? Number(c.maxScore) : 5.0,
      desc: c.description || c.desc || ''
    }));
  } catch (rubricErr) {
    if (coiBtn) coiBtn.style.display = 'none';
    contentArea.innerHTML = `
      <div class="card" style="text-align:center;padding:50px 24px;border:1px solid rgba(255,122,144,0.4);margin-top:20px">
        <div style="font-size:2.4rem;margin-bottom:12px">⚠️</div>
        <h3 style="font-size:1.6rem;color:var(--bad)">Unable to Load Judging Rubric</h3>
        <p style="color:var(--mute);max-width:48ch;margin:8px auto 20px">${escapeHtml(rubricErr.message)}</p>
        <a class="btn ghost sm" href="#/gallery">Back to Gallery</a>
      </div>
    `;
    return;
  }

  // Default to first uncompleted project if available
  const firstUncompIdx = queue.findIndex(p => p.status !== 'COMPLETED');
  if (firstUncompIdx >= 0) {
    currentIndex = firstUncompIdx;
  } else {
    currentIndex = 0;
  }

  contentArea.innerHTML = `
    <!-- Two-Tier Assignment Queue Overview -->
    <div class="card" id="judgeQueueOverviewCard" style="margin-top:20px;padding:22px;border:1px solid var(--line);background:var(--glass2)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div>
          <h3 style="font-size:1.35rem;margin:0">Assigned Projects Queue</h3>
          <p style="color:var(--mute);font-size:0.88rem;margin:3px 0 0">Click any project to inspect details, score, or revise a submitted evaluation.</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn ghost sm" id="viewAllJudgeQueueBtn" type="button" style="font-size:0.8rem;padding:4px 10px;color:var(--c);border-color:rgba(55,224,255,0.4)">👁️ View All Queue (${queue.length})</button>
          <span class="bdg warn" id="pendingQueueBadge" style="font-size:0.8rem;padding:4px 10px;font-weight:700">0 Pending</span>
          <span class="bdg ok" id="completedQueueBadge" style="font-size:0.8rem;padding:4px 10px;font-weight:700">0 Completed</span>
        </div>
      </div>

      <!-- Top Tier: Pending Reviews (Uncompleted) -->
      <div style="margin-bottom:20px">
        <h4 style="font-size:0.95rem;color:var(--warn);margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <span>⏳</span> Pending Evaluations (<span id="uncompletedCountNum">0</span> remaining)
        </h4>
        <div id="uncompletedProjectsContainer"></div>
      </div>

      <!-- Bottom Tier: My Completed Reviews -->
      <div>
        <h4 style="font-size:0.95rem;color:var(--ok);margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <span>✅</span> My Completed Reviews (<span id="completedCountNum">0</span> scored)
        </h4>
        <div id="completedProjectsContainer"></div>
      </div>
    </div>

    <!-- Active Review Panel -->
    <div class="jgrid" id="jgrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px;margin-top:20px">
      <!-- Project Showcase Card -->
      <div class="card jproj" id="jprojCard">
        <div id="reviewStatusNotice" style="display:none"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span class="trk" id="jTrack" style="padding:3px 12px;border-radius:99px;background:rgba(255,255,255,0.08);font-size:0.78rem;font-weight:700">Track</span>
            <span id="jMetaBadges" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"></span>
          </div>
          <span style="font-size:0.8rem;color:var(--mute)" id="jQueuePos">Project 1 of ${queue.length}</span>
        </div>

        <h3 id="jTitle" style="font-size:2rem;letter-spacing:-.03em;margin:14px 0 4px">Title</h3>
        <p id="jTagline" style="color:var(--c);font-weight:700;font-size:1.02rem">Tagline</p>

        <!-- Media Container (Thumbnail & Gallery) -->
        <div id="jMedia"></div>

        <p id="jDesc" style="color:var(--mute);margin:16px 0;line-height:1.65;font-size:1rem;white-space:pre-line">Description</p>
        
        <div style="margin:18px 0">
          <b style="font-size:0.82rem;color:var(--mute);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Tech Stack</b>
          <div class="gt" id="jTech"></div>
        </div>

        <!-- Custom Questions & Answers -->
        <div id="jCustomQa"></div>

        <!-- Action Links -->
        <div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap" id="jLinks"></div>
      </div>

      <!-- Rubric Sliders Card -->
      <div class="card jrub">
        <h3>Score this project</h3>
        <div id="criteriaList" style="margin-top:16px;display:grid;gap:16px"></div>

        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:20px 0 12px;border-top:1px solid var(--line);margin-top:20px">
          <span style="font-weight:700">Weighted total:</span>
          <b id="jWeightedTotal" style="font-size:2.6rem;font-family:var(--display);background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent">3.50</b>
        </div>

        <div class="fld" style="margin-top:8px">
          <label for="jComment">Comment (optional):</label>
          <textarea id="jComment" rows="3" placeholder="What stood out?"></textarea>
        </div>

        <div style="display:flex;justify-content:space-between;gap:12px;margin-top:20px;flex-wrap:wrap">
          <button class="btn ghost sm" id="jSkipBtn" type="button" ${queue.length <= 1 ? 'style="display:none"' : ''}>Skip for now</button>
          <button class="btn main" id="jSubmitScoreBtn" type="button">
            <span id="jSubmitLabel">Submit score &rarr;</span>
          </button>
        </div>
        <small id="skipHelperText" style="color:var(--mute);font-size:0.78rem;display:block;margin-top:10px">
          "Skip for now": This project remains in your queue and can be reviewed later.
        </small>
      </div>
    </div>

    <!-- Completed State -->
    <div class="card" id="jCompletedState" style="display:none;text-align:center;padding:60px 20px;margin-top:30px">
      <div style="font-size:3rem;margin-bottom:12px">🎉</div>
      <h2 style="font-size:2.2rem">Queue complete</h2>
      <p style="color:var(--mute);max-width:44ch;margin:8px auto 24px;font-size:1.05rem">You scored every assigned project in your queue.</p>
      <button class="btn main sm" id="jReviewAgainBtn">Review again</button>
    </div>
  `;

  const criteriaList = document.getElementById('criteriaList');
  const values = {};
  criteria.forEach(c => {
    const mid = (c.minScore + c.maxScore) / 2;
    values[c.key] = Math.round(mid * 2) / 2;
  });

  function renderRubric() {
    criteriaList.innerHTML = criteria.map((c) => `
      <div style="display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;background:var(--glass2);padding:12px;border-radius:12px;border:1px solid var(--line)">
        <div>
          <label style="font-weight:600;font-size:0.92rem;display:block">${escapeHtml(c.name)} <span class="wt" style="color:var(--mute);font-size:0.78rem">(${c.weight}%)</span></label>
          <p style="color:var(--mute);font-size:0.78rem;margin:2px 0 0">${escapeHtml(c.desc || '')}</p>
        </div>
        <output id="out_${c.key}" style="font-family:var(--mono);font-weight:700;font-size:1.1rem;color:var(--c)">${(values[c.key] != null ? values[c.key] : c.minScore).toFixed(1)}</output>
        <div style="grid-column:1/-1;margin-top:8px">
          <input type="range" min="${c.minScore}" max="${c.maxScore}" step="0.5" value="${values[c.key] != null ? values[c.key] : c.minScore}" id="range_${c.key}" style="width:100%;height:28px;accent-color:var(--v);cursor:pointer">
          <div style="display:flex;justify-content:space-between;color:var(--mute);font-size:0.72rem;margin-top:2px">
            <span>${c.minScore} — Min</span>
            <span>${((c.minScore + c.maxScore) / 2).toFixed(1)} — Mid</span>
            <span>${c.maxScore} — Max</span>
          </div>
        </div>
      </div>
    `).join('');

    criteria.forEach(c => {
      document.getElementById(`range_${c.key}`)?.addEventListener('input', (e) => {
        values[c.key] = parseFloat(e.target.value);
        const out = document.getElementById(`out_${c.key}`);
        if (out) out.textContent = values[c.key].toFixed(1);
        calcTotal();
      });
    });

    calcTotal();
  }

  function calcTotal() {
    let total = 0;
    let totalWeight = 0;
    criteria.forEach(c => {
      const val = values[c.key] != null ? values[c.key] : c.minScore;
      total += (val * c.weight);
      totalWeight += c.weight;
    });
    const weighted = totalWeight > 0 ? (total / totalWeight) : 0;
    const wt = document.getElementById('jWeightedTotal');
    if (wt) wt.textContent = weighted.toFixed(2);
  }

  function renderQueueLists() {
    const uncompleted = queue.filter(p => p.status !== 'COMPLETED');
    const completed = queue.filter(p => p.status === 'COMPLETED');

    const pendingBdg = document.getElementById('pendingQueueBadge');
    const compBdg = document.getElementById('completedQueueBadge');
    const uncompNum = document.getElementById('uncompletedCountNum');
    const compNum = document.getElementById('completedCountNum');

    if (pendingBdg) pendingBdg.textContent = `${uncompleted.length} Pending`;
    if (compBdg) compBdg.textContent = `${completed.length} Completed`;
    if (uncompNum) uncompNum.textContent = String(uncompleted.length);
    if (compNum) compNum.textContent = String(completed.length);

    const uncompContainer = document.getElementById('uncompletedProjectsContainer');
    if (uncompContainer) {
      if (uncompleted.length === 0) {
        uncompContainer.innerHTML = `
          <div style="padding:14px 18px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--mute);font-size:0.88rem">
            ✓ All assigned projects have been evaluated! Select any completed review below if you need to adjust scores.
          </div>
        `;
      } else {
        uncompContainer.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;max-height:280px;overflow-y:auto;padding-right:4px">
            ${uncompleted.map(p => {
              const isActive = queue[currentIndex]?.id === p.id;
              return `
                <div class="card target-proj-card ${isActive ? 'is-active' : ''}" data-pid="${p.id}" style="padding:14px;border-radius:12px;background:var(--glass2);cursor:pointer;border:1px solid ${isActive ? 'var(--c)' : 'var(--line)'};transition:all .2s">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <span class="trk" style="font-size:0.75rem">${escapeHtml(p.tr)}</span>
                    <span class="bdg warn" style="font-size:0.7rem">Pending</span>
                  </div>
                  <b style="font-size:0.96rem;display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.n)}</b>
                  <p style="color:var(--mute);font-size:0.82rem;margin:0 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.t || p.teamName || 'Ready for evaluation')}</p>
                  <button class="btn main sm select-proj-btn" data-pid="${p.id}" type="button" style="width:100%;font-size:0.8rem;padding:6px 10px">Evaluate Project &rarr;</button>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }

    const compContainer = document.getElementById('completedProjectsContainer');
    if (compContainer) {
      if (completed.length === 0) {
        compContainer.innerHTML = `
          <div style="padding:14px 18px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--mute);font-size:0.88rem">
            No reviews completed yet. Pick a pending project above to evaluate.
          </div>
        `;
      } else {
        compContainer.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;max-height:280px;overflow-y:auto;padding-right:4px">
            ${completed.map(p => {
              const isActive = queue[currentIndex]?.id === p.id;
              const displayScore = p.rawScore != null ? Number(p.rawScore).toFixed(2) : '3.50';
              return `
                <div class="card target-proj-card ${isActive ? 'is-active' : ''}" data-pid="${p.id}" style="padding:14px;border-radius:12px;background:var(--glass2);cursor:pointer;border:1px solid ${isActive ? 'var(--c)' : 'var(--line)'};transition:all .2s">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <span class="trk" style="font-size:0.75rem">${escapeHtml(p.tr)}</span>
                    <span class="bdg ok" style="font-size:0.75rem;font-weight:700">⭐ ${displayScore} / 5.00</span>
                  </div>
                  <b style="font-size:0.96rem;display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.n)}</b>
                  <p style="color:var(--mute);font-size:0.82rem;margin:0 0 10px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.comment ? `"${p.comment}"` : 'No comment provided')}</p>
                  <button class="btn ghost sm select-proj-btn" data-pid="${p.id}" type="button" style="width:100%;font-size:0.8rem;padding:6px 10px;color:var(--c);border-color:rgba(55,224,255,0.4)">View / Edit Review ✏️</button>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }

    // Attach click listeners to all project selection elements
    container.querySelectorAll('.target-proj-card, .select-proj-btn').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const pid = el.getAttribute('data-pid');
        const foundIdx = queue.findIndex(x => String(x.id) === String(pid));
        if (foundIdx >= 0) {
          currentIndex = foundIdx;
          loadProject(currentIndex);
          document.getElementById('jgrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
    });

    // Bind View All Queue Modal
    const queueModal = document.getElementById('viewAllJudgeQueueModal');
    const openQueueModalBtn = document.getElementById('viewAllJudgeQueueBtn');
    const closeQueueModalBtn = document.getElementById('closeViewAllJudgeQueueBtn');
    const queueFilterInput = document.getElementById('filterJudgeQueueInput');
    const queueModalList = document.getElementById('allJudgeQueueListContainer');

    function renderQueueModalList(list) {
      if (!queueModalList) return;
      if (list.length === 0) {
        queueModalList.innerHTML = `<p style="color:var(--mute);text-align:center;padding:24px;grid-column:1/-1">No projects match search.</p>`;
        return;
      }
      queueModalList.innerHTML = list.map(p => {
        const isCompleted = p.status === 'COMPLETED';
        const scoreVal = p.rawScore != null ? Number(p.rawScore).toFixed(2) : null;
        return `
          <div style="padding:14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span class="trk" style="font-size:0.75rem">${escapeHtml(p.tr)}</span>
                <span class="bdg ${isCompleted ? 'ok' : 'warn'}" style="font-size:0.72rem">
                  ${isCompleted ? `⭐ ${scoreVal || '3.50'} / 5.00` : 'Pending'}
                </span>
              </div>
              <b style="font-size:0.96rem;display:block;margin-bottom:4px">${escapeHtml(p.n)}</b>
              <p style="color:var(--mute);font-size:0.82rem;margin:0 0 10px;line-height:1.4">${escapeHtml(p.t || p.teamName || 'Assigned Project')}</p>
            </div>
            <button class="btn ${isCompleted ? 'ghost' : 'main'} sm modal-select-proj-btn" data-pid="${p.id}" type="button" style="width:100%;font-size:0.8rem;padding:6px 10px">
              ${isCompleted ? 'View / Edit Review ✏️' : 'Evaluate Project &rarr;'}
            </button>
          </div>
        `;
      }).join('');

      queueModalList.querySelectorAll('.modal-select-proj-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-pid');
          const foundIdx = queue.findIndex(x => String(x.id) === String(pid));
          if (foundIdx >= 0) {
            currentIndex = foundIdx;
            loadProject(currentIndex);
            queueModal?.classList.remove('open');
            document.getElementById('jgrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    if (openQueueModalBtn && !openQueueModalBtn._bound) {
      openQueueModalBtn._bound = true;
      openQueueModalBtn.addEventListener('click', () => {
        renderQueueModalList(queue);
        queueModal?.classList.add('open');
      });
    }

    if (closeQueueModalBtn && !closeQueueModalBtn._bound) {
      closeQueueModalBtn._bound = true;
      closeQueueModalBtn.addEventListener('click', () => queueModal?.classList.remove('open'));
    }

    if (queueFilterInput && !queueFilterInput._bound) {
      queueFilterInput._bound = true;
      queueFilterInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) {
          renderQueueModalList(queue);
        } else {
          const filtered = queue.filter(p =>
            (p.n && p.n.toLowerCase().includes(term)) ||
            (p.tr && p.tr.toLowerCase().includes(term)) ||
            (p.status && p.status.toLowerCase().includes(term)) ||
            (p.t && p.t.toLowerCase().includes(term))
          );
          renderQueueModalList(filtered);
        }
      });
    }
  }

  function loadProject(index) {
    if (index >= queue.length) {
      const grid = document.getElementById('jgrid');
      const comp = document.getElementById('jCompletedState');
      if (grid) grid.style.display = 'none';
      if (comp) comp.style.display = 'block';
      if (coiBtn) coiBtn.style.display = 'none';
      const jq = document.getElementById('jq');
      if (jq) jq.textContent = queue.length === 0 ? 'Queue empty' : 'Queue completed';
      const jqb = document.getElementById('jqb');
      if (jqb) jqb.style.transform = 'scaleX(1)';
      renderQueueLists();
      return;
    }

    const grid = document.getElementById('jgrid');
    const comp = document.getElementById('jCompletedState');
    if (grid) grid.style.display = 'grid';
    if (comp) comp.style.display = 'none';
    if (coiBtn) coiBtn.style.display = 'inline-block';

    const p = queue[index];
    const isCompleted = p.status === 'COMPLETED';

    const trackEl = document.getElementById('jTrack');
    if (!trackEl) return;
    trackEl.textContent = p.tr;
    const queuePosEl = document.getElementById('jQueuePos');
    if (queuePosEl) queuePosEl.textContent = `Project ${index + 1} of ${queue.length}`;
    const titleEl = document.getElementById('jTitle');
    if (titleEl) titleEl.textContent = p.n;
    const taglineEl = document.getElementById('jTagline');
    if (taglineEl) taglineEl.textContent = p.t;
    const descEl = document.getElementById('jDesc');
    if (descEl) descEl.textContent = p.d;

    // Status notice for completed review vs pending
    const statusNotice = document.getElementById('reviewStatusNotice');
    if (statusNotice) {
      if (isCompleted) {
        const scoreVal = p.rawScore != null ? Number(p.rawScore).toFixed(2) : '3.50';
        statusNotice.style.display = 'block';
        statusNotice.innerHTML = `
          <div style="padding:10px 14px;border-radius:10px;background:rgba(55,224,255,0.08);border:1px solid rgba(55,224,255,0.3);color:var(--c);font-size:0.88rem;margin-bottom:14px">
            ✏️ <b>Saved Review:</b> You previously evaluated this project and awarded <b>⭐ ${scoreVal} / 5.00</b>. You can adjust the rubric sliders or notes below to update your evaluation.
          </div>
        `;
      } else {
        statusNotice.style.display = 'none';
        statusNotice.innerHTML = '';
      }
    }

    // Submit label update
    const submitLabel = document.getElementById('jSubmitLabel');
    if (submitLabel) {
      submitLabel.innerHTML = isCompleted ? 'Update score &rarr;' : 'Submit score &rarr;';
    }

    // Pre-populate rubric values
    criteria.forEach(c => {
      let val = (c.minScore + c.maxScore) / 2;
      if (isCompleted) {
        if (p.criteria && p.criteria[c.key] != null) {
          val = Number(p.criteria[c.key]);
        } else if (p.rawScore != null) {
          val = Number(p.rawScore);
        }
      }
      values[c.key] = Math.round(val * 2) / 2;
      const rangeEl = document.getElementById(`range_${c.key}`);
      const outEl = document.getElementById(`out_${c.key}`);
      if (rangeEl) rangeEl.value = values[c.key];
      if (outEl) outEl.textContent = values[c.key].toFixed(1);
    });
    calcTotal();

    // Pre-populate comment
    const commEl = document.getElementById('jComment');
    if (commEl) {
      commEl.value = isCompleted && p.comment ? p.comment : '';
    }

    // Team name and event ID badge
    const metaContainer = document.getElementById('jMetaBadges');
    if (metaContainer) {
      metaContainer.innerHTML = `
        <span class="bdg" style="background:rgba(255,255,255,0.06);font-size:0.78rem">Event #${escapeHtml(String(p.eventId))}</span>
        <span class="bdg" style="background:rgba(55,224,255,0.1);color:var(--c);font-size:0.78rem">Team: ${escapeHtml(p.teamName || 'Solo / Team')}</span>
        <span class="bdg ${p.status === 'COMPLETED' ? 'ok' : 'warn'}" style="font-size:0.78rem">${escapeHtml(p.status)}</span>
      `;
    }

    // Media: Thumbnail & Gallery
    const mediaContainer = document.getElementById('jMedia');
    if (mediaContainer) {
      mediaContainer.innerHTML = '';
      if (p.thumbnailUrl) {
        const safeThumb = sanitizeUrl(p.thumbnailUrl);
        if (safeThumb !== '#') {
          mediaContainer.innerHTML += `
            <div style="max-height:220px;overflow:hidden;border-radius:12px;margin:12px 0;border:1px solid var(--line);background:#000">
              <img src="${escapeHtml(safeThumb)}" alt="${escapeHtml(p.n)} Thumbnail" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'">
            </div>
          `;
        }
      }
      if (Array.isArray(p.galleryImages) && p.galleryImages.length > 0) {
        const validImages = p.galleryImages.map(img => sanitizeUrl(img)).filter(u => u !== '#');
        if (validImages.length > 0) {
          mediaContainer.innerHTML += `
            <div style="margin:12px 0">
              <small style="color:var(--mute);display:block;font-size:0.75rem;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Gallery Images (${validImages.length})</small>
              <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px">
                ${validImages.map(img => `
                  <a href="${escapeHtml(img)}" target="_blank" rel="noopener" style="flex:0 0 110px;height:75px;border-radius:8px;overflow:hidden;border:1px solid var(--line);display:block">
                    <img src="${escapeHtml(img)}" alt="Gallery preview" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'">
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        }
      }
    }

    const techContainer = document.getElementById('jTech');
    techContainer.innerHTML = (p.te || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

    // Action links: Live project, Hosted demo video, Source repository
    const linksContainer = document.getElementById('jLinks');
    linksContainer.innerHTML = '';
    const safeDemo = sanitizeUrl(p.demoUrl);
    const safeLive = sanitizeUrl(p.liveLink);
    const safeVideo = sanitizeUrl(p.demoVideoUrl);
    const safeRepo = sanitizeUrl(p.repoUrl);

    if (p.liveLink && safeLive !== '#') {
      linksContainer.innerHTML += `<a class="btn main sm" href="${escapeHtml(safeLive)}" target="_blank" rel="noopener">🌐 Live Project &rarr;</a>`;
    } else if (p.demoUrl && safeDemo !== '#') {
      linksContainer.innerHTML += `<a class="btn main sm" href="${escapeHtml(safeDemo)}" target="_blank" rel="noopener">🌐 Live Demo &rarr;</a>`;
    }

    if (p.demoVideoUrl && safeVideo !== '#') {
      linksContainer.innerHTML += `<a class="btn ghost sm" href="${escapeHtml(safeVideo)}" target="_blank" rel="noopener" style="border-color:var(--p);color:var(--p)">🎬 Hosted Demo Video &rarr;</a>`;
    }

    if (p.repoUrl && safeRepo !== '#') {
      linksContainer.innerHTML += `<a class="btn ghost sm" href="${escapeHtml(safeRepo)}" target="_blank" rel="noopener">💻 Source Code &rarr;</a>`;
    }

    // Custom questions & answers
    const qaContainer = document.getElementById('jCustomQa');
    if (qaContainer) {
      qaContainer.innerHTML = '';
      if (p.customAnswers) {
        let entries = [];
        if (Array.isArray(p.customAnswers)) {
          entries = p.customAnswers.map(item => [item.question || item.prompt || item.key || 'Question', item.answer || item.value || '']);
        } else if (typeof p.customAnswers === 'object') {
          entries = Object.entries(p.customAnswers);
        }
        if (entries.length > 0) {
          qaContainer.innerHTML = `
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">
              <b style="font-size:0.82rem;color:var(--mute);display:block;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Submission Details & Q&A</b>
              <div style="display:grid;gap:10px">
                ${entries.map(([q, a]) => `
                  <div style="background:var(--glass2);border:1px solid var(--line);border-radius:10px;padding:10px 14px">
                    <small style="color:var(--c);font-weight:700;display:block;margin-bottom:4px">${escapeHtml(String(q))}</small>
                    <div style="color:var(--text);font-size:0.9rem;line-height:1.5">${escapeHtml(String(a))}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }
    }

    scoredCount = queue.filter(x => x.status === 'COMPLETED').length;
    document.getElementById('jq').textContent = `Project ${index + 1} of ${queue.length}, ${scoredCount} scored`;
    document.getElementById('jqb').style.transform = `scaleX(${queue.length > 0 ? (scoredCount / queue.length) : 0})`;

    renderQueueLists();
  }

  renderRubric();
  loadProject(currentIndex);
  renderQueueLists();

  const submitBtn = document.getElementById('jSubmitScoreBtn');
  const submitLabel = document.getElementById('jSubmitLabel');
  const scoreConfirmModal = document.getElementById('scoreConfirmModal');
  const confirmProjName = document.getElementById('confirmProjectName');
  const confirmScoreVal = document.getElementById('confirmScoreValue');
  const cancelConfirmBtn = document.getElementById('cancelConfirmScoreBtn');
  const executeSubmitBtn = document.getElementById('executeSubmitScoreBtn');

  submitBtn?.addEventListener('click', () => {
    const currentProj = queue[currentIndex];
    if (!currentProj) return;
    const totalScore = parseFloat(document.getElementById('jWeightedTotal').textContent);
    confirmProjName.textContent = currentProj.n;
    confirmScoreVal.textContent = `${totalScore.toFixed(2)} / 5.00`;
    scoreConfirmModal?.classList.add('open');
  });

  cancelConfirmBtn?.addEventListener('click', () => {
    scoreConfirmModal?.classList.remove('open');
  });

  executeSubmitBtn?.addEventListener('click', async () => {
    executeSubmitBtn.disabled = true;
    submitBtn.disabled = true;
    const currentProj = queue[currentIndex];
    const totalScore = parseFloat(document.getElementById('jWeightedTotal').textContent);
    const comment = document.getElementById('jComment').value;

    try {
      await api.submitScore({
        submissionId: currentProj.id,
        eventId: currentProj.eventId || activeEventId,
        score: totalScore,
        comment,
        criteria: { ...values }
      });

      scoreConfirmModal?.classList.remove('open');
      submitLabel.innerHTML = '✓ Saved!';
      submitBtn.style.background = 'var(--m)';
      submitBtn.style.color = '#000';

      currentProj.status = 'COMPLETED';
      currentProj.rawScore = totalScore;
      currentProj.comment = comment;
      currentProj.criteria = { ...values };

      setTimeout(() => {
        submitBtn.disabled = false;
        executeSubmitBtn.disabled = false;
        submitBtn.style.background = '';
        submitBtn.style.color = '';
        notify(`Score submitted for ${currentProj.n}!`, 'success');

        renderQueueLists();

        // Advance to next uncompleted project if any remain
        const nextUncompIdx = queue.findIndex((p, idx) => idx > currentIndex && p.status !== 'COMPLETED');
        if (nextUncompIdx >= 0) {
          currentIndex = nextUncompIdx;
        } else {
          const anyUncompIdx = queue.findIndex(p => p.status !== 'COMPLETED');
          if (anyUncompIdx >= 0) {
            currentIndex = anyUncompIdx;
          }
        }
        loadProject(currentIndex);
      }, 600);
    } catch (err) {
      notify(`Failed to submit score: ${err.message}`, 'error');
      submitBtn.disabled = false;
      executeSubmitBtn.disabled = false;
    }
  });

  document.getElementById('jSkipBtn')?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % queue.length;
    loadProject(currentIndex);
    notify('Moved to next project in queue.');
  });

  document.getElementById('refreshJudgeQueueBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshJudgeQueueBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Refreshing...';
    }
    try {
      await renderJudge(container, targetAssignmentId);
      notify('Queue refreshed from server', 'info');
    } catch (err) {
      notify(`Refresh failed: ${err.message}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Refresh Queue';
      }
    }
  });

  document.getElementById('jReviewAgainBtn')?.addEventListener('click', () => {
    currentIndex = 0;
    const comp = document.getElementById('jCompletedState');
    const grid = document.getElementById('jgrid');
    if (comp) comp.style.display = 'none';
    if (grid) grid.style.display = 'grid';
    if (coiBtn) coiBtn.style.display = 'inline-block';
    loadProject(0);
  });

  // COI Modal Handling
  const coiModal = document.getElementById('coiModal');
  coiBtn?.addEventListener('click', () => {
    coiModal.classList.add('open');
  });

  document.getElementById('closeCoiBtn')?.addEventListener('click', () => {
    coiModal.classList.remove('open');
  });

  document.getElementById('confirmCoiBtn')?.addEventListener('click', async () => {
    const reason = document.getElementById('coiReasonSelect').value;
    const notes = document.getElementById('coiNotes').value;
    const currentProj = queue[currentIndex];
    const confirmBtn = document.getElementById('confirmCoiBtn');
    confirmBtn.disabled = true;

    try {
      await api.declareCOI({
        submissionId: currentProj.id,
        eventId: currentProj.eventId || activeEventId,
        reason,
        notes
      });

      coiModal.classList.remove('open');
      notify(`Conflict declared for ${currentProj.n}. Removed from queue for reassignment.`, 'success');
      queue.splice(currentIndex, 1);
      if (currentIndex >= queue.length) {
        currentIndex = 0;
      }
      loadProject(currentIndex);
    } catch (err) {
      notify(`Failed to declare conflict of interest: ${err.message}`, 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  });

  // ==========================================
  // PAIRWISE JUDGING MODE CONTROLLER
  // ==========================================
  const modeRubricTabBtn = document.getElementById('modeRubricTabBtn');
  const modePairwiseTabBtn = document.getElementById('modePairwiseTabBtn');
  const coiExplBanner = document.getElementById('coiExplBanner');
  const pairwiseContentArea = document.getElementById('pairwiseContentArea');

  let activeJudgingMode = 'rubric';
  let pairwiseKeyHandler = null;

  function switchJudgingMode(newMode) {
    activeJudgingMode = newMode;
    if (newMode === 'pairwise') {
      modeRubricTabBtn?.classList.remove('active');
      modeRubricTabBtn?.classList.add('ghost');
      modePairwiseTabBtn?.classList.add('active');
      modePairwiseTabBtn?.classList.remove('ghost');

      if (coiExplBanner) coiExplBanner.style.display = 'none';
      if (contentArea) contentArea.style.display = 'none';
      if (coiBtn) coiBtn.style.display = 'none';
      if (pairwiseContentArea) {
        pairwiseContentArea.style.display = 'block';
        loadPairwiseDuel();
      }
    } else {
      modePairwiseTabBtn?.classList.remove('active');
      modePairwiseTabBtn?.classList.add('ghost');
      modeRubricTabBtn?.classList.add('active');
      modeRubricTabBtn?.classList.remove('ghost');

      if (coiExplBanner) coiExplBanner.style.display = 'flex';
      if (contentArea) contentArea.style.display = 'block';
      if (coiBtn && queue.length > 0) coiBtn.style.display = 'inline-block';
      if (pairwiseContentArea) pairwiseContentArea.style.display = 'none';
      if (pairwiseKeyHandler) {
        window.removeEventListener('keydown', pairwiseKeyHandler);
        pairwiseKeyHandler = null;
      }
    }
  }

  modeRubricTabBtn?.addEventListener('click', () => switchJudgingMode('rubric'));
  modePairwiseTabBtn?.addEventListener('click', () => switchJudgingMode('pairwise'));

  async function loadPairwiseDuel() {
    if (!activeEventId) {
      pairwiseContentArea.innerHTML = `
        <div class="card" style="text-align:center;padding:40px 20px">
          <p style="color:var(--mute)">Please select an active hackathon event first.</p>
        </div>
      `;
      return;
    }

    pairwiseContentArea.innerHTML = `
      <div style="padding:48px 20px;text-align:center;color:var(--mute)">
        <div style="font-size:2rem;margin-bottom:8px">⚔️</div>
        Loading pairwise matchup...
      </div>
    `;

    try {
      const [progRes, pairRes] = await Promise.all([
        api.getJudgePairwiseProgress(activeEventId).catch(() => null),
        api.getNextPair(activeEventId).catch(err => { throw err; })
      ]);

      const isEnabled = progRes ? progRes.pairwiseEnabled : true;
      if (isEnabled === false) {
        pairwiseContentArea.innerHTML = `
          <div class="card" style="text-align:center;padding:48px 24px;margin-top:16px">
            <div style="font-size:2.6rem;margin-bottom:12px">⚔️</div>
            <h3 style="font-size:1.5rem">Pairwise Judging is Currently Disabled</h3>
            <p style="color:var(--mute);max-width:48ch;margin:8px auto 20px">
              The organizer has not enabled Pairwise Judging for this event. You can continue evaluating submissions using standard Rubric Scoring.
            </p>
            <button class="btn main sm" id="returnToRubricFromDisabledBtn" type="button">&larr; Return to Rubric Scoring</button>
          </div>
        `;
        document.getElementById('returnToRubricFromDisabledBtn')?.addEventListener('click', () => switchJudgingMode('rubric'));
        return;
      }

      if (!pairRes.pairAvailable || !pairRes.projectA || !pairRes.projectB) {
        const completed = progRes?.completedComparisons || pairRes.totalComparedByJudge || 0;
        pairwiseContentArea.innerHTML = `
          <div class="card" style="text-align:center;padding:48px 24px;margin-top:16px">
            <div style="font-size:2.8rem;margin-bottom:12px">🎉</div>
            <h3 style="font-size:1.6rem">All Matchups Completed!</h3>
            <p style="color:var(--mute);max-width:50ch;margin:8px auto 20px">
              ${escapeHtml(pairRes.message || 'You have compared all eligible project pairs available for your assignment queue.')}
            </p>
            <div style="display:inline-flex;gap:12px;background:var(--glass2);padding:10px 18px;border-radius:12px;border:1px solid var(--line);margin-bottom:24px">
              <span>Comparisons completed: <b style="color:var(--c)">${completed}</b></span>
            </div>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
              <button class="btn ghost sm" id="retryPairwiseBtn" type="button">🔄 Check for New Matchups</button>
              <button class="btn main sm" id="returnToRubricFromDoneBtn" type="button">&larr; Rubric Scoring</button>
            </div>
          </div>
        `;
        document.getElementById('retryPairwiseBtn')?.addEventListener('click', () => loadPairwiseDuel());
        document.getElementById('returnToRubricFromDoneBtn')?.addEventListener('click', () => switchJudgingMode('rubric'));
        return;
      }

      const pA = pairRes.projectA;
      const pB = pairRes.projectB;
      const completed = progRes?.completedComparisons || pairRes.totalComparedByJudge || 0;

      const jqEl = document.getElementById('jq');
      if (jqEl) jqEl.textContent = `Pairwise: ${completed} completed`;

      pairwiseContentArea.innerHTML = `
        <div style="margin-top:10px">
          <!-- Arena Header -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
                <span class="bdg hl" style="font-weight:700">PAIRWISE COMPARISON</span>
                <span style="color:var(--mute);font-size:0.85rem">Which project is stronger?</span>
              </div>
              <h2 style="font-size:1.5rem;margin:0">Head-to-Head Evaluation</h2>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="bdg ok">${completed} Comparisons Completed</span>
              <button class="btn ghost sm" id="skipPairwiseBtn" type="button" title="Get a different pair (S)">⏭️ Skip Pair</button>
            </div>
          </div>

          <!-- Keyboard Hints Banner -->
          <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:10px;padding:8px 14px;margin-bottom:20px;font-size:0.8rem;color:var(--mute)">
            <span>💡 <b>Keyboard Shortcuts:</b> Press <kbd style="background:var(--glass2);padding:2px 6px;border-radius:4px;border:1px solid var(--line);color:var(--text)">A</kbd> or <kbd style="background:var(--glass2);padding:2px 6px;border-radius:4px;border:1px solid var(--line);color:var(--text)">&larr;</kbd> for Project A &bull; Press <kbd style="background:var(--glass2);padding:2px 6px;border-radius:4px;border:1px solid var(--line);color:var(--text)">B</kbd> or <kbd style="background:var(--glass2);padding:2px 6px;border-radius:4px;border:1px solid var(--line);color:var(--text)">&rarr;</kbd> for Project B &bull; Press <kbd style="background:var(--glass2);padding:2px 6px;border-radius:4px;border:1px solid var(--line);color:var(--text)">S</kbd> to skip</span>
            <span style="color:var(--mute)">Strict Zero-Leakage: Ballots are completely confidential</span>
          </div>

          <!-- Duel Cards Container -->
          <div style="display:grid;grid-template-columns:1fr 70px 1fr;gap:16px;align-items:stretch;margin-bottom:20px">
            <!-- Project A Card -->
            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;border:1px solid rgba(59,130,246,0.3);background:rgba(59,130,246,0.02);position:relative">
              <div style="position:absolute;top:14px;right:14px">
                <span class="bdg" style="background:#2563EB;color:#FFF;font-weight:700">PROJECT A</span>
              </div>
              <div>
                <span class="trk" style="margin-bottom:6px;display:inline-block">${escapeHtml(pA.track || 'General')}</span>
                <h3 style="font-size:1.4rem;margin:0 0 8px;padding-right:80px;line-height:1.25">${escapeHtml(pA.title)}</h3>
                <p style="color:var(--c);font-weight:500;font-size:0.92rem;margin:0 0 12px">${escapeHtml(pA.tagline || '')}</p>
                <div style="color:var(--mute);font-size:0.9rem;line-height:1.5;margin-bottom:16px;max-height:180px;overflow-y:auto">
                  ${escapeHtml(pA.description || 'No description provided.')}
                </div>
                <!-- Links -->
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
                  ${pA.demoUrl ? `<a href="${sanitizeUrl(pA.demoUrl)}" target="_blank" rel="noopener" class="btn ghost sm" style="font-size:0.75rem;padding:3px 8px">🔗 Demo</a>` : ''}
                  ${pA.repoUrl ? `<a href="${sanitizeUrl(pA.repoUrl)}" target="_blank" rel="noopener" class="btn ghost sm" style="font-size:0.75rem;padding:3px 8px">💻 Code</a>` : ''}
                  ${pA.videoUrl ? `<a href="${sanitizeUrl(pA.videoUrl)}" target="_blank" rel="noopener" class="btn ghost sm" style="font-size:0.75rem;padding:3px 8px">🎬 Video</a>` : ''}
                </div>
              </div>
              <div>
                <button class="btn main" id="voteProjectABtn" type="button" style="width:100%;padding:14px;font-size:1.05rem;background:#2563EB;border:1px solid #3B82F6;color:#FFF;font-weight:700">
                  🏆 Project A is Better &rarr;
                </button>
              </div>
            </div>

            <!-- VS Badge -->
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.08);border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1rem;color:var(--text);letter-spacing:1px;box-shadow:0 0 16px rgba(0,0,0,0.5)">
                VS
              </div>
            </div>

            <!-- Project B Card -->
            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;border:1px solid rgba(139,92,246,0.3);background:rgba(139,92,246,0.02);position:relative">
              <div style="position:absolute;top:14px;right:14px">
                <span class="bdg" style="background:#8B5CF6;color:#FFF;font-weight:700">PROJECT B</span>
              </div>
              <div>
                <span class="trk" style="margin-bottom:6px;display:inline-block">${escapeHtml(pB.track || 'General')}</span>
                <h3 style="font-size:1.4rem;margin:0 0 8px;padding-right:80px;line-height:1.25">${escapeHtml(pB.title)}</h3>
                <p style="color:var(--p);font-weight:500;font-size:0.92rem;margin:0 0 12px">${escapeHtml(pB.tagline || '')}</p>
                <div style="color:var(--mute);font-size:0.9rem;line-height:1.5;margin-bottom:16px;max-height:180px;overflow-y:auto">
                  ${escapeHtml(pB.description || 'No description provided.')}
                </div>
                <!-- Links -->
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
                  ${pB.demoUrl ? `<a href="${sanitizeUrl(pB.demoUrl)}" target="_blank" rel="noopener" class="btn ghost sm" style="font-size:0.75rem;padding:3px 8px">🔗 Demo</a>` : ''}
                  ${pB.repoUrl ? `<a href="${sanitizeUrl(pB.repoUrl)}" target="_blank" rel="noopener" class="btn ghost sm" style="font-size:0.75rem;padding:3px 8px">💻 Code</a>` : ''}
                  ${pB.videoUrl ? `<a href="${sanitizeUrl(pB.videoUrl)}" target="_blank" rel="noopener" class="btn ghost sm" style="font-size:0.75rem;padding:3px 8px">🎬 Video</a>` : ''}
                </div>
              </div>
              <div>
                <button class="btn main" id="voteProjectBBtn" type="button" style="width:100%;padding:14px;font-size:1.05rem;background:#8B5CF6;border:1px solid #A78BFA;color:#FFF;font-weight:700">
                  🏆 Project B is Better &rarr;
                </button>
              </div>
            </div>
          </div>

          <!-- Notes & Options -->
          <div class="card" style="padding:14px 18px">
            <div class="fld" style="margin:0">
              <label for="pairwiseNotesInput" style="font-size:0.85rem">Comparative Rationale (optional):</label>
              <input type="text" id="pairwiseNotesInput" placeholder="e.g. Project A demonstrated deeper technical polish and clearer architecture." style="width:100%;border-radius:10px;background:var(--glass2);border:1px solid var(--line);padding:8px 12px;color:var(--text);font-size:0.88rem">
            </div>
          </div>
        </div>
      `;

      const voteABtn = document.getElementById('voteProjectABtn');
      const voteBBtn = document.getElementById('voteProjectBBtn');
      const skipBtn = document.getElementById('skipPairwiseBtn');
      const notesInput = document.getElementById('pairwiseNotesInput');

      async function submitDecision(winnerId) {
        if (!winnerId) return;
        voteABtn.disabled = true;
        voteBBtn.disabled = true;
        skipBtn.disabled = true;

        const winnerTitle = winnerId === pA.id ? pA.title : pB.title;
        const notes = notesInput?.value?.trim() || '';

        try {
          await api.submitPairwiseComparison(activeEventId, {
            projectAId: pA.id,
            projectBId: pB.id,
            winnerProjectId: winnerId,
            notes: notes || null
          });
          notify(`Comparison recorded: "${winnerTitle}" won! Loading next pair...`, 'success');
          loadPairwiseDuel();
        } catch (err) {
          if (err.message && err.message.includes('409')) {
            notify('This pair was already evaluated. Loading fresh matchup...', 'info');
            loadPairwiseDuel();
          } else {
            notify(`Submission failed: ${err.message}`, 'error');
            voteABtn.disabled = false;
            voteBBtn.disabled = false;
            skipBtn.disabled = false;
          }
        }
      }

      voteABtn?.addEventListener('click', () => submitDecision(pA.id));
      voteBBtn?.addEventListener('click', () => submitDecision(pB.id));
      skipBtn?.addEventListener('click', () => loadPairwiseDuel());

      if (pairwiseKeyHandler) {
        window.removeEventListener('keydown', pairwiseKeyHandler);
      }
      pairwiseKeyHandler = (e) => {
        if (activeJudgingMode !== 'pairwise') return;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return;

        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
          e.preventDefault();
          voteABtn?.click();
        } else if (e.key === 'b' || e.key === 'B' || e.key === 'ArrowRight') {
          e.preventDefault();
          voteBBtn?.click();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          skipBtn?.click();
        }
      };
      window.addEventListener('keydown', pairwiseKeyHandler);

    } catch (err) {
      pairwiseContentArea.innerHTML = `
        <div class="card" style="text-align:center;padding:40px 20px;border:1px solid rgba(255,122,144,0.3);margin-top:16px">
          <div style="font-size:2.2rem;margin-bottom:8px">⚠️</div>
          <h3 style="font-size:1.4rem;color:var(--bad)">Unable to Load Pairwise Matchup</h3>
          <p style="color:var(--mute);max-width:44ch;margin:8px auto 16px">${escapeHtml(err.message)}</p>
          <button class="btn ghost sm" id="retryPairwiseErrBtn" type="button">🔄 Retry</button>
        </div>
      `;
      document.getElementById('retryPairwiseErrBtn')?.addEventListener('click', () => loadPairwiseDuel());
    }
  }
}
