/**
 * resultsView.js — Public Results & Leaderboard
 * Raw vs. Z-Score Normalized Toggle, ranking shift chips, smooth transitions.
 * Connects directly to real NormalizationController endpoints without mock fallback.
 */

import { h, $, notify, escapeHtml } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export async function renderResults(container, eventId = null) {
  if (!eventId) {
    container.innerHTML = `
<section class="view enter" id="v-results-no-event">
  <div class="card" style="max-width:640px;margin:40px auto;text-align:center;padding:48px 32px">
    <div style="font-size:2.8rem;margin-bottom:12px">🏆</div>
    <h2 style="font-family:var(--display);font-size:1.75rem;margin-bottom:8px">Please choose an event first</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem">
      You need to select an active hackathon event to view the official results and leaderboard.
    </p>
    <a class="btn main" href="#/gallery">Browse Active Events &rarr;</a>
  </div>
</section>
`;
    return;
  }

  container.innerHTML = `
<section class="view enter" id="v-results">
  <div class="vh row">
    <div>
      <h2 class="vt">Results & Leaderboard</h2>
      <p class="vs">Switch between raw and normalized scores to see how judge bias balancing changes the ranking.</p>
    </div>
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px;padding:6px 16px;border-radius:999px;background:var(--glass2);border:1px solid var(--line)">
        <span style="font-size:.9rem;font-weight:600" id="resModeLabel">Raw</span>
        <button id="resToggleSw" role="switch" aria-checked="false" aria-label="Show normalized scores" style="position:relative;width:56px;height:30px;border-radius:99px;background:rgba(255,255,255,.14);border:1px solid var(--line);transition:background .3s">
          <span id="resKnob" style="position:absolute;left:3px;top:2px;width:24px;height:24px;border-radius:50%;background:#FFF;transition:transform .35s var(--ease)"></span>
        </button>
        <span style="font-size:.9rem;font-weight:700;color:var(--c)">Normalized</span>
      </div>
      <button class="btn ghost sm" id="downloadResultsBtn">Download CSV</button>
    </div>
  </div>

  <!-- Top 3 Winners Podium Area (Displays when hackathon is ended) -->
  <div id="podiumArea"></div>

  <div id="resultsContainerArea">
    <div class="card" style="margin-top:22px;padding:24px">
      <div class="results-header">
        <span>Rank</span>
        <span>Project</span>
        <span style="text-align:right">Score</span>
        <span style="text-align:right">Reviews</span>
      </div>

      <div id="resultsTableBody" style="display:grid;gap:8px;margin-top:12px">
        <div style="padding:24px;text-align:center;color:var(--mute)">Loading results from backend...</div>
      </div>
    </div>
  </div>

  <p class="note2" id="normalizationExplanation" style="margin-top:16px;color:var(--mute);font-size:.95rem">
    Showing raw average scores. Switch to <b>normalized</b> to see how judge bias changes the ranking.
  </p>
</section>
`;

  const tbody = document.getElementById('resultsTableBody');
  const containerArea = document.getElementById('resultsContainerArea');
  const sw = document.getElementById('resToggleSw');
  const knob = document.getElementById('resKnob');
  const modeLabel = document.getElementById('resModeLabel');
  const expP = document.getElementById('normalizationExplanation');

  let rawList = [];
  let normList = [];
  let isNormalized = false;
  let currentEventObj = null;

  async function loadData() {
    tbody.innerHTML = '<div style="padding:24px;text-align:center;color:var(--mute)">Loading results...</div>';

    try {
      const isOrganizer = authStore.isOrganizer() || authStore.isAdmin();
      const eventObj = await api.getEvent(eventId).catch(() => null);
      currentEventObj = eventObj;
      const publishAt = eventObj?.resultsPublishAt || eventObj?.judgingEnd;
      const isPreliminary = isOrganizer && publishAt && new Date() < new Date(publishAt);

      if (isPreliminary) {
        const headerRow = container.querySelector('.vh.row > div');
        if (headerRow && !headerRow.querySelector('.preliminary-badge')) {
          const badge = document.createElement('div');
          badge.className = 'preliminary-badge';
          badge.style.marginTop = '6px';
          badge.innerHTML = `<span class="bdg warn" style="font-size:0.85rem;padding:4px 10px;font-weight:700">PRELIMINARY — Not yet visible to participants</span>`;
          headerRow.appendChild(badge);
        }
      }

      const [rawRes, normRes] = await Promise.all([
        api.getResults(eventId, 'raw'),
        api.getResults(eventId, 'normalized')
      ]);

      rawList = Array.isArray(rawRes) ? rawRes : [];
      normList = Array.isArray(normRes) ? normRes : [];

      if (rawList.length === 0 && normList.length === 0) {
        containerArea.innerHTML = `
          <div class="card" style="text-align:center;padding:50px 20px;margin-top:20px;border:1px dashed var(--line)">
            <div style="font-size:2.6rem;margin-bottom:12px">📊</div>
            <h3 style="font-size:1.5rem">No results available</h3>
            <p style="color:var(--mute);margin:8px 0 20px">No scores have been submitted yet for Event ID ${eventId}.</p>
            <a class="btn ghost sm" href="#/gallery">Browse Projects</a>
          </div>
        `;
        return;
      }

    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('results are not published') || msg.includes('403') || msg.includes('forbidden')) {
        containerArea.innerHTML = `
          <div class="card" style="text-align:center;padding:50px 20px;margin-top:20px;border:1px dashed var(--line)">
            <div style="font-size:2.8rem;margin-bottom:12px">🔒</div>
            <h3 style="font-size:1.5rem">Results Protected During Deliberation</h3>
            <p style="color:var(--mute);margin:8px 0 20px;max-width:55ch;margin-left:auto;margin-right:auto">
              ${escapeHtml(err.message)}
            </p>
            <p style="color:var(--c);font-size:0.9rem">Official scores will be released once judging completes on the schedule established by the organizer.</p>
            <div style="margin-top:20px">
              <a class="btn ghost sm" href="#/gallery">Browse Projects &rarr;</a>
            </div>
          </div>
        `;
        return;
      }

      containerArea.innerHTML = `
        <div class="card" style="text-align:center;padding:48px 20px;border:1px solid rgba(255,122,144,0.3);margin-top:20px">
          <div style="font-size:2.2rem;margin-bottom:10px">⚠️</div>
          <h3 style="font-size:1.4rem;color:var(--bad)">Unable to load leaderboard</h3>
          <p style="color:var(--mute);margin:8px 0 20px">${err.message}</p>
          <button class="btn ghost sm" id="retryResultsBtn">Retry</button>
        </div>
      `;
      document.getElementById('retryResultsBtn')?.addEventListener('click', loadData);
    }
  }

  function renderTable() {
    const list = isNormalized ? normList : rawList;
    const tableBody = document.getElementById('resultsTableBody');
    const podiumArea = document.getElementById('podiumArea');

    // Podium Check: "it will show when the hackathon is ended , if not completed it wil not show"
    const now = new Date();
    const publishAt = currentEventObj?.resultsPublishAt ? new Date(currentEventObj.resultsPublishAt) : (currentEventObj?.judgingEnd ? new Date(currentEventObj.judgingEnd) : null);
    const isEnded = currentEventObj?.status === 'CLOSED' || (publishAt && now >= publishAt);

    if (podiumArea) {
      if (!isEnded) {
        podiumArea.innerHTML = `
          <div style="padding:16px 20px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);margin:16px 0 22px;text-align:center">
            <div style="font-size:1.8rem;margin-bottom:6px">⏳</div>
            <b style="font-size:1.05rem;color:#F8FAFC">Hackathon in Progress — Final Top 3 Podium Pending</b>
            <p style="color:var(--mute);font-size:0.86rem;margin:4px auto 0;max-width:60ch">
              The official top 3 winners podium and certified trophies will be revealed once the hackathon concludes${publishAt ? ` on ${formatDateTime(publishAt)}` : ''}.
            </p>
          </div>
        `;
      } else if (list.length > 0) {
        // "do three squre ,middle 1st lentgh is high compared to second box ,right side second lenght is high compare to tihred ,left side third lenght is less compate to 2nd ,like this do"
        const first = list[0];
        const second = list.length > 1 ? list[1] : null;
        const third = list.length > 2 ? list[2] : null;

        const firstScore = first ? (typeof (first.finalScore || first.rawScore) === 'number' ? (first.finalScore || first.rawScore).toFixed(2) : (first.finalScore || first.rawScore)) : '-';
        const secondScore = second ? (typeof (second.finalScore || second.rawScore) === 'number' ? (second.finalScore || second.rawScore).toFixed(2) : (second.finalScore || second.rawScore)) : '-';
        const thirdScore = third ? (typeof (third.finalScore || third.rawScore) === 'number' ? (third.finalScore || third.rawScore).toFixed(2) : (third.finalScore || third.rawScore)) : '-';

        podiumArea.innerHTML = `
          <div class="podium-wrapper" style="margin:24px 0 32px">
            <div style="text-align:center;margin-bottom:18px">
              <span class="bdg ok" style="font-size:0.75rem;font-weight:700">🏆 OFFICIAL FINAL WINNERS</span>
              <h3 style="font-size:1.6rem;margin:6px 0 4px">Top Three Standings</h3>
              <p style="color:var(--mute);font-size:0.86rem;margin:0">Certified hackathon winners based on ${isNormalized ? 'z-score normalized judge calibration' : 'raw evaluation scores'}.</p>
            </div>

            <div class="podium-pedestal-grid" style="display:flex;align-items:flex-end;justify-content:center;gap:16px;max-width:880px;margin:0 auto;padding:0 8px">
              <!-- Left Box: 3rd Place (Bronze) — Height: 200px (less than 2nd box) -->
              <div class="podium-pillar podium-third" style="flex:1;max-width:260px;min-width:180px;height:200px;border-radius:14px;background:rgba(217,119,6,0.06);border:2px solid rgba(217,119,6,0.4);display:flex;flex-direction:column;justify-content:space-between;padding:16px 14px;text-align:center;position:relative;box-shadow:0 8px 24px rgba(0,0,0,0.3)">
                <div>
                  <div style="font-size:2rem;line-height:1;margin-bottom:4px">🥉</div>
                  <span class="bdg" style="border-color:#D97706;color:#D97706;font-size:0.72rem;font-weight:700">3RD PLACE &bull; BRONZE</span>
                  <b style="display:block;font-size:1.05rem;color:#F8FAFC;margin-top:6px;line-height:1.3">${third ? escapeHtml(third.title || 'Submission #' + third.submissionId) : 'TBD'}</b>
                  ${third?.track ? `<span class="trk" style="font-size:0.72rem;margin-top:4px">${escapeHtml(third.track)}</span>` : ''}
                </div>
                <div style="border-top:1px solid rgba(217,119,6,0.25);padding-top:8px">
                  <span style="font-family:var(--mono);font-size:1.15rem;font-weight:800;color:#D97706">${thirdScore}</span>
                  <small style="display:block;font-size:0.72rem;color:var(--mute)">Final Score</small>
                </div>
              </div>

              <!-- Middle Box: 1st Place (Gold) — Height: 310px (tallest, high compared to 2nd box) -->
              <div class="podium-pillar podium-first" style="flex:1;max-width:270px;min-width:190px;height:310px;border-radius:16px;background:rgba(245,158,11,0.08);border:2px solid rgba(245,158,11,0.55);display:flex;flex-direction:column;justify-content:space-between;padding:20px 16px;text-align:center;position:relative;box-shadow:0 12px 32px rgba(245,158,11,0.15)">
                <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#F59E0B;color:#000;font-size:0.75rem;font-weight:800;padding:2px 10px;border-radius:99px;letter-spacing:0.04em">GRAND CHAMPION</div>
                <div>
                  <div style="font-size:3rem;line-height:1;margin-bottom:6px">🥇</div>
                  <span class="bdg" style="border-color:#F59E0B;color:#F59E0B;font-size:0.78rem;font-weight:800">1ST PLACE &bull; GOLD</span>
                  <b style="display:block;font-size:1.25rem;color:#FFF;margin-top:8px;line-height:1.3">${first ? escapeHtml(first.title || 'Submission #' + first.submissionId) : 'TBD'}</b>
                  ${first?.track ? `<span class="trk" style="font-size:0.75rem;margin-top:4px">${escapeHtml(first.track)}</span>` : ''}
                </div>
                <div style="border-top:1px solid rgba(245,158,11,0.3);padding-top:10px">
                  <span style="font-family:var(--mono);font-size:1.45rem;font-weight:800;color:#F59E0B">${firstScore}</span>
                  <small style="display:block;font-size:0.75rem;color:var(--mute)">Final Champion Score</small>
                </div>
              </div>

              <!-- Right Box: 2nd Place (Silver) — Height: 250px (higher than 3rd, less than 1st) -->
              <div class="podium-pillar podium-second" style="flex:1;max-width:260px;min-width:180px;height:250px;border-radius:14px;background:rgba(148,163,184,0.06);border:2px solid rgba(148,163,184,0.4);display:flex;flex-direction:column;justify-content:space-between;padding:18px 14px;text-align:center;position:relative;box-shadow:0 8px 24px rgba(0,0,0,0.3)">
                <div>
                  <div style="font-size:2.4rem;line-height:1;margin-bottom:4px">🥈</div>
                  <span class="bdg" style="border-color:#94A3B8;color:#CBD5E1;font-size:0.74rem;font-weight:700">2ND PLACE &bull; SILVER</span>
                  <b style="display:block;font-size:1.1rem;color:#F8FAFC;margin-top:6px;line-height:1.3">${second ? escapeHtml(second.title || 'Submission #' + second.submissionId) : 'TBD'}</b>
                  ${second?.track ? `<span class="trk" style="font-size:0.72rem;margin-top:4px">${escapeHtml(second.track)}</span>` : ''}
                </div>
                <div style="border-top:1px solid rgba(148,163,184,0.25);padding-top:8px">
                  <span style="font-family:var(--mono);font-size:1.25rem;font-weight:800;color:#CBD5E1">${secondScore}</span>
                  <small style="display:block;font-size:0.72rem;color:var(--mute)">Final Score</small>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        podiumArea.innerHTML = '';
      }
    }

    if (!tableBody) return;
    tableBody.innerHTML = '';

    list.forEach((item, index) => {
      const score = item.finalScore || item.rawScore || 0;
      const isTop = index === 0;

      // Find rank difference if available
      let deltaBadge = null;
      if (isNormalized && rawList.length > 0) {
        const rawIdx = rawList.findIndex(r => (r.submissionId && r.submissionId === item.submissionId) || r.title === item.title);
        if (rawIdx !== -1) {
          const delta = rawIdx - index; // positive means moved up
          deltaBadge = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : 'No change';
        }
      }

      const row = h('div', {
        className: `results-row ${isTop ? 'top-rank' : ''}`,
        style: isTop ? {
          background: 'linear-gradient(90deg, rgba(255,179,107,0.12), transparent)',
          border: '1px solid rgba(255,179,107,0.4)'
        } : {}
      }, [
        h('b', { className: 'results-rank', style: { fontFamily: 'var(--display)', fontSize: '1.25rem', color: isTop ? 'var(--p)' : 'var(--mute)' } }, `#${item.rank || index + 1}`),
        h('div', { className: 'results-title' }, [
          h('b', { style: { fontSize: '1.05rem', color: '#FFF', fontFamily: 'var(--display)' } }, item.title || 'Submission #' + item.submissionId),
          item.tagline ? h('small', { className: 'results-desc', style: { color: 'var(--mute)', display: 'block', fontSize: '0.82rem' } }, item.tagline) : null
        ].filter(Boolean)),
        h('span', { className: 'results-score', style: { fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: '800', fontSize: '1.02rem', color: isTop ? 'var(--p)' : '#FFF' } }, typeof score === 'number' ? score.toFixed(2) : score),
        h('span', {
          className: `bdg ${isNormalized ? 'ok' : 'warn'} results-reviews`,
          style: { justifySelf: 'end' }
        }, deltaBadge ? deltaBadge : `${item.reviewsCount || 0} reviews`)
      ]);

      tableBody.appendChild(row);
    });
  }

  sw?.addEventListener('click', () => {
    isNormalized = !isNormalized;
    sw.setAttribute('aria-checked', isNormalized);
    if (knob) knob.style.transform = isNormalized ? 'translateX(26px)' : 'none';
    sw.style.background = isNormalized ? 'linear-gradient(120deg,#8B5CFF,#37E0FF)' : 'rgba(255,255,255,.14)';
    if (modeLabel) modeLabel.textContent = isNormalized ? 'Normalized' : 'Raw';
    if (expP) {
      expP.innerHTML = isNormalized
        ? 'Showing <b>z-score normalized scores</b> (Standardized T-score scale: T = 50 + 10z). Strict and lenient judges are statistically calibrated. <small style="display:block;margin-top:4px;color:var(--c)">Note: If judges evaluate only 1 project or assign identical scores across their queue, the neutral zero-variance baseline is 50.00.</small>'
        : 'Showing <b>raw average scores</b>. Switch to <b>normalized</b> to see how judge bias changes the ranking.';
    }
    renderTable();
  });

  document.getElementById('downloadResultsBtn')?.addEventListener('click', async () => {
    try {
      await api.exportResults(eventId);
      notify('Downloaded results CSV from backend', 'success');
    } catch (err) {
      notify(`Export failed: ${err.message}`, 'error');
    }
  });

  await loadData();
}
