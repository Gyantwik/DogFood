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

  async function loadData() {
    tbody.innerHTML = '<div style="padding:24px;text-align:center;color:var(--mute)">Loading results...</div>';

    try {
      const isOrganizer = authStore.isOrganizer() || authStore.isAdmin();
      const eventObj = await api.getEvent(eventId).catch(() => null);
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

      renderTable();
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('results are not published yet')) {
        containerArea.innerHTML = `
          <div class="card" style="text-align:center;padding:50px 20px;margin-top:20px;border:1px dashed var(--line)">
            <div style="font-size:2.8rem;margin-bottom:12px">⏳</div>
            <h3 style="font-size:1.5rem">Results Not Published Yet</h3>
            <p style="color:var(--mute);margin:8px 0 20px">${escapeHtml(err.message)}</p>
            <p style="color:var(--c);font-size:0.9rem">Official scores will be released once judging completes.</p>
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
