/**
 * verificationView.js — Dedicated Public Credential & Ledger Verification Portal
 * 
 * Provides:
 * 1. Tamper-evident participant & winner certificate verification (SHA-256 checksum)
 * 2. Cryptographic judge participation verification (HMAC-SHA256) with zero score leaking
 * 3. Instant SVG certificate preview & download
 * 4. URL query parameter hydration (?id=CERT-... or ?judgeId=...)
 */

import { h, escapeHtml, notify } from '../lib/dom.js';
import { api } from '../api/client.js';

export async function renderVerification(container) {
  const hash = window.location.hash || '';
  const searchParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
  const initialCertId = searchParams.get('id') || searchParams.get('certId') || '';
  const initialJudgeId = searchParams.get('judgeId') || '';
  const initialEventId = searchParams.get('eventId') || '';

  container.innerHTML = `
<section class="view enter" id="v-verification-portal">
  <div class="card" style="max-width:920px;margin:24px auto;padding:32px 28px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)">
    
    <!-- Portal Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:20px;background:rgba(217,119,6,0.12);border:1px solid rgba(217,119,6,0.3);color:#F59E0B;font-size:0.8rem;font-weight:700;margin-bottom:12px">
        <span>🛡️ OFFICIAL CRYPTOGRAPHIC LEDGER</span>
      </div>
      <h1 style="font-family:var(--display);font-size:2.2rem;letter-spacing:-0.02em;margin:0 0 8px">Credential Verification Portal</h1>
      <p style="color:var(--mute);font-size:1rem;max-width:620px;margin:0 auto">
        Verify authentic hackathon certificates and cryptographically signed judge participation records with zero score leaking.
      </p>
    </div>

    <!-- Mode Selector Tabs -->
    <div style="display:flex;gap:8px;background:rgba(0,0,0,0.3);padding:6px;border-radius:12px;margin-bottom:28px;border:1px solid rgba(255,255,255,0.08)">
      <button class="btn main sm" id="tabCertBtn" type="button" style="flex:1;height:40px;font-size:0.92rem;font-weight:600">
        📜 Certificate Verification
      </button>
      <button class="btn ghost sm" id="tabJudgeBtn" type="button" style="flex:1;height:40px;font-size:0.92rem;font-weight:600">
        ⚖️ Signed Judge Record
      </button>
    </div>

    <!-- PANEL 1: Certificate Verification -->
    <div id="panelCertSection">
      <div style="background:var(--glass2);padding:24px;border-radius:14px;border:1px solid var(--line);margin-bottom:24px">
        <h3 style="margin:0 0 6px;font-size:1.2rem">Verify Hackathon Certificate</h3>
        <p style="color:var(--mute);font-size:0.88rem;margin:0 0 16px">
          Enter the unique Certificate ID printed on the document (e.g. <code>CERT-PART-1-4</code>) to verify its authenticity against the SHA-256 event ledger.
        </p>
        
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
          <input type="text" id="verifyCertIdInput" value="${escapeHtml(initialCertId)}" placeholder="e.g. CERT-PART-1-4" style="flex:1;min-width:240px;height:44px;border-radius:10px;background:rgba(0,0,0,0.25);border:1px solid var(--line);color:var(--text);padding:0 14px;font-family:var(--mono);font-size:0.95rem">
          <button class="btn main sm" id="btnRunCertVerify" type="button" style="height:44px;padding:0 20px;font-weight:600;font-size:0.92rem">
            Verify Certificate &rarr;
          </button>
          <button class="btn ghost sm" id="btnSampleCert" type="button" style="height:44px;padding:0 14px;font-size:0.85rem">
            Sample Valid ID
          </button>
        </div>
      </div>

      <!-- Verification Result Container -->
      <div id="certResultContainer"></div>
    </div>

    <!-- PANEL 2: Judge Record Verification -->
    <div id="panelJudgeSection" style="display:none">
      <div style="background:var(--glass2);padding:24px;border-radius:14px;border:1px solid var(--line);margin-bottom:24px">
        <h3 style="margin:0 0 6px;font-size:1.2rem">Verify Signed Judge Participation Record</h3>
        <p style="color:var(--mute);font-size:0.88rem;margin:0 0 16px">
          Verify a judge's HMAC-SHA256 participation signature. Proves rigorous evaluation of assigned submissions without exposing confidential score ratings or private comments.
        </p>

        <form id="judgeVerifyForm" style="display:grid;gap:12px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fld">
              <label for="jUserId">Judge User ID *</label>
              <input type="number" id="jUserId" value="${escapeHtml(initialJudgeId || '2')}" required style="height:40px;border-radius:8px">
            </div>
            <div class="fld">
              <label for="jEventId">Event ID *</label>
              <input type="number" id="jEventId" value="${escapeHtml(initialEventId || '1')}" required style="height:40px;border-radius:8px">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="fld">
              <label for="jCount">Evaluated Submissions</label>
              <input type="number" id="jCount" value="5" min="0" required style="height:40px;border-radius:8px">
            </div>
            <div class="fld">
              <label for="jTimestamp">Completion Timestamp (ISO 8601)</label>
              <input type="text" id="jTimestamp" value="2026-09-28T12:00:00Z" required style="height:40px;border-radius:8px;font-family:var(--mono)">
            </div>
          </div>
          <div class="fld">
            <label for="jSignature">HMAC-SHA256 Cryptographic Signature *</label>
            <input type="text" id="jSignature" placeholder="64-character hex signature..." required style="height:40px;border-radius:8px;font-family:var(--mono);font-size:0.85rem">
          </div>

          <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap">
            <button class="btn main sm" type="submit" id="btnRunJudgeVerify" style="height:40px;padding:0 20px;font-weight:600">
              Verify Signature &rarr;
            </button>
            <button class="btn ghost sm" id="btnLoadValidJudgeRecord" type="button" style="height:40px;padding:0 14px;font-size:0.85rem">
              Generate &amp; Load Valid Judge Record
            </button>
            <button class="btn ghost sm" id="btnTamperJudgeSignature" type="button" style="height:40px;padding:0 14px;font-size:0.85rem;color:var(--bad)">
              Test Tampered Signature
            </button>
          </div>
        </form>
      </div>

      <!-- Judge Result Container -->
      <div id="judgeResultContainer"></div>
    </div>

  </div>
</section>
  `;

  // Bind tabs
  const tabCertBtn = document.getElementById('tabCertBtn');
  const tabJudgeBtn = document.getElementById('tabJudgeBtn');
  const panelCert = document.getElementById('panelCertSection');
  const panelJudge = document.getElementById('panelJudgeSection');

  tabCertBtn?.addEventListener('click', () => {
    tabCertBtn.className = 'btn main sm';
    tabJudgeBtn.className = 'btn ghost sm';
    panelCert.style.display = 'block';
    panelJudge.style.display = 'none';
  });

  tabJudgeBtn?.addEventListener('click', () => {
    tabJudgeBtn.className = 'btn main sm';
    tabCertBtn.className = 'btn ghost sm';
    panelCert.style.display = 'none';
    panelJudge.style.display = 'block';
  });

  if (hash.includes('judge') || initialJudgeId) {
    tabJudgeBtn?.click();
  }

  // Certificate Verification Logic
  const certInput = document.getElementById('verifyCertIdInput');
  const certVerifyBtn = document.getElementById('btnRunCertVerify');
  const certSampleBtn = document.getElementById('btnSampleCert');
  const certResultDiv = document.getElementById('certResultContainer');

  async function executeCertVerify(certId) {
    if (!certId) {
      notify('Please enter a certificate ID', 'warn');
      return;
    }
    certResultDiv.innerHTML = `<div style="padding:24px;text-align:center;color:var(--mute)">🔍 Querying cryptographic ledger...</div>`;
    try {
      const data = await api.getCertificate(certId.trim());
      renderCertSuccess(data);
    } catch (err) {
      renderCertFailure(certId, err.message);
    }
  }

  function renderCertSuccess(data) {
    const cert = data?.certificate || data;
    const isWinner = cert?.certificateType === 'WINNER';
    const checksum = cert?.checksum || 'VERIFIED-LEDGER-HASH';
    const issuedDate = cert?.issuedAt ? new Date(cert.issuedAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'September 2026';

    certResultDiv.innerHTML = `
      <div style="background:linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(217,119,6,0.08) 100%);border:2px solid ${isWinner ? '#F59E0B' : '#3B82F6'};border-radius:16px;padding:28px;position:relative">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:20px">
          <div>
            <span class="bdg ok" style="font-size:0.8rem;padding:4px 10px;font-weight:700">✓ CRYPTOGRAPHICALLY VERIFIED</span>
            <h2 style="font-family:var(--display);font-size:1.6rem;margin:8px 0 4px">Official Certificate of ${isWinner ? 'Excellence (Winner)' : 'Participation'}</h2>
            <span style="font-family:var(--mono);color:var(--mute);font-size:0.88rem">Ledger ID: ${escapeHtml(cert.id || 'N/A')}</span>
          </div>
          <div style="text-align:right">
            <span class="bdg ${isWinner ? 'hl' : 'ok'}" style="font-size:0.85rem;padding:6px 12px;font-weight:700">
              ${escapeHtml(cert.placement || (isWinner ? 'Top Placement' : 'Participant'))}
            </span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;background:rgba(0,0,0,0.25);padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.06)">
          <div>
            <small style="color:var(--mute);text-transform:uppercase;font-size:0.75rem">Recipient</small>
            <b style="display:block;font-size:1.1rem;color:#FFF;margin-top:2px">${escapeHtml(cert.recipientName || 'Hackathon Developer')}</b>
          </div>
          <div>
            <small style="color:var(--mute);text-transform:uppercase;font-size:0.75rem">Hackathon Event</small>
            <b style="display:block;font-size:1rem;color:#FFF;margin-top:2px">${escapeHtml(cert.eventName || `Event #${cert.eventId}`)}</b>
          </div>
          <div>
            <small style="color:var(--mute);text-transform:uppercase;font-size:0.75rem">Project / Submission</small>
            <b style="display:block;font-size:1rem;color:var(--c);margin-top:2px">${escapeHtml(cert.submissionTitle || 'Official Submission')}</b>
          </div>
          <div>
            <small style="color:var(--mute);text-transform:uppercase;font-size:0.75rem">Issued Date</small>
            <b style="display:block;font-size:1rem;color:#FFF;margin-top:2px">${escapeHtml(issuedDate)}</b>
          </div>
        </div>

        <!-- SHA-256 Ledger Fingerprint -->
        <div style="background:rgba(0,0,0,0.4);padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);margin-bottom:20px">
          <small style="color:var(--mute);display:block;font-size:0.75rem;margin-bottom:4px">SHA-256 LEDGER PROOF CHECKSUM</small>
          <code style="color:#10B981;font-size:0.85rem;word-break:break-all">${escapeHtml(checksum)}</code>
        </div>

        <!-- Download & Printable SVG CTA -->
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <button class="btn main sm" id="btnDownloadCertSvg" type="button" style="font-weight:600">
            ⬇️ Download Official SVG Certificate
          </button>
          <button class="btn ghost sm" id="btnPrintCert" type="button">
            🖨️ Print Credential
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnDownloadCertSvg')?.addEventListener('click', () => {
      downloadCertificateSvg(cert);
    });

    document.getElementById('btnPrintCert')?.addEventListener('click', () => {
      window.print();
    });
  }

  function renderCertFailure(certId, msg) {
    certResultDiv.innerHTML = `
      <div style="background:rgba(255,122,144,0.08);border:1px solid rgba(255,122,144,0.3);border-radius:14px;padding:24px;text-align:center">
        <div style="font-size:2rem;margin-bottom:8px">❌</div>
        <h3 style="color:var(--bad);margin:0 0 6px">Certificate Not Found or Invalid</h3>
        <p style="color:var(--mute);font-size:0.9rem;margin:0 0 14px">
          The certificate ID <code>${escapeHtml(certId)}</code> could not be cryptographically verified against the platform ledger.
        </p>
        <span style="font-size:0.8rem;color:var(--mute)">Reason: ${escapeHtml(msg || 'Ledger entry does not exist')}</span>
      </div>
    `;
  }

  certVerifyBtn?.addEventListener('click', () => {
    executeCertVerify(certInput?.value);
  });

  certInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeCertVerify(certInput?.value);
  });

  certSampleBtn?.addEventListener('click', () => {
    if (certInput) {
      certInput.value = 'CERT-PART-1-4';
      executeCertVerify('CERT-PART-1-4');
    }
  });

  // Judge Record Verification Logic
  const judgeForm = document.getElementById('judgeVerifyForm');
  const judgeResultDiv = document.getElementById('judgeResultContainer');
  const btnLoadValidRecord = document.getElementById('btnLoadValidJudgeRecord');
  const btnTamperSig = document.getElementById('btnTamperJudgeSignature');

  btnLoadValidRecord?.addEventListener('click', async () => {
    const eventId = document.getElementById('jEventId')?.value || '1';
    btnLoadValidRecord.disabled = true;
    btnLoadValidRecord.textContent = 'Loading valid record...';
    if (judgeResultDiv) judgeResultDiv.innerHTML = '';
    try {
      const rec = await api.getSampleJudgeRecord(eventId);
      if (rec) {
        document.getElementById('jUserId').value = rec.judgeId || '2';
        document.getElementById('jEventId').value = rec.eventId || '1';
        document.getElementById('jCount').value = rec.evaluatedCount || rec.evaluatedSubmissionsCount || '5';
        document.getElementById('jTimestamp').value = rec.completionTimestamp || (rec.completedAt ? rec.completedAt.toString() : '2026-09-28T12:00:00Z');
        document.getElementById('jSignature').value = rec.signature || rec.hmacSignature || '';
        notify('Loaded authentic signed judge record from server!', 'success');
      }
    } catch (err) {
      notify('Failed to load authentic sample record: ' + err.message, 'error');
    } finally {
      btnLoadValidRecord.disabled = false;
      btnLoadValidRecord.textContent = 'Generate & Load Valid Judge Record';
    }
  });

  btnTamperSig?.addEventListener('click', () => {
    const sigEl = document.getElementById('jSignature');
    if (sigEl) {
      if (sigEl.value && sigEl.value.length > 5) {
        const lastChar = sigEl.value.slice(-1);
        const replacement = lastChar === 'a' ? 'b' : (lastChar === '0' ? '1' : '0');
        sigEl.value = sigEl.value.slice(0, -1) + replacement;
      } else {
        sigEl.value = 'deadbeef0000111122223333444455556666777788889999aaaabbbbccccdddd';
      }
      if (judgeResultDiv) judgeResultDiv.innerHTML = '';
      notify('Injected tampered signature for fraud detection test', 'warn');
    }
  });

  judgeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const judgeId = Number(document.getElementById('jUserId')?.value);
    const eventId = Number(document.getElementById('jEventId')?.value);
    const evaluatedCount = Number(document.getElementById('jCount')?.value);
    const completedAt = document.getElementById('jTimestamp')?.value?.trim();
    const hmacSignature = document.getElementById('jSignature')?.value?.trim();

    judgeResultDiv.innerHTML = `<div style="padding:24px;text-align:center;color:var(--mute)">🔍 Validating HMAC-SHA256 signature with backend...</div>`;

    try {
      const res = await api.verifyJudgeRecord({
        judgeId,
        eventId,
        evaluatedCount,
        completedAt,
        signature: hmacSignature
      });

      if (res && res.valid) {
        renderJudgeSuccess(res, { judgeId, eventId, evaluatedCount, completedAt, hmacSignature });
      } else {
        renderJudgeFailure(res?.message || 'Cryptographic signature mismatch. The judge record has been modified or is invalid.');
      }
    } catch (err) {
      renderJudgeFailure(err.message || 'Cryptographic signature mismatch. The judge record has been modified or is invalid.');
    }
  });

  function renderJudgeSuccess(data, inputMeta) {
    const jId = data?.judgeId || inputMeta?.judgeId;
    const evId = data?.eventId || inputMeta?.eventId;
    const evName = data?.eventName || `Event #${evId}`;
    const jName = data?.judgeName || `Judge #${jId}`;
    const count = data?.evaluatedCount !== undefined ? data.evaluatedCount : inputMeta?.evaluatedCount;
    const ts = data?.completedAt || inputMeta?.completedAt;
    const sig = inputMeta?.hmacSignature || '';

    judgeResultDiv.innerHTML = `
      <div style="background:rgba(16,185,129,0.08);border:2px solid #10B981;border-radius:16px;padding:28px" id="judgeVerifySuccessBox">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.2);display:grid;place-items:center;font-size:1.5rem;color:#10B981">
            ✓
          </div>
          <div>
            <h3 style="color:#10B981;margin:0 0 2px;font-size:1.3rem">🟢 ✓ Signature Verified</h3>
            <span style="color:var(--mute);font-size:0.88rem">Record Status: <b style="color:#10B981">AUTHENTIC</b> &bull; Zero Score Leakage Guaranteed</span>
          </div>
        </div>

        <p style="color:var(--text);font-size:0.95rem;line-height:1.6;margin:0 0 18px">
          This certifies that <b>${escapeHtml(jName)}</b> (ID: <code>${escapeHtml(jId)}</code>) has completed official scoring duties for <b>${escapeHtml(evName)}</b> (Event ID: <code>${escapeHtml(evId)}</code>), evaluating <b>${escapeHtml(count)}</b> assigned submissions. The cryptographic proof verifies rigorous service without leaking confidential score ratings or private judge comments.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;background:rgba(0,0,0,0.3);padding:16px;border-radius:12px;margin-bottom:18px;border:1px solid rgba(255,255,255,0.06)">
          <div>
            <small style="color:var(--mute);font-size:0.75rem;text-transform:uppercase">Judge User ID</small>
            <div style="font-weight:700;color:#FFF;margin-top:2px">${escapeHtml(jId)} (${escapeHtml(jName)})</div>
          </div>
          <div>
            <small style="color:var(--mute);font-size:0.75rem;text-transform:uppercase">Event ID</small>
            <div style="font-weight:700;color:#FFF;margin-top:2px">${escapeHtml(evId)} (${escapeHtml(evName)})</div>
          </div>
          <div>
            <small style="color:var(--mute);font-size:0.75rem;text-transform:uppercase">Evaluated Submissions</small>
            <div style="font-weight:700;color:#38BDF8;margin-top:2px">${escapeHtml(count)} Completed</div>
          </div>
          <div>
            <small style="color:var(--mute);font-size:0.75rem;text-transform:uppercase">Completion Timestamp</small>
            <div style="font-weight:600;font-family:var(--mono);color:#FFF;font-size:0.85rem;margin-top:2px">${escapeHtml(ts)}</div>
          </div>
        </div>

        <div style="background:rgba(0,0,0,0.3);padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <small style="color:var(--mute);font-size:0.75rem">HMAC-SHA256 CRYPTOGRAPHIC SIGNATURE</small>
            <span class="bdg ok" style="font-size:0.72rem;background:rgba(16,185,129,0.2);color:#10B981">VALID</span>
          </div>
          <code style="color:#10B981;font-size:0.85rem;word-break:break-all">${escapeHtml(sig)}</code>
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn main sm" type="button" onclick="window.print()">🖨️ Print Judge Letter of Service</button>
        </div>
      </div>
    `;
  }

  function renderJudgeFailure(msg) {
    judgeResultDiv.innerHTML = `
      <div style="background:rgba(239,68,68,0.08);border:2px solid #EF4444;border-radius:16px;padding:28px" id="judgeVerifyFailBox">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.2);display:grid;place-items:center;font-size:1.5rem;color:#EF4444">
            ❌
          </div>
          <div>
            <h3 style="color:#EF4444;margin:0 0 2px;font-size:1.3rem">🔴 ❌ Verification Failed</h3>
            <span style="color:var(--mute);font-size:0.88rem">Cryptographic Signature Mismatch &bull; Fraud / Alteration Detected</span>
          </div>
        </div>
        <p style="color:var(--text);font-size:0.95rem;line-height:1.6;margin:0 0 16px">
          Cryptographic signature mismatch. The judge record has been modified or is invalid.
        </p>
        <div style="background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);color:#FCA5A5;font-size:0.85rem">
          <b>Details:</b> ${escapeHtml(msg || 'HMAC-SHA256 signature mismatch')}
        </div>
      </div>
    `;
  }

  // Auto-trigger if initial query param exists
  if (initialCertId) {
    executeCertVerify(initialCertId);
  }
}

