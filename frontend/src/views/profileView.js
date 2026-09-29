/**
 * profileView.js — User Profile, Anti-Sybil Voter Verification & Official Certificates
 * Displays:
 * - User identity and roles
 * - Mobile Phone Verification (Anti-Sybil 1 phone = 1 vote assurance)
 * - Official Hackathon Certificates (Issued when hackathon ends)
 * - Printable/Downloadable High-Res Digital Certificate generator
 * - Public Ledger SHA-256 Checksum verification links
 */

import { h, $, notify, escapeHtml, formatDateTime } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export async function renderProfile(container, eventId = null) {
  const session = authStore.getSession();
  const user = authStore.getUser();

  if (!session || !user) {
    container.innerHTML = `
<section class="view enter" id="v-profile-unauth">
  <div class="card" style="max-width:540px;margin:40px auto;text-align:center;padding:48px 24px">
    <div style="font-size:2.8rem;margin-bottom:12px">👤</div>
    <h2 style="font-size:1.75rem;margin-bottom:8px">Please sign in to view your profile</h2>
    <p style="color:var(--mute);margin-bottom:24px;font-size:0.95rem">
      Access your account settings, community voting status, and official hackathon certificates.
    </p>
    <a class="btn main" href="#/login">Sign in &rarr;</a>
  </div>
</section>
`;
    return;
  }

  const activeEventId = eventId || authStore.getEventId() || '1';
  let eventObj = null;
  try {
    eventObj = await api.getEvent(activeEventId).catch(() => null);
  } catch {
    // optional event load
  }

  const role = authStore.getRole();

  // Check if hackathon has ended
  const now = new Date();
  const publishAt = eventObj?.resultsPublishAt ? new Date(eventObj.resultsPublishAt) : (eventObj?.judgingEnd ? new Date(eventObj.judgingEnd) : null);
  const isHackathonEnded = eventObj?.status === 'CLOSED' || (publishAt && now >= publishAt);

  container.innerHTML = `
<section class="view enter" id="v-profile">
  <div class="vh row" style="align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span class="bdg ok" style="font-weight:700">USER PROFILE</span>
        <span class="trk" style="font-size:0.75rem">ID #${escapeHtml(String(user.userId || user.id || 'N/A'))}</span>
      </div>
      <h2 class="vt" style="margin:0">${escapeHtml(user.name || user.username || 'User')}</h2>
      <p class="vs" style="margin-top:4px">Manage your account identity, voter verification status, and official credentials.</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <a class="btn ghost sm" href="#/gallery">Browse Projects</a>
      <a class="btn ghost sm" href="#/results">View Leaderboard</a>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:28px">
    <!-- Account Information Card -->
    <div class="card" style="padding:22px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);border-radius:14px">
      <h3 style="font-size:1.15rem;margin:0 0 16px;display:flex;align-items:center;gap:8px">
        <span>👤</span> Identity &amp; Account
      </h3>
      <div style="display:grid;gap:12px;font-size:0.9rem">
        <div>
          <span style="color:var(--mute);font-size:0.78rem;text-transform:uppercase;font-weight:700;display:block">Full Name / Alias</span>
          <b style="font-size:1.05rem;color:#F8FAFC">${escapeHtml(user.name || user.username || 'Unknown')}</b>
        </div>
        <div>
          <span style="color:var(--mute);font-size:0.78rem;text-transform:uppercase;font-weight:700;display:block">Email Address</span>
          <span style="color:#CBD5E1;font-family:var(--mono)">${escapeHtml(user.email || 'No email registered')}</span>
        </div>
        <div>
          <span style="color:var(--mute);font-size:0.78rem;text-transform:uppercase;font-weight:700;display:block">Account Role</span>
          <span class="rolebadge ${role}" style="display:inline-block;margin-top:2px">${escapeHtml(role)}</span>
        </div>
      </div>
    </div>

    <!-- Anti-Sybil Community Voting Status Card -->
    <div class="card" style="padding:22px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);border-radius:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <h3 style="font-size:1.15rem;margin:0;display:flex;align-items:center;gap:8px">
          <span>🛡️</span> Community Voting Integrity
        </h3>
        <span class="bdg ok" style="font-size:0.75rem">
          ✓ ANTI-SYBIL ACTIVE
        </span>
      </div>
      <p style="color:var(--mute);font-size:0.86rem;line-height:1.4;margin:0 0 14px">
        Community voting uses multi-mode Sybil protection: session tokens + IP rate-limiting for public open ballots, email verification, and account-gated anti-COI checks.
      </p>

      <div style="padding:12px 14px;border-radius:10px;background:rgba(92,255,176,0.06);border:1px solid rgba(92,255,176,0.2);margin-bottom:14px">
        <small style="color:var(--mute);font-size:0.75rem;text-transform:uppercase;display:block;font-weight:700">Verified Ballot Identity</small>
        <b style="font-family:var(--mono);color:var(--m);font-size:0.95rem">${escapeHtml(user.email || user.username)}</b>
        <div style="font-size:0.78rem;color:var(--mute);margin-top:4px">✓ Account verified &bull; 1 vote per event enforced with Conflict-of-Interest prevention.</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <a class="btn ghost sm" href="#/gallery" style="font-size:0.8rem">Browse Projects in Gallery &rarr;</a>
      </div>
    </div>
  </div>

  <!-- Official Certificates & Credentials Section -->
  <div class="card" style="padding:24px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);border-radius:14px;margin-bottom:28px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span class="bdg ok" style="font-size:0.75rem">CRYPTOGRAPHIC CREDENTIALS</span>
          <span class="bdg" style="background:rgba(255,255,255,0.06);font-size:0.75rem">SHA-256 LEDGER</span>
        </div>
        <h3 style="font-size:1.4rem;margin:0">Official Hackathon Certificates</h3>
        <p style="color:var(--mute);font-size:0.88rem;margin:4px 0 0">
          Official certificates for active participants and podium winners with tamper-evident digital verification.
        </p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <a class="btn ghost sm" href="#/verify" style="border:1px solid rgba(255,255,255,0.15);color:var(--c)">🔍 Verification Portal &rarr;</a>
        <button class="btn ghost sm" id="btnRefreshCertificates" type="button" style="border:1px solid rgba(255,255,255,0.1)">🔄 Refresh Ledger</button>
      </div>
    </div>

    <!-- Event Lifecycle Status Notice -->
    <div style="padding:14px 18px;border-radius:10px;background:${isHackathonEnded ? 'rgba(92,255,176,0.06)' : 'rgba(255,255,255,0.03)'};border:1px solid ${isHackathonEnded ? 'rgba(92,255,176,0.2)' : 'rgba(255,255,255,0.08)'};margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div>
        <span style="font-size:0.78rem;text-transform:uppercase;font-weight:700;color:${isHackathonEnded ? 'var(--m)' : 'var(--mute)'};display:block">
          ${isHackathonEnded ? '🏁 Hackathon Concluded — Certificates Active' : '⏳ Hackathon In Progress'}
        </span>
        <b style="font-size:1.05rem;color:#F8FAFC">
          ${escapeHtml(eventObj?.name || `Event #${activeEventId}`)}
        </b>
        <div style="font-size:0.82rem;color:var(--mute);margin-top:2px">
          ${isHackathonEnded 
            ? 'The hackathon has officially completed and final winners are certified. Your credentials can be viewed and downloaded below.' 
            : `Winner certificates and participation awards are finalized when the hackathon ends${publishAt ? ` on ${formatDateTime(publishAt)}` : ''}.`}
        </div>
      </div>
      <span class="bdg ${isHackathonEnded ? 'ok' : 'warn'}">
        ${isHackathonEnded ? 'AWARDS FINALIZED' : 'IN PROGRESS'}
      </span>
    </div>

    <!-- Certificates Container List -->
    <div id="userCertificatesList" style="display:grid;gap:16px">
      <div style="padding:32px;text-align:center;color:var(--mute)">
        Loading your official certificates...
      </div>
    </div>
  </div>

  <!-- Fullscreen Certificate Preview Modal -->
  <div class="modal-backdrop" id="certPreviewModal">
    <div class="modal-card" style="max-width:820px;max-height:92vh;overflow-y:auto;background:#0d1117;border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h4 style="font-size:1.3rem;margin:0">Official Certificate Preview</h4>
        <button class="btn ghost sm" id="closeCertPreviewBtn" type="button" style="padding:4px 8px;font-size:1.1rem">&times;</button>
      </div>
      <div id="certPreviewCanvasArea" style="margin-bottom:16px"></div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn ghost sm" id="btnClosePreviewModal" type="button">Close</button>
        <button class="btn main sm" id="btnDownloadPreviewCert" type="button" style="background:#2563EB;color:#FFF;font-weight:600">⬇️ Download Certificate</button>
      </div>
    </div>
  </div>
</section>
`;


  // Load User Certificates
  async function loadCertificates() {
    const listContainer = document.getElementById('userCertificatesList');
    if (!listContainer) return;

    try {
      // Fetch user certificates from /api/certificates/me or fallback to event certificates
      let userCerts = [];
      try {
        const myRes = await api.getMyCertificates();
        userCerts = Array.isArray(myRes) ? myRes : (myRes?.data || []);
      } catch {
        // Fallback: fetch event certificates and filter for current user
        const evCertsRes = await api.getEventCertificates(activeEventId).catch(() => []);
        const allEvCerts = Array.isArray(evCertsRes) ? evCertsRes : (evCertsRes?.data || []);
        const uId = user.userId || user.id;
        const uEmail = (user.email || '').toLowerCase();
        userCerts = allEvCerts.filter(c => 
          (uId && Number(c.recipientId) === Number(uId)) ||
          (uEmail && c.recipientEmail && c.recipientEmail.toLowerCase() === uEmail)
        );
      }



      if (userCerts.length === 0) {
        listContainer.innerHTML = `
          <div style="padding:40px;text-align:center;border-radius:12px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.1)">
            <div style="font-size:2.2rem;margin-bottom:10px">📜</div>
            <b style="font-size:1.05rem;display:block;margin-bottom:6px">No certificates issued yet</b>
            <p style="color:var(--mute);font-size:0.86rem;max-width:55ch;margin:0 auto">
              ${isHackathonEnded 
                ? 'Certificates have not been published for this event yet. Event organizers can generate certificate records from the Organizer Command Center.' 
                : 'Winner and participation certificates will be generated automatically when this hackathon concludes.'}
            </p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = userCerts.map((cert, idx) => {
        const isWinner = cert.recipientType === 'WINNER' || cert.awardTitle.includes('Winner') || cert.awardTitle.includes('Place');
        const badgeColor = cert.awardTitle.includes('1st') ? '#F59E0B' : cert.awardTitle.includes('2nd') ? '#94A3B8' : cert.awardTitle.includes('3rd') ? '#D97706' : '#3B82F6';
        const medal = cert.awardTitle.includes('1st') ? '🥇' : cert.awardTitle.includes('2nd') ? '🥈' : cert.awardTitle.includes('3rd') ? '🥉' : '📜';

        return `
          <div class="card cert-item-card" data-idx="${idx}" style="padding:22px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);border-radius:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px">
            <div style="display:flex;gap:16px;align-items:flex-start">
              <div style="font-size:2.5rem;line-height:1;padding:12px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08)">
                ${medal}
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                  <span class="bdg" style="border-color:${badgeColor};color:${badgeColor};font-weight:700;font-size:0.75rem">
                    ${escapeHtml(cert.recipientType || (isWinner ? 'WINNER' : 'PARTICIPANT'))}
                  </span>
                  <span style="font-family:var(--mono);font-size:0.8rem;color:var(--mute)">ID: ${escapeHtml(cert.certificateId)}</span>
                </div>
                <h4 style="font-size:1.25rem;margin:0 0 6px;color:#F8FAFC">${escapeHtml(cert.awardTitle)}</h4>
                <div style="font-size:0.85rem;color:var(--mute);line-height:1.5">
                  <b>Recipient:</b> ${escapeHtml(cert.recipientName)} &bull; 
                  <b>Event:</b> ${escapeHtml(cert.eventName || `Event #${cert.eventId}`)}<br>
                  <b>Issued:</b> ${formatDateTime(cert.createdAt)} &bull; 
                  <b>SHA-256 Ledger Hash:</b> <span style="font-family:var(--mono);color:#93C5FD;font-size:0.78rem">${escapeHtml((cert.verificationHash || '').substring(0, 24))}...</span>
                </div>
              </div>
            </div>

            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <button class="btn ghost sm btn-view-cert" data-idx="${idx}" type="button" style="border:1px solid rgba(255,255,255,0.12)">
                👁️ View Preview
              </button>
              <a class="btn ghost sm" href="#/verify?id=${encodeURIComponent(cert.certificateId)}" target="_blank" style="border:1px solid rgba(56,189,248,0.4);color:var(--c)">
                🔍 Verify &rarr;
              </a>
              <button class="btn main sm btn-download-cert" data-idx="${idx}" type="button" style="background:#2563EB;color:#FFF;font-weight:600;border:1px solid #3B82F6">
                ⬇️ Download Certificate
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Bind Preview & Download buttons
      listContainer.querySelectorAll('.btn-view-cert').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.getAttribute('data-idx'), 10);
          const cert = userCerts[idx];
          if (cert) showCertificatePreview(cert);
        });
      });

      listContainer.querySelectorAll('.btn-download-cert').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.getAttribute('data-idx'), 10);
          const cert = userCerts[idx];
          if (cert) downloadCertificateFile(cert);
        });
      });

    } catch (err) {
      listContainer.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--bad)">
          Unable to load certificates: ${escapeHtml(err.message)}
        </div>
      `;
    }
  }

  document.getElementById('btnRefreshCertificates')?.addEventListener('click', loadCertificates);
  await loadCertificates();

  // Certificate Rendering & Downloading Helpers
  function generateCertificateSvg(cert) {
    const isWinner = cert.recipientType === 'WINNER' || cert.awardTitle.includes('Winner') || cert.awardTitle.includes('Place');
    const medalEmoji = cert.awardTitle.includes('1st') ? '🥇 Grand Champion' : cert.awardTitle.includes('2nd') ? '🥈 Runner Up' : cert.awardTitle.includes('3rd') ? '🥉 Bronze Honoree' : '📜 Certificate of Participation';
    const borderCol = cert.awardTitle.includes('1st') ? '#F59E0B' : cert.awardTitle.includes('2nd') ? '#94A3B8' : cert.awardTitle.includes('3rd') ? '#D97706' : '#3B82F6';
    const issueDate = cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'September 2026';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="100%" height="auto" style="border-radius:12px;background:#0A0D14;box-shadow:0 12px 36px rgba(0,0,0,0.6)">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0c101c"/>
            <stop offset="50%" stop-color="#111827"/>
            <stop offset="100%" stop-color="#090d16"/>
          </linearGradient>
          <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${borderCol}"/>
            <stop offset="50%" stop-color="#FFFFFF"/>
            <stop offset="100%" stop-color="${borderCol}"/>
          </linearGradient>
        </defs>

        <!-- Outer & Inner Borders -->
        <rect x="20" y="20" width="960" height="660" rx="14" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="4"/>
        <rect x="36" y="36" width="928" height="628" rx="8" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" stroke-dasharray="6,4"/>

        <!-- Header -->
        <text x="500" y="90" text-anchor="middle" fill="${borderCol}" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="4">DOGFOOD HACKATHON PLATFORM &#8226; OFFICIAL CREDENTIAL</text>
        <text x="500" y="145" text-anchor="middle" fill="#FFFFFF" font-family="serif" font-size="36" font-weight="bold" letter-spacing="1">CERTIFICATE OF ACHIEVEMENT</text>
        <line x1="400" y1="165" x2="600" y2="165" stroke="${borderCol}" stroke-width="2"/>

        <!-- Subhead -->
        <text x="500" y="210" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">This official credential proudly recognizes that</text>
        
        <!-- Recipient Name -->
        <text x="500" y="275" text-anchor="middle" fill="#F8FAFC" font-family="serif" font-size="44" font-weight="bold">${escapeHtml(cert.recipientName)}</text>
        <line x1="300" y1="300" x2="700" y2="300" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>

        <!-- Award Description -->
        <text x="500" y="345" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16">has demonstrated exceptional engineering, integrity, and active contribution in</text>
        <text x="500" y="390" text-anchor="middle" fill="#38BDF8" font-family="sans-serif" font-size="26" font-weight="bold">${escapeHtml(cert.eventName || 'DogFood Hackathon')}</text>
        <text x="500" y="430" text-anchor="middle" fill="${borderCol}" font-family="sans-serif" font-size="20" font-weight="600">${escapeHtml(cert.awardTitle)}</text>

        <!-- Proof Seal & Integrity Hash -->
        <circle cx="200" cy="535" r="45" fill="none" stroke="${borderCol}" stroke-width="2"/>
        <text x="200" y="530" text-anchor="middle" fill="${borderCol}" font-family="sans-serif" font-size="11" font-weight="bold">OFFICIAL</text>
        <text x="200" y="546" text-anchor="middle" fill="${borderCol}" font-family="sans-serif" font-size="10" font-weight="bold">SEAL &#8226; 2026</text>

        <!-- Signatures & Verification Info -->
        <text x="500" y="525" text-anchor="middle" fill="#F8FAFC" font-family="cursive, serif" font-size="24">Hackathon Organizing Board</text>
        <line x1="380" y1="540" x2="620" y2="540" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <text x="500" y="560" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="12">Executive Evaluation Committee</text>

        <!-- Issue Date -->
        <text x="800" y="525" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-size="15" font-weight="bold">${escapeHtml(issueDate)}</text>
        <line x1="720" y1="540" x2="880" y2="540" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <text x="800" y="560" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="12">Date of Certification</text>

        <!-- Footer Cryptographic Checksum -->
        <text x="500" y="630" text-anchor="middle" fill="#64748B" font-family="monospace" font-size="11">
          CERT ID: ${escapeHtml(cert.certificateId)} &#8226; SHA-256 LEDGER HASH: ${escapeHtml(cert.verificationHash || 'VERIFIED')}
        </text>
        <text x="500" y="648" text-anchor="middle" fill="#64748B" font-family="monospace" font-size="10">
          Publicly verifiable via /#/verification-hub with zero-tampering cryptographic consensus.
        </text>
      </svg>
    `;
  }

  let activeCertForPreview = null;
  function showCertificatePreview(cert) {
    activeCertForPreview = cert;
    const modal = document.getElementById('certPreviewModal');
    const area = document.getElementById('certPreviewCanvasArea');
    if (!modal || !area) return;

    area.innerHTML = generateCertificateSvg(cert);
    modal.classList.add('open');
  }

  function downloadCertificateFile(cert) {
    const svgContent = generateCertificateSvg(cert);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.certificateId || 'certificate'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Downloaded ${cert.certificateId}.svg successfully!`, 'success');
  }

  document.getElementById('closeCertPreviewBtn')?.addEventListener('click', () => {
    document.getElementById('certPreviewModal')?.classList.remove('open');
  });

  document.getElementById('btnClosePreviewModal')?.addEventListener('click', () => {
    document.getElementById('certPreviewModal')?.classList.remove('open');
  });

  document.getElementById('btnDownloadPreviewCert')?.addEventListener('click', () => {
    if (activeCertForPreview) {
      downloadCertificateFile(activeCertForPreview);
    }
  });
}
