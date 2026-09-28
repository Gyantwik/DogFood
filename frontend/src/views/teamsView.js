/**
 * teamsView.js — Context-Aware Hackathon Team Portal
 *
 * Implements 4 distinct product states:
 * 1. State A: No selected event -> Prompt to choose a hackathon.
 * 2. State B: Event selected but user not registered -> Prompt to register with 1-click registration.
 * 3. State C: Registered but not on a team -> Create team or join team by invite code.
 * 4. State D: Registered & on a team -> Display real team details, members, invite code (with copy button), and link to submit project.
 */

import { h, $, notify, escapeHtml } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export async function renderTeams(container, eventId = null) {
  // If no eventId passed, check if active event is set in authStore
  if (!eventId) {
    eventId = authStore.getEventId();
  }

  // STATE A: No event selected
  if (!eventId) {
    container.innerHTML = `
<section class="view enter" id="v-teams-no-event">
  <div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:48px 32px">
    <div style="font-size:2.8rem;margin-bottom:12px">👥</div>
    <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Please choose an event first</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem">
      You need to select an active hackathon event before you can view, create, or join a team.
    </p>
    <a class="btn main" href="#/gallery">Browse Active Events &rarr;</a>
  </div>
</section>
`;
    return;
  }

  // Check authentication
  if (!authStore.isAuthenticated()) {
    container.innerHTML = `
<section class="view enter" id="v-teams-unauth">
  <div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:48px 32px">
    <div style="font-size:2.8rem;margin-bottom:12px">🔐</div>
    <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Sign in required</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem">
      Please sign in to access team settings and participate in hackathon teams.
    </p>
    <a class="btn main" href="#/login">Sign In &rarr;</a>
  </div>
</section>
`;
    return;
  }

  // Role guard: Organizers and Judges do NOT have teams — redirect them to their workspace
  const session = authStore.getSession();
  const activeRole = session?.role || '';
  if (activeRole === 'ORGANIZER' || activeRole === 'JUDGE') {
    const isOrg = activeRole === 'ORGANIZER';
    container.innerHTML = `
<section class="view enter" id="v-teams-wrong-role">
  <div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:48px 32px">
    <div style="font-size:2.8rem;margin-bottom:12px">${isOrg ? '🏗️' : '⚖️'}</div>
    <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Teams are for participants</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem;max-width:48ch;margin-left:auto;margin-right:auto">
      You are signed in as <b>${escapeHtml(session.name)}</b> with the <b>${activeRole}</b> role.
      ${isOrg ? 'Organizers manage events and view all teams from the Dashboard — they do not join teams.' : 'Judges evaluate submissions from the Judge Queue — they do not join teams.'}
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

  // Fetch teams for this event
  let teams = [];
  try {
    const tRes = await api.getTeams(eventId);
    teams = Array.isArray(tRes) ? tRes : (tRes?.data || []);
  } catch (err) {
    console.warn('Failed to load teams:', err);
  }

  // session is re-fetched here for the participant flow (role guard returned above for non-participants)
  const participantSession = authStore.getSession();
  const rolesByEvent = participantSession?.rolesByEvent || {};
  const hasSpecificEventRoles = Object.keys(rolesByEvent).length > 0;

  const currentUser = authStore.getUser() || {};
  const currentUserId = currentUser.userId || currentUser.id;
  const currentUsername = currentUser.username || currentUser.name;

  const myTeam = Array.isArray(teams) ? teams.find(t => {
    const isLeader = currentUserId && String(t.leaderId) === String(currentUserId);
    const isMember = t.members?.some(m =>
      (currentUserId && (String(m.userId) === String(currentUserId) || String(m.id) === String(currentUserId))) ||
      (currentUsername && (m.username || m.name)?.toLowerCase() === currentUsername.toLowerCase())
    );
    return isLeader || isMember;
  }) : null;

  let isRegistered = Boolean(
    myTeam ||
    rolesByEvent[eventId] ||
    rolesByEvent[String(eventId)] ||
    (!hasSpecificEventRoles && (participantSession?.role === 'PARTICIPANT' || participantSession?.role === 'ADMIN'))
  );

  // If not recorded in client session, verify with backend /api/auth/me
  if (!isRegistered) {
    try {
      const meRes = await api.getMe();
      const meData = meRes?.data || meRes;
      if (meData?.rolesByEvent && (meData.rolesByEvent[eventId] || meData.rolesByEvent[String(eventId)])) {
        const role = meData.rolesByEvent[eventId] || meData.rolesByEvent[String(eventId)];
        authStore.addEventRole(eventId, role);
        isRegistered = true;
      }
    } catch {
      // ignore
    }
  }

  // STATE B: Event selected, but user NOT registered for this event
  if (!isRegistered) {
    container.innerHTML = `
<section class="view enter" id="v-teams-not-registered">
  <div class="vh row">
    <div style="min-width:0;flex:1 1 280px">
      <span class="bdg ok">ACTIVE</span>
      <h2 class="vt" style="margin-top:8px">Event #${escapeHtml(eventId)}</h2>
      <p class="vs">Team Portal &bull; Registration Required</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a class="btn ghost sm" href="#/events/${eventId}">Hackathon Details</a>
      <a class="btn ghost sm" href="#/gallery">Browse Other Events</a>
    </div>
  </div>

  <div class="card" style="max-width:680px;margin:32px auto;text-align:center;padding:48px 32px">
    <div style="font-size:3rem;margin-bottom:16px">🎯</div>
    <h3 style="font-size:1.6rem;margin-bottom:10px">You're not registered for this hackathon yet</h3>
    <p style="color:var(--mute);margin-bottom:28px;font-size:0.98rem;line-height:1.6;max-width:52ch;margin-left:auto;margin-right:auto">
      To create or join a team and submit projects for Event #${escapeHtml(eventId)}, you must first register as a participant.
    </p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <button class="btn main" id="btnRegisterForHackathon" type="button" style="padding:12px 28px;font-size:1.02rem">
        Register for this Hackathon &rarr;
      </button>
      <a class="btn ghost" href="#/events/${eventId}">View Event Details</a>
    </div>
  </div>
</section>
`;

    document.getElementById('btnRegisterForHackathon')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Registering...';
      try {
        await api.registerForEvent(eventId);
        authStore.addEventRole(eventId, 'PARTICIPANT');
        notify(`Successfully registered for Event #${eventId}!`, 'success');
        // Seamlessly re-render into State C / D
        await renderTeams(container, eventId);
      } catch (err) {
        notify(`Registration failed: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Register for this Hackathon \u2192';
      }
    });
    return;
  }

  // STATE D: User is registered AND has a team
  if (myTeam) {
    const isLeader = currentUserId && String(myTeam.leaderId) === String(currentUserId);
    const members = myTeam.members || [];

    let isTeamSubmitted = false;
    try {
      const mySub = await api.getMySubmission(eventId).catch(() => null);
      if (mySub && (mySub.status === 'SUBMITTED' || mySub.status === 'LOCKED')) {
        isTeamSubmitted = true;
      }
    } catch {}

    container.innerHTML = `
<section class="view enter" id="v-teams-my-team">
  <div class="vh row">
    <div style="min-width:0;flex:1 1 280px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span class="bdg ok">&#10003; Registered</span>
        <span style="font-size:0.85rem;color:var(--mute)">Event #${escapeHtml(eventId)}</span>
      </div>
      <h2 class="vt" style="margin-top:8px">${escapeHtml(myTeam.name)}</h2>
      <p class="vs">Your active hackathon team for Event #${escapeHtml(eventId)}.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${isLeader ? `<a class="btn main sm" href="#/events/${eventId}/submit">+ Submit Project &rarr;</a>` : `<a class="btn ghost sm" href="#/events/${eventId}/submit">View Team Submission &rarr;</a>`}
      <a class="btn ghost sm" href="#/events/${eventId}">Event Details</a>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;margin-top:24px">
    <!-- Active Team Details Card -->
    <div class="card" style="border-color:rgba(92,255,176,0.4)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="bdg ok">Your Team</span>
        ${isLeader ? '<span class="bdg p" style="font-size:0.75rem">Team Leader</span>' : '<span class="bdg c" style="font-size:0.75rem">Team Member</span>'}
      </div>
      <h3 style="font-size:1.5rem;margin:12px 0 6px">${escapeHtml(myTeam.name)}</h3>
      <p style="color:var(--mute);font-size:0.92rem;margin-bottom:20px">
        Event #${escapeHtml(eventId)} &bull; ${members.length} member(s)
      </p>

      ${isTeamSubmitted ? `
        <div style="padding:16px;border-radius:14px;background:rgba(255,200,60,0.1);border:1px solid rgba(255,200,60,0.35);color:var(--warn)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:1.1rem">🔒</span>
            <b style="font-size:0.95rem">Team Roster Locked</b>
          </div>
          <p style="color:var(--text);font-size:0.86rem;line-height:1.5;margin:8px 0 0">
            Your team has already submitted a project (<b>Status: SUBMITTED</b>). Per event rules, team membership is locked once a project is submitted, so new members can no longer join.
          </p>
        </div>
      ` : myTeam.inviteCode ? `
        <div style="padding:16px;border-radius:14px;background:rgba(92,255,176,0.08);border:1px solid rgba(92,255,176,0.3)">
          <span style="font-size:0.8rem;font-weight:700;color:var(--m);display:block;text-transform:uppercase;letter-spacing:.04em">Team Invite Code:</span>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
            <code id="activeTeamCode" style="flex:1;font-family:var(--mono);font-size:1.2rem;font-weight:800;color:#FFF;background:rgba(0,0,0,0.4);padding:8px 14px;border-radius:10px;letter-spacing:1px">${escapeHtml(myTeam.inviteCode)}</code>
            <button class="btn ghost sm" id="copyActiveCodeBtn" type="button" style="border-color:var(--m)">
              <span id="copyActiveLabel">Copy Code</span>
            </button>
          </div>
          <small style="color:var(--mute);display:block;margin-top:8px;font-size:0.8rem">
            Share this invite code with your teammates so they can join your team.
          </small>
        </div>
      ` : ''}

      <div style="margin-top:24px">
        ${isLeader
          ? `<a class="btn main" href="#/events/${eventId}/submit" style="width:100%;justify-content:center">Go to Project Submission &rarr;</a>`
          : `<a class="btn ghost" href="#/events/${eventId}/submit" style="width:100%;justify-content:center">View Team Submission (Leader Submits) &rarr;</a>`
        }
      </div>
    </div>

    <!-- Team Members Card -->
    <div class="card">
      <h3 style="font-size:1.25rem;margin-bottom:14px">Team Roster (${members.length})</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${members.map(m => {
          const isMemberLeader = Boolean(m.isLeader || (currentUserId && String(myTeam.leaderId) === String(m.userId || m.id)));
          return `
            <div style="padding:12px 14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
              <div>
                <b style="color:var(--text);font-size:0.95rem;display:block">${escapeHtml(m.username || m.name || `User #${m.userId || m.id}`)}</b>
                ${m.email ? `<small style="color:var(--mute);font-size:0.8rem">${escapeHtml(m.email)}</small>` : ''}
              </div>
              <div>
                ${isMemberLeader ? '<span class="bdg p" style="font-size:0.72rem">Leader</span>' : '<span class="bdg" style="font-size:0.72rem;color:var(--mute)">Member</span>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </div>

  <!-- Teams in this Event Roster -->
  <div class="card" style="margin-top:28px">
    <h3>Teams in this Event</h3>
    <div id="teamRoster" style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
    </div>
  </div>
</section>
`;

    // Populate teamRoster
    populateTeamRoster(teams, myTeam);

    document.getElementById('copyActiveCodeBtn')?.addEventListener('click', () => {
      const code = myTeam.inviteCode;
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        const lbl = document.getElementById('copyActiveLabel');
        if (lbl) lbl.textContent = '✓ Copied!';
        notify('Invite code copied to clipboard', 'success');
        setTimeout(() => {
          if (lbl) lbl.textContent = 'Copy Code';
        }, 2000);
      });
    });
    return;
  }

  // STATE C: User IS registered, but has NO team yet
  container.innerHTML = `
<section class="view enter" id="v-teams-create-or-join">
  <div class="vh row">
    <div style="min-width:0;flex:1 1 280px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span class="bdg ok">&#10003; Registered</span>
        <span style="font-size:0.85rem;color:var(--mute)">Event #${escapeHtml(eventId)}</span>
      </div>
      <h2 class="vt" style="margin-top:8px">My Team</h2>
      <p class="vs">Create a new team or enter an invite code to join an existing team.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a class="btn ghost sm" href="#/events/${eventId}">Hackathon Details</a>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;margin-top:24px">
    <!-- Create Team Card -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:1.5rem">🚀</span>
        <h3 style="font-size:1.3rem;margin:0">Create a team</h3>
      </div>
      <p style="color:var(--mute);font-size:.92rem;margin:6px 0 20px">
        Start a new team for Event #${escapeHtml(eventId)}. An invite code will be generated for your teammates.
      </p>

      <form id="createTeamForm">
        <div class="fld">
          <label for="teamName">Team name *</label>
          <input id="teamName" type="text" placeholder="e.g. Orbit Labs" required autocomplete="off">
        </div>
        <button class="btn main" id="createTeamBtn" type="submit" style="width:100%;justify-content:center">Create team</button>
      </form>
    </div>

    <!-- Join Team Card -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:1.5rem">🔑</span>
        <h3 style="font-size:1.3rem;margin:0">Join a team</h3>
      </div>
      <p style="color:var(--mute);font-size:.92rem;margin:6px 0 20px">
        Enter the invite code given to you by your team leader.
      </p>

      <form id="joinTeamForm">
        <div class="fld">
          <label for="joinCodeInput">Invite code *</label>
          <input id="joinCodeInput" type="text" placeholder="e.g. INV-TM_01" required style="font-family:var(--mono);text-transform:uppercase" autocomplete="off">
        </div>
        <p id="joinError" class="autherr"></p>
        <button class="btn ghost" id="joinTeamBtn" type="submit" style="width:100%;justify-content:center;border-color:var(--c)">Join team</button>
      </form>
    </div>
  </div>

  <!-- Teams in this Event Roster -->
  <div class="card" style="margin-top:28px">
    <h3>Teams in this Event</h3>
    <div id="teamRoster" style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
    </div>
  </div>
</section>
`;

  // Populate teamRoster
  populateTeamRoster(teams, null);

  const createForm = document.getElementById('createTeamForm');
  const joinForm = document.getElementById('joinTeamForm');

  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('teamName').value.trim();
    if (!name) return;
    const createBtn = document.getElementById('createTeamBtn');
    createBtn.disabled = true;

    try {
      const res = await api.createTeam(eventId, { name });
      notify(`Team "${name}" created successfully!`, 'success');
      await renderTeams(container, eventId);
    } catch (err) {
      notify(`Error creating team: ${err.message}`, 'error');
      createBtn.disabled = false;
    }
  });

  joinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
    const joinErr = document.getElementById('joinError');
    const joinBtn = document.getElementById('joinTeamBtn');
    if (joinErr) joinErr.textContent = '';
    joinBtn.disabled = true;

    try {
      const res = await api.joinTeam(code);
      const teamData = res?.data || res;
      notify(`Successfully joined team "${teamData?.name || code}"!`, 'success');
      await renderTeams(container, eventId);
    } catch (err) {
      if (joinErr) joinErr.textContent = err.message || 'Failed to join team. Check invite code.';
      joinBtn.disabled = false;
    }
  });
}

function populateTeamRoster(teams, myTeam) {
  const roster = document.getElementById('teamRoster');
  if (!roster) return;

  if (Array.isArray(teams) && teams.length > 0) {
    roster.innerHTML = teams.map(t => {
      const isThisMyTeam = myTeam && String(t.id) === String(myTeam.id);
      if (isThisMyTeam) {
        return `
          <div style="padding:14px;border-radius:14px;background:var(--glass2);border:1px solid rgba(92,255,176,0.35)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <b style="font-size:0.95rem;color:var(--text)">${escapeHtml(t.name)} <span class="bdg ok" style="font-size:0.7rem;margin-left:6px">Your team</span></b>
              ${t.inviteCode ? `<code style="font-size:0.8rem;padding:2px 8px;border-radius:6px;background:rgba(92,255,176,0.15);color:var(--m)">${escapeHtml(t.inviteCode)}</code>` : ''}
            </div>
            <small style="color:var(--mute);display:block;font-size:0.78rem;margin-top:6px">
              ${(t.members || []).length} member(s) ${t.inviteCode ? `&bull; Invite code: <b>${escapeHtml(t.inviteCode)}</b>` : ''}
            </small>
          </div>
        `;
      }
      return `
        <div style="padding:14px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <b style="font-size:0.95rem;color:var(--text)">${escapeHtml(t.name)}</b>
            <span style="font-size:0.8rem;color:var(--mute)">${(t.members || []).length} member(s)</span>
          </div>
          <small style="color:var(--mute);display:block;font-size:0.78rem;margin-top:6px">
            Public Roster &bull; Private team
          </small>
        </div>
      `;
    }).join('');
  } else {
    roster.innerHTML = `
      <div style="padding:14px;border-radius:14px;background:var(--glass2);border:1px solid var(--line);color:var(--mute)">
        No teams created yet. Be the first to create one!
      </div>
    `;
  }
}