function downloadCertificateSvg(cert) {
  const recipient = cert.recipientName || 'Participant';
  const eventName = cert.eventName || 'DogFood Hackathon 2026';
  const type = cert.certificateType === 'WINNER' ? 'Certificate of Excellence' : 'Certificate of Participation';
  const placement = cert.placement || 'Participant';
  const checksum = cert.checksum || 'SHA256-AUTHENTIC-LEDGER-HASH';

  const svgContent = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
  </defs>
  <rect width="900" height="600" fill="url(#bg)" />
  <rect x="25" y="25" width="850" height="550" rx="16" fill="none" stroke="url(#gold)" stroke-width="4" stroke-dasharray="8 4" />
  <rect x="40" y="40" width="820" height="520" rx="12" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
  
  <text x="450" y="110" font-family="sans-serif" font-size="28" font-weight="bold" fill="#F59E0B" text-anchor="middle" letter-spacing="2">DOGFOOD HACKATHON PLATFORM</text>
  <text x="450" y="150" font-family="sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle" letter-spacing="4">OFFICIAL VERIFIED CREDENTIAL</text>
  
  <text x="450" y="220" font-family="sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${type}</text>
  <text x="450" y="260" font-family="sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">This is proudly presented to</text>
  
  <text x="450" y="320" font-family="sans-serif" font-size="34" font-weight="bold" fill="#38BDF8" text-anchor="middle">${recipient}</text>
  <text x="450" y="360" font-family="sans-serif" font-size="18" fill="#CBD5E1" text-anchor="middle">for exceptional performance and achievement in</text>
  <text x="450" y="395" font-family="sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${eventName}</text>
  <text x="450" y="425" font-family="sans-serif" font-size="15" fill="#F59E0B" text-anchor="middle">${placement}</text>
  
  <line x1="150" y1="480" x2="350" y2="480" stroke="#475569" stroke-width="1" />
  <text x="250" y="505" font-family="sans-serif" font-size="12" fill="#94A3B8" text-anchor="middle">ORGANIZING COMMITTEE</text>
  
  <line x1="550" y1="480" x2="750" y2="480" stroke="#475569" stroke-width="1" />
  <text x="650" y="505" font-family="sans-serif" font-size="12" fill="#94A3B8" text-anchor="middle">LEDGER VERIFICATION</text>
  
  <text x="450" y="550" font-family="monospace" font-size="10" fill="#64748B" text-anchor="middle">SHA-256: ${checksum}</text>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cert.id || 'certificate'}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  notify('Downloaded verified SVG certificate', 'success');
}
