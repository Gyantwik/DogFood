/**
 * eventDetailView.js — Public Hackathon Event Detail View
 * Connects to GET /api/events/{id} for dynamic event metadata, deadline, and tracks.
 */

import { h, $, notify, escapeHtml } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export async function renderEventDetail(container, eventId = null) {
  if (!eventId) {
    container.innerHTML = `
<section class="view enter" id="v-event-detail-no-event">
  <div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:48px 32px">
    <div style="font-size:2.8rem;margin-bottom:12px">🎯</div>
    <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Please choose an event first</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem">
      You need to select an active hackathon event to view its details.
    </p>
    <a class="btn main" href="#/gallery">Browse Active Events &rarr;</a>
  </div>
</section>
`;
    return;
  }

  container.innerHTML = `
<section class="view enter" id="v-event-detail">
  <div id="eventDetailContent">
    <div style="padding:40px;text-align:center;color:var(--mute)">Loading event details...</div>
  </div>
</section>
`;

  const content = document.getElementById('eventDetailContent');

  try {
    const res = await api.getEvent(eventId);
    const event = res?.data || res;

    if (!event || !event.name) {
      content.innerHTML = `
        <div class="card" style="text-align:center;padding:50px 20px;margin-top:20px">
          <div style="font-size:2.6rem;margin-bottom:12px">🔍</div>
          <h3 style="font-size:1.6rem">Event not found</h3>
          <p style="color:var(--mute);margin:8px 0 20px">No hackathon event found with ID ${escapeHtml(eventId)}.</p>
          <a class="btn ghost sm" href="#/gallery">Browse Public Gallery</a>
        </div>
      `;
      return;
    }

    // Sync user session roles if authenticated
    if (authStore.isAuthenticated()) {
      try {
        const meRes = await api.getMe();
        const me = meRes?.data || meRes;
        if (me?.rolesByEvent) {
          Object.entries(me.rolesByEvent).forEach(([eId, r]) => {
            authStore.addEventRole(eId, r);
          });
        }
      } catch {}
    }

    const tracks = event.tracks || [];
    const now = new Date();
    const deadlineStr = event.submissionDeadline ? new Date(event.submissionDeadline).toLocaleString() : 'Not configured';
    const subEnd = event.submissionDeadline ? new Date(event.submissionDeadline) : null;
    const subStart = event.submissionStart ? new Date(event.submissionStart) : (event.registrationEnd ? new Date(event.registrationEnd) : null);
    const regEnd = event.registrationEnd ? new Date(event.registrationEnd) : null;

    const isClosed = event.status === 'CLOSED' || (subEnd && now > subEnd);
    const isRegistrationOnly = subStart && now < subStart;
    const isReg = authStore.isRegisteredForEvent(eventId);
    const isAuth = authStore.isAuthenticated();

    let phaseBadgeText = 'ACTIVE';
    let phaseBadgeClass = 'ok';
    if (isClosed) {
      phaseBadgeText = 'SUBMISSIONS CLOSED';
      phaseBadgeClass = 'bad';
    } else if (isRegistrationOnly) {
      phaseBadgeText = 'REGISTRATION PHASE';
      phaseBadgeClass = 'warn';
    } else {
      phaseBadgeText = 'SUBMISSIONS OPEN';
      phaseBadgeClass = 'ok';
    }

    content.innerHTML = `
      <div class="vh row">
        <div style="min-width:0;flex:1 1 280px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="bdg ${phaseBadgeClass}">${phaseBadgeText}</span>
            ${isReg ? '<span class="bdg ok">&#10003; Registered</span>' : ''}
          </div>
          <h2 class="vt" style="margin-top:8px">${escapeHtml(event.name)}</h2>
          <p class="vs">${escapeHtml(event.description || 'Welcome to this hackathon event.')}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          ${!isReg && isAuth ? '<button class="btn main sm" id="btnRegisterEvent" type="button">Register for Hackathon</button>' : ''}
          ${!isAuth ? '<a class="btn main sm" href="#/login">Sign in to Register</a>' : ''}
          ${isReg ? `<a class="btn main sm" href="#/events/${eventId}/teams">My Team &rarr;</a>` : ''}
          <a class="btn ghost sm" href="#/events/${eventId}/gallery">Public Gallery</a>
          <a class="btn ghost sm" href="#/events/${eventId}/results">Leaderboard</a>
        </div>
      </div>

      <div class="event-detail-grid">
        <!-- Event Info Card -->
        <div class="card" style="min-width:0">
          <h3 style="font-size:1.25rem;margin-bottom:12px">Event Schedule & Phases</h3>
          <div style="color:var(--text);font-size:0.95rem;line-height:1.8">
            <div><b style="color:var(--mute)">Current Phase:</b> <span class="bdg ${phaseBadgeClass}" style="font-size:0.8rem">${phaseBadgeText}</span></div>
            <div><b style="color:var(--mute)">Last Date to Register:</b> <span style="font-family:var(--mono);font-size:0.9rem">${regEnd ? regEnd.toLocaleString() : 'Open until submission starts'}</span></div>
            <div><b style="color:var(--mute)">Project Submissions Open:</b> <span style="font-family:var(--mono);font-size:0.9rem">${subStart ? subStart.toLocaleString() : 'Open Now'}</span></div>
            <div><b style="color:var(--mute)">Submission Deadline:</b> <span style="font-family:var(--mono);word-break:break-all">${deadlineStr}</span></div>
            ${event.eventStart || event.eventEnd ? `
              <div><b style="color:var(--mute)">Event Timeline:</b> <span style="font-family:var(--mono);font-size:0.88rem">${event.eventStart ? new Date(event.eventStart).toLocaleDateString() : 'TBD'} &rarr; ${event.eventEnd ? new Date(event.eventEnd).toLocaleDateString() : 'TBD'}</span></div>
            ` : ''}
            ${event.judgingStart || event.judgingEnd ? `
              <div><b style="color:var(--mute)">Judging Period:</b> <span style="font-family:var(--mono);font-size:0.88rem">${event.judgingStart ? new Date(event.judgingStart).toLocaleDateString() : 'TBD'} &rarr; ${event.judgingEnd ? new Date(event.judgingEnd).toLocaleDateString() : 'TBD'}</span></div>
            ` : ''}
            ${event.resultsPublishAt ? `
              <div><b style="color:var(--mute)">Results Announcement:</b> <span style="font-family:var(--mono);font-size:0.88rem">${new Date(event.resultsPublishAt).toLocaleString()}</span></div>
            ` : ''}
            <div><b style="color:var(--mute)">Event ID:</b> <code style="font-family:var(--mono)">${escapeHtml(eventId)}</code></div>
            
            <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
              ${isReg ? `
                <div style="padding:14px;border-radius:12px;background:rgba(92,255,176,0.1);border:1px solid rgba(92,255,176,0.3)">
                  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
                    <span style="color:var(--m);font-weight:700;font-size:0.95rem">&#10003; You are registered for this event</span>
                    <span class="bdg ok">Participant</span>
                  </div>
                  <p style="color:var(--text);font-size:0.85rem;margin:6px 0 12px">Your registration is confirmed. Join or create a team to collaborate.</p>
                  <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <a class="btn main sm" href="#/events/${eventId}/teams">Go to My Team &rarr;</a>
                    <a class="btn ghost sm" href="#/events/${eventId}/submit">Submit Project &rarr;</a>
                  </div>
                </div>
              ` : `
                <div style="padding:14px;border-radius:12px;background:var(--glass2);border:1px solid var(--line)">
                  <span style="color:var(--mute);font-size:0.88rem;display:block;margin-bottom:8px">Not yet registered for this event</span>
                  ${isAuth ? `<button class="btn main sm" id="btnRegisterEventSchedule" type="button">Register as Participant &rarr;</button>` : `<a class="btn main sm" href="#/login">Sign in to Register</a>`}
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Tracks Card -->
        <div class="card" style="min-width:0">
          <h3 style="font-size:1.25rem;margin-bottom:12px">Competition Tracks (${tracks.length})</h3>
          ${tracks.length === 0 ? `
            <p style="color:var(--mute)">No specific tracks configured for this event.</p>
          ` : `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
              ${tracks.map(t => `
                <div style="padding:14px;border-radius:14px;background:var(--glass2);border:1px solid var(--line);min-width:0">
                  <b style="color:var(--c);font-size:1rem;display:block;overflow-wrap:anywhere;word-break:break-word">${typeof t === 'string' ? escapeHtml(t) : escapeHtml(t.name || 'General')}</b>
                  <p style="color:var(--mute);font-size:0.86rem;margin-top:4px;overflow-wrap:anywhere;word-break:break-word">${(typeof t === 'object' && t.description) ? escapeHtml(t.description) : 'Track judging and evaluation'}</p>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    const handleRegister = async (btn) => {
      btn.disabled = true;
      btn.textContent = 'Registering...';
      try {
        await api.registerForEvent(eventId);
        authStore.addEventRole(eventId, 'PARTICIPANT');
        notify(`Successfully registered for ${event.name}!`, 'success');
        await renderEventDetail(container, eventId);
      } catch (err) {
        notify(`Registration error: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Register for Hackathon';
      }
    };

    document.getElementById('btnRegisterEvent')?.addEventListener('click', (e) => handleRegister(e.currentTarget));
    document.getElementById('btnRegisterEventSchedule')?.addEventListener('click', (e) => handleRegister(e.currentTarget));
  } catch (err) {
    content.innerHTML = `
      <div class="card" style="text-align:center;padding:48px 20px;border:1px solid rgba(255,122,144,0.3);margin-top:20px">
        <div style="font-size:2.2rem;margin-bottom:10px">⚠️</div>
        <h3 style="font-size:1.4rem;color:var(--bad)">Failed to load event</h3>
        <p style="color:var(--mute);margin:8px 0 20px">${err.message}</p>
        <a class="btn ghost sm" href="#/gallery">Back to Gallery</a>
      </div>
    `;
  }
}
