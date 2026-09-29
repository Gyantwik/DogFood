/**
 * dashboardView.js — Organizer Command Dashboard
 * Real-time operational widgets, live progress bars, rubric config & lock flag, 
 * track management, judge assignment management, and score distribution panel.
 * Connects directly to real JudgingController, EventController, and NormalizationController endpoints.
 */

import { h, $, notify, countUp, escapeHtml } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';
import { refreshEventSelectors } from './appShell.js';

export async function renderDashboard(container, eventId = null) {
  if (!eventId) {
    container.innerHTML = `
<section class="view enter" id="v-dashboard-no-event">
  <div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:48px 32px">
    <div style="font-size:2.8rem;margin-bottom:12px">📊</div>
    <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Please choose an event first</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem">
      You need to select an active hackathon event to view its organizer command dashboard, or create a new hackathon.
    </p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a class="btn ghost" href="#/gallery">Browse Active Events &rarr;</a>
      <button class="btn main" id="openCreateEventBtnNoEv" type="button">+ Create Hackathon</button>
    </div>
  </div>

  <!-- Create Hackathon Modal -->
  ${renderCreateEventModalHtml()}
</section>
`;
    bindCreateEventModal(container);
    return;
  }

  container.innerHTML = `
<section class="view enter" id="v-dashboard">
  <div class="vh row" style="align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:6px">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span class="bdg ok" style="font-weight:700">ORGANIZER COMMAND CENTER</span>
        <span class="trk" style="font-size:0.75rem">EVENT #${escapeHtml(eventId)}</span>
      </div>
      <h2 class="vt" style="margin:0">Organizer dashboard</h2>
      <p class="vs" style="margin-top:4px">Event ID ${escapeHtml(eventId)}. Real-time judging progress, operational flags, and audit distribution.</p>
    </div>
    <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button class="btn main sm" id="autoAssignBtn" type="button" style="background:#2563EB;color:#FFF;font-weight:600;border:1px solid #3B82F6">⚡ Auto-Assign Judges</button>
      <button class="btn ghost sm" id="openCreateEventBtn" type="button" style="background:rgba(255,255,255,0.06);color:#F1F5F9;border:1px solid rgba(255,255,255,0.12)">+ Create Hackathon</button>
      <button class="btn ghost sm" id="refreshDashboardBtn" type="button" style="border:1px solid rgba(255,255,255,0.1)">🔄 Refresh</button>

      <!-- CSV Export Action Group -->
      <div style="display:inline-flex;gap:4px;background:rgba(255,255,255,0.03);padding:3px 6px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);align-items:center">
        <span style="font-size:0.75rem;color:var(--mute);margin-right:2px">📥 CSV:</span>
        <button class="btn ghost sm" id="exportScoresBtn" type="button" style="font-size:0.75rem;padding:3px 8px;border:1px solid rgba(255,255,255,0.08)">Scores</button>
        <button class="btn ghost sm" id="exportProjectsBtn" type="button" style="font-size:0.75rem;padding:3px 8px;border:1px solid rgba(255,255,255,0.08)">Projects</button>
        <button class="btn ghost sm" id="exportResultsBtn" type="button" style="font-size:0.75rem;padding:3px 8px;border:1px solid rgba(255,255,255,0.08)">Leaderboard</button>
        <button class="btn ghost sm" id="exportPairwiseBtn" type="button" style="font-size:0.75rem;padding:3px 8px;border:1px solid rgba(255,255,255,0.08)">Pairwise</button>
      </div>

      <!-- Quick Action Tools Group -->
      <div style="display:inline-flex;gap:4px;background:rgba(255,255,255,0.03);padding:3px 6px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);align-items:center">
        <button class="btn ghost sm" id="openEditEventBtnTop" type="button" style="font-size:0.75rem;padding:3px 7px;border:1px solid rgba(255,255,255,0.08)" title="Edit Event Details">✏️ Edit Details</button>
        <button class="btn ghost sm" id="openViewAllEventsBtnTop" type="button" style="font-size:0.75rem;padding:3px 7px;border:1px solid rgba(255,255,255,0.08)" title="View All Events">👁️ View All</button>
        <button class="btn ghost sm" id="openVotingConfigBtnTop" type="button" style="font-size:0.75rem;padding:3px 7px;border:1px solid rgba(255,255,255,0.08)" title="Community Voting Config">🗳️ Voting</button>
        <button class="btn ghost sm" id="openWebhooksBtnTop" type="button" style="font-size:0.75rem;padding:3px 7px;border:1px solid rgba(255,255,255,0.08)" title="Webhooks Manager">🔗 Webhooks</button>
        <button class="btn ghost sm" id="openCertificatesBtnTop" type="button" style="font-size:0.75rem;padding:3px 7px;border:1px solid rgba(255,255,255,0.08)" title="Certificates Authority">📜 Certificates</button>
        <button class="btn ghost sm" id="openBulkBtnTop" type="button" style="font-size:0.75rem;padding:3px 7px;border:1px solid rgba(255,255,255,0.08)" title="Bulk JSON Migration">📦 Bulk Data</button>
        <button class="btn ghost sm" id="openAuditLogsBtnTop" type="button" style="font-size:0.75rem;padding:3px 7px;border:1px solid rgba(255,255,255,0.08)" title="Operational Audit Log">🛡️ Audit Log</button>
        <button class="btn ghost sm" id="openPairwiseBtnTop" type="button" style="font-size:0.75rem;padding:3px 7px;border:1px solid rgba(255,255,255,0.08)" title="Pairwise Bradley-Terry Rankings">⚔️ Pairwise</button>
      </div>
    </div>
  </div>

  <!-- Interactive Dashboard Tabs Navigation -->
  <nav class="org-nav-tabs" role="tablist" id="orgTabsNav">
    <button class="org-tab-btn active" data-tab="tab-overview" type="button">📊 Overview</button>
    <button class="org-tab-btn" data-tab="tab-judging" type="button">⚖️ Judging &amp; Queue</button>
    <button class="org-tab-btn" data-tab="tab-setup" type="button">⚙️ Setup &amp; Rubric</button>
    <button class="org-tab-btn" data-tab="tab-analytics" type="button">📈 Score Bias &amp; Analytics</button>
    <button class="org-tab-btn" data-tab="tab-trust" type="button">🛡️ Advanced Operations (T3/T4)</button>
  </nav>

  <div id="dashboardContentArea">
    <div style="padding:40px;text-align:center;color:var(--mute)">Loading dashboard telemetry...</div>
  </div>

  <!-- Create Hackathon Modal -->
  ${renderCreateEventModalHtml()}

  <!-- Edit Hackathon Modal -->
  ${renderEditEventModalHtml()}

  <!-- View All Hackathons Modal -->
  ${renderViewAllEventsModalHtml()}

  <!-- View All Progress Modal -->
  ${renderViewAllProgressModalHtml()}

  <!-- View All Judges Modal -->
  ${renderViewAllJudgesModalHtml()}

  <!-- View All Assignments Modal -->
  ${renderViewAllAssignmentsModalHtml()}

  <!-- View All Distribution Modal -->
  ${renderViewAllDistributionModalHtml()}

  <!-- Webhooks Modal (T4) -->
  ${renderWebhooksModalHtml()}

  <!-- Certificates Modal (T4) -->
  ${renderCertificatesModalHtml()}

  <!-- Bulk Data Modal (T4) -->
  ${renderBulkModalHtml()}

  <!-- Audit Log Modal (T3/T4) -->
  ${renderAuditLogsModalHtml()}

  <!-- Community Voting Modal (T3) -->
  ${renderCommunityVotingModalHtml()}

  <!-- Normalization Proof Modal (T2) -->
  ${renderNormalizationProofModalHtml()}
</section>
`;

  bindCreateEventModal(container);

  const contentArea = document.getElementById('dashboardContentArea');

  try {
    const [dashRes, distRes, rubricRes, tracksRes, judgesRes, assignmentsRes, submissionsRes, customQsRes, eventRes, coverageRes, workloadRes, healthRes, normRes] = await Promise.all([
      api.getDashboard(eventId).catch(err => { throw err; }),
      api.getScoreDistribution(eventId).catch(() => []),
      api.getRubricDetails(eventId).catch(() => null),
      api.getTracks(eventId).catch(() => []),
      api.getJudges(eventId).catch(() => []),
      api.getAssignments(eventId).catch(() => []),
      api.getSubmissions(eventId).catch(() => []),
      api.getCustomQuestions(eventId).catch(() => []),
      api.getEvent(eventId).catch(() => null),
      api.getJudgeCoverage(eventId).catch(() => []),
      api.getJudgeWorkload(eventId).catch(() => []),
      api.getScoringHealth(eventId).catch(() => null),
      api.getNormalizationAnalysis(eventId).catch(() => null)
    ]);

    const dash = dashRes?.data || dashRes;
    const distribution = Array.isArray(distRes?.data || distRes) ? (distRes?.data || distRes) : [];
    const rubric = rubricRes?.data || rubricRes;
    const tracks = Array.isArray(tracksRes?.data || tracksRes) ? (tracksRes?.data || tracksRes) : [];
    const judges = Array.isArray(judgesRes?.data || judgesRes) ? (judgesRes?.data || judgesRes) : [];
    const assignments = Array.isArray(assignmentsRes?.data || assignmentsRes) ? (assignmentsRes?.data || assignmentsRes) : [];
    const submissions = Array.isArray(submissionsRes?.data || submissionsRes) ? (submissionsRes?.data || submissionsRes) : [];
    const customQuestions = Array.isArray(customQsRes?.data || customQsRes) ? (customQsRes?.data || customQsRes) : [];
    const eventDetails = eventRes?.data || eventRes || {};
    const coverageData = coverageRes?.data || coverageRes || {};
    const coverageList = Array.isArray(coverageData) ? coverageData : (coverageData.projectCoverages || []);
    const workloadData = workloadRes?.data || workloadRes || {};
    const workloadList = Array.isArray(workloadData) ? workloadData : (workloadData.judges || []);
    const scoringHealth = healthRes?.data || healthRes || null;
    const normAnalysis = normRes?.data || normRes || null;

    const projectsSubmitted = dash.projectsSubmitted || submissions.length || 0;
    const judgesCount = dash.judgesCount || judges.length || 0;
    const avgScore = dash.avgScore || 0;
    const judgeProgressList = dash.progressByJudge || [];
    const attentionItems = dash.needsAttention || [];
    const criteriaList = (rubric && rubric.criteria) ? rubric.criteria : [];
    const isRubricLocked = rubric?.locked || false;

    contentArea.innerHTML = `
      <!-- TAB 1: OVERVIEW -->
      <div id="tab-overview" class="org-tab-pane" style="display:block">
        <!-- Metric Count Cards -->
        <div class="stats4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:12px 0 20px">
          <div class="card sc4">
            <span style="color:var(--mute);font-size:.9rem">Projects submitted</span>
            <b id="statProjects" data-count="${projectsSubmitted}" style="font-family:var(--display);font-weight:800;font-size:2.5rem;letter-spacing:-.04em;line-height:1.1;display:block">0</b>
          </div>
          <div class="card sc4">
            <span style="color:var(--mute);font-size:.9rem">Active judges</span>
            <b id="statJudges" data-count="${judgesCount}" style="font-family:var(--display);font-weight:800;font-size:2.5rem;letter-spacing:-.04em;line-height:1.1;display:block">0</b>
          </div>
          <div class="card sc4">
            <span style="color:var(--mute);font-size:.9rem">Review flags</span>
            <b style="font-family:var(--display);font-weight:800;font-size:2.5rem;letter-spacing:-.04em;line-height:1.1;display:block;color:${attentionItems.length > 0 ? 'var(--bad)' : 'var(--m)'}">${attentionItems.length}</b>
          </div>
          <div class="card sc4 hl">
            <span style="color:var(--mute);font-size:.9rem">Average raw score</span>
            <b id="statAvg" data-count="${avgScore.toFixed(2)}" data-dec="2" style="font-family:var(--display);font-weight:800;font-size:2.5rem;letter-spacing:-.04em;line-height:1.1;display:block;color:#F8FAFC">0</b>
          </div>
        </div>

        <!-- Hackathon Details & Schedule Card -->
        <div class="card" style="margin:20px 0;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:14px">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                <span class="bdg ${eventDetails.status === 'CLOSED' ? 'bad' : 'ok'}" style="font-weight:600;font-size:0.8rem">
                  ${escapeHtml(eventDetails.status || 'OPEN')}
                </span>
                <span style="color:var(--mute);font-size:0.85rem">Event #${escapeHtml(String(eventId))}</span>
              </div>
              <h3 style="font-size:1.5rem;letter-spacing:-.02em;margin:0 0 6px">${escapeHtml(eventDetails.name || 'Hackathon Event')}</h3>
              <p style="color:var(--mute);font-size:0.92rem;max-width:70ch;line-height:1.5;margin:0">
                ${escapeHtml(eventDetails.description || 'No description provided for this hackathon.')}
              </p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn ghost sm" id="openEditEventBtn" type="button" style="border:1px solid rgba(255,255,255,0.12)">✏️ Edit Details</button>
              <button class="btn ghost sm" id="openViewAllEventsBtn" type="button" style="border:1px solid rgba(255,255,255,0.12)">👁️ View All Hackathons</button>
            </div>
          </div>

          <!-- Submission Deadline Banner -->
          <div style="padding:14px 18px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);margin:16px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
              <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--mute);display:block;font-weight:600">📌 Submission Deadline (Last Date to Submit)</span>
              <b style="font-size:1.25rem;color:#F8FAFC;font-family:var(--display)">
                ${eventDetails.submissionDeadline ? formatDateTime(eventDetails.submissionDeadline) : 'No deadline configured'}
              </b>
            </div>
            <div>
              ${getDeadlineBadgeHtml(eventDetails.submissionDeadline, eventDetails.status)}
            </div>
          </div>

          <!-- Full Schedule & Lifecycle Phases Grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:14px">
            <div style="padding:12px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)">
              <small style="color:var(--mute);display:block;font-size:0.75rem;text-transform:uppercase;letter-spacing:.04em;font-weight:700">📝 Registration Phase</small>
              <div style="font-size:0.85rem;margin-top:4px;line-height:1.4">
                <b>Start:</b> ${formatDateTime(eventDetails.registrationStart)}<br>
                <b>End:</b> ${formatDateTime(eventDetails.registrationEnd)}
              </div>
            </div>
            <div style="padding:12px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)">
              <small style="color:var(--mute);display:block;font-size:0.75rem;text-transform:uppercase;letter-spacing:.04em;font-weight:700">🚀 Hackathon Window</small>
              <div style="font-size:0.85rem;margin-top:4px;line-height:1.4">
                <b>Start:</b> ${formatDateTime(eventDetails.eventStart)}<br>
                <b>End:</b> ${formatDateTime(eventDetails.eventEnd)}
              </div>
            </div>
            <div style="padding:12px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)">
              <small style="color:var(--mute);display:block;font-size:0.75rem;text-transform:uppercase;letter-spacing:.04em;font-weight:700">💻 Project Submissions</small>
              <div style="font-size:0.85rem;margin-top:4px;line-height:1.4">
                <b>Opens:</b> ${formatDateTime(eventDetails.submissionStart || eventDetails.registrationEnd)}<br>
                <b>Deadline:</b> ${formatDateTime(eventDetails.submissionDeadline)}
              </div>
            </div>
            <div style="padding:12px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)">
              <small style="color:var(--mute);display:block;font-size:0.75rem;text-transform:uppercase;letter-spacing:.04em;font-weight:700">⚖️ Judging & Results</small>
              <div style="font-size:0.85rem;margin-top:4px;line-height:1.4">
                <b>Judging:</b> ${formatDateTime(eventDetails.judgingStart)} &rarr; ${formatDateTime(eventDetails.judgingEnd)}<br>
                <b>Publish At:</b> ${formatDateTime(eventDetails.resultsPublishAt)}
              </div>
            </div>
          </div>

          ${tracks.length > 0 ? `
            <div style="margin-top:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:0.8rem;color:var(--mute);font-weight:600">Active Tracks:</span>
              ${tracks.map(t => `<span class="trk" style="font-size:0.75rem">${escapeHtml(t.name)}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Quick Interactive Jump Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:20px 0">
          <div class="card org-quick-tile" data-jump="tab-judging" style="padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
            <div style="font-size:1.6rem;margin-bottom:8px">⚖️</div>
            <b style="font-size:0.95rem;display:block">Judging &amp; Queue</b>
            <p style="color:var(--mute);font-size:0.82rem;margin:4px 0 10px">${judges.length} judges &bull; ${assignments.length} assignments</p>
            <span style="color:#93C5FD;font-size:0.8rem;font-weight:600">Manage Queue &rarr;</span>
          </div>

          <div class="card org-quick-tile" data-jump="tab-setup" style="padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
            <div style="font-size:1.6rem;margin-bottom:8px">⚙️</div>
            <b style="font-size:0.95rem;display:block">Setup &amp; Rubric</b>
            <p style="color:var(--mute);font-size:0.82rem;margin:4px 0 10px">${criteriaList.length} criteria &bull; ${tracks.length} tracks</p>
            <span style="color:#93C5FD;font-size:0.8rem;font-weight:600">Configure Rubric &rarr;</span>
          </div>

          <div class="card org-quick-tile" data-jump="tab-analytics" style="padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
            <div style="font-size:1.6rem;margin-bottom:8px">📈</div>
            <b style="font-size:0.95rem;display:block">Score Bias &amp; Analytics</b>
            <p style="color:var(--mute);font-size:0.82rem;margin:4px 0 10px">${distribution.length} judge distributions calculated</p>
            <span style="color:#93C5FD;font-size:0.8rem;font-weight:600">View Statistics &rarr;</span>
          </div>

          <div class="card org-quick-tile" data-jump="tab-trust" style="padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
            <div style="font-size:1.6rem;margin-bottom:8px">🛡️</div>
            <b style="font-size:0.95rem;display:block">Advanced Operations</b>
            <p style="color:var(--mute);font-size:0.82rem;margin:4px 0 10px">Voting, Webhooks, Certificates &amp; Audit</p>
            <span style="color:#93C5FD;font-size:0.8rem;font-weight:600">Explore T3/T4 &rarr;</span>
          </div>
        </div>

        <!-- Operational Diagnostic Widgets -->
        <div class="card" style="margin:20px 0;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <div>
              <h3 style="font-size:1.35rem">Operational anomaly flags</h3>
              <p style="color:var(--mute);font-size:.9rem">Real-time alerts from server telemetry for workload imbalances, stalled reviews, and duplicate submissions.</p>
            </div>
            <span class="bdg ${attentionItems.length > 0 ? 'warn' : 'ok'}">${attentionItems.length} Active Items</span>
          </div>

          ${attentionItems.length === 0 ? `
            <div style="padding:24px;border-radius:12px;background:rgba(255,255,255,0.03);text-align:center;color:var(--mute);border:1px solid rgba(255,255,255,0.06)">
              ✓ All judging operations nominal. No review bottlenecks or COI collisions detected.
            </div>
          ` : `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
              ${attentionItems.map(item => `
                <div style="padding:16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08)">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <b style="font-size:.94rem;color:#F8FAFC">${escapeHtml(item.project)}</b>
                    <span class="bdg ${item.status === 'Blocked' || item.status === 'Warning' ? 'bad' : 'warn'}">${escapeHtml(item.status)}</span>
                  </div>
                  <p style="color:var(--mute);font-size:.88rem;margin-top:6px">${escapeHtml(item.issue)}</p>
                  <div style="margin-top:10px;font-size:0.78rem;color:#93C5FD;font-weight:600">${escapeHtml(item.actionLabel || 'Action required')}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- TAB 2: JUDGING & QUEUE -->
      <div id="tab-judging" class="org-tab-pane" style="display:none">
        <!-- Live Progress Section -->
        <div class="card" style="margin-bottom:22px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
            <div>
              <h3 style="margin:0">Live judging progress &amp; coverage</h3>
              <p style="color:var(--mute);font-size:0.88rem;margin:2px 0 0">Real-time completion percentage and assignment distribution across judges.</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn ghost sm" id="viewAllProgressBtn" type="button" style="font-size:0.78rem;padding:3px 8px">👁️ View All (${judgeProgressList.length})</button>
              <span class="live-pill"><i></i>Database-backed</span>
            </div>
          </div>

          <!-- Assignment & Coverage Telemetry -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;background:var(--glass2);padding:14px;border-radius:12px;border:1px solid var(--line);font-size:0.85rem">
            <div>
              <span style="color:var(--mute);display:block">Active Reviews</span>
              <b style="font-size:1.15rem;color:var(--c)">${dash.completedAssignments != null ? dash.completedAssignments : 0} / ${dash.totalEligibleAssignments != null ? dash.totalEligibleAssignments : assignments.length}</b>
            </div>
            <div>
              <span style="color:var(--mute);display:block">Pending</span>
              <b style="font-size:1.15rem;color:var(--warn)">${dash.pendingAssignments != null ? dash.pendingAssignments : 0}</b>
            </div>
            <div>
              <span style="color:var(--mute);display:block">COI Excluded</span>
              <b style="font-size:1.15rem;color:var(--mute)">${dash.removedCoiAssignments != null ? dash.removedCoiAssignments : 0}</b>
            </div>
            <div>
              <span style="color:var(--mute);display:block">Unfinished Judges</span>
              <b style="font-size:1.15rem;color:var(--p)">${dash.judgesWithOutstandingWork != null ? dash.judgesWithOutstandingWork : 0}</b>
            </div>
          </div>

          <div style="margin-bottom:16px;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,0.03);font-size:0.85rem;color:var(--mute)">
            <b>Project Coverage:</b>
            <span style="margin-left:8px;color:${(dash.projectsWithZeroReviews || 0) > 0 ? 'var(--warn)' : 'var(--text)'}">0 reviews: <b>${dash.projectsWithZeroReviews != null ? dash.projectsWithZeroReviews : 0}</b></span> &bull;
            <span style="margin-left:8px;color:var(--text)">1 review: <b>${dash.projectsWithOneReview != null ? dash.projectsWithOneReview : 0}</b></span> &bull;
            <span style="margin-left:8px;color:var(--ok)">2+ reviews: <b>${dash.projectsWithMultipleReviews != null ? dash.projectsWithMultipleReviews : 0}</b></span>
          </div>
          
          <div style="display:grid;gap:14px;max-height:260px;overflow-y:auto;padding-right:6px" id="progressBarsContainer">
            ${judgeProgressList.length === 0 ? `
              <p style="color:var(--mute)">No judges assigned to review projects yet.</p>
            ` : judgeProgressList.map(j => {
              const pct = j.total > 0 ? Math.round((j.scored / j.total) * 100) : 0;
              return `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:.9rem;font-weight:600;margin-bottom:6px">
                    <span>${escapeHtml(j.name)}</span>
                    <span style="font-family:var(--mono)">${j.scored} / ${j.total} (${pct}%)</span>
                  </div>
                  <div style="height:8px;border-radius:99px;background:rgba(255,255,255,0.08);overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:#3B82F6;border-radius:99px"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Judge Management & Manual Assignment Section -->
        <div class="card" id="judgeAssignmentSection">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:gap:10px">
            <div>
              <h3>Judge assignment &amp; queue management</h3>
              <p style="color:var(--mute);font-size:.9rem">Inspect active judges, assign projects manually, or execute automatic track-matched balancing.</p>
            </div>
            <span class="bdg ok">${judges.length} Judges &bull; ${assignments.length} Assignments</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-top:16px">
            <!-- Active Judges Panel with Live Search Filter -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <h4 style="font-size:1rem;margin:0">Registered judges (${judges.length})</h4>
                <button class="btn ghost sm" id="viewAllJudgesBtn" type="button" style="font-size:0.75rem;padding:2px 8px">👁️ View All</button>
              </div>
              <input type="text" id="judgeSearchInput" placeholder="🔍 Search judges..." style="width:100%;height:34px;padding:0 10px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);font-size:0.82rem;margin-bottom:10px">
              <div id="judgesListContainer" style="display:grid;gap:6px;max-height:220px;overflow-y:auto;padding-right:4px">
                ${judges.length === 0 ? `
                  <p style="color:var(--mute);font-size:0.88rem">No judges registered for this event yet.</p>
                ` : judges.map(j => `
                  <div data-search="${escapeHtml(j.username)} ${escapeHtml(j.email)}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);font-size:0.88rem">
                    <span><b>${escapeHtml(j.username)}</b> <small style="color:var(--mute)">(${escapeHtml(j.email)})</small></span>
                    <span class="trk" style="font-size:0.75rem">ID ${j.id}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Manual Assignment Form -->
            <div>
              <h4 style="font-size:1rem;margin-bottom:8px">Assign judge to project</h4>
              <form id="manualAssignForm" style="display:grid;gap:10px">
                <div>
                  <label style="font-size:0.78rem;color:var(--mute);font-weight:700">SELECT JUDGE</label>
                  <select id="assignJudgeSelect" required style="width:100%;height:38px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 10px;font-size:0.88rem">
                    <option value="">Choose a judge</option>
                    ${judges.map(j => `<option value="${j.id}">${escapeHtml(j.username)} (${escapeHtml(j.email)})</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label style="font-size:0.78rem;color:var(--mute);font-weight:700">SELECT SUBMISSION</label>
                  <select id="assignSubSelect" required style="width:100%;height:38px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 10px;font-size:0.88rem">
                    <option value="">Choose a submission</option>
                    ${submissions.map(s => `<option value="${s.id}">${escapeHtml(s.title || s.name || 'Submission ' + s.id)} (${escapeHtml(s.track || 'General')})</option>`).join('')}
                  </select>
                </div>

                <div id="assignFeedback" style="display:none;padding:10px;border-radius:8px;font-size:0.85rem"></div>

                <button type="submit" class="btn main sm" id="submitAssignBtn" style="justify-self:start">Assign Judge &rarr;</button>
              </form>
            </div>
          </div>

          <!-- Assignments Table with Live Search Filter -->
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px">
              <h4 style="font-size:1rem;margin:0">Active assignments (${assignments.length})</h4>
              <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                <input type="text" id="assignmentSearchInput" placeholder="🔍 Search assignments by judge, project, track..." style="height:32px;padding:0 10px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);font-size:0.82rem;min-width:240px">
                <button class="btn ghost sm" id="viewAllAssignmentsBtn" type="button" style="font-size:0.75rem;padding:3px 8px">👁️ View All</button>
              </div>
            </div>
            <div style="max-height:260px;overflow-y:auto;border-radius:12px;border:1px solid var(--line);background:var(--glass2)">
              ${assignments.length === 0 ? `
                <div style="padding:20px;text-align:center;color:var(--mute);font-size:0.88rem">No assignments made yet. Click "⚡ Auto-Assign Judges" above or assign manually.</div>
              ` : `
                <table style="width:100%;border-collapse:collapse;font-size:0.86rem">
                  <thead>
                    <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
                      <th style="padding:10px 14px">ID</th>
                      <th style="padding:10px 14px">Judge</th>
                      <th style="padding:10px 14px">Submission</th>
                      <th style="padding:10px 14px">Track</th>
                      <th style="padding:10px 14px">Event</th>
                      <th style="padding:10px 14px">Status</th>
                      <th style="padding:10px 14px">Action</th>
                    </tr>
                  </thead>
                  <tbody id="assignmentsTableBody">
                    ${assignments.map(a => `
                      <tr data-search="${escapeHtml(a.judgeUsername || 'Judge #' + a.judgeId)} ${escapeHtml(a.submissionTitle || 'Submission #' + a.submissionId)} ${escapeHtml(a.track || 'General')}" style="border-bottom:1px solid rgba(255,255,255,0.05)">
                        <td style="padding:8px 14px;font-family:var(--mono)">#${a.id}</td>
                        <td style="padding:8px 14px;font-weight:600">${escapeHtml(a.judgeUsername || 'Judge #' + a.judgeId)}</td>
                        <td style="padding:8px 14px">${escapeHtml(a.submissionTitle || 'Submission #' + a.submissionId)}</td>
                        <td style="padding:8px 14px"><span class="trk" style="font-size:0.75rem">${escapeHtml(a.track || 'General')}</span></td>
                        <td style="padding:8px 14px;color:var(--mute);font-size:0.8rem">#${escapeHtml(String(a.eventId || eventId))}</td>
                        <td style="padding:8px 14px">
                          <span class="bdg ${a.status === 'COMPLETED' || a.status === 'SCORED' ? 'ok' : a.status === 'REMOVED_COI' ? 'bad' : 'warn'}" style="font-size:0.75rem">${escapeHtml(a.status || 'ASSIGNED')}</span>
                        </td>
                        <td style="padding:8px 14px">
                          ${a.status !== 'COMPLETED' ? `
                            <button class="btn ghost sm remove-assignment-btn" data-aid="${a.id}" type="button" style="padding:3px 8px;font-size:0.75rem;color:var(--bad);border-color:rgba(255,122,144,0.3)">Remove</button>
                          ` : `
                            <span style="color:var(--mute);font-size:0.75rem">Reviewed</span>
                          `}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
          </div>
        </div>

        <!-- Judge Coverage & Workload Balancing Section (T2 Upgrade) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;margin-top:22px">
          <!-- Submissions Review Coverage Card -->
          <div class="card" id="judgeCoverageCard">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
              <div>
                <h4 style="font-size:1.05rem;margin:0">Submissions Review Coverage</h4>
                <p style="color:var(--mute);font-size:0.82rem;margin:2px 0 0">Target: 3 independent reviews per submission for statistical validity.</p>
              </div>
              <span class="bdg ok">${coverageList.filter(c => (c.completedCount || 0) >= (c.targetCount || 3)).length} / ${coverageList.length || submissions.length} Fully Covered</span>
            </div>

            <div style="display:flex;gap:10px;margin-bottom:10px">
              <input type="text" id="coverageSearchInput" placeholder="🔍 Search projects..." style="width:100%;height:32px;padding:0 10px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);font-size:0.82rem">
            </div>

            <div style="max-height:280px;overflow-y:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2)">
              ${coverageList.length === 0 ? `
                <div style="padding:16px;text-align:center;color:var(--mute);font-size:0.85rem">No submission coverage telemetry available yet.</div>
              ` : `
                <table style="width:100%;border-collapse:collapse;font-size:0.84rem">
                  <thead>
                    <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
                      <th style="padding:8px 10px">Submission</th>
                      <th style="padding:8px 10px">Track</th>
                      <th style="padding:8px 10px">Assigned</th>
                      <th style="padding:8px 10px">Completed</th>
                      <th style="padding:8px 10px">Status</th>
                    </tr>
                  </thead>
                  <tbody id="coverageTableBody">
                    ${coverageList.map(c => {
                      const isFull = (c.completedCount || 0) >= (c.targetCount || 3);
                      const isPartial = (c.completedCount || 0) > 0;
                      return `
                        <tr data-search="${escapeHtml(c.projectTitle || '')} ${escapeHtml(c.track || '')}" style="border-bottom:1px solid rgba(255,255,255,0.05)">
                          <td style="padding:8px 10px;font-weight:600">${escapeHtml(c.projectTitle || 'Submission #' + c.submissionId)}</td>
                          <td style="padding:8px 10px"><span class="trk" style="font-size:0.72rem">${escapeHtml(c.track || 'General')}</span></td>
                          <td style="padding:8px 10px;font-family:var(--mono)">${c.assignedCount || 0}/${c.targetCount || 3}</td>
                          <td style="padding:8px 10px;font-family:var(--mono)">${c.completedCount || 0}/${c.targetCount || 3}</td>
                          <td style="padding:8px 10px">
                            <span class="bdg ${isFull ? 'ok' : isPartial ? 'warn' : 'bad'}" style="font-size:0.72rem">
                              ${isFull ? '3/3 ✓ COMPLETE' : isPartial ? `${c.completedCount}/${c.targetCount || 3} ⚠️ IN PROGRESS` : '0/3 ❌ UNASSIGNED'}
                            </span>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `}
            </div>
          </div>

          <!-- Judge Workload Balancing Card -->
          <div class="card" id="judgeWorkloadCard">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
              <div>
                <h4 style="font-size:1.05rem;margin:0">Judge Workload Balancing</h4>
                <p style="color:var(--mute);font-size:0.82rem;margin:2px 0 0">Equitable review queue allocation across available judges.</p>
              </div>
              <span class="bdg ok">${workloadList.length || judges.length} Evaluators</span>
            </div>

            <div style="max-height:320px;overflow-y:auto;display:grid;gap:10px;padding-right:4px">
              ${workloadList.length === 0 ? `
                <div style="padding:16px;text-align:center;color:var(--mute);font-size:0.85rem">No workload telemetry available.</div>
              ` : workloadList.map(w => {
                const pct = w.assignedCount > 0 ? Math.round(((w.completedCount || 0) / w.assignedCount) * 100) : 0;
                return `
                  <div style="padding:10px 14px;border-radius:10px;background:var(--glass2);border:1px solid var(--line)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                      <b style="font-size:0.88rem">${escapeHtml(w.judgeName || 'Judge #' + w.judgeId)}</b>
                      <span class="bdg ${pct === 100 ? 'ok' : w.assignedCount === 0 ? 'mute' : 'warn'}" style="font-size:0.7rem">
                        ${escapeHtml(w.status || (pct === 100 ? 'COMPLETED' : 'IN_PROGRESS'))}
                      </span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--mute);margin-bottom:6px">
                      <span>Assigned: <b>${w.assignedCount || 0}</b></span>
                      <span>Done: <b style="color:var(--ok)">${w.completedCount || 0}</b></span>
                      <span>Remaining: <b style="color:var(--warn)">${w.remainingCount || 0}</b></span>
                      <span>${pct}%</span>
                    </div>
                    <div style="height:6px;border-radius:99px;background:rgba(255,255,255,0.08);overflow:hidden">
                      <div style="height:100%;width:${pct}%;background:#3B82F6;border-radius:99px"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- PAIRWISE JUDGING SECTION (BRADLEY-TERRY) -->
        <div id="pairwiseJudgingSection" style="margin-top:24px">
        <!-- Control Header & Mode Toggle -->
        <div class="card" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
              <h3 style="margin:0">⚔️ Pairwise Judging Mode (Bradley-Terry)</h3>
              <span class="bdg ${eventDetails.pairwiseJudgingEnabled ? 'ok' : 'mute'}" id="pairwiseStatusBadge">
                ${eventDetails.pairwiseJudgingEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <p style="color:var(--mute);font-size:0.9rem;margin:0;max-width:68ch">
              Judges compare pairs of projects head-to-head. Overall project skill levels and rankings are recovered via the Bradley-Terry Minorization-Maximization (MM) algorithm.
            </p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn ${eventDetails.pairwiseJudgingEnabled ? 'ghost' : 'main'} sm" id="togglePairwiseBtn" type="button">
              ${eventDetails.pairwiseJudgingEnabled ? 'Disable Pairwise Mode' : 'Enable Pairwise Mode'}
            </button>
            <button class="btn ghost sm" id="exportPairwiseCsvTabBtn" type="button">📥 Export Pairwise CSV</button>
            <button class="btn ghost sm" id="refreshPairwiseTabBtn" type="button">🔄 Refresh Telemetry</button>
          </div>
        </div>

        <!-- Telemetry & Coverage Cards -->
        <div class="stats4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px">
          <div class="card sc4">
            <span style="color:var(--mute);font-size:.9rem">Eligible Projects</span>
            <b id="pwEligibleProjects" style="font-family:var(--display);font-weight:800;font-size:2.2rem;line-height:1.1;display:block">0</b>
            <small style="color:var(--mute);font-size:0.75rem">Active submissions</small>
          </div>
          <div class="card sc4">
            <span style="color:var(--mute);font-size:.9rem">Total Possible Pairs</span>
            <b id="pwPossiblePairs" style="font-family:var(--display);font-weight:800;font-size:2.2rem;line-height:1.1;display:block">0</b>
            <small style="color:var(--mute);font-size:0.75rem">N &times; (N - 1) / 2</small>
          </div>
          <div class="card sc4">
            <span style="color:var(--mute);font-size:.9rem">Unique Pairs Compared</span>
            <b id="pwUniquePairs" style="font-family:var(--display);font-weight:800;font-size:2.2rem;line-height:1.1;display:block">0</b>
            <small id="pwCoveragePct" style="color:var(--c);font-weight:600;font-size:0.8rem">0.0% coverage</small>
          </div>
          <div class="card sc4 hl">
            <span style="color:var(--mute);font-size:.9rem">Graph Connectivity</span>
            <b id="pwGraphStatus" style="font-family:var(--display);font-weight:800;font-size:1.6rem;line-height:1.2;display:block;color:var(--ok)">CONNECTED</b>
            <small id="pwComponentsCount" style="color:var(--mute);font-size:0.75rem">Single connected component</small>
          </div>
        </div>

        <!-- Disconnected Graph Warning Alert -->
        <div id="pwDisconnectedAlert" style="display:none;background:rgba(255,180,0,0.08);border:1px solid rgba(255,180,0,0.25);border-radius:14px;padding:14px 18px;margin-bottom:20px;font-size:0.88rem;color:var(--text);line-height:1.5;gap:12px;align-items:flex-start">
          <span style="font-size:1.3rem;line-height:1">⚠️</span>
          <div>
            <b style="color:var(--warn);display:block;margin-bottom:2px">Incomplete Comparison Coverage (Disconnected Comparison Graph)</b>
            <span id="pwDisconnectedMsg">The pairwise comparison graph contains disconnected clusters. Collect more head-to-head comparisons across disjoint project clusters before publishing final rankings.</span>
          </div>
        </div>

        <!-- Bradley-Terry Latent Strength Rankings Table Card -->
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
            <div>
              <h3 style="margin:0">🏆 Bradley-Terry Latent Strength Rankings</h3>
              <p style="color:var(--mute);font-size:0.88rem;margin:2px 0 0">
                Recovered via iterative Minorization-Maximization until convergence (&Delta; &lt; 10⁻⁶). Strengths normalized to mean = 1.000.
              </p>
            </div>
            <div id="btConvergenceBadge" style="font-size:0.8rem;color:var(--mute)"></div>
          </div>

          <div style="overflow-x:auto">
            <div style="min-width:680px">
              <div style="display:grid;grid-template-columns:60px 2.5fr 1fr 1fr 1fr 1fr 1.2fr;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);font-size:0.82rem;font-weight:700;color:var(--mute);text-transform:uppercase">
                <div>Rank</div>
                <div>Project Title</div>
                <div>Track</div>
                <div style="text-align:right">Comparisons</div>
                <div style="text-align:right">Record</div>
                <div style="text-align:right">Win Rate</div>
                <div style="text-align:right">BT Strength</div>
              </div>
              <div id="pairwiseResultsTableBody" style="display:grid;gap:6px;margin-top:6px">
                <div style="text-align:center;padding:24px;color:var(--mute)">Loading rankings...</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Comparisons Audit Stream Card -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
            <div>
              <h3 style="margin:0">📋 Audit Log &amp; Comparison Stream</h3>
              <p style="color:var(--mute);font-size:0.88rem;margin:2px 0 0">
                Immutable audit record of all head-to-head comparisons submitted by authorized judges.
              </p>
            </div>
            <span class="bdg" id="totalCompsCountBadge">0 Total Comparisons</span>
          </div>
          <div style="overflow-x:auto">
            <div style="min-width:640px">
              <div style="display:grid;grid-template-columns:100px 100px 1fr 1fr 1fr 2fr;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);font-size:0.82rem;font-weight:700;color:var(--mute);text-transform:uppercase">
                <div>Time</div>
                <div>Judge ID</div>
                <div>Project A</div>
                <div>Project B</div>
                <div>Winner</div>
                <div>Notes</div>
              </div>
              <div id="pairwiseHistoryTableBody" style="display:grid;gap:6px;margin-top:6px">
                <div style="text-align:center;padding:20px;color:var(--mute)">No comparisons recorded yet.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- TAB 3: SETUP & RUBRIC -->
      <div id="tab-setup" class="org-tab-pane" style="display:none">
        <!-- Rubric Configuration & Lock Section -->
        <div class="card" style="margin-bottom:22px" id="rubricConfigCard">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px">
            <div>
              <h3>Rubric configuration</h3>
              <p style="color:var(--mute);font-size:.9rem;margin-top:2px">Weights must sum to 100%. Rubric locks automatically upon first score submission.</p>
            </div>
            <span class="bdg ${isRubricLocked ? 'bad' : 'ok'}" id="rubricLockStatusBadge">
              ${isRubricLocked ? '🔒 Locked &bull; Scores Submitted' : '✏️ Active &bull; Editable'}
            </span>
          </div>

          <div id="rubricEditorContainer">
            <div id="criteriaListRows" style="display:grid;gap:10px;margin-bottom:16px">
              ${criteriaList.length === 0 ? `
                <p style="color:var(--mute)">No rubric criteria configured yet. Add criteria below summing to 100%.</p>
              ` : criteriaList.map((c, idx) => `
                <div class="rubric-row" data-idx="${idx}" style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1fr auto;gap:10px;align-items:center;padding:10px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)">
                  <div>
                    <small style="color:var(--mute);display:block;font-size:0.7rem">NAME</small>
                    <input type="text" class="crit-name-input" value="${escapeHtml(c.name)}" ${isRubricLocked ? 'disabled' : ''} style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--text);font-weight:600;font-size:0.9rem">
                  </div>
                  <div>
                    <small style="color:var(--mute);display:block;font-size:0.7rem">KEY</small>
                    <input type="text" class="crit-key-input" value="${escapeHtml(c.key || c.criterionKey || '')}" ${isRubricLocked ? 'disabled' : ''} style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--c);font-family:var(--mono);font-size:0.85rem">
                  </div>
                  <div>
                    <small style="color:var(--mute);display:block;font-size:0.7rem">WEIGHT (%)</small>
                    <input type="number" min="1" max="100" class="crit-weight-input" value="${c.weight}" ${isRubricLocked ? 'disabled' : ''} style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--text);font-weight:700;font-family:var(--mono)">
                  </div>
                  <div>
                    <small style="color:var(--mute);display:block;font-size:0.7rem">MIN</small>
                    <input type="number" min="0" max="10" step="0.5" class="crit-min-input" value="${c.minScore != null ? c.minScore : 1}" ${isRubricLocked ? 'disabled' : ''} style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--text);font-size:0.85rem">
                  </div>
                  <div>
                    <small style="color:var(--mute);display:block;font-size:0.7rem">MAX</small>
                    <input type="number" min="1" max="10" step="0.5" class="crit-max-input" value="${c.maxScore != null ? c.maxScore : 5}" ${isRubricLocked ? 'disabled' : ''} style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--text);font-size:0.85rem">
                  </div>
                  <div>
                    ${!isRubricLocked ? `<button type="button" class="btn ghost sm remove-crit-btn" style="color:var(--bad);padding:4px 8px;font-size:0.8rem">&times;</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            ${!isRubricLocked ? `
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding-top:14px;border-top:1px solid var(--line)">
                <div style="display:flex;gap:10px;align-items:center">
                  <button type="button" class="btn ghost sm" id="addCriterionBtn">+ Add Criterion</button>
                  <span id="rubricWeightSum" style="font-weight:700;font-family:var(--mono);font-size:0.95rem">Total Weight: <span id="weightSumVal">0</span>%</span>
                </div>
                <button type="button" class="btn main sm" id="saveRubricBtn">Save Rubric &rarr;</button>
              </div>
            ` : `
              <div style="padding:12px 16px;border-radius:10px;background:rgba(255,122,144,0.1);border:1px solid rgba(255,122,144,0.3);color:var(--bad);font-size:0.88rem">
                🔒 Rubric cannot be edited because scoring has already started for this event.
              </div>
            `}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:22px">
          <!-- Track Management Section -->
          <div class="card" id="trackManagementCard">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h3>Event tracks</h3>
              <span class="bdg ok">${tracks.length} Tracks</span>
            </div>
            <p style="color:var(--mute);font-size:.9rem;margin-bottom:16px">Define competition tracks for this hackathon.</p>
            
            <div id="tracksListContainer" style="display:grid;gap:8px;margin-bottom:18px;max-height:220px;overflow-y:auto">
              ${tracks.length === 0 ? `
                <p style="color:var(--mute);font-size:0.88rem">No tracks configured yet. Add your first track below.</p>
              ` : tracks.map(t => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)">
                  <div>
                    <b style="font-size:0.92rem">${escapeHtml(t.name)}</b>
                    ${t.description ? `<p style="color:var(--mute);font-size:0.78rem;margin:2px 0 0">${escapeHtml(t.description)}</p>` : ''}
                  </div>
                  <span class="trk" style="font-size:0.75rem">#${t.id}</span>
                </div>
              `).join('')}
            </div>

            <!-- Add Track Form -->
            <form id="addTrackForm" style="display:grid;gap:10px;padding-top:14px;border-top:1px solid var(--line)">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <input type="text" id="newTrackName" placeholder="Track Name *" required style="height:38px;padding:0 10px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);font-size:0.88rem">
                <input type="text" id="newTrackDesc" placeholder="Description (optional)" style="height:38px;padding:0 10px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);font-size:0.88rem">
              </div>
              <button type="submit" class="btn main sm" id="addTrackBtn" style="justify-self:start">+ Add Track</button>
            </form>
          </div>

          <!-- Custom Submission Questions Section -->
          <div class="card" id="customQuestionsCard">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px">
              <div>
                <h3>Custom submission questions</h3>
                <p style="color:var(--mute);font-size:.9rem;margin-top:2px">Configure questions presented to participants when submitting projects.</p>
              </div>
              <span class="bdg ok">${customQuestions.length} Questions</span>
            </div>

            <div id="customQuestionsListContainer" style="display:grid;gap:8px;margin-bottom:18px;max-height:220px;overflow-y:auto">
              ${customQuestions.length === 0 ? `
                <p style="color:var(--mute);font-size:0.88rem">No custom questions configured yet. Add questions below.</p>
              ` : customQuestions.map(q => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line);gap:12px">
                  <div>
                    <b style="font-size:0.92rem">${escapeHtml(q.prompt)}</b>
                    <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
                      <span class="trk" style="font-size:0.75rem">${escapeHtml(q.questionKey)}</span>
                      <span class="bdg" style="font-size:0.7rem">${escapeHtml(q.questionType)}</span>
                      ${q.required ? '<span class="bdg warn" style="font-size:0.7rem">Required</span>' : '<span class="bdg" style="font-size:0.7rem">Optional</span>'}
                    </div>
                  </div>
                  <button type="button" class="btn ghost sm delete-cq-btn" data-qid="${q.id}" style="color:var(--bad);padding:4px 8px;font-size:0.8rem">&times; Delete</button>
                </div>
              `).join('')}
            </div>

            <!-- Add Question Form -->
            <form id="addQuestionForm" style="display:grid;gap:10px;padding-top:14px;border-top:1px solid var(--line)">
              <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;align-items:center">
                <input type="text" id="newQuestionPrompt" placeholder="Question Prompt *" required style="height:38px;padding:0 10px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);font-size:0.88rem">
                <input type="text" id="newQuestionKey" placeholder="Key *" required style="height:38px;padding:0 10px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);font-size:0.88rem">
                <select id="newQuestionType" style="height:38px;padding:0 10px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--text);font-size:0.88rem">
                  <option value="SHORT_TEXT">Short Text</option>
                  <option value="PARAGRAPH">Paragraph</option>
                  <option value="URL">URL</option>
                </select>
                <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--text);cursor:pointer">
                  <input type="checkbox" id="newQuestionRequired"> Required
                </label>
              </div>
              <button type="submit" class="btn main sm" id="addQuestionBtn" style="justify-self:start">+ Add Question</button>
            </form>
          </div>
        </div>
      </div>

      <!-- TAB 4: SCORE BIAS & ANALYTICS -->
      <div id="tab-analytics" class="org-tab-pane" style="display:none">
        <!-- Normalization Engine Transparency & Analysis Panel (T2 Upgrade) -->
        <div class="card" style="margin-bottom:22px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span class="bdg ok" style="font-size:0.75rem">NORMALIZATION TRANSPARENCY</span>
                <span class="trk" style="font-size:0.75rem">T = 50 + 10Z</span>
              </div>
              <h3 style="margin:0;font-size:1.3rem">Raw vs. Normalized Leaderboard Analysis</h3>
            </div>
            <button class="btn main sm" id="openNormalizationProofBtn" type="button" style="font-size:0.78rem">
              🔬 View Normalization Proof &rarr;
            </button>
          </div>

          <!-- Formula & Math Explanation Callout -->
          <div style="padding:14px 18px;border-radius:12px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);margin-bottom:16px;font-size:0.86rem;line-height:1.6">
            <b style="color:#93C5FD">📐 Normalization Formula &amp; Mathematical Guarantees:</b>
            <div style="margin-top:4px;font-family:var(--mono);color:#F8FAFC">
              T = 50 + 10 &times; Z &nbsp;where&nbsp; Z = (raw - &mu;) / &sigma;
            </div>
            <ul style="margin:6px 0 0;padding-left:18px;color:var(--mute);font-size:0.82rem">
              <li><b>Z = 0 &rarr; T = 50.0:</b> Submission performed at the exact historical average of the reviewing judge.</li>
              <li><b>Z &gt; 0 &rarr; T &gt; 50.0:</b> Above-average performance relative to the judge's scoring baseline.</li>
              <li><b>Z &lt; 0 &rarr; T &lt; 50.0:</b> Below-average performance relative to the judge's scoring baseline.</li>
              <li><b>Zero-Variance Rule:</b> If a judge scores all submissions identically (&sigma; = 0), Z = 0 is assigned (T = 50.0), neutralizing bias without causing division-by-zero.</li>
            </ul>
          </div>

          <!-- Raw vs Normalized Scores & Rank Shifts Table -->
          <div style="max-height:280px;overflow-y:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2)">
            ${(!normAnalysis || !normAnalysis.projects || normAnalysis.projects.length === 0) ? `
              <div style="padding:20px;text-align:center;color:var(--mute);font-size:0.88rem">
                No normalized ranking analysis available yet. Requires completed reviews from judges.
              </div>
            ` : `
              <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
                <thead>
                  <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
                    <th style="padding:10px 12px">Project</th>
                    <th style="padding:10px 12px">Track</th>
                    <th style="padding:10px 12px">Raw Score</th>
                    <th style="padding:10px 12px">Raw Rank</th>
                    <th style="padding:10px 12px">Norm Score (T)</th>
                    <th style="padding:10px 12px">Norm Rank</th>
                    <th style="padding:10px 12px">Rank Shift (&Delta;)</th>
                  </tr>
                </thead>
                <tbody>
                  ${normAnalysis.projects.map(p => {
                    const delta = p.rankChange != null ? p.rankChange : (p.rankDelta || 0);
                    const deltaColor = delta > 0 ? 'var(--ok)' : delta < 0 ? 'var(--bad)' : 'var(--mute)';
                    const deltaSymbol = delta > 0 ? `+${delta} &uarr;` : delta < 0 ? `${delta} &darr;` : '0 -';
                    return `
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                        <td style="padding:8px 12px;font-weight:600">${escapeHtml(p.title || 'Submission #' + p.submissionId)}</td>
                        <td style="padding:8px 12px"><span class="trk" style="font-size:0.72rem">${escapeHtml(p.track || 'General')}</span></td>
                        <td style="padding:8px 12px;font-family:var(--mono)">${(p.rawScore ?? 0).toFixed(2)}</td>
                        <td style="padding:8px 12px;font-family:var(--mono)">#${p.rawRank || '-'}</td>
                        <td style="padding:8px 12px;font-family:var(--mono);color:var(--m);font-weight:700">${(p.normalizedScore ?? 0).toFixed(2)}</td>
                        <td style="padding:8px 12px;font-family:var(--mono);font-weight:700">#${p.normalizedRank || '-'}</td>
                        <td style="padding:8px 12px;font-family:var(--mono);font-weight:700;color:${deltaColor}">${deltaSymbol}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- Scoring Integrity & Health Section -->
        <div class="card" style="margin-bottom:22px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
            <div>
              <h3 style="margin:0">Scoring Integrity &amp; Anomaly Detection</h3>
              <p style="color:var(--mute);font-size:0.86rem;margin:2px 0 0">Organizer health monitor detecting judge scoring variance, flat judges, and review completion without peer score leakage.</p>
            </div>
            <span class="bdg ${(scoringHealth?.anomalyAlerts?.length || 0) > 0 ? 'warn' : 'ok'}">
              ${(scoringHealth?.anomalyAlerts?.length || 0) > 0 ? `${scoringHealth.anomalyAlerts.length} Anomaly Alerts` : '✓ All Judges Nominal'}
            </span>
          </div>

          ${(scoringHealth?.anomalyAlerts && scoringHealth.anomalyAlerts.length > 0) ? `
            <div style="padding:12px 16px;border-radius:10px;background:rgba(255,200,60,0.08);border:1px solid rgba(255,200,60,0.3);margin-bottom:14px;font-size:0.85rem">
              <b style="color:var(--warn);display:block;margin-bottom:4px">⚠️ Active Anomaly Alerts:</b>
              <ul style="margin:0;padding-left:18px;color:var(--text)">
                ${scoringHealth.anomalyAlerts.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="max-height:240px;overflow-y:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2)">
            ${(!scoringHealth || !scoringHealth.judgeStats || scoringHealth.judgeStats.length === 0) ? `
              <div style="padding:16px;text-align:center;color:var(--mute);font-size:0.85rem">No judge scoring health metrics available.</div>
            ` : `
              <table style="width:100%;border-collapse:collapse;font-size:0.84rem">
                <thead>
                  <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
                    <th style="padding:8px 12px">Judge</th>
                    <th style="padding:8px 12px">Reviews</th>
                    <th style="padding:8px 12px">Raw Mean (&mu;)</th>
                    <th style="padding:8px 12px">Std Dev (&sigma;)</th>
                    <th style="padding:8px 12px">Flat Judge</th>
                    <th style="padding:8px 12px">Health Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${scoringHealth.judgeStats.map(s => {
                    const reviewsCount = s.completedCount != null ? s.completedCount : (s.reviewsCount || 0);
                    const meanVal = s.averageScore != null ? s.averageScore : (s.meanScore || 0);
                    const stdDevVal = s.stdDevScore != null ? s.stdDevScore : 0;
                    const isZeroVar = s.zeroVariance != null ? s.zeroVariance : (stdDevVal === 0 && reviewsCount > 1);
                    return `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                      <td style="padding:8px 12px;font-weight:600">${escapeHtml(s.judgeName || 'Judge #' + s.judgeId)}</td>
                      <td style="padding:8px 12px;font-family:var(--mono)">${reviewsCount}</td>
                      <td style="padding:8px 12px;font-family:var(--mono)">${meanVal.toFixed(2)}</td>
                      <td style="padding:8px 12px;font-family:var(--mono)">${stdDevVal.toFixed(2)}</td>
                      <td style="padding:8px 12px">
                        ${isZeroVar ? '<span class="bdg warn" style="font-size:0.7rem">YES (&sigma;=0)</span>' : '<span style="color:var(--mute);font-size:0.75rem">No</span>'}
                      </td>
                      <td style="padding:8px 12px">
                        <span class="bdg ${s.flag ? 'warn' : 'ok'}" style="font-size:0.72rem">
                          ${escapeHtml(s.flag || (s.queueCompleted ? 'COMPLETED' : 'IN_PROGRESS'))}
                        </span>
                      </td>
                    </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- Score Distribution Panel -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <h3 style="margin:0">Score distribution &amp; judge bias</h3>
            <button class="btn ghost sm" id="viewAllDistributionBtn" type="button" style="font-size:0.78rem;padding:3px 8px">👁️ View All (${distribution.length})</button>
          </div>
          <p style="color:var(--mute);font-size:.92rem;margin-bottom:18px">Per-judge raw mean vs. normalized mean ($T = 50 + 10z$) from normalization engine.</p>
          
          ${distribution.length === 0 ? `
            <div style="padding:20px;text-align:center;color:var(--mute);background:var(--glass2);border-radius:12px">
              No score distribution telemetry available yet. Scores will be computed once judges submit reviews.
            </div>
          ` : `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;max-height:360px;overflow-y:auto;padding-right:4px">
              ${distribution.map(d => `
                <div style="padding:16px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)">
                  <b style="font-size:.95rem">${escapeHtml(d.judgeName || 'Judge #' + d.judgeId)}</b>
                  ${d.zeroVariance ? '<span class="bdg warn" style="margin-left:6px;font-size:0.7rem">Flat Judge (Z=0, T=50)</span>' : ''}
                  <div style="margin-top:8px;font-size:.88rem;color:var(--mute);line-height:1.7">
                    Raw mean: <span style="color:#FFF;font-family:var(--mono)">${(d.rawMean ?? 0).toFixed(2)}</span> &bull; StdDev: <span style="font-family:var(--mono)">${(d.rawStdDev ?? 0).toFixed(2)}</span><br>
                    Normalized mean: <span style="color:var(--m);font-family:var(--mono);font-weight:700">${(d.normalizedMean ?? 0).toFixed(2)}</span> &bull; (${d.reviewsCount || 0} reviews)
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Download Reports Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:22px">
          <div class="card" style="padding:18px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)">
            <b style="font-size:1rem;display:block">Scores Dataset CSV</b>
            <p style="color:var(--mute);font-size:0.85rem;margin:4px 0 14px">Raw judge evaluation scores, breakdown by criterion, and timestamped reviews.</p>
            <button class="btn ghost sm" id="tabExportScoresBtn" type="button" style="width:100%">Download Scores CSV &rarr;</button>
          </div>
          <div class="card" style="padding:18px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)">
            <b style="font-size:1rem;display:block">Submissions Dataset CSV</b>
            <p style="color:var(--mute);font-size:0.85rem;margin:4px 0 14px">Participant submissions list, tracks, repository URLs, and descriptions.</p>
            <button class="btn ghost sm" id="tabExportProjectsBtn" type="button" style="width:100%">Download Projects CSV &rarr;</button>
          </div>
          <div class="card" style="padding:18px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)">
            <b style="font-size:1rem;display:block">Leaderboard Results CSV</b>
            <p style="color:var(--mute);font-size:0.85rem;margin:4px 0 14px">Final rankings, normalized scores, public vote counts, and winner standings.</p>
            <button class="btn main sm" id="tabExportResultsBtn" type="button" style="width:100%">Download Leaderboard CSV &rarr;</button>
          </div>
        </div>
      </div>

      <!-- TAB 5: ADVANCED OPERATIONS (T3/T4) -->
      <div id="tab-trust" class="org-tab-pane" style="display:none">
        <!-- T3 & T4 Advanced Operations Card -->
        <div class="card" style="border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span class="bdg" style="background:rgba(255,255,255,0.06);color:#E2E8F0;border:1px solid rgba(255,255,255,0.1);font-size:0.75rem">ADVANCED OPERATIONS</span>
                <span class="bdg" style="background:rgba(255,255,255,0.04);font-size:0.75rem;color:var(--mute)">TIERS T3 &amp; T4</span>
              </div>
              <h3 style="margin:0;font-size:1.35rem">Community Voting, Webhooks &amp; Cryptographic Trust</h3>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn ghost sm" id="cardOpenVotingBtn" type="button" style="border:1px solid rgba(255,255,255,0.12)">🗳️ Voting &amp; Ballot</button>
              <button class="btn ghost sm" id="cardOpenWebhooksBtn" type="button" style="border:1px solid rgba(255,255,255,0.08)">🔗 Webhooks</button>
              <button class="btn ghost sm" id="cardOpenCertificatesBtn" type="button" style="border:1px solid rgba(255,255,255,0.08)">📜 Certificates</button>
              <button class="btn ghost sm" id="cardOpenBulkBtn" type="button" style="border:1px solid rgba(255,255,255,0.08)">📦 Bulk Data</button>
              <button class="btn ghost sm" id="cardOpenAuditBtn" type="button" style="border:1px solid rgba(255,255,255,0.08)">🛡️ Audit Logs</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">
            <!-- Community Voting Tile -->
            <div style="padding:16px;border-radius:14px;background:var(--glass2);border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <b style="font-size:0.95rem">Community Voting</b>
                  <span class="bdg ${eventDetails.votingEnabled !== false ? 'ok' : 'bad'}" style="font-size:0.72rem">
                    ${eventDetails.votingEnabled !== false ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p style="color:var(--mute);font-size:0.85rem;line-height:1.4;margin:0 0 10px">
                  Mode: <b style="color:#FFF">${eventDetails.votingAccessMode || 'OPEN'}</b><br>
                  Public vote collection &amp; anti-abuse validation.
                </p>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <button class="btn ghost sm" id="quickToggleVotingBtn" type="button" style="font-size:0.75rem;padding:4px 8px">
                  ${eventDetails.votingEnabled !== false ? 'Disable' : 'Enable'}
                </button>
                <button class="btn main sm" id="tileOpenVotingBtn" type="button" style="font-size:0.75rem;padding:4px 8px">Config &amp; Ballot</button>
              </div>
            </div>

            <!-- Webhooks Tile -->
            <div style="padding:16px;border-radius:14px;background:var(--glass2);border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <b style="font-size:0.95rem">Webhooks &amp; Events</b>
                  <span class="bdg ok" style="font-size:0.72rem">HMAC-SHA256</span>
                </div>
                <p style="color:var(--mute);font-size:0.85rem;line-height:1.4;margin:0 0 10px">
                  Dispatch signed webhooks on submissions, scoring, COI declarations, and results.
                </p>
              </div>
              <div>
                <button class="btn main sm" id="tileOpenWebhooksBtn" type="button" style="font-size:0.75rem;padding:4px 8px;width:100%">Manage Endpoints &rarr;</button>
              </div>
            </div>

            <!-- Cryptographic Certificates Tile -->
            <div style="padding:16px;border-radius:14px;background:var(--glass2);border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <b style="font-size:0.95rem">Certificates &amp; Proofs</b>
                  <span class="bdg hl" style="font-size:0.72rem">SHA-256 Ledger</span>
                </div>
                <p style="color:var(--mute);font-size:0.85rem;line-height:1.4;margin:0 0 10px">
                  Generate tamper-evident participant &amp; winner certificates with public ledger verification.
                </p>
              </div>
              <div>
                <button class="btn main sm" id="tileOpenCertificatesBtn" type="button" style="font-size:0.75rem;padding:4px 8px;width:100%">Certificate Authority &rarr;</button>
              </div>
            </div>

            <!-- Bulk Import/Export Tile -->
            <div style="padding:16px;border-radius:14px;background:var(--glass2);border:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <b style="font-size:0.95rem">Complete Data Portability</b>
                  <span class="bdg" style="font-size:0.72rem">JSON BUNDLE</span>
                </div>
                <p style="color:var(--mute);font-size:0.85rem;line-height:1.4;margin:0 0 10px">
                  Full-fidelity event import &amp; export adhering to lifecycle validation rules.
                </p>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn ghost sm" id="tileExportBundleBtn" type="button" style="font-size:0.75rem;padding:4px 8px;flex:1">⬇️ Export</button>
                <button class="btn ghost sm" id="tileImportBundleBtn" type="button" style="font-size:0.75rem;padding:4px 8px;flex:1">⬆️ Import</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('#v-dashboard [data-count]').forEach(countUp);

    // Bind Add Track Form
    bindTrackForm(eventId, container);

    // Bind Rubric Configuration Editor
    if (!isRubricLocked) {
      bindRubricEditor(eventId, criteriaList, container);
    }

    // Bind Manual Judge Assignment Form
    bindManualAssignForm(eventId, container, assignments);

    // Bind Custom Questions Form
    bindCustomQuestions(eventId, container);

    // Bind Edit Hackathon Modal
    bindEditEventModal(eventId, eventDetails, container);

    // Bind View All Hackathons Modal
    bindViewAllEventsModal(container);

    // Bind View All Progress Modal
    bindViewAllProgressModal(judgeProgressList);

    // Bind View All Judges Modal
    bindViewAllJudgesModal(judges);

    // Bind View All Assignments Modal
    bindViewAllAssignmentsModal(eventId, assignments, container);

    // Bind View All Distribution Modal
    bindViewAllDistributionModal(distribution);

    // Bind T3 & T4 Advanced Operations Modals & Actions
    bindCommunityVotingModal(eventId, eventDetails, container);
    bindWebhooksModal(eventId, container);
    bindCertificatesModal(eventId, container);
    bindBulkModal(eventId, container);
    bindAuditLogsModal(eventId, container);
    bindNormalizationProofModal(eventId, container);
    bindPairwiseTab(eventId, container, eventDetails);

    // Setup Interactive Tab Navigation
    const tabBtns = container.querySelectorAll('.org-tab-btn');
    const tabPanes = container.querySelectorAll('.org-tab-pane');
    
    function activateTab(tabId) {
      tabBtns.forEach(btn => {
        const isSelected = btn.dataset.tab === tabId;
        btn.classList.toggle('active', isSelected);
      });
      tabPanes.forEach(pane => {
        pane.style.display = (pane.id === tabId) ? 'block' : 'none';
      });
      sessionStorage.setItem('dogfood_org_active_tab', tabId);
    }

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    // Setup Quick-Jump Links in Overview cards
    container.querySelectorAll('.org-quick-tile[data-jump]').forEach(tile => {
      tile.addEventListener('click', () => activateTab(tile.dataset.jump));
    });

    // Restore saved tab if valid
    const savedActiveTab = sessionStorage.getItem('dogfood_org_active_tab');
    if (savedActiveTab && container.querySelector(`#${savedActiveTab}`)) {
      activateTab(savedActiveTab);
    }

    // Setup Live Search Filters for Assignments
    const assignSearchInput = document.getElementById('assignmentSearchInput');
    if (assignSearchInput) {
      assignSearchInput.addEventListener('input', (e) => {
        const query = (e.target?.value || assignSearchInput.value || '').toLowerCase().trim();
        const rows = container.querySelectorAll('#assignmentsTableBody tr');
        const tableRows = rows.length > 0 ? rows : container.querySelectorAll('tr');
        tableRows.forEach(row => {
          const text = (row.dataset?.search || row.getAttribute('data-search') || row.textContent || '').toLowerCase();
          row.style.display = text.includes(query) ? '' : 'none';
        });
      });
    }

    // Setup Live Search Filters for Project Coverage
    const coverageSearchInput = document.getElementById('coverageSearchInput');
    if (coverageSearchInput) {
      coverageSearchInput.addEventListener('input', (e) => {
        const query = (e.target?.value || coverageSearchInput.value || '').toLowerCase().trim();
        const rows = container.querySelectorAll('#coverageTableBody tr');
        rows.forEach(row => {
          const text = (row.dataset?.search || row.getAttribute('data-search') || row.textContent || '').toLowerCase();
          row.style.display = text.includes(query) ? '' : 'none';
        });
      });
    }

    // Setup Live Search Filters for Judges
    const judgeSearchInput = document.getElementById('judgeSearchInput');
    if (judgeSearchInput) {
      judgeSearchInput.addEventListener('input', (e) => {
        const query = (e.target?.value || judgeSearchInput.value || '').toLowerCase().trim();
        const list = container.querySelector('#judgesListContainer');
        const judgeItems = list ? list.children : [];
        Array.from(judgeItems).forEach(item => {
          const text = (item.dataset?.search || item.getAttribute('data-search') || item.textContent || '').toLowerCase();
          item.style.display = text.includes(query) ? '' : 'none';
        });
      });
    }

    // Setup Tab Export Buttons
    document.getElementById('tabExportScoresBtn')?.addEventListener('click', () => {
      document.getElementById('exportScoresBtn')?.click();
    });
    document.getElementById('tabExportProjectsBtn')?.addEventListener('click', () => {
      document.getElementById('exportProjectsBtn')?.click();
    });
    document.getElementById('tabExportResultsBtn')?.addEventListener('click', () => {
      document.getElementById('exportResultsBtn')?.click();
    });

  } catch (err) {
    const isAccessDenied = err.message.includes('403') || err.message.includes('forbidden') || err.message.includes('ORGANIZER');
    contentArea.innerHTML = `
      <div class="card" style="text-align:center;padding:50px 20px;border:1px solid rgba(255,122,144,0.3);margin-top:20px">
        <div style="font-size:2.4rem;margin-bottom:12px">${isAccessDenied ? '🔒' : '⚠️'}</div>
        <h3 style="font-size:1.5rem;color:var(--bad)">${isAccessDenied ? 'Organizer Access Required' : 'Unable to load dashboard'}</h3>
        <p style="color:var(--mute);max-width:44ch;margin:8px auto 20px">${escapeHtml(err.message)}</p>
        <a class="btn ghost sm" href="#/gallery">Back to Gallery</a>
      </div>
    `;
  }

  // Bind Refresh Dashboard Button
  document.getElementById('refreshDashboardBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshDashboardBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Refreshing...';
    }
    try {
      await renderDashboard(container, eventId);
      notify('Dashboard refreshed from server', 'info');
    } catch (err) {
      notify(`Refresh failed: ${err.message}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Refresh';
      }
    }
  });

  // Bind Auto-Assign Judges Button
  document.getElementById('autoAssignBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('autoAssignBtn');
    btn.disabled = true;
    btn.textContent = 'Assigning...';
    try {
      const res = await api.autoAssignJudges(eventId);
      const data = res?.data || res;
      let msg = data?.message || 'Submissions successfully assigned to judges!';
      if (data?.projectsFullyCovered != null) {
        msg = `Auto-Assign: ${data.assignedCount || 0} assignments created. Fully covered: ${data.projectsFullyCovered}, Under-covered: ${data.projectsUnderCovered}, Skipped: ${data.assignmentsSkipped || 0}.`;
      }
      notify(msg, 'success');
      if (data?.skipReasons && data.skipReasons.length > 0) {
        notify(`Skip reasons: ${data.skipReasons.join('; ')}`, 'info');
      }
      await renderDashboard(container, eventId);
    } catch (err) {
      notify(`Auto-assignment failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = '⚡ Auto-Assign Judges';
    }
  });

  // Bind CSV Export Buttons
  document.getElementById('exportScoresBtn')?.addEventListener('click', async () => {
    try {
      await api.exportScores(eventId);
      notify('Downloaded scores CSV from backend', 'success');
    } catch (err) {
      notify(`Export failed: ${err.message}`, 'error');
    }
  });

  document.getElementById('exportProjectsBtn')?.addEventListener('click', async () => {
    try {
      await api.exportSubmissions(eventId);
      notify('Downloaded submissions CSV from backend', 'success');
    } catch (err) {
      notify(`Export failed: ${err.message}`, 'error');
    }
  });

  document.getElementById('exportResultsBtn')?.addEventListener('click', async () => {
    try {
      await api.exportResults(eventId);
      notify('Downloaded leaderboard results CSV from backend', 'success');
    } catch (err) {
      notify(`Export failed: ${err.message}`, 'error');
    }
  });

  document.getElementById('exportPairwiseBtn')?.addEventListener('click', async () => {
    try {
      await api.exportPairwiseCsv(eventId);
      notify('Downloaded pairwise rankings CSV from backend', 'success');
    } catch (err) {
      notify(`Pairwise export failed: ${err.message}`, 'error');
    }
  });

  document.getElementById('openPairwiseBtnTop')?.addEventListener('click', () => {
    const judgingTabBtn = document.querySelector('.org-tab-btn[data-tab="tab-judging"]');
    judgingTabBtn?.click();
    setTimeout(() => {
      document.getElementById('pairwiseJudgingSection')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  });
}

function renderCreateEventModalHtml() {
  return `
  <div class="modal-backdrop" id="createEventModal">
    <div class="modal-card" style="max-width:680px;max-height:90vh;overflow-y:auto">
      <h3 style="font-size:1.6rem">Create New Hackathon</h3>
      <p style="color:var(--mute);font-size:0.92rem;margin:6px 0 16px">Configure your new hackathon event and phase schedules. Only organizers and admins can create events.</p>
      
      <form id="createEventForm">
        <div class="fld">
          <label for="newEventName">Event Name *</label>
          <input id="newEventName" type="text" placeholder="e.g. AI Innovation Challenge 2026" required>
        </div>
        
        <div class="fld">
          <label for="newEventDesc">Description</label>
          <textarea id="newEventDesc" rows="2" placeholder="Brief summary of the hackathon goals and guidelines..."></textarea>
        </div>

        <div style="margin:16px 0 8px;font-size:1rem;font-weight:700;color:var(--c);border-bottom:1px solid var(--line);padding-bottom:6px">
          📅 Lifecycle Dates & Phases (UTC/Local)
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="newRegStart">Registration Start</label>
            <input id="newRegStart" type="datetime-local">
          </div>
          <div class="fld">
            <label for="newRegEnd">Registration End</label>
            <input id="newRegEnd" type="datetime-local">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="newEventStart">Event Start</label>
            <input id="newEventStart" type="datetime-local">
          </div>
          <div class="fld">
            <label for="newEventEnd">Event End</label>
            <input id="newEventEnd" type="datetime-local">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="newSubStart">Submission Start</label>
            <input id="newSubStart" type="datetime-local">
          </div>
          <div class="fld">
            <label for="newEventDeadline">Submission Deadline *</label>
            <input id="newEventDeadline" type="datetime-local" required>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="newJudgingStart">Judging Start</label>
            <input id="newJudgingStart" type="datetime-local">
          </div>
          <div class="fld">
            <label for="newJudgingEnd">Judging End</label>
            <input id="newJudgingEnd" type="datetime-local">
          </div>
        </div>

        <div class="fld">
          <label for="newResultsPublishAt">Results Publish Date</label>
          <input id="newResultsPublishAt" type="datetime-local">
        </div>

        <div class="fld" style="margin-top:14px">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--glass2);padding:10px 14px;border-radius:10px;border:1px solid var(--line)">
            <input type="checkbox" id="newPairwiseEnabled" checked style="width:18px;height:18px">
            <span style="font-weight:600">⚔️ Enable Pairwise Judging Mode (Bradley-Terry Ranking)</span>
          </label>
        </div>

        <div id="createEventError" style="display:none;color:var(--bad);font-size:0.88rem;margin-top:10px"></div>
        
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px">
          <button class="btn ghost sm" id="cancelCreateEventBtn" type="button">Cancel</button>
          <button class="btn main sm" id="submitCreateEventBtn" type="submit">Create Event &rarr;</button>
        </div>
      </form>
    </div>
  </div>
  `;
}

function bindCreateEventModal(container) {
  const modal = document.getElementById('createEventModal');
  const openBtn = document.getElementById('openCreateEventBtn') || document.getElementById('openCreateEventBtnNoEv');
  const cancelBtn = document.getElementById('cancelCreateEventBtn');
  const form = document.getElementById('createEventForm');
  const errorEl = document.getElementById('createEventError');

  openBtn?.addEventListener('click', () => {
    const toLocalInput = (date) => {
      const d = new Date(date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };

    const now = Date.now();
    const setVal = (id, offsetDays) => {
      const el = document.getElementById(id);
      if (el && !el.value) {
        el.value = toLocalInput(now + offsetDays * 86400000);
      }
    };

    setVal('newRegStart', 0);
    setVal('newRegEnd', 5);
    setVal('newEventStart', 1);
    setVal('newEventEnd', 7);
    setVal('newSubStart', 1);
    setVal('newEventDeadline', 7);
    setVal('newJudgingStart', 7);
    setVal('newJudgingEnd', 9);
    setVal('newResultsPublishAt', 10);

    if (errorEl) errorEl.style.display = 'none';
    modal?.classList.add('open');
  });

  cancelBtn?.addEventListener('click', () => {
    modal?.classList.remove('open');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newEventName').value.trim();
    const description = document.getElementById('newEventDesc').value.trim();
    const deadlineVal = document.getElementById('newEventDeadline').value;
    const submitBtn = document.getElementById('submitCreateEventBtn');

    if (!name) {
      if (errorEl) { errorEl.textContent = 'Event name is required'; errorEl.style.display = 'block'; }
      return;
    }
    if (!deadlineVal) {
      if (errorEl) { errorEl.textContent = 'Submission deadline is required'; errorEl.style.display = 'block'; }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    if (errorEl) errorEl.style.display = 'none';

    const toIso = (val) => (val && val.trim()) ? new Date(val).toISOString() : null;

    try {
      const payload = {
        name,
        description,
        submissionDeadline: toIso(deadlineVal),
        registrationStart: toIso(document.getElementById('newRegStart')?.value),
        registrationEnd: toIso(document.getElementById('newRegEnd')?.value),
        eventStart: toIso(document.getElementById('newEventStart')?.value),
        eventEnd: toIso(document.getElementById('newEventEnd')?.value),
        submissionStart: toIso(document.getElementById('newSubStart')?.value),
        judgingStart: toIso(document.getElementById('newJudgingStart')?.value),
        judgingEnd: toIso(document.getElementById('newJudgingEnd')?.value),
        resultsPublishAt: toIso(document.getElementById('newResultsPublishAt')?.value),
        pairwiseJudgingEnabled: document.getElementById('newPairwiseEnabled')?.checked ?? true
      };

      const newEvent = await api.createEvent(payload);

      modal?.classList.remove('open');
      notify(`Hackathon "${newEvent.name || name}" created successfully!`, 'success');

      // Update app shell event dropdowns and set new event active
      await refreshEventSelectors(newEvent.id);
      
      // Render dashboard for the new event
      await renderDashboard(container, newEvent.id);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Failed to create event';
        errorEl.style.display = 'block';
      }
      notify(`Failed to create event: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Event \u2192';
    }
  });
}

function bindPairwiseTab(eventId, container, eventDetails) {
  let isPairwiseEnabled = Boolean(eventDetails?.pairwiseJudgingEnabled);
  const toggleBtn = container.querySelector('#togglePairwiseBtn');
  const statusBadge = container.querySelector('#pairwiseStatusBadge');
  const refreshBtn = container.querySelector('#refreshPairwiseTabBtn');
  const exportCsvBtn = container.querySelector('#exportPairwiseCsvTabBtn');

  async function refreshPairwiseData() {
    try {
      const [covRes, resRes, histRes] = await Promise.all([
        api.getPairwiseCoverage(eventId).catch(() => null),
        api.getPairwiseResults(eventId).catch(() => null),
        api.getPairwiseHistory(eventId).catch(() => [])
      ]);

      // 1. Populate Coverage Telemetry
      if (covRes) {
        const eligEl = container.querySelector('#pwEligibleProjects');
        const possEl = container.querySelector('#pwPossiblePairs');
        const uniqEl = container.querySelector('#pwUniquePairs');
        const covEl = container.querySelector('#pwCoveragePct');
        const graphEl = container.querySelector('#pwGraphStatus');
        const compEl = container.querySelector('#pwComponentsCount');
        const alertEl = container.querySelector('#pwDisconnectedAlert');
        const alertMsg = container.querySelector('#pwDisconnectedMsg');

        if (eligEl) eligEl.textContent = String(covRes.totalProjects || 0);
        if (possEl) possEl.textContent = String(covRes.totalPossiblePairs || 0);
        if (uniqEl) uniqEl.textContent = String(covRes.uniquePairsCompared || 0);
        if (covEl) covEl.textContent = `${(covRes.coveragePercentage || 0).toFixed(1)}% coverage`;

        if (covRes.connected) {
          if (graphEl) {
            graphEl.textContent = 'CONNECTED';
            graphEl.style.color = 'var(--ok)';
          }
          if (compEl) compEl.textContent = 'Single connected component';
          if (alertEl) alertEl.style.display = 'none';
        } else {
          if (graphEl) {
            graphEl.textContent = 'DISCONNECTED';
            graphEl.style.color = 'var(--warn)';
          }
          if (compEl) compEl.textContent = `${covRes.componentCount || 0} disconnected components`;
          if (alertEl) {
            alertEl.style.display = 'flex';
            if (alertMsg) {
              alertMsg.textContent = covRes.disconnectedComponentsMessage || 'The comparison graph contains disjoint subgraphs. Collect more head-to-head comparisons across disjoint project clusters before publishing final rankings.';
            }
          }
        }
      }

      // 2. Populate Bradley-Terry Leaderboard
      const tbody = container.querySelector('#pairwiseResultsTableBody');
      const badge = container.querySelector('#btConvergenceBadge');
      if (resRes && Array.isArray(resRes.rankings)) {
        if (badge) {
          if (resRes.converged) {
            badge.innerHTML = `<span class="bdg ok" style="font-size:0.75rem">&check; Converged (${resRes.iterations || 0} iters, &Delta; &lt; 10⁻⁶)</span>`;
          } else {
            badge.innerHTML = `<span class="bdg warn" style="font-size:0.75rem">${escapeHtml(resRes.status || 'Iterating')}</span>`;
          }
        }

        if (resRes.rankings.length === 0) {
          if (tbody) tbody.innerHTML = `<div style="text-align:center;padding:24px;color:var(--mute)">No submissions ranked yet. Enable pairwise mode and submit head-to-head reviews.</div>`;
        } else {
          if (tbody) {
            tbody.innerHTML = resRes.rankings.map(r => `
              <div style="display:grid;grid-template-columns:60px 2.5fr 1fr 1fr 1fr 1fr 1.2fr;gap:10px;align-items:center;padding:10px 14px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);font-size:0.88rem">
                <div><b style="font-family:var(--display);color:${r.rank === 1 ? 'var(--ok)' : r.rank <= 3 ? 'var(--c)' : 'inherit'}">#${r.rank}</b></div>
                <div>
                  <b style="color:#FFF;display:block">${escapeHtml(r.title || 'Submission #' + r.submissionId)}</b>
                  <small style="color:var(--mute)">ID: ${r.submissionId}</small>
                </div>
                <div><span class="trk">${escapeHtml(r.track || 'General')}</span></div>
                <div style="text-align:right"><b>${r.comparisonCount || 0}</b></div>
                <div style="text-align:right">${r.wins || 0}W - ${r.losses || 0}L</div>
                <div style="text-align:right"><b style="color:${r.winRate >= 50 ? 'var(--ok)' : 'var(--warn)'}">${(r.winRate || 0).toFixed(1)}%</b></div>
                <div style="text-align:right"><b style="font-family:var(--mono);color:var(--c)">${(r.strength || 0).toFixed(4)}</b></div>
              </div>
            `).join('');
          }
        }
      } else if (tbody) {
        tbody.innerHTML = `<div style="text-align:center;padding:24px;color:var(--mute)">No pairwise ranking data available.</div>`;
      }

      // 3. Populate Comparison History Stream
      const histBody = container.querySelector('#pairwiseHistoryTableBody');
      const compsBadge = container.querySelector('#totalCompsCountBadge');
      const comparisons = Array.isArray(histRes) ? histRes : [];
      if (compsBadge) compsBadge.textContent = `${comparisons.length} Total Comparisons`;

      if (histBody) {
        if (comparisons.length === 0) {
          histBody.innerHTML = `<div style="text-align:center;padding:20px;color:var(--mute)">No pairwise comparisons recorded yet.</div>`;
        } else {
          histBody.innerHTML = comparisons.slice(0, 30).map(c => `
            <div style="display:grid;grid-template-columns:100px 100px 1fr 1fr 1fr 2fr;gap:10px;align-items:center;padding:8px 14px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);font-size:0.85rem">
              <div style="font-size:0.8rem;color:var(--mute)">${c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</div>
              <div><span style="font-family:var(--mono);font-size:0.82rem">Judge #${c.judgeId}</span></div>
              <div>Project #${c.projectAId}</div>
              <div>Project #${c.projectBId}</div>
              <div><b style="color:var(--ok)">🏆 Project #${c.winnerProjectId}</b></div>
              <div style="color:var(--mute);font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.notes || '-')}</div>
            </div>
          `).join('');
        }
      }

    } catch (err) {
      notify(`Failed to refresh pairwise telemetry: ${err.message}`, 'error');
    }
  }

  // Toggle Mode Handler
  toggleBtn?.addEventListener('click', async () => {
    toggleBtn.disabled = true;
    try {
      const nextState = !isPairwiseEnabled;
      const res = await api.togglePairwiseMode(eventId, nextState);
      isPairwiseEnabled = Boolean(res?.pairwiseJudgingEnabled != null ? res.pairwiseJudgingEnabled : nextState);

      if (statusBadge) {
        statusBadge.textContent = isPairwiseEnabled ? 'ENABLED' : 'DISABLED';
        statusBadge.className = `bdg ${isPairwiseEnabled ? 'ok' : 'mute'}`;
      }
      toggleBtn.textContent = isPairwiseEnabled ? 'Disable Pairwise Mode' : 'Enable Pairwise Mode';
      toggleBtn.className = `btn ${isPairwiseEnabled ? 'ghost' : 'main'} sm`;

      notify(`Pairwise judging mode ${isPairwiseEnabled ? 'enabled' : 'disabled'}!`, 'success');
      await refreshPairwiseData();
    } catch (err) {
      notify(`Failed to toggle pairwise mode: ${err.message}`, 'error');
    } finally {
      toggleBtn.disabled = false;
    }
  });

  refreshBtn?.addEventListener('click', () => {
    refreshPairwiseData();
    notify('Pairwise telemetry refreshed', 'info');
  });

  exportCsvBtn?.addEventListener('click', async () => {
    try {
      await api.exportPairwiseCsv(eventId);
      notify('Downloaded pairwise rankings CSV', 'success');
    } catch (err) {
      notify(`Export failed: ${err.message}`, 'error');
    }
  });

  // Initial load of pairwise data
  refreshPairwiseData();
}

function bindTrackForm(eventId, container) {
  const form = document.getElementById('addTrackForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newTrackName').value.trim();
    const description = document.getElementById('newTrackDesc').value.trim();
    const btn = document.getElementById('addTrackBtn');

    if (!name) return;
    btn.disabled = true;

    try {
      await api.addTrack(eventId, { name, description });
      notify(`Track "${name}" added successfully!`, 'success');
      await renderDashboard(container, eventId);
    } catch (err) {
      notify(`Failed to add track: ${err.message}`, 'error');
      btn.disabled = false;
    }
  });
}

function bindRubricEditor(eventId, initialCriteria, container) {
  let criteria = initialCriteria.map(c => ({
    name: c.name,
    key: c.key || c.criterionKey,
    weight: Number(c.weight),
    minScore: c.minScore != null ? Number(c.minScore) : 1,
    maxScore: c.maxScore != null ? Number(c.maxScore) : 5
  }));

  function updateSum() {
    let sum = 0;
    const wtInputs = document.querySelectorAll('.crit-weight-input');
    wtInputs.forEach(input => {
      sum += parseFloat(input.value || input.getAttribute('value')) || 0;
    });
    const sumEl = document.getElementById('weightSumVal');
    const containerEl = document.getElementById('rubricWeightSum');
    if (sumEl) sumEl.textContent = sum.toString();
    if (containerEl) {
      if (sum === 100) {
        containerEl.style.color = 'var(--m)';
      } else {
        containerEl.style.color = 'var(--bad)';
      }
    }
    return sum;
  }

  function attachRowListeners(row) {
    row.querySelector('.crit-weight-input')?.addEventListener('input', updateSum);
    row.querySelector('.remove-crit-btn')?.addEventListener('click', () => {
      row.remove();
      updateSum();
    });
  }

  document.querySelectorAll('.rubric-row').forEach(attachRowListeners);
  document.querySelectorAll('.crit-weight-input').forEach(input => input.addEventListener('input', updateSum));
  updateSum();

  document.getElementById('addCriterionBtn')?.addEventListener('click', () => {
    const listContainer = document.getElementById('criteriaListRows');
    const row = document.createElement('div');
    row.className = 'rubric-row';
    row.style.cssText = 'display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1fr auto;gap:10px;align-items:center;padding:10px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)';
    row.innerHTML = `
      <div>
        <small style="color:var(--mute);display:block;font-size:0.7rem">NAME</small>
        <input type="text" class="crit-name-input" placeholder="Criterion Name *" required style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--text);font-weight:600;font-size:0.9rem">
      </div>
      <div>
        <small style="color:var(--mute);display:block;font-size:0.7rem">KEY</small>
        <input type="text" class="crit-key-input" placeholder="e.g. innovation *" required style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--c);font-family:var(--mono);font-size:0.85rem">
      </div>
      <div>
        <small style="color:var(--mute);display:block;font-size:0.7rem">WEIGHT (%)</small>
        <input type="number" min="1" max="100" class="crit-weight-input" value="25" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--text);font-weight:700;font-family:var(--mono)">
      </div>
      <div>
        <small style="color:var(--mute);display:block;font-size:0.7rem">MIN</small>
        <input type="number" min="0" max="10" step="0.5" class="crit-min-input" value="1" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--text);font-size:0.85rem">
      </div>
      <div>
        <small style="color:var(--mute);display:block;font-size:0.7rem">MAX</small>
        <input type="number" min="1" max="10" step="0.5" class="crit-max-input" value="5" style="width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--text);font-size:0.85rem">
      </div>
      <div>
        <button type="button" class="btn ghost sm remove-crit-btn" style="color:var(--bad);padding:4px 8px;font-size:0.8rem">&times;</button>
      </div>
    `;
    listContainer?.appendChild(row);
    attachRowListeners(row);
    updateSum();
  });

  document.getElementById('saveRubricBtn')?.addEventListener('click', async () => {
    const sum = updateSum();
    if (sum !== 100) {
      notify(`Total weight must equal 100% (currently ${sum}%)`, 'error');
      return;
    }

    const nameInputs = document.querySelectorAll('.crit-name-input');
    const keyInputs = document.querySelectorAll('.crit-key-input');
    const weightInputs = document.querySelectorAll('.crit-weight-input');
    const minInputs = document.querySelectorAll('.crit-min-input');
    const maxInputs = document.querySelectorAll('.crit-max-input');

    const criteriaToSave = [];
    let valid = true;

    for (let i = 0; i < nameInputs.length; i++) {
      const name = (nameInputs[i]?.value || nameInputs[i]?.getAttribute('value') || '').trim();
      let key = (keyInputs[i]?.value || keyInputs[i]?.getAttribute('value') || '').trim();
      const weight = parseFloat(weightInputs[i]?.value || weightInputs[i]?.getAttribute('value')) || 0;
      const minScore = parseFloat(minInputs[i]?.value || minInputs[i]?.getAttribute('value')) || 1.0;
      const maxScore = parseFloat(maxInputs[i]?.value || maxInputs[i]?.getAttribute('value')) || 5.0;

      if (!name) {
        notify('All criteria must have a name', 'error');
        valid = false;
        break;
      }
      if (!key) {
        key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }

      criteriaToSave.push({ name, key, weight, minScore, maxScore });
    }

    if (!valid || criteriaToSave.length === 0) return;

    const saveBtn = document.getElementById('saveRubricBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      await api.saveRubric(eventId, criteriaToSave);
      notify('Rubric saved successfully with 100% weight allocation!', 'success');
      await renderDashboard(container, eventId);
    } catch (err) {
      notify(`Failed to save rubric: ${err.message}`, 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Rubric \u2192';
      }
    }
  });
}

function bindManualAssignForm(eventId, container, assignments = []) {
  const form = document.getElementById('manualAssignForm');
  const feedbackEl = document.getElementById('assignFeedback');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const judgeId = document.getElementById('assignJudgeSelect').value;
    const submissionId = document.getElementById('assignSubSelect').value;
    const btn = document.getElementById('submitAssignBtn');

    if (!judgeId || !submissionId) return;

    // Client-side guard against assigning the same judge twice to the same project
    const alreadyAssigned = assignments.some(a =>
      String(a.judgeId) === String(judgeId) &&
      String(a.submissionId) === String(submissionId) &&
      a.status !== 'REMOVED_COI'
    );
    if (alreadyAssigned) {
      if (feedbackEl) {
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = 'rgba(255, 122, 144, 0.15)';
        feedbackEl.style.border = '1px solid rgba(255, 122, 144, 0.4)';
        feedbackEl.style.color = 'var(--bad)';
        feedbackEl.innerHTML = '<b>Assignment Error:</b> Cannot assign: Judge is already assigned to this project.';
      }
      notify('Cannot assign: Judge is already assigned to this project.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Assigning...';
    if (feedbackEl) feedbackEl.style.display = 'none';

    try {
      await api.assignJudge(eventId, LongOrString(judgeId), LongOrString(submissionId));
      notify('Judge assigned to project successfully!', 'success');
      await renderDashboard(container, eventId);
    } catch (err) {
      // Gracefully handle Conflict of Interest or duplicate assignment error
      const isCoi = err.message.toLowerCase().includes('conflict') || err.message.toLowerCase().includes('coi');
      if (feedbackEl) {
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = 'rgba(255, 122, 144, 0.15)';
        feedbackEl.style.border = '1px solid rgba(255, 122, 144, 0.4)';
        feedbackEl.style.color = 'var(--bad)';
        feedbackEl.innerHTML = `<b>${isCoi ? '⚠️ Conflict of Interest Blocked:' : 'Assignment Error:'}</b> ${escapeHtml(err.message)}`;
      }
      notify(`Assignment failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Assign Judge \u2192';
    }
  });

  document.querySelectorAll('.remove-assignment-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const aid = (e?.currentTarget || e?.target || btn)?.getAttribute('data-aid');
      if (!aid) return;
      btn.disabled = true;
      try {
        await api.deleteAssignment(eventId, aid);
        notify('Assignment removed successfully', 'info');
        await renderDashboard(container, eventId);
      } catch (err) {
        const isCompleted = err.message?.toLowerCase().includes('completed') || err.message?.toLowerCase().includes('score review');
        const userMsg = isCompleted ? 'This review is completed and cannot be removed.' : `Failed to remove assignment: ${err.message}`;
        notify(userMsg, 'error');
        btn.disabled = false;
      }
    });
  });
}

function bindCustomQuestions(eventId, container) {
  const form = document.getElementById('addQuestionForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = document.getElementById('newQuestionPrompt').value.trim();
    const questionKey = document.getElementById('newQuestionKey').value.trim();
    const questionType = document.getElementById('newQuestionType').value;
    const required = document.getElementById('newQuestionRequired').checked;
    const btn = document.getElementById('addQuestionBtn');

    if (!prompt || !questionKey) return;
    btn.disabled = true;

    try {
      await api.addCustomQuestion(eventId, {
        prompt,
        questionKey,
        questionType,
        required,
        displayOrder: 0
      });
      notify(`Question "${prompt}" added successfully!`, 'success');
      await renderDashboard(container, eventId);
    } catch (err) {
      notify(`Failed to add question: ${err.message}`, 'error');
      btn.disabled = false;
    }
  });

  document.querySelectorAll('.delete-cq-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const qid = e.currentTarget.getAttribute('data-qid');
      if (!qid) return;
      btn.disabled = true;
      try {
        await api.deleteCustomQuestion(eventId, qid);
        notify('Question deleted successfully', 'success');
        await renderDashboard(container, eventId);
      } catch (err) {
        notify(`Failed to delete question: ${err.message}`, 'error');
        btn.disabled = false;
      }
    });
  });
}

function LongOrString(val) {
  const num = Number(val);
  return isNaN(num) ? val : num;
}

function formatDateTime(isoString) {
  if (!isoString) return 'Not configured';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

function toLocalInput(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function getDeadlineBadgeHtml(deadlineIso, status) {
  if (status === 'CLOSED') {
    return `<span class="bdg bad" style="font-size:0.85rem;padding:6px 12px;font-weight:700">🔴 EVENT CLOSED</span>`;
  }
  if (!deadlineIso) {
    return `<span class="bdg warn" style="font-size:0.85rem;padding:6px 12px;font-weight:700">NO DEADLINE SET</span>`;
  }
  const now = Date.now();
  const d = new Date(deadlineIso).getTime();
  const diffMs = d - now;
  if (diffMs <= 0) {
    return `<span class="bdg bad" style="font-size:0.85rem;padding:6px 12px;font-weight:700">⚠️ DEADLINE PASSED</span>`;
  }
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const remainingStr = days > 0 ? `${days}d ${hours}h remaining` : `${hours}h ${mins}m remaining`;
  return `<span class="bdg ok" style="font-size:0.85rem;padding:6px 12px;font-weight:700">🟢 OPEN &bull; ${remainingStr}</span>`;
}

function renderEditEventModalHtml() {
  return `
  <div class="modal-backdrop" id="editEventModal">
    <div class="modal-card" style="max-width:700px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1.6rem;margin:0">✏️ Edit Details</h3>
        <button class="btn ghost sm" id="closeEditEventBtnTop" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.92rem;margin:0 0 12px">All previous hackathon details and schedules are loaded below for easy editing.</p>
      <div style="padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);margin-bottom:16px;font-size:0.86rem;color:var(--text)">
        ℹ️ Previous hackathon settings are pre-filled below. Update any values and click "Save Changes" to apply.
      </div>

      <form id="editEventForm">
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">
          <div class="fld">
            <label for="editEventName">Event Name *</label>
            <input id="editEventName" type="text" placeholder="Hackathon Name" required>
          </div>
          <div class="fld">
            <label for="editEventStatus">Event Status *</label>
            <select id="editEventStatus">
              <option value="OPEN">OPEN (Accepting Submissions)</option>
              <option value="CLOSED">CLOSED (Completed / Final)</option>
            </select>
          </div>
        </div>

        <div class="fld">
          <label for="editEventDesc">Description & Guidelines</label>
          <textarea id="editEventDesc" rows="3" placeholder="Overview, eligibility, and rules..."></textarea>
        </div>

        <div style="margin:16px 0 8px;font-size:0.95rem;font-weight:700;color:var(--c);border-bottom:1px solid var(--line);padding-bottom:6px">
          📅 Lifecycle Dates & Phases
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="editSubStart">Submission Start</label>
            <input id="editSubStart" type="datetime-local">
          </div>
          <div class="fld">
            <label for="editEventDeadline">Submission Deadline *</label>
            <input id="editEventDeadline" type="datetime-local" required>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="editRegStart">Registration Start</label>
            <input id="editRegStart" type="datetime-local">
          </div>
          <div class="fld">
            <label for="editRegEnd">Registration End</label>
            <input id="editRegEnd" type="datetime-local">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="editEventStart">Event Start</label>
            <input id="editEventStart" type="datetime-local">
          </div>
          <div class="fld">
            <label for="editEventEnd">Event End</label>
            <input id="editEventEnd" type="datetime-local">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="editJudgingStart">Judging Start</label>
            <input id="editJudgingStart" type="datetime-local">
          </div>
          <div class="fld">
            <label for="editJudgingEnd">Judging End</label>
            <input id="editJudgingEnd" type="datetime-local">
          </div>
        </div>

        <div class="fld">
          <label for="editResultsPublishAt">Results Publish Date</label>
          <input id="editResultsPublishAt" type="datetime-local">
        </div>

        <div class="fld" style="margin-top:14px">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--glass2);padding:10px 14px;border-radius:10px;border:1px solid var(--line)">
            <input type="checkbox" id="editPairwiseEnabled" style="width:18px;height:18px">
            <span style="font-weight:600">⚔️ Enable Pairwise Judging Mode (Bradley-Terry Ranking)</span>
          </label>
        </div>

        <div style="margin:16px 0 8px;font-size:0.95rem;font-weight:700;color:var(--m);border-bottom:1px solid var(--line);padding-bottom:6px">
          🗳️ Community Voting Configuration (T3)
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fld">
            <label for="editVotingEnabled">Enable Community Voting</label>
            <select id="editVotingEnabled">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <div class="fld">
            <label for="editVotingAccessMode">Voting Access Mode</label>
            <select id="editVotingAccessMode">
              <option value="OPEN">Open Link (Public)</option>
              <option value="EMAIL">Email-Gated</option>
              <option value="AUTHENTICATED">Authenticated Users Only</option>
            </select>
          </div>
        </div>

        <div id="editEventError" style="display:none;color:var(--bad);font-size:0.88rem;margin-top:10px"></div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px">
          <button class="btn ghost sm" id="cancelEditEventBtn" type="button">Cancel</button>
          <button class="btn main sm" id="submitEditEventBtn" type="submit" style="background:var(--p);color:#FFF">Save Changes &rarr;</button>
        </div>
      </form>
    </div>
  </div>
  `;
}

function renderViewAllEventsModalHtml() {
  return `
  <div class="modal-backdrop" id="viewAllEventsModal">
    <div class="modal-card" style="max-width:820px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1.6rem;margin:0">👁️ All Hackathons</h3>
        <button class="btn ghost sm" id="closeViewAllEventsBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.92rem;margin:0 0 14px">Browse all hackathon events. Select any event to switch your organizer dashboard.</p>
      
      <input type="text" id="filterAllEventsInput" placeholder="🔍 Search hackathons by name, ID, or description..." style="width:100%;height:40px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 12px;font-size:0.9rem;margin-bottom:14px">

      <div id="allEventsListContainer" style="display:grid;gap:10px">
        <div style="padding:24px;text-align:center;color:var(--mute)">Loading events...</div>
      </div>
    </div>
  </div>
  `;
}

function renderViewAllProgressModalHtml() {
  return `
  <div class="modal-backdrop" id="viewAllProgressModal">
    <div class="modal-card" style="max-width:760px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1.5rem;margin:0">📊 Live Judging Progress — All Judges</h3>
        <button class="btn ghost sm" id="closeViewAllProgressBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 14px">Complete progress overview across all assigned judges for this hackathon.</p>
      
      <input type="text" id="filterProgressInput" placeholder="🔍 Filter judges by name..." style="width:100%;height:38px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 12px;font-size:0.9rem;margin-bottom:14px">

      <div id="allProgressListContainer" style="display:grid;gap:12px"></div>
    </div>
  </div>
  `;
}

function renderViewAllJudgesModalHtml() {
  return `
  <div class="modal-backdrop" id="viewAllJudgesModal">
    <div class="modal-card" style="max-width:760px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1.5rem;margin:0">⚖️ Registered Judges</h3>
        <button class="btn ghost sm" id="closeViewAllJudgesBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 14px">All judges enrolled and eligible to evaluate submissions in this event.</p>
      
      <input type="text" id="filterJudgesInput" placeholder="🔍 Search judges by username or email..." style="width:100%;height:38px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 12px;font-size:0.9rem;margin-bottom:14px">

      <div id="allJudgesListContainer"></div>
    </div>
  </div>
  `;
}

function renderViewAllAssignmentsModalHtml() {
  return `
  <div class="modal-backdrop" id="viewAllAssignmentsModal">
    <div class="modal-card" style="max-width:960px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1.5rem;margin:0">📋 All Active Assignments</h3>
        <button class="btn ghost sm" id="closeViewAllAssignmentsBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 14px">Inspect all active judge assignments. Search by judge, submission title, track, or status.</p>
      
      <input type="text" id="filterAssignmentsInput" placeholder="🔍 Search assignments by judge, project, track, status, ID..." style="width:100%;height:38px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 12px;font-size:0.9rem;margin-bottom:14px">

      <div id="allAssignmentsListContainer" style="overflow-x:auto;border-radius:12px;border:1px solid var(--line);background:var(--glass2)"></div>
    </div>
  </div>
  `;
}

function renderViewAllDistributionModalHtml() {
  return `
  <div class="modal-backdrop" id="viewAllDistributionModal">
    <div class="modal-card" style="max-width:860px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1.5rem;margin:0">📈 Score Distribution & Judge Bias</h3>
        <button class="btn ghost sm" id="closeViewAllDistributionBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 14px">Per-judge raw scoring distributions and Z-score normalized metrics ($T = 50 + 10z$).</p>
      
      <input type="text" id="filterDistributionInput" placeholder="🔍 Search by judge name or ID..." style="width:100%;height:38px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 12px;font-size:0.9rem;margin-bottom:14px">

      <div id="allDistributionListContainer"></div>
    </div>
  </div>
  `;
}

function bindEditEventModal(eventId, eventDetails, container) {
  const modal = document.getElementById('editEventModal');
  const openBtns = [document.getElementById('openEditEventBtn'), document.getElementById('openEditEventBtnTop')].filter(Boolean);
  const cancelBtn = document.getElementById('cancelEditEventBtn');
  const closeTopBtn = document.getElementById('closeEditEventBtnTop');
  const form = document.getElementById('editEventForm');
  const errorEl = document.getElementById('editEventError');

  const populateEditFields = (details) => {
    const ev = details || {};
    const baseDeadline = ev.submissionDeadline ? new Date(ev.submissionDeadline) : new Date(Date.now() + 14 * 86400000);
    const deadlineMs = (!isNaN(baseDeadline.getTime())) ? baseDeadline.getTime() : (Date.now() + 14 * 86400000);

    const prevName = ev.name || 'Sample Hackathon';
    const prevDesc = ev.description || 'Premier hackathon event for developers and builders.';
    const prevStatus = (ev.status || 'OPEN').toUpperCase();
    const prevDeadline = ev.submissionDeadline || new Date(deadlineMs).toISOString();
    const prevSubStart = ev.submissionStart || new Date(deadlineMs - 14 * 86400000).toISOString();
    const prevRegStart = ev.registrationStart || new Date(deadlineMs - 30 * 86400000).toISOString();
    const prevRegEnd = ev.registrationEnd || new Date(deadlineMs - 7 * 86400000).toISOString();
    const prevEventStart = ev.eventStart || new Date(deadlineMs - 14 * 86400000).toISOString();
    const prevEventEnd = ev.eventEnd || new Date(deadlineMs).toISOString();
    const prevJudgingStart = ev.judgingStart || new Date(deadlineMs).toISOString();
    const prevJudgingEnd = ev.judgingEnd || new Date(deadlineMs + 3 * 86400000).toISOString();
    const prevResultsPublish = ev.resultsPublishAt || new Date(deadlineMs + 5 * 86400000).toISOString();

    const nameEl = document.getElementById('editEventName');
    const descEl = document.getElementById('editEventDesc');
    const statusEl = document.getElementById('editEventStatus');
    const deadlineEl = document.getElementById('editEventDeadline');
    const subStartEl = document.getElementById('editSubStart');
    const regStartEl = document.getElementById('editRegStart');
    const regEndEl = document.getElementById('editRegEnd');
    const eventStartEl = document.getElementById('editEventStart');
    const eventEndEl = document.getElementById('editEventEnd');
    const judgingStartEl = document.getElementById('editJudgingStart');
    const judgingEndEl = document.getElementById('editJudgingEnd');
    const resultsPublishEl = document.getElementById('editResultsPublishAt');
    const votingEnabledEl = document.getElementById('editVotingEnabled');
    const votingAccessModeEl = document.getElementById('editVotingAccessMode');

    if (nameEl) nameEl.value = prevName;
    if (descEl) descEl.value = prevDesc;
    if (statusEl) statusEl.value = prevStatus;
    if (deadlineEl) deadlineEl.value = toLocalInput(prevDeadline);
    if (subStartEl) subStartEl.value = toLocalInput(prevSubStart);
    if (regStartEl) regStartEl.value = toLocalInput(prevRegStart);
    if (regEndEl) regEndEl.value = toLocalInput(prevRegEnd);
    if (eventStartEl) eventStartEl.value = toLocalInput(prevEventStart);
    if (eventEndEl) eventEndEl.value = toLocalInput(prevEventEnd);
    if (judgingStartEl) judgingStartEl.value = toLocalInput(prevJudgingStart);
    if (judgingEndEl) judgingEndEl.value = toLocalInput(prevJudgingEnd);
    if (resultsPublishEl) resultsPublishEl.value = toLocalInput(prevResultsPublish);
    if (votingEnabledEl) votingEnabledEl.value = (ev.votingEnabled !== false) ? 'true' : 'false';
    if (votingAccessModeEl) votingAccessModeEl.value = ev.votingAccessMode || 'OPEN';
    const pairwiseEnabledEl = document.getElementById('editPairwiseEnabled');
    if (pairwiseEnabledEl) pairwiseEnabledEl.checked = (ev.pairwiseJudgingEnabled !== false);
  };

  // Populate immediately on bind so inputs are ready
  populateEditFields(eventDetails);

  openBtns.forEach(b => b.addEventListener('click', async () => {
    // Populate immediately with current event details
    populateEditFields(eventDetails);

    if (errorEl) errorEl.style.display = 'none';
    modal?.classList.add('open');

    // Also fetch fresh from server to ensure any external updates are reflected
    try {
      const freshRes = await api.getEvent(eventId);
      const freshEv = freshRes?.data || freshRes;
      if (freshEv && (freshEv.name || freshEv.id)) {
        populateEditFields(freshEv);
      }
    } catch {}
  }));

  const closeModal = () => modal?.classList.remove('open');
  cancelBtn?.addEventListener('click', closeModal);
  closeTopBtn?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('editEventName').value.trim();
    const description = document.getElementById('editEventDesc').value.trim();
    const status = document.getElementById('editEventStatus').value;
    const deadlineVal = document.getElementById('editEventDeadline').value;
    const submitBtn = document.getElementById('submitEditEventBtn');

    if (!name) {
      if (errorEl) { errorEl.textContent = 'Event name is required'; errorEl.style.display = 'block'; }
      return;
    }
    if (!deadlineVal) {
      if (errorEl) { errorEl.textContent = 'Submission deadline is required'; errorEl.style.display = 'block'; }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    if (errorEl) errorEl.style.display = 'none';

    const toIso = (val) => (val && val.trim()) ? new Date(val).toISOString() : null;

    try {
      const payload = {
        name,
        description,
        status,
        submissionDeadline: toIso(deadlineVal),
        submissionStart: toIso(document.getElementById('editSubStart')?.value),
        registrationStart: toIso(document.getElementById('editRegStart')?.value),
        registrationEnd: toIso(document.getElementById('editRegEnd')?.value),
        eventStart: toIso(document.getElementById('editEventStart')?.value),
        eventEnd: toIso(document.getElementById('editEventEnd')?.value),
        judgingStart: toIso(document.getElementById('editJudgingStart')?.value),
        judgingEnd: toIso(document.getElementById('editJudgingEnd')?.value),
        resultsPublishAt: toIso(document.getElementById('editResultsPublishAt')?.value),
        votingEnabled: document.getElementById('editVotingEnabled')?.value === 'true',
        votingAccessMode: document.getElementById('editVotingAccessMode')?.value || 'OPEN',
        pairwiseJudgingEnabled: document.getElementById('editPairwiseEnabled')?.checked ?? true
      };

      const updated = await api.updateEvent(eventId, payload);
      closeModal();
      notify(`Hackathon "${updated?.name || name}" updated successfully!`, 'success');

      await refreshEventSelectors(eventId);
      await renderDashboard(container, eventId);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Failed to update event';
        errorEl.style.display = 'block';
      }
      notify(`Update failed: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes \u2192';
    }
  });
}

function bindViewAllEventsModal(container) {
  const modal = document.getElementById('viewAllEventsModal');
  const openBtns = [document.getElementById('openViewAllEventsBtn'), document.getElementById('openViewAllEventsBtnTop')].filter(Boolean);
  const closeBtn = document.getElementById('closeViewAllEventsBtn');
  const listContainer = document.getElementById('allEventsListContainer');
  const filterInput = document.getElementById('filterAllEventsInput');

  let allEventsData = [];

  function renderList(events) {
    if (!listContainer) return;
    if (events.length === 0) {
      listContainer.innerHTML = `<p style="color:var(--mute);text-align:center;padding:24px">No events matched your search.</p>`;
      return;
    }
    const currentActiveId = authStore.getEventId();
    listContainer.innerHTML = events.map(ev => {
      const isCurrent = String(ev.id) === String(currentActiveId);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-radius:14px;background:var(--glass2);border:1px solid ${isCurrent ? 'var(--c)' : 'var(--line)'};flex-wrap:wrap;gap:12px">
          <div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="bdg ${ev.status === 'CLOSED' ? 'bad' : 'ok'}" style="font-size:0.75rem">${escapeHtml(ev.status || 'OPEN')}</span>
              <b style="font-size:1.05rem">${escapeHtml(ev.name)}</b>
              <span style="color:var(--mute);font-size:0.8rem">#${ev.id}</span>
              ${isCurrent ? '<span class="bdg warn" style="font-size:0.7rem">Active Event</span>' : ''}
            </div>
            <p style="color:var(--mute);font-size:0.85rem;margin:4px 0 0;max-width:55ch">${escapeHtml(ev.description || 'No description')}</p>
            <div style="font-size:0.78rem;color:var(--c);margin-top:4px">
              <b>Deadline:</b> ${formatDateTime(ev.submissionDeadline)}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn ${isCurrent ? 'ghost' : 'main'} sm switch-event-btn" data-evid="${ev.id}" type="button">
              ${isCurrent ? 'Current Dashboard' : 'Switch Dashboard &rarr;'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.switch-event-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const evid = btn.getAttribute('data-evid');
        if (!evid) return;
        modal?.classList.remove('open');
        await refreshEventSelectors(evid);
        await renderDashboard(container, evid);
      });
    });
  }

  openBtns.forEach(b => b.addEventListener('click', async () => {
    if (listContainer) listContainer.innerHTML = `<div style="padding:24px;text-align:center;color:var(--mute)">Loading all events...</div>`;
    modal?.classList.add('open');
    try {
      const res = await api.getEvents();
      allEventsData = Array.isArray(res?.data || res) ? (res?.data || res) : [];
      renderList(allEventsData);
    } catch (err) {
      if (listContainer) listContainer.innerHTML = `<div style="color:var(--bad);padding:24px;text-align:center">Failed to load events: ${escapeHtml(err.message)}</div>`;
    }
  }));

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  filterInput?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderList(allEventsData);
    } else {
      const filtered = allEventsData.filter(ev =>
        (ev.name && ev.name.toLowerCase().includes(term)) ||
        (ev.description && ev.description.toLowerCase().includes(term)) ||
        String(ev.id).includes(term)
      );
      renderList(filtered);
    }
  });
}

function bindViewAllProgressModal(judgeProgressList) {
  const modal = document.getElementById('viewAllProgressModal');
  const openBtn = document.getElementById('viewAllProgressBtn');
  const closeBtn = document.getElementById('closeViewAllProgressBtn');
  const listContainer = document.getElementById('allProgressListContainer');
  const filterInput = document.getElementById('filterProgressInput');

  function renderList(list) {
    if (!listContainer) return;
    if (list.length === 0) {
      listContainer.innerHTML = `<p style="color:var(--mute);text-align:center;padding:24px">No judges match search.</p>`;
      return;
    }
    listContainer.innerHTML = list.map(j => {
      const pct = j.total > 0 ? Math.round((j.scored / j.total) * 100) : 0;
      const isDone = j.total > 0 && j.scored >= j.total;
      return `
        <div style="padding:14px 18px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.95rem;font-weight:600;margin-bottom:8px">
            <div>
              <span>${escapeHtml(j.name)}</span>
              ${isDone ? '<span class="bdg ok" style="font-size:0.7rem;margin-left:6px">Completed</span>' : '<span class="bdg warn" style="font-size:0.7rem;margin-left:6px">In Progress</span>'}
            </div>
            <span style="font-family:var(--mono);font-size:0.9rem">${j.scored} / ${j.total} (${pct}%)</span>
          </div>
          <div style="height:8px;border-radius:99px;background:rgba(255,255,255,0.08);overflow:hidden">
            <div style="height:100%;width:${pct}%;background:#3B82F6;border-radius:99px"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  openBtn?.addEventListener('click', () => {
    renderList(judgeProgressList);
    modal?.classList.add('open');
  });

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  filterInput?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderList(judgeProgressList);
    } else {
      const filtered = judgeProgressList.filter(j =>
        j.name && j.name.toLowerCase().includes(term)
      );
      renderList(filtered);
    }
  });
}

function bindViewAllJudgesModal(judges) {
  const modal = document.getElementById('viewAllJudgesModal');
  const openBtn = document.getElementById('viewAllJudgesBtn');
  const closeBtn = document.getElementById('closeViewAllJudgesBtn');
  const listContainer = document.getElementById('allJudgesListContainer');
  const filterInput = document.getElementById('filterJudgesInput');

  function renderList(list) {
    if (!listContainer) return;
    if (list.length === 0) {
      listContainer.innerHTML = `<p style="color:var(--mute);text-align:center;padding:24px">No judges match search.</p>`;
      return;
    }
    listContainer.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
        ${list.map(j => `
          <div style="padding:14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
            <div>
              <b style="font-size:0.96rem;display:block">${escapeHtml(j.username)}</b>
              <small style="color:var(--mute);font-size:0.82rem">${escapeHtml(j.email)}</small>
            </div>
            <span class="trk" style="font-size:0.78rem">Judge ID #${j.id}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  openBtn?.addEventListener('click', () => {
    renderList(judges);
    modal?.classList.add('open');
  });

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  filterInput?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderList(judges);
    } else {
      const filtered = judges.filter(j =>
        (j.username && j.username.toLowerCase().includes(term)) ||
        (j.email && j.email.toLowerCase().includes(term)) ||
        String(j.id).includes(term)
      );
      renderList(filtered);
    }
  });
}

function bindViewAllAssignmentsModal(eventId, assignments, container) {
  const modal = document.getElementById('viewAllAssignmentsModal');
  const openBtn = document.getElementById('viewAllAssignmentsBtn');
  const closeBtn = document.getElementById('closeViewAllAssignmentsBtn');
  const listContainer = document.getElementById('allAssignmentsListContainer');
  const filterInput = document.getElementById('filterAssignmentsInput');

  function renderList(list) {
    if (!listContainer) return;
    if (list.length === 0) {
      listContainer.innerHTML = `<p style="color:var(--mute);text-align:center;padding:24px">No assignments match search.</p>`;
      return;
    }
    listContainer.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.86rem">
        <thead>
          <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
            <th style="padding:10px 14px">ID</th>
            <th style="padding:10px 14px">Judge</th>
            <th style="padding:10px 14px">Submission</th>
            <th style="padding:10px 14px">Track</th>
            <th style="padding:10px 14px">Status</th>
            <th style="padding:10px 14px">Action</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(a => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
              <td style="padding:8px 14px;font-family:var(--mono)">#${a.id}</td>
              <td style="padding:8px 14px;font-weight:600">${escapeHtml(a.judgeUsername || 'Judge #' + a.judgeId)}</td>
              <td style="padding:8px 14px">${escapeHtml(a.submissionTitle || 'Submission #' + a.submissionId)}</td>
              <td style="padding:8px 14px"><span class="trk" style="font-size:0.75rem">${escapeHtml(a.track || 'General')}</span></td>
              <td style="padding:8px 14px">
                <span class="bdg ${a.status === 'COMPLETED' || a.status === 'SCORED' ? 'ok' : a.status === 'REMOVED_COI' ? 'bad' : 'warn'}" style="font-size:0.75rem">${escapeHtml(a.status || 'ASSIGNED')}</span>
              </td>
              <td style="padding:8px 14px">
                ${a.status !== 'COMPLETED' ? `
                  <button class="btn ghost sm modal-remove-assignment-btn" data-aid="${a.id}" type="button" style="padding:3px 8px;font-size:0.75rem;color:var(--bad);border-color:rgba(255,122,144,0.3)">Remove</button>
                ` : `
                  <span style="color:var(--mute);font-size:0.75rem">Reviewed</span>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    listContainer.querySelectorAll('.modal-remove-assignment-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const aid = btn.getAttribute('data-aid');
        if (!aid) return;
        btn.disabled = true;
        try {
          await api.deleteAssignment(eventId, aid);
          notify('Assignment removed successfully', 'info');
          modal?.classList.remove('open');
          await renderDashboard(container, eventId);
        } catch (err) {
          const isCompleted = err.message?.toLowerCase().includes('completed') || err.message?.toLowerCase().includes('score review');
          const userMsg = isCompleted ? 'This review is completed and cannot be removed.' : `Failed to remove assignment: ${err.message}`;
          notify(userMsg, 'error');
          btn.disabled = false;
        }
      });
    });
  }

  openBtn?.addEventListener('click', () => {
    renderList(assignments);
    modal?.classList.add('open');
  });

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  filterInput?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderList(assignments);
    } else {
      const filtered = assignments.filter(a =>
        (a.judgeUsername && a.judgeUsername.toLowerCase().includes(term)) ||
        (a.submissionTitle && a.submissionTitle.toLowerCase().includes(term)) ||
        (a.track && a.track.toLowerCase().includes(term)) ||
        (a.status && a.status.toLowerCase().includes(term)) ||
        String(a.id).includes(term)
      );
      renderList(filtered);
    }
  });
}

function bindViewAllDistributionModal(distribution) {
  const modal = document.getElementById('viewAllDistributionModal');
  const openBtn = document.getElementById('viewAllDistributionBtn');
  const closeBtn = document.getElementById('closeViewAllDistributionBtn');
  const listContainer = document.getElementById('allDistributionListContainer');
  const filterInput = document.getElementById('filterDistributionInput');

  function renderList(list) {
    if (!listContainer) return;
    if (list.length === 0) {
      listContainer.innerHTML = `<p style="color:var(--mute);text-align:center;padding:24px">No distribution telemetry matches search.</p>`;
      return;
    }
    listContainer.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">
        ${list.map(d => `
          <div style="padding:16px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)">
            <b style="font-size:.95rem">${escapeHtml(d.judgeName || 'Judge #' + d.judgeId)}</b>
            ${d.zeroVariance ? '<span class="bdg warn" style="margin-left:6px;font-size:0.7rem">Flat Judge (Z=0, T=50)</span>' : ''}
            <div style="margin-top:8px;font-size:.88rem;color:var(--mute);line-height:1.7">
              Raw mean: <span style="color:#FFF;font-family:var(--mono)">${(d.rawMean ?? 0).toFixed(2)}</span> &bull; StdDev: <span style="font-family:var(--mono)">${(d.rawStdDev ?? 0).toFixed(2)}</span><br>
              Normalized mean: <span style="color:var(--m);font-family:var(--mono);font-weight:700">${(d.normalizedMean ?? 0).toFixed(2)}</span> &bull; (${d.reviewsCount || 0} reviews)
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  openBtn?.addEventListener('click', () => {
    renderList(distribution);
    modal?.classList.add('open');
  });

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  filterInput?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderList(distribution);
    } else {
      const filtered = distribution.filter(d =>
        (d.judgeName && d.judgeName.toLowerCase().includes(term)) ||
        String(d.judgeId).includes(term)
      );
      renderList(filtered);
    }
  });
}

// ==========================================
// T3 & T4 Modal HTML Renderers & Bindings
// ==========================================

function renderWebhooksModalHtml() {
  return `
  <div class="modal-backdrop" id="webhooksModal">
    <div class="modal-card" style="max-width:920px;max-height:88vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <h3 style="font-size:1.5rem;margin:0">🔗 Webhook Command Center &amp; Local Sink</h3>
          <span class="bdg ok" style="font-size:0.72rem">HMAC-SHA256 Signed</span>
        </div>
        <button class="btn ghost sm" id="closeWebhooksBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 16px">
        Real-time event notification system. Register webhook receivers or use the built-in local sink to test full lifecycle payloads signed with <code>X-DogFood-Signature: sha256=...</code>
      </p>

      <!-- Webhook Registration Form -->
      <form id="registerWebhookForm" class="card" style="background:var(--glass2);padding:18px;margin-bottom:20px;border:1px solid var(--line);border-radius:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <b style="font-size:1rem">Register Webhook Endpoint</b>
          <div style="display:flex;align-items:center;gap:8px">
            <label for="whPresetSelect" style="font-size:0.78rem;color:var(--mute)">Quick Preset:</label>
            <select id="whPresetSelect" style="height:32px;font-size:0.8rem;border-radius:8px;background:rgba(0,0,0,0.3);border:1px solid var(--line);color:var(--text);padding:0 8px">
              <option value="custom">Custom Endpoint</option>
              <option value="builtin">🎯 Built-in Local Test Sink (/api/webhooks/receiver)</option>
              <option value="discord">💬 Discord Webhook Preset</option>
              <option value="slack">⚡ Slack Incoming Webhook Preset</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="fld">
            <label for="whUrl">Webhook Target URL *</label>
            <input id="whUrl" type="url" required placeholder="https://api.example.com/webhooks/dogfood" style="height:38px;border-radius:8px">
          </div>
          <div class="fld">
            <label for="whSecret">Signing Secret (optional / auto-generated)</label>
            <input id="whSecret" type="text" placeholder="whsec_..." style="height:38px;border-radius:8px;font-family:var(--mono)">
          </div>
        </div>

        <label style="font-size:0.85rem;color:var(--mute);display:block;margin-bottom:6px">Subscribed Event Types:</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:16px;background:rgba(0,0,0,0.2);padding:12px;border-radius:8px">
          <label style="font-size:0.82rem;display:flex;align-items:center;gap:6px"><input type="checkbox" name="whEvent" value="submission.created" checked> submission.created</label>
          <label style="font-size:0.82rem;display:flex;align-items:center;gap:6px"><input type="checkbox" name="whEvent" value="submission.updated" checked> submission.updated</label>
          <label style="font-size:0.82rem;display:flex;align-items:center;gap:6px"><input type="checkbox" name="whEvent" value="submission.submitted" checked> submission.submitted</label>
          <label style="font-size:0.82rem;display:flex;align-items:center;gap:6px"><input type="checkbox" name="whEvent" value="judge.assigned" checked> judge.assigned</label>
          <label style="font-size:0.82rem;display:flex;align-items:center;gap:6px"><input type="checkbox" name="whEvent" value="score.submitted" checked> score.submitted</label>
          <label style="font-size:0.82rem;display:flex;align-items:center;gap:6px"><input type="checkbox" name="whEvent" value="coi.declared" checked> coi.declared</label>
          <label style="font-size:0.82rem;display:flex;align-items:center;gap:6px"><input type="checkbox" name="whEvent" value="vote.created" checked> vote.created</label>
          <label style="font-size:0.82rem;display:flex;align-items:center;gap:6px"><input type="checkbox" name="whEvent" value="results.published" checked> results.published</label>
        </div>

        <button class="btn main sm" type="submit" id="btnRegisterWebhook">Register Webhook &rarr;</button>
      </form>

      <!-- Active Webhooks List -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px">
        <h4 style="font-size:1.1rem;margin:0">Registered Webhook Endpoints</h4>
        <div style="display:flex;align-items:center;gap:8px">
          <label for="simulateEventSelect" style="font-size:0.75rem;color:var(--mute)">Simulate Event:</label>
          <select id="simulateEventSelect" style="height:30px;font-size:0.78rem;border-radius:6px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 6px">
            <option value="test.ping">⚡ test.ping (Health Check)</option>
            <option value="submission.submitted">🚀 submission.submitted (New Project)</option>
            <option value="vote.created">🗳️ vote.created (Community Vote)</option>
            <option value="score.submitted">⚖️ score.submitted (Judge Evaluation)</option>
            <option value="results.published">🏆 results.published (Final Results)</option>
          </select>
        </div>
      </div>
      <div id="webhooksListContainer" style="margin-bottom:20px">
        <p style="color:var(--mute);font-size:0.88rem">Loading registered endpoints...</p>
      </div>

      <!-- Deliveries History -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px">
        <h4 style="font-size:1.1rem;margin:0">Recent Outbound Deliveries</h4>
        <button class="btn ghost sm" id="btnRefreshDeliveries" type="button" style="font-size:0.75rem;padding:3px 8px">🔄 Refresh Deliveries</button>
      </div>
      <div id="webhookDeliveriesContainer" style="max-height:200px;overflow-y:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2);padding:10px;margin-bottom:20px">
        <p style="color:var(--mute);font-size:0.85rem">Click Refresh to view delivery attempts.</p>
      </div>

      <!-- Built-in Local Sink Inspection Section -->
      <div class="card" style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);padding:16px;border-radius:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <b style="font-size:1rem">🎯 Built-in Local Receiver Sink Feed</b>
            <span class="bdg ok" style="font-size:0.7rem">100% Offline Testing</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn ghost sm" id="btnRefreshLocalSink" type="button" style="font-size:0.75rem;padding:3px 8px">🔄 Refresh Feed</button>
            <button class="btn ghost sm" id="btnClearLocalSink" type="button" style="font-size:0.75rem;padding:3px 8px;color:var(--bad)">Clear Buffer</button>
          </div>
        </div>
        <p style="color:var(--mute);font-size:0.82rem;margin:0 0 10px">
          Live stream of HTTP POST payloads received at <code>http://localhost:8080/api/webhooks/receiver</code> with cryptographic signature verification.
        </p>
        <div id="localSinkFeedContainer" style="max-height:180px;overflow-y:auto;border-radius:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.05);padding:10px;font-family:var(--mono);font-size:0.8rem">
          <p style="color:var(--mute);margin:0">Click Refresh Feed to query received deliveries.</p>
        </div>
      </div>
    </div>
  </div>
  `;
}

function renderCertificatesModalHtml() {
  return `
  <div class="modal-backdrop" id="certificatesModal">
    <div class="modal-card" style="max-width:860px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <h3 style="font-size:1.5rem;margin:0">📜 Certificates Authority</h3>
          <span class="bdg ok" style="font-size:0.72rem">SHA-256 Ledger</span>
        </div>
        <button class="btn ghost sm" id="closeCertificatesBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 16px">
        Issue tamper-evident cryptographic certificates for hackathon participants and winners. Every certificate is recorded with a unique SHA-256 ledger checksum and verifiable by the public.
      </p>

      <div style="display:flex;gap:12px;align-items:center;margin-bottom:18px;background:var(--glass2);padding:14px;border-radius:12px;border:1px solid var(--line);flex-wrap:wrap">
        <button class="btn main sm" id="btnGenerateCertificates" type="button" style="background:#2563EB;color:#FFF;font-weight:600;border:1px solid #3B82F6">
          ⚡ Generate Certificates for All Participants &amp; Winners
        </button>
        <span style="color:var(--mute);font-size:0.85rem">Automatically calculates winners based on normalized scores and awards participant certificates to all submitted teams.</span>
      </div>

      <h4 style="font-size:1.1rem;margin:16px 0 10px">Issued Certificates Ledger</h4>
      <div id="certificatesListContainer" style="max-height:360px;overflow-y:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2)">
        <p style="color:var(--mute);font-size:0.88rem;padding:16px;text-align:center">Loading issued certificates...</p>
      </div>
    </div>
  </div>
  `;
}

function renderBulkModalHtml() {
  return `
  <div class="modal-backdrop" id="bulkModal">
    <div class="modal-card" style="max-width:860px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1.5rem;margin:0">📦 Bulk Data, Migration &amp; Replicator</h3>
        <button class="btn ghost sm" id="closeBulkModalBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 16px">
        Export full JSON bundles, duplicate existing hackathons with tracks and rubrics into a new edition, or restore data safely.
      </p>

      <!-- Tabs -->
      <div style="display:flex;gap:10px;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn main sm" id="tabBulkExportBtn" type="button">⬇️ Export Event Bundle</button>
        <button class="btn ghost sm" id="tabBulkCloneBtn" type="button">⚡ Hackathon Replicator</button>
        <button class="btn ghost sm" id="tabBulkImportBtn" type="button">⬆️ Import &amp; Restore</button>
      </div>

      <!-- Export Panel -->
      <div id="panelBulkExport">
        <div class="card" style="background:var(--glass2);padding:18px;border-radius:12px;border:1px solid var(--line)">
          <h4 style="margin:0 0 8px;font-size:1.1rem">Download Full Event JSON Bundle</h4>
          <p style="color:var(--mute);font-size:0.88rem;line-height:1.5;margin:0 0 14px">
            Includes all event settings, rubric criteria, tracks, submissions, judge evaluations, score distribution metrics, and community votes. Guaranteed full-fidelity export for migration or offline archives.
          </p>
          <button class="btn main sm" id="btnDownloadBundleJson" type="button">
            ⬇️ Download event bundle (.json)
          </button>
        </div>
      </div>

      <!-- Hackathon Replicator Panel -->
      <div id="panelBulkClone" style="display:none">
        <form id="formCloneEvent" class="card" style="background:var(--glass2);padding:18px;border-radius:12px;border:1px solid var(--line)">
          <h4 style="margin:0 0 8px;font-size:1.1rem">⚡ One-Click Hackathon Cloner / Replicator</h4>
          <p style="color:var(--mute);font-size:0.88rem;margin:0 0 16px">
            Duplicate this hackathon into a new edition. Perfectly clones tracks, rubric criteria with verified 100% weights, and custom application questions.
          </p>
          <div class="fld" style="margin-bottom:12px">
            <label for="cloneNewName">New Hackathon Name *</label>
            <input type="text" id="cloneNewName" required placeholder="e.g. AI Challenge 2027" style="height:38px;border-radius:8px">
          </div>
          <div class="fld" style="margin-bottom:14px">
            <label for="cloneDateOffset">Timeline Date Shift (Days forward)</label>
            <input type="number" id="cloneDateOffset" value="365" min="0" style="height:38px;border-radius:8px">
            <small style="color:var(--mute);display:block;margin-top:4px">Automatically shifts registration, submission, judging, and voting windows forward by N days.</small>
          </div>
          <div style="display:grid;gap:8px;margin-bottom:16px;background:rgba(0,0,0,0.2);padding:12px;border-radius:8px">
            <label style="font-size:0.85rem;display:flex;align-items:center;gap:8px"><input type="checkbox" id="cloneCopyTracks" checked> Copy Competition Tracks &amp; Categories</label>
            <label style="font-size:0.85rem;display:flex;align-items:center;gap:8px"><input type="checkbox" id="cloneCopyRubrics" checked> Copy Rubric Criteria &amp; Weights (100% Normalized)</label>
            <label style="font-size:0.85rem;display:flex;align-items:center;gap:8px"><input type="checkbox" id="cloneCopyQuestions" checked> Copy Custom Application Questions</label>
          </div>
          <button class="btn main sm" type="submit" id="btnExecuteCloneEvent">Replicate Hackathon Now &rarr;</button>
        </form>
      </div>

      <!-- Import Panel -->
      <div id="panelBulkImport" style="display:none">
        <form id="formImportBundle" class="card" style="background:var(--glass2);padding:18px;border-radius:12px;border:1px solid var(--line)">
          <h4 style="margin:0 0 8px;font-size:1.1rem">Import Bundle Data</h4>
          <p style="color:var(--mute);font-size:0.88rem;margin:0 0 12px">
            Upload or paste an event JSON bundle. The server enforces lifecycle rules and validates track, submission, and scoring constraints.
          </p>
          <div class="fld" style="margin-bottom:12px">
            <label for="importBundleFileInput">Choose Bundle File (.json)</label>
            <input type="file" id="importBundleFileInput" accept=".json,application/json" style="padding:6px;border-radius:8px;border:1px solid var(--line)">
          </div>
          <div class="fld" style="margin-bottom:14px">
            <label for="importBundleJsonText">Or Paste Raw JSON</label>
            <textarea id="importBundleJsonText" rows="6" placeholder="{ &quot;event&quot;: { ... }, &quot;tracks&quot;: [ ... ] }" style="font-family:var(--mono);font-size:0.82rem;border-radius:8px;padding:8px"></textarea>
          </div>
          <div id="importBundleAlert" style="display:none;padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:0.85rem"></div>
          <button class="btn main sm" type="submit" id="btnExecuteImportBundle">Import &amp; Validate Bundle &rarr;</button>
        </form>
      </div>
    </div>
  </div>
  `;
}

function renderAuditLogsModalHtml() {
  return `
  <div class="modal-backdrop" id="auditLogsModal">
    <div class="modal-card" style="max-width:960px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <h3 style="font-size:1.5rem;margin:0">🛡️ Security, Compliance &amp; Anti-Abuse Trail</h3>
          <span class="bdg ok" style="font-size:0.72rem">Immutable Ledger</span>
        </div>
        <button class="btn ghost sm" id="closeAuditLogsBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 14px">
        Forensic compliance log tracking anti-abuse events (Sybil vote rejections, rate-limiting violations, duplicate voting attempts), score modifications, COI recusals, and event mutations.
      </p>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <!-- Category Filter Pills -->
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="auditCategoryPills">
          <button class="btn main sm audit-cat-btn" data-cat="ALL" type="button" style="font-size:0.75rem;padding:3px 10px">All Records</button>
          <button class="btn ghost sm audit-cat-btn" data-cat="SECURITY" type="button" style="font-size:0.75rem;padding:3px 10px">🛡️ Anti-Abuse &amp; Security</button>
          <button class="btn ghost sm audit-cat-btn" data-cat="JUDGING" type="button" style="font-size:0.75rem;padding:3px 10px">⚖️ Judging &amp; Scores</button>
          <button class="btn ghost sm audit-cat-btn" data-cat="LIFECYCLE" type="button" style="font-size:0.75rem;padding:3px 10px">📋 Event Lifecycle</button>
          <button class="btn ghost sm audit-cat-btn" data-cat="WEBHOOK" type="button" style="font-size:0.75rem;padding:3px 10px">🔗 Webhooks</button>
        </div>

        <button class="btn main sm" id="btnExportAuditCsv" type="button" style="font-size:0.78rem;padding:4px 12px;font-weight:600">
          📥 Download CSV Compliance Report
        </button>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:14px">
        <input type="text" id="filterAuditLogsInput" placeholder="🔍 Search audit logs by action, actor, or details..." style="flex:1;height:38px;border-radius:10px;background:var(--glass2);border:1px solid var(--line);color:var(--text);padding:0 12px;font-size:0.88rem">
        <button class="btn ghost sm" id="btnRefreshAuditLogs" type="button">🔄 Refresh</button>
      </div>

      <div id="auditLogsListContainer" style="overflow-x:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2)">
        <p style="color:var(--mute);font-size:0.88rem;padding:20px;text-align:center">Loading audit log entries...</p>
      </div>
    </div>
  </div>
  `;
}

function renderCommunityVotingModalHtml() {
  return `
  <div class="modal-backdrop" id="communityVotingModal">
    <div class="modal-card" style="max-width:860px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <h3 style="font-size:1.5rem;margin:0">🗳️ Community Voting &amp; Ballot Standings</h3>
          <span class="bdg ok" style="font-size:0.72rem">T3 Public Choice</span>
        </div>
        <button class="btn ghost sm" id="closeCommunityVotingBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 16px">
        Configure voter eligibility, access restrictions, and view real-time persisted community vote tallies.
      </p>

      <!-- Quick Voting Config Card -->
      <form id="votingConfigForm" class="card" style="background:var(--glass2);padding:18px;margin-bottom:20px;border:1px solid var(--line);border-radius:12px">
        <b style="display:block;font-size:1rem;margin-bottom:12px">Access Mode &amp; Eligibility</b>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div class="fld">
            <label for="modalVotingEnabledSelect">Community Voting Status</label>
            <select id="modalVotingEnabledSelect">
              <option value="true">Enabled (Accepting Votes)</option>
              <option value="false">Disabled (Voting Paused / Closed)</option>
            </select>
          </div>
          <div class="fld">
            <label for="modalVotingModeSelect">Access Restriction Mode</label>
            <select id="modalVotingModeSelect">
              <option value="OPEN">Open Link (Public Ballot)</option>
              <option value="EMAIL">Email-Gated (One Vote per Email)</option>
              <option value="AUTHENTICATED">Authenticated (Registered Users Only)</option>
            </select>
          </div>
        </div>
        <button class="btn main sm" type="submit" id="btnSaveVotingConfig">Save Voting Settings</button>
      </form>

      <!-- Live Ballot Standings Table -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h4 style="font-size:1.1rem;margin:0">Community Vote Leaderboard</h4>
        <button class="btn ghost sm" id="btnRefreshVotingStandings" type="button" style="font-size:0.75rem;padding:3px 8px">🔄 Refresh Ballot</button>
      </div>
      <div id="votingBallotStandingsContainer" style="overflow-x:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2)">
        <p style="color:var(--mute);font-size:0.88rem;padding:16px;text-align:center">Loading community vote rankings...</p>
      </div>
    </div>
  </div>
  `;
}

// ==========================================
// T3 & T4 Modal Bindings
// ==========================================

function bindWebhooksModal(eventId, container) {
  const modal = document.getElementById('webhooksModal');
  const openBtns = [document.getElementById('openWebhooksBtnTop'), document.getElementById('cardOpenWebhooksBtn'), document.getElementById('tileOpenWebhooksBtn')].filter(Boolean);
  const closeBtn = document.getElementById('closeWebhooksBtn');
  const form = document.getElementById('registerWebhookForm');
  const listContainer = document.getElementById('webhooksListContainer');
  const deliveriesContainer = document.getElementById('webhookDeliveriesContainer');
  const refreshDeliveriesBtn = document.getElementById('btnRefreshDeliveries');
  const presetSelect = document.getElementById('whPresetSelect');
  const urlInput = document.getElementById('whUrl');
  const secretInput = document.getElementById('whSecret');
  const refreshSinkBtn = document.getElementById('btnRefreshLocalSink');
  const clearSinkBtn = document.getElementById('btnClearLocalSink');
  const sinkFeedContainer = document.getElementById('localSinkFeedContainer');

  presetSelect?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'builtin') {
      if (urlInput) urlInput.value = `${window.location.origin.includes('localhost') ? window.location.origin.replace(':3000', ':8080') : 'http://localhost:8080'}/api/webhooks/receiver`;
      if (secretInput) secretInput.value = 'dogfood_secret_local_dev';
      notify('Pre-filled Built-in Local Test Receiver URL & Secret', 'info');
    } else if (val === 'discord') {
      if (urlInput) urlInput.value = 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN';
      if (secretInput) secretInput.value = '';
    } else if (val === 'slack') {
      if (urlInput) urlInput.value = 'SLACK_WEBHOOK_NOT_CONFIGURED';
      if (secretInput) secretInput.value = '';
    } else {
      if (urlInput) urlInput.value = '';
      if (secretInput) secretInput.value = '';
    }
  });

  async function loadWebhooks() {
    if (!listContainer) return;
    try {
      const webhooks = await api.listWebhooks(eventId);
      if (webhooks.length === 0) {
        listContainer.innerHTML = `<p style="color:var(--mute);font-size:0.88rem;padding:12px;background:var(--glass2);border-radius:8px">No webhooks registered yet for this event.</p>`;
        return;
      }
      listContainer.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
          <thead>
            <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
              <th style="padding:8px 10px">ID</th>
              <th style="padding:8px 10px">Target URL</th>
              <th style="padding:8px 10px">Events</th>
              <th style="padding:8px 10px">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${webhooks.map(w => `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                <td style="padding:8px 10px;font-family:var(--mono)">#${w.id}</td>
                <td style="padding:8px 10px;font-weight:600;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(w.url)}</td>
                <td style="padding:8px 10px">
                  <small style="color:var(--mute)">${Array.isArray(w.subscribedEvents) ? w.subscribedEvents.join(', ') : w.subscribedEvents}</small>
                </td>
                <td style="padding:8px 10px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                  <button class="btn ghost sm btn-test-webhook" data-wid="${w.id}" type="button" style="padding:3px 8px;font-size:0.75rem;border-color:var(--c);color:var(--c)">⚡ Dispatch</button>
                  <button class="btn ghost sm btn-view-deliveries" data-wid="${w.id}" type="button" style="padding:3px 8px;font-size:0.75rem">📜 Logs</button>
                  <button class="btn ghost sm btn-del-webhook" data-wid="${w.id}" type="button" style="padding:3px 8px;font-size:0.75rem;color:var(--bad);border-color:rgba(255,122,144,0.3)">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      listContainer.querySelectorAll('.btn-test-webhook').forEach(btn => {
        btn.addEventListener('click', async () => {
          const wid = btn.getAttribute('data-wid');
          const simEvent = document.getElementById('simulateEventSelect')?.value || 'test.ping';
          btn.disabled = true;
          btn.textContent = 'Dispatching...';
          try {
            const res = await api.testWebhook(eventId, wid, simEvent);
            notify(`Dispatched '${simEvent}'! Response HTTP: ${res.statusCode || 200}`, 'success');
            await loadDeliveries(wid);
            await loadLocalSinkFeed();
          } catch (err) {
            notify(`Dispatch failed: ${err.message}`, 'error');
          } finally {
            btn.disabled = false;
            btn.textContent = '⚡ Dispatch';
          }
        });
      });

      listContainer.querySelectorAll('.btn-view-deliveries').forEach(btn => {
        btn.addEventListener('click', () => {
          const wid = btn.getAttribute('data-wid');
          loadDeliveries(wid);
        });
      });

      listContainer.querySelectorAll('.btn-del-webhook').forEach(btn => {
        btn.addEventListener('click', async () => {
          const wid = btn.getAttribute('data-wid');
          if (!confirm(`Delete webhook #${wid}?`)) return;
          try {
            await api.deleteWebhook(eventId, wid);
            notify('Webhook deleted', 'info');
            await loadWebhooks();
          } catch (err) {
            notify(`Failed to delete webhook: ${err.message}`, 'error');
          }
        });
      });
    } catch (err) {
      listContainer.innerHTML = `<p style="color:var(--mute);font-size:0.88rem">Unable to load webhooks.</p>`;
    }
  }

  async function loadDeliveries(webhookId = null) {
    if (!deliveriesContainer) return;
    deliveriesContainer.innerHTML = `<p style="color:var(--mute);font-size:0.85rem">Loading delivery logs...</p>`;
    try {
      const deliveries = await api.getWebhookDeliveries(eventId, webhookId);
      if (deliveries.length === 0) {
        deliveriesContainer.innerHTML = `<p style="color:var(--mute);font-size:0.85rem">No delivery attempts recorded yet.</p>`;
        return;
      }
      deliveriesContainer.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem">
          <thead>
            <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
              <th style="padding:6px 8px">Time</th>
              <th style="padding:6px 8px">Event</th>
              <th style="padding:6px 8px">HTTP</th>
              <th style="padding:6px 8px">Response / Error</th>
              <th style="padding:6px 8px">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${deliveries.slice(0, 15).map(d => `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                <td style="padding:6px 8px;color:var(--mute)">${new Date(d.deliveredAt).toLocaleTimeString()}</td>
                <td style="padding:6px 8px;font-family:var(--mono)">${escapeHtml(d.eventType)}</td>
                <td style="padding:6px 8px">
                  <span class="bdg ${d.statusCode >= 200 && d.statusCode < 300 ? 'ok' : 'bad'}" style="font-size:0.7rem">
                    ${d.statusCode || 'FAIL'}
                  </span>
                </td>
                <td style="padding:6px 8px;font-family:var(--mono);color:var(--mute);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(d.responseBody || d.errorMessage || 'OK')}">
                  ${escapeHtml(d.responseBody || d.errorMessage || 'OK')}
                </td>
                <td style="padding:6px 8px;display:flex;gap:4px">
                  <button class="btn ghost sm btn-inspect-delivery" data-did="${d.id}" type="button" style="padding:2px 6px;font-size:0.7rem" title="Inspect Payload">🔍</button>
                  <button class="btn ghost sm btn-retry-delivery" data-wid="${d.webhookId}" data-did="${d.id}" type="button" style="padding:2px 6px;font-size:0.7rem" title="Retry Delivery">🔄 Retry</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      deliveriesContainer.querySelectorAll('.btn-inspect-delivery').forEach(btn => {
        btn.addEventListener('click', () => {
          const did = btn.getAttribute('data-did');
          const deliv = deliveries.find(x => String(x.id) === String(did));
          if (!deliv) return;
          alert(`WEBHOOK DELIVERY INSPECTOR (ID #${did})\n\nEvent: ${deliv.eventType}\nStatus Code: ${deliv.statusCode}\n\nPAYLOAD ENVELOPE:\n${deliv.payload}\n\nRESPONSE BODY:\n${deliv.responseBody || 'None'}`);
        });
      });

      deliveriesContainer.querySelectorAll('.btn-retry-delivery').forEach(btn => {
        btn.addEventListener('click', async () => {
          const wid = btn.getAttribute('data-wid');
          const did = btn.getAttribute('data-did');
          btn.disabled = true;
          btn.textContent = '...';
          try {
            const res = await api.retryWebhookDelivery(eventId, wid, did);
            notify(`Delivery retried! HTTP Status: ${res.statusCode || 200}`, 'success');
            await loadDeliveries(wid);
            await loadLocalSinkFeed();
          } catch (err) {
            notify(`Retry failed: ${err.message}`, 'error');
          } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Retry';
          }
        });
      });
    } catch (err) {
      deliveriesContainer.innerHTML = `<p style="color:var(--mute);font-size:0.85rem">Unable to load deliveries.</p>`;
    }
  }

  async function loadLocalSinkFeed() {
    if (!sinkFeedContainer) return;
    try {
      const items = await api.getReceivedWebhooks();
      if (!items || items.length === 0) {
        sinkFeedContainer.innerHTML = `<p style="color:var(--mute);margin:0">No webhooks received by local sink buffer yet. Dispatch to http://localhost:8080/api/webhooks/receiver to see live payloads.</p>`;
        return;
      }
      sinkFeedContainer.innerHTML = `
        <div style="display:grid;gap:8px">
          ${items.slice(0, 10).map(item => `
            <div style="padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:6px;border-left:3px solid #10B981">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <b style="color:#10B981">${escapeHtml(item.event || 'unknown')}</b>
                <span style="color:var(--mute);font-size:0.75rem">${new Date(item.receivedAt).toLocaleTimeString()}</span>
              </div>
              <div style="color:var(--mute);font-size:0.75rem;margin-bottom:4px">
                Signature: <span style="color:var(--c)">${escapeHtml(item.signature ? item.signature.substring(0, 24) + '...' : 'none')}</span>
              </div>
              <pre style="margin:0;padding:6px;background:rgba(0,0,0,0.5);border-radius:4px;overflow-x:auto;font-size:0.75rem;color:#E2E8F0">${escapeHtml(typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload, null, 2))}</pre>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      sinkFeedContainer.innerHTML = `<p style="color:var(--mute);margin:0">Local receiver buffer offline.</p>`;
    }
  }

  openBtns.forEach(btn => btn.addEventListener('click', () => {
    modal?.classList.add('open');
    loadWebhooks();
    loadDeliveries();
    loadLocalSinkFeed();
  }));

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  refreshDeliveriesBtn?.addEventListener('click', () => loadDeliveries());
  refreshSinkBtn?.addEventListener('click', () => loadLocalSinkFeed());

  clearSinkBtn?.addEventListener('click', async () => {
    try {
      await api.clearReceivedWebhooks();
      notify('Local sink buffer cleared', 'info');
      await loadLocalSinkFeed();
    } catch (err) {
      notify(`Failed to clear sink: ${err.message}`, 'error');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('whUrl')?.value?.trim();
    const secret = document.getElementById('whSecret')?.value?.trim();
    const eventCheckboxes = form.querySelectorAll('input[name="whEvent"]:checked');
    const subscribedEvents = Array.from(eventCheckboxes).map(cb => cb.value);

    if (!url) return;
    if (subscribedEvents.length === 0) {
      notify('Please select at least one event to subscribe.', 'warn');
      return;
    }

    const regBtn = document.getElementById('btnRegisterWebhook');
    if (regBtn) { regBtn.disabled = true; regBtn.textContent = 'Registering...'; }

    try {
      await api.registerWebhook(eventId, { url, secret, subscribedEvents });
      notify('Webhook registered successfully!', 'success');
      form.reset();
      await loadWebhooks();
    } catch (err) {
      notify(`Registration failed: ${err.message}`, 'error');
    } finally {
      if (regBtn) { regBtn.disabled = false; regBtn.textContent = 'Register Webhook \u2192'; }
    }
  });
}

function bindCertificatesModal(eventId, container) {
  const modal = document.getElementById('certificatesModal');
  const openBtns = [document.getElementById('openCertificatesBtnTop'), document.getElementById('cardOpenCertificatesBtn'), document.getElementById('tileOpenCertificatesBtn')].filter(Boolean);
  const closeBtn = document.getElementById('closeCertificatesBtn');
  const genBtn = document.getElementById('btnGenerateCertificates');
  const listContainer = document.getElementById('certificatesListContainer');

  async function loadCertificates() {
    if (!listContainer) return;
    try {
      const certs = await api.getEventCertificates(eventId);
      if (certs.length === 0) {
        listContainer.innerHTML = `<p style="color:var(--mute);font-size:0.88rem;padding:24px;text-align:center">No certificates generated yet for this event. Click above to generate them.</p>`;
        return;
      }
      listContainer.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
          <thead>
            <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
              <th style="padding:10px 12px">Certificate ID</th>
              <th style="padding:10px 12px">Recipient</th>
              <th style="padding:10px 12px">Type</th>
              <th style="padding:10px 12px">Track / Placement</th>
              <th style="padding:10px 12px">SHA-256 Checksum</th>
              <th style="padding:10px 12px">Verify</th>
            </tr>
          </thead>
          <tbody>
            ${certs.map(c => `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                <td style="padding:10px 12px;font-family:var(--mono);color:var(--c)">${escapeHtml(c.id)}</td>
                <td style="padding:10px 12px;font-weight:600">${escapeHtml(c.recipientName)}</td>
                <td style="padding:10px 12px">
                  <span class="bdg ${c.certificateType === 'WINNER' ? 'hl' : 'ok'}" style="font-size:0.72rem">
                    ${escapeHtml(c.certificateType || 'PARTICIPATION')}
                  </span>
                </td>
                <td style="padding:10px 12px">${escapeHtml(c.placement || 'All Tracks')}</td>
                <td style="padding:10px 12px;font-family:var(--mono);font-size:0.75rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--mute)" title="${escapeHtml(c.checksum)}">
                  ${escapeHtml(c.checksum ? c.checksum.substring(0, 16) + '...' : 'N/A')}
                </td>
                <td style="padding:10px 12px">
                  <a class="btn ghost sm" href="#/verify?id=${encodeURIComponent(c.id)}" target="_blank" style="padding:2px 8px;font-size:0.75rem;border-color:var(--c);color:var(--c)">Verify Portal &rarr;</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      listContainer.innerHTML = `<p style="color:var(--mute);font-size:0.88rem;padding:16px;text-align:center">Unable to load certificates.</p>`;
    }
  }

  openBtns.forEach(btn => btn.addEventListener('click', () => {
    modal?.classList.add('open');
    loadCertificates();
  }));

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));

  genBtn?.addEventListener('click', async () => {
    genBtn.disabled = true;
    genBtn.textContent = 'Generating...';
    try {
      const res = await api.generateCertificates(eventId);
      notify(`Certificates generated successfully (${res.count || 'all'} issued)!`, 'success');
      await loadCertificates();
    } catch (err) {
      notify(`Certificate generation failed: ${err.message}`, 'error');
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = '⚡ Generate Certificates for All Participants & Winners';
    }
  });
}

function bindBulkModal(eventId, container) {
  const modal = document.getElementById('bulkModal');
  const openBtns = [document.getElementById('openBulkBtnTop'), document.getElementById('cardOpenBulkBtn'), document.getElementById('tileExportBundleBtn'), document.getElementById('tileImportBundleBtn')].filter(Boolean);
  const closeBtn = document.getElementById('closeBulkModalBtn');
  const tabExportBtn = document.getElementById('tabBulkExportBtn');
  const tabCloneBtn = document.getElementById('tabBulkCloneBtn');
  const tabImportBtn = document.getElementById('tabBulkImportBtn');
  const panelExport = document.getElementById('panelBulkExport');
  const panelClone = document.getElementById('panelBulkClone');
  const panelImport = document.getElementById('panelBulkImport');
  const btnDownload = document.getElementById('btnDownloadBundleJson');
  const formClone = document.getElementById('formCloneEvent');
  const formImport = document.getElementById('formImportBundle');
  const fileInput = document.getElementById('importBundleFileInput');
  const jsonText = document.getElementById('importBundleJsonText');
  const alertEl = document.getElementById('importBundleAlert');

  if (tabExportBtn && tabCloneBtn && tabImportBtn && panelExport && panelClone && panelImport) {
    tabExportBtn.addEventListener('click', () => {
      tabExportBtn.className = 'btn main sm';
      tabCloneBtn.className = 'btn ghost sm';
      tabImportBtn.className = 'btn ghost sm';
      panelExport.style.display = 'block';
      panelClone.style.display = 'none';
      panelImport.style.display = 'none';
    });

    tabCloneBtn.addEventListener('click', () => {
      tabCloneBtn.className = 'btn main sm';
      tabExportBtn.className = 'btn ghost sm';
      tabImportBtn.className = 'btn ghost sm';
      panelClone.style.display = 'block';
      panelExport.style.display = 'none';
      panelImport.style.display = 'none';
    });

    tabImportBtn.addEventListener('click', () => {
      tabImportBtn.className = 'btn main sm';
      tabExportBtn.className = 'btn ghost sm';
      tabCloneBtn.className = 'btn ghost sm';
      panelImport.style.display = 'block';
      panelExport.style.display = 'none';
      panelClone.style.display = 'none';
    });
  }

  openBtns.forEach(btn => btn.addEventListener('click', () => {
    modal?.classList.add('open');
  }));

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));

  btnDownload?.addEventListener('click', async () => {
    btnDownload.disabled = true;
    btnDownload.textContent = 'Exporting...';
    try {
      const bundle = await api.exportBundle(eventId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      api.downloadBlob(blob, `event-${eventId}-bundle.json`);
      notify('Event bundle exported successfully!', 'success');
    } catch (err) {
      notify(`Export failed: ${err.message}`, 'error');
    } finally {
      btnDownload.disabled = false;
      btnDownload.textContent = '⬇️ Download event bundle (.json)';
    }
  });

  formClone?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('cloneNewName')?.value?.trim();
    const copyTracks = document.getElementById('cloneCopyTracks')?.checked;
    const copyRubrics = document.getElementById('cloneCopyRubrics')?.checked;
    const copyCustomQuestions = document.getElementById('cloneCopyQuestions')?.checked;
    const dateOffsetDays = Number(document.getElementById('cloneDateOffset')?.value || 0);

    const execBtn = document.getElementById('btnExecuteCloneEvent');
    if (execBtn) { execBtn.disabled = true; execBtn.textContent = 'Replicating Hackathon...'; }

    try {
      const cloned = await api.cloneEvent(eventId, {
        newName,
        copyTracks,
        copyRubrics,
        copyCustomQuestions,
        dateOffsetDays
      });
      notify(`Hackathon successfully replicated as "${cloned.name || newName}"!`, 'success');
      modal?.classList.remove('open');
      await refreshEventSelectors();
      if (cloned.id) {
        authStore.setEventId(cloned.id);
        await renderDashboard(container, cloned.id);
      }
    } catch (err) {
      notify(`Clone failed: ${err.message}`, 'error');
    } finally {
      if (execBtn) { execBtn.disabled = false; execBtn.textContent = 'Replicate Hackathon Now \u2192'; }
    }
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (jsonText) jsonText.value = evt.target.result;
      };
      reader.readAsText(file);
    }
  });

  formImport?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = jsonText?.value?.trim();
    if (!raw) {
      notify('Please provide JSON bundle text or select a file.', 'warn');
      return;
    }

    let parsedBundle;
    try {
      parsedBundle = JSON.parse(raw);
    } catch (err) {
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.style.background = 'rgba(255,122,144,0.1)';
        alertEl.style.border = '1px solid var(--bad)';
        alertEl.style.color = 'var(--bad)';
        alertEl.textContent = 'Invalid JSON: Could not parse input bundle.';
      }
      return;
    }

    const execBtn = document.getElementById('btnExecuteImportBundle');
    if (execBtn) { execBtn.disabled = true; execBtn.textContent = 'Importing...'; }
    if (alertEl) alertEl.style.display = 'none';

    try {
      const res = await api.importBundle(eventId, parsedBundle);
      notify(res?.message || 'Event bundle imported successfully!', 'success');
      modal?.classList.remove('open');
      await renderDashboard(container, eventId);
    } catch (err) {
      if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.style.background = 'rgba(255,122,144,0.1)';
        alertEl.style.border = '1px solid var(--bad)';
        alertEl.style.color = 'var(--bad)';
        alertEl.textContent = `Import failed: ${err.message}`;
      }
      notify(`Import failed: ${err.message}`, 'error');
    } finally {
      if (execBtn) { execBtn.disabled = false; execBtn.textContent = 'Import & Validate Bundle \u2192'; }
    }
  });
}

function bindAuditLogsModal(eventId, container) {
  const modal = document.getElementById('auditLogsModal');
  const openBtns = [document.getElementById('openAuditLogsBtnTop'), document.getElementById('cardOpenAuditBtn')].filter(Boolean);
  const closeBtn = document.getElementById('closeAuditLogsBtn');
  const listContainer = document.getElementById('auditLogsListContainer');
  const filterInput = document.getElementById('filterAuditLogsInput');
  const refreshBtn = document.getElementById('btnRefreshAuditLogs');
  const exportCsvBtn = document.getElementById('btnExportAuditCsv');
  const catButtons = modal?.querySelectorAll('.audit-cat-btn') || [];

  let logsData = [];
  let currentCategory = 'ALL';

  function renderList(list) {
    if (!listContainer) return;
    if (list.length === 0) {
      listContainer.innerHTML = `<p style="color:var(--mute);padding:24px;text-align:center">No audit trail records found for selected filter.</p>`;
      return;
    }
    listContainer.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.84rem">
        <thead>
          <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
            <th style="padding:10px 12px">Timestamp</th>
            <th style="padding:10px 12px">Action</th>
            <th style="padding:10px 12px">Actor</th>
            <th style="padding:10px 12px">Details</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(l => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
              <td style="padding:8px 12px;color:var(--mute);white-space:nowrap">${new Date(l.createdAt).toLocaleString()}</td>
              <td style="padding:8px 12px">
                <span class="bdg ${l.action.includes('REJECTED') || l.action.includes('LIMITED') ? 'bad' : 'ok'}" style="font-size:0.72rem">
                  ${escapeHtml(l.action)}
                </span>
              </td>
              <td style="padding:8px 12px;font-weight:600">${escapeHtml(l.username || 'System / Voter #' + (l.userId || ''))}</td>
              <td style="padding:8px 12px;font-family:var(--mono);font-size:0.8rem;color:var(--text)">
                ${escapeHtml(l.details || l.targetType || '—')}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function applyAuditFilters() {
    const term = filterInput?.value?.toLowerCase().trim() || '';
    let filtered = logsData;

    if (currentCategory === 'SECURITY') {
      filtered = filtered.filter(l => {
        const act = (l.action || '').toUpperCase();
        return act.includes('REJECTED') || act.includes('LIMITED') || act.includes('COI') || act.includes('RATE');
      });
    } else if (currentCategory === 'JUDGING') {
      filtered = filtered.filter(l => {
        const act = (l.action || '').toUpperCase();
        return act.includes('SCORE') || act.includes('RUBRIC') || act.includes('ASSIGN');
      });
    } else if (currentCategory === 'LIFECYCLE') {
      filtered = filtered.filter(l => {
        const act = (l.action || '').toUpperCase();
        return act.includes('EVENT') || act.includes('TRACK') || act.includes('CLONED') || act.includes('BUNDLE');
      });
    } else if (currentCategory === 'WEBHOOK') {
      filtered = filtered.filter(l => {
        const act = (l.action || '').toUpperCase();
        return act.includes('WEBHOOK');
      });
    }

    if (term) {
      filtered = filtered.filter(l =>
        (l.action && l.action.toLowerCase().includes(term)) ||
        (l.username && l.username.toLowerCase().includes(term)) ||
        (l.details && l.details.toLowerCase().includes(term)) ||
        (l.ipAddress && l.ipAddress.toLowerCase().includes(term))
      );
    }
    renderList(filtered);
  }

  async function loadLogs() {
    if (!listContainer) return;
    listContainer.innerHTML = `<p style="color:var(--mute);padding:20px;text-align:center">Loading audit log entries...</p>`;
    try {
      logsData = await api.getAuditLogs(eventId);
      applyAuditFilters();
    } catch (err) {
      listContainer.innerHTML = `<p style="color:var(--mute);padding:16px;text-align:center">Unable to load audit logs: ${escapeHtml(err.message)}</p>`;
    }
  }

  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => { b.className = 'btn ghost sm audit-cat-btn'; });
      btn.className = 'btn main sm audit-cat-btn';
      currentCategory = btn.getAttribute('data-cat') || 'ALL';
      applyAuditFilters();
    });
  });

  exportCsvBtn?.addEventListener('click', async () => {
    exportCsvBtn.disabled = true;
    exportCsvBtn.textContent = 'Generating CSV...';
    try {
      const csvText = await api.exportAuditLogsCsv(eventId);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      api.downloadBlob(blob, `compliance-audit-log-event-${eventId}.csv`);
      notify('Compliance audit report downloaded successfully', 'success');
    } catch (err) {
      notify(`Export failed: ${err.message}`, 'error');
    } finally {
      exportCsvBtn.disabled = false;
      exportCsvBtn.textContent = '📥 Download CSV Compliance Report';
    }
  });

  openBtns.forEach(btn => btn.addEventListener('click', () => {
    modal?.classList.add('open');
    loadLogs();
  }));

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  refreshBtn?.addEventListener('click', loadLogs);
  filterInput?.addEventListener('input', applyAuditFilters);
}

function bindCommunityVotingModal(eventId, eventDetails, container) {
  const modal = document.getElementById('communityVotingModal');
  const openBtns = [document.getElementById('openVotingConfigBtnTop'), document.getElementById('cardOpenVotingBtn'), document.getElementById('tileOpenVotingBtn')].filter(Boolean);
  const closeBtn = document.getElementById('closeCommunityVotingBtn');
  const form = document.getElementById('votingConfigForm');
  const enabledSelect = document.getElementById('modalVotingEnabledSelect');
  const modeSelect = document.getElementById('modalVotingModeSelect');
  const standingsContainer = document.getElementById('votingBallotStandingsContainer');
  const refreshStandingsBtn = document.getElementById('btnRefreshVotingStandings');
  const quickToggleBtn = document.getElementById('quickToggleVotingBtn');

  // Populate config
  if (enabledSelect) enabledSelect.value = (eventDetails.votingEnabled !== false) ? 'true' : 'false';
  if (modeSelect) modeSelect.value = eventDetails.votingAccessMode || 'OPEN';

  async function loadVotingStandings() {
    if (!standingsContainer) return;
    try {
      const res = await api.getVotingResults(eventId).catch(() => null);
      const results = res || [];

      if (!Array.isArray(results) || results.length === 0) {
        standingsContainer.innerHTML = `<p style="color:var(--mute);padding:20px;text-align:center">No votes recorded yet on the community ballot.</p>`;
        return;
      }

      standingsContainer.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.86rem">
          <thead>
            <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
              <th style="padding:10px 12px">Rank</th>
              <th style="padding:10px 12px">Project Title</th>
              <th style="padding:10px 12px">Track</th>
              <th style="padding:10px 12px">Votes Cast</th>
            </tr>
          </thead>
          <tbody>
            ${results.map((r, i) => `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                <td style="padding:8px 12px;font-weight:700">#${i + 1}</td>
                <td style="padding:8px 12px;font-weight:600">${escapeHtml(r.submissionTitle || 'Submission #' + r.submissionId)}</td>
                <td style="padding:8px 12px"><span class="trk" style="font-size:0.75rem">${escapeHtml(r.track || 'General')}</span></td>
                <td style="padding:8px 12px">
                  <span class="bdg ok" style="font-size:0.8rem">⭐ ${r.voteCount || 0} votes</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      standingsContainer.innerHTML = `<p style="color:var(--mute);padding:16px;text-align:center">Unable to load voting rankings.</p>`;
    }
  }

  openBtns.forEach(btn => btn.addEventListener('click', () => {
    modal?.classList.add('open');
    loadVotingStandings();
  }));

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  refreshStandingsBtn?.addEventListener('click', loadVotingStandings);

  // Quick toggle on card
  quickToggleBtn?.addEventListener('click', async () => {
    quickToggleBtn.disabled = true;
    try {
      const newEnabled = eventDetails.votingEnabled === false ? true : false;
      await api.updateEvent(eventId, {
        ...eventDetails,
        votingEnabled: newEnabled
      });
      notify(`Community voting ${newEnabled ? 'enabled' : 'disabled'}!`, 'info');
      await renderDashboard(container, eventId);
    } catch (err) {
      notify(`Failed to toggle voting: ${err.message}`, 'error');
      quickToggleBtn.disabled = false;
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const votingEnabled = enabledSelect.value === 'true';
    const votingAccessMode = modeSelect.value;
    const saveBtn = document.getElementById('btnSaveVotingConfig');

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    try {
      await api.updateEvent(eventId, {
        ...eventDetails,
        votingEnabled,
        votingAccessMode
      });
      notify('Voting settings updated successfully!', 'success');
      modal?.classList.remove('open');
      await renderDashboard(container, eventId);
    } catch (err) {
      notify(`Failed to update voting settings: ${err.message}`, 'error');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Voting Settings'; }
    }
  });
}

function renderNormalizationProofModalHtml() {
  return `
  <div class="modal-backdrop" id="normalizationProofModal">
    <div class="modal-card" style="max-width:960px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <h3 style="font-size:1.5rem;margin:0">🔬 Reproducible Normalization Proof</h3>
          <span class="bdg ok" style="font-size:0.72rem">T-Score Engine</span>
        </div>
        <button class="btn ghost sm" id="closeNormalizationProofBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <p style="color:var(--mute);font-size:0.9rem;margin:0 0 16px">
        Cryptographic and mathematical verification of judge parameters (&mu;, &sigma;) and submission-level normalized T-scores for full auditability and reproducibility.
      </p>

      <div id="normalizationProofContent" style="display:grid;gap:16px">
        <p style="color:var(--mute);padding:20px;text-align:center">Loading proof verification...</p>
      </div>
    </div>
  </div>
  `;
}

function bindNormalizationProofModal(eventId, container) {
  const modal = document.getElementById('normalizationProofModal');
  const openBtn = document.getElementById('openNormalizationProofBtn');
  const closeBtn = document.getElementById('closeNormalizationProofBtn');
  const content = document.getElementById('normalizationProofContent');

  async function loadProof() {
    if (!content) return;
    content.innerHTML = `<p style="color:var(--mute);padding:20px;text-align:center">Computing mathematical proof...</p>`;
    try {
      const res = await api.getNormalizationProof(eventId);
      const proof = res?.data || res;
      if (!proof) {
        content.innerHTML = `<p style="color:var(--mute);padding:20px;text-align:center">No proof available.</p>`;
        return;
      }

      const judges = proof.judgeDistributions || proof.judges || [];
      const projects = proof.projectCalculations || proof.submissionProofs || [];

      content.innerHTML = `
        <!-- Proof Summary & Mathematical Invariant -->
        <div style="padding:14px 18px;border-radius:12px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);font-size:0.86rem;line-height:1.6">
          <b style="color:#93C5FD">Mathematical Invariant &amp; Formula:</b>
          <div style="font-family:var(--mono);color:var(--text);margin:6px 0;font-weight:600">${escapeHtml(proof.formula || 'T = 50 + 10 * Z')}</div>
          <p style="color:var(--mute);margin:4px 0 0;font-size:0.82rem">
            ${escapeHtml(proof.zeroVarianceFallbackRule || 'When \u03c3 = 0, Z \u2261 0 \u21d2 T = 50.0 (strictly neutral)')}
          </p>
          <div style="margin-top:6px;font-size:0.78rem;color:var(--mute)">
            Event ID: <b>#${proof.eventId || eventId}</b> &bull; Status: <span class="bdg ok" style="font-size:0.7rem">Cryptographically &amp; Mathematically Verified</span>
          </div>
        </div>

        <!-- Section 1: Judge Normalization Parameters -->
        <div>
          <h4 style="font-size:1.05rem;margin:0 0 8px">1. Judge Normalization Parameters (&mu;, &sigma;)</h4>
          <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2)">
            ${judges.length === 0 ? `
              <div style="padding:14px;text-align:center;color:var(--mute);font-size:0.85rem">No judge parameters recorded yet.</div>
            ` : `
              <table style="width:100%;border-collapse:collapse;font-size:0.84rem">
                <thead>
                  <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
                    <th style="padding:8px 12px">Judge</th>
                    <th style="padding:8px 12px">Reviews (N)</th>
                    <th style="padding:8px 12px">Mean (&mu;)</th>
                    <th style="padding:8px 12px">Std Dev (&sigma;)</th>
                    <th style="padding:8px 12px">Status / Method</th>
                  </tr>
                </thead>
                <tbody>
                  ${judges.map(j => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                      <td style="padding:8px 12px;font-weight:600">
                        ${escapeHtml(j.judgeName || ('Judge #' + j.judgeId))}
                        <span style="font-family:var(--mono);font-size:0.75rem;color:var(--mute);margin-left:4px">#${j.judgeId}</span>
                      </td>
                      <td style="padding:8px 12px;font-family:var(--mono)">${j.reviewCount ?? j.reviewsCount ?? 0}</td>
                      <td style="padding:8px 12px;font-family:var(--mono)">${((j.mean ?? j.rawMean ?? 0)).toFixed(2)}</td>
                      <td style="padding:8px 12px;font-family:var(--mono)">${((j.stdDev ?? j.rawStdDev ?? 0)).toFixed(2)}</td>
                      <td style="padding:8px 12px">
                        ${j.zeroVariance ? '<span class="bdg warn" style="font-size:0.7rem">\u03c3=0 (Neutral T=50)</span>' : '<span class="bdg ok" style="font-size:0.7rem">' + escapeHtml(j.appliedMethod || 'Standard Z-Score') + '</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- Section 2: Step-by-Step Project Proofs -->
        <div>
          <h4 style="font-size:1.05rem;margin:0 0 8px">2. Step-by-Step Submission Calculations</h4>
          <div style="max-height:280px;overflow-y:auto;border-radius:10px;border:1px solid var(--line);background:var(--glass2)">
            ${projects.length === 0 ? `
              <div style="padding:14px;text-align:center;color:var(--mute);font-size:0.85rem">No submission proofs computed yet.</div>
            ` : `
              <table style="width:100%;border-collapse:collapse;font-size:0.84rem">
                <thead>
                  <tr style="border-bottom:1px solid var(--line);color:var(--mute);text-align:left">
                    <th style="padding:8px 12px">Submission</th>
                    <th style="padding:8px 12px">Raw Avg</th>
                    <th style="padding:8px 12px">Normalized (T)</th>
                    <th style="padding:8px 12px">Rank Shift</th>
                    <th style="padding:8px 12px">Per-Judge Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  ${projects.map(p => {
                    const steps = (p.scoreSteps || []).map(s => `J#${s.judgeId}: raw=${(s.rawScore ?? 0).toFixed(1)} &rarr; Z=${(s.zScore ?? 0).toFixed(2)} &rarr; T=${(s.tScore ?? 0).toFixed(1)}`).join('<br>');
                    const rankShift = (p.rawRank && p.normalizedRank) ? (p.rawRank - p.normalizedRank) : 0;
                    return `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                      <td style="padding:8px 12px">
                        <b>${escapeHtml(p.title || ('Submission #' + p.submissionId))}</b>
                        <span style="font-family:var(--mono);font-size:0.75rem;color:var(--mute);margin-left:4px">#${p.submissionId}</span>
                      </td>
                      <td style="padding:8px 12px;font-family:var(--mono)">${((p.averageRawScore ?? p.rawScore ?? 0)).toFixed(2)}</td>
                      <td style="padding:8px 12px;font-family:var(--mono);color:var(--m);font-weight:700">${((p.averageNormalizedScore ?? p.normalizedScore ?? 0)).toFixed(2)}</td>
                      <td style="padding:8px 12px;font-family:var(--mono)">
                        Raw #${p.rawRank || '-'} &rarr; Norm #${p.normalizedRank || '-'}
                        ${rankShift > 0 ? `<span style="color:var(--ok);font-size:0.75rem">(&#x25B2;+${rankShift})</span>` : rankShift < 0 ? `<span style="color:var(--bad);font-size:0.75rem">(&#x25BC;${rankShift})</span>` : '<span style="color:var(--mute);font-size:0.75rem">(&plusmn;0)</span>'}
                      </td>
                      <td style="padding:8px 12px;font-size:0.78rem;font-family:var(--mono);color:var(--mute)">
                        ${steps || 'No individual review steps'}
                      </td>
                    </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<p style="color:var(--bad);padding:20px;text-align:center">Failed to load normalization proof: ${escapeHtml(err.message)}</p>`;
    }
  }

  openBtn?.addEventListener('click', () => {
    modal?.classList.add('open');
    loadProof();
  });

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
}


