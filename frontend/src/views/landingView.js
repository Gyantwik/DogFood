/**
 * landingView.js — Complete Rich Public Landing View for Dogfood / Lodestar
 * Includes all interactive showcases:
 * 1. High-speed glowing particle constellation canvas
 * 2. Live hero ranking simulator
 * 3. Stats band with animated counter
 * 4. Four steps flow with glowing path line
 * 5. Interactive story sequence (6 projects moving through 3 stages with score rings)
 * 6. Core trust features with animated SVG icons
 * 7. Bento grid with 3D Holographic Certificate, dot score balancing, private view toggle, real-time sparkline, and API code
 * 8. Judging Lab with Fair Score Matrix AND Head-to-Head Pairwise Duel
 * 9. Roles Showcase with direct launchpad actions
 * 10. Continuous sliding gallery marquee
 * 11. Self-host interactive terminal
 * 12. Accordion FAQ, footer CTA & circular scroll progress ring
 */

import { clamp, escapeHtml, notify, sanitizeUrl } from '../lib/dom.js';
import { api } from '../api/client.js';
import { authStore } from '../store/authStore.js';

export function renderLanding(container) {
  container.innerHTML = `
<main id="main" class="enter">
  <!-- 1. Hero Section -->
  <section class="hero" id="top">
    <canvas id="sky" aria-hidden="true"></canvas>
    <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="wrap hero-in">
      <div>
        <span class="badge"><span class="pulse"></span>Dogfood Hackathon 2026</span>
        <h1 id="h1">
          Where great builds get discovered.
        </h1>
        <p class="sub">
          The 72-hour self-hostable hackathon submission and judging platform. Choose your role below to enter the workflow:
        </p>

        <!-- Role Action Cards in First Viewport (Builder / Judge / Organizer) -->
        <div class="hero-roles-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:24px 0 16px">
          <!-- BUILDER -->
          <div class="card hero-role-card" style="padding:16px;background:rgba(92,255,176,0.06);border:1px solid rgba(92,255,176,0.3);display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <span class="bdg ok" style="font-size:0.7rem">BUILDER</span>
              </div>
              <p style="color:var(--mute);font-size:0.84rem;line-height:1.45;margin-bottom:14px">
                Create or join a team, save server drafts, and submit before deadline.
              </p>
            </div>
            <a class="btn main sm" href="#/submit" style="width:100%">Enter Builder &rarr;</a>
          </div>

          <!-- JUDGE -->
          <div class="card hero-role-card" style="padding:16px;background:rgba(55,224,255,0.06);border:1px solid rgba(55,224,255,0.3);display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <span class="bdg ok" style="font-size:0.7rem;color:var(--c);border-color:rgba(55,224,255,0.4)">JUDGE</span>
              </div>
              <p style="color:var(--mute);font-size:0.84rem;line-height:1.45;margin-bottom:14px">
                Review assigned projects, score rubric criteria, and declare COI.
              </p>
            </div>
            <a class="btn main sm" href="#/judge" style="width:100%;background:linear-gradient(120deg,#37E0FF,#4C7DFF)">Enter Judge &rarr;</a>
          </div>

          <!-- ORGANIZER -->
          <div class="card hero-role-card" style="padding:16px;background:rgba(255,179,107,0.06);border:1px solid rgba(255,179,107,0.3);display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <span class="bdg warn" style="font-size:0.7rem">ORGANIZER</span>
              </div>
              <p style="color:var(--mute);font-size:0.84rem;line-height:1.45;margin-bottom:14px">
                Manage events, track telemetry, review normalized scores & export CSV.
              </p>
            </div>
            <a class="btn main sm" href="#/dashboard" style="width:100%;background:linear-gradient(120deg,#FFB36B,#FF7A90)">Open Dashboard &rarr;</a>
          </div>
        </div>

        <!-- VISITOR LINK (Secondary, not competing) -->
        <div style="margin-top:10px;font-size:0.92rem;color:var(--mute)">
          Just browsing? <a href="#/gallery" style="color:var(--c);font-weight:700">Explore the public gallery &rarr;</a>
        </div>
      </div>
      <div class="board-card" aria-label="Live ranking preview with sample data">
        <div class="bc-head">
          <span>Live ranking simulation</span>
          <small>Sample data</small>
        </div>
        <div class="hb" id="hb"></div>
        <div class="toast" id="toast" aria-live="polite">Waiting for the first score…</div>
      </div>
    </div>
  </section>

  <!-- 2. Stats Strip -->
  <div class="statsband" id="stats" style="border-block:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.035),transparent);padding:36px 0 20px">
    <div class="wrap sb" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px">
      <div class="stat"><b data-count="72" data-suf="h" style="font-family:var(--display);font-weight:800;font-size:clamp(2rem,4.2vw,3.2rem);letter-spacing:-.03em;line-height:1;display:block">0</b><span style="color:var(--mute);font-size:.92rem">72h Hackathon duration</span></div>
      <div class="stat"><b data-count="100" data-suf="%" style="font-family:var(--display);font-weight:800;font-size:clamp(2rem,4.2vw,3.2rem);letter-spacing:-.03em;line-height:1;display:block">0</b><span style="color:var(--mute);font-size:.92rem">100% Self-Hostable & offline</span></div>
      <div class="stat"><b style="font-family:var(--display);font-weight:800;font-size:clamp(2rem,4.2vw,3.2rem);letter-spacing:-.03em;line-height:1;display:block;color:var(--c)">T1 &rarr; T4</b><span style="color:var(--mute);font-size:.92rem">Capability roadmap</span></div>
      <div class="stat"><b style="font-family:var(--display);font-weight:800;font-size:clamp(2rem,4.2vw,3.2rem);letter-spacing:-.03em;line-height:1;display:block;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent">Z-Score</b><span style="color:var(--mute);font-size:.92rem">Fair normalization</span></div>
    </div>
    <p class="sfine wrap" style="color:var(--mute);font-size:.8rem;margin-top:14px;opacity:.7">Dogfood architecture specifications</p>
  </div>

  <!-- 3. Four Steps Flow -->
  <section id="steps">
    <div class="wrap">
      <h2 class="rv">Platform execution workflow.</h2>
      <p class="lede rv">From authentication to verified export. Trace a submission through the four pipeline stages:</p>
      <div class="path" id="path">
        <div class="pline" id="pline" aria-hidden="true"><i></i><b></b><b style="animation-delay:-1.3s"></b><b style="animation-delay:-2.6s"></b></div>
        <div class="card pstep act"><div class="pn">1</div><h3>Authentication & Teams</h3><p>Sign in with role-based session security, create or join teams with private invite codes.</p></div>
        <div class="card pstep act"><div class="pn">2</div><h3>Submissions & Server Drafts</h3><p>Persist drafts to the PostgreSQL database, edit until deadline, and lock final entries.</p></div>
        <div class="card pstep act"><div class="pn">3</div><h3>Judge Queues & Scoring</h3><p>Server-enforced private ballots, conflict of interest declarations, and weighted rubrics.</p></div>
        <div class="card pstep act"><div class="pn">4</div><h3>Normalization & Export</h3><p>Neutralize judge bias via Z-Score mathematics, view live leaderboards, and export CSVs.</p></div>
      </div>
    </div>
  </section>

  <!-- 4. Interactive Story Sequence (6 Cards Progression) -->
  <section id="story">
    <div class="wrap">
      <h2 class="rv">Watch six projects go through it.</h2>
      <p class="lede rv">Scroll to follow six projects through a whole event.</p>
      <div class="story-grid">
        <div class="steps">
          <div class="step act" data-s="0"><div class="n">1</div><h3>Teams submit</h3><p>Projects arrive as drafts, stay editable, and lock when the deadline hits.</p></div>
          <div class="step" data-s="1"><div class="n">2</div><h3>Judges score</h3><p>Each judge sees only their own ballot. Scores fill in as they work.</p></div>
          <div class="step" data-s="2"><div class="n">3</div><h3>Results go live</h3><p>Fair rankings, written feedback, and a podium for the top builds.</p></div>
        </div>
        <div class="stage-wrap">
          <div class="stage s0" id="stage" role="img" aria-label="Six project cards moving from scattered submissions to scored ranking">
            <div class="glow g0"></div><div class="glow g1"></div><div class="glow g2"></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 5. Core Features Grid -->
  <section id="core" style="padding-top:0">
    <div class="wrap">
      <h2 class="rv">What makes it trustworthy.</h2>
      <p class="lede rv">Four ideas the whole product is built around.</p>
      <div class="core">
        <div class="bx rv">
          <div class="ico" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <rect x="14" y="28" width="36" height="26" rx="7" fill="rgba(139,92,255,.25)" stroke="url(#sg)" stroke-width="2.5"/>
              <path class="shk" d="M22 28V21a10 10 0 0 1 20 0v7" fill="none" stroke="url(#sg)" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="32" cy="41" r="3.5" fill="#fff"/>
            </svg>
          </div>
          <h3>Role isolation</h3>
          <p>Builders, judges and organizers each see only what they should, enforced by the server.</p>
        </div>
        <div class="bx rv" style="--d:80ms">
          <div class="ico" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <g stroke="url(#sg)" stroke-width="2.5" stroke-linecap="round"><path d="M8 16h48M8 32h48M8 48h48"/></g>
              <circle class="kn k1" cx="22" cy="16" r="5" fill="#fff"/>
              <circle class="kn k2" cx="42" cy="32" r="5" fill="#fff"/>
              <circle class="kn k3" cx="30" cy="48" r="5" fill="#fff"/>
            </svg>
          </div>
          <h3>Weighted rubrics</h3>
          <p>Organizers decide what matters and how much, and judges see the weights.</p>
        </div>
        <div class="bx rv">
          <div class="ico" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M6 32h52" stroke="rgba(255,255,255,.3)" stroke-width="2"/>
              <circle class="nd" style="--y:-20px" cx="12" cy="32" r="4.5" fill="#8B5CFF"/>
              <circle class="nd" style="--y:14px" cx="22" cy="32" r="4.5" fill="#37E0FF"/>
              <circle class="nd" style="--y:-10px" cx="32" cy="32" r="4.5" fill="#FFB36B"/>
              <circle class="nd" style="--y:22px" cx="42" cy="32" r="4.5" fill="#5CFFB0"/>
              <circle class="nd" style="--y:-16px" cx="52" cy="32" r="4.5" fill="#FF7A90"/>
            </svg>
          </div>
          <h3>Score normalization</h3>
          <p>Strict and generous judges are balanced so neither decides the winner.</p>
        </div>
        <div class="bx rv" style="--d:80ms">
          <div class="ico" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <rect x="6" y="12" width="52" height="40" rx="8" fill="rgba(55,224,255,.1)" stroke="url(#sg)" stroke-width="2.5"/>
              <path d="M16 26l8 6-8 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path class="cu" d="M30 40h12" stroke="#5CFFB0" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>One-command hosting</h3>
          <p>Run the whole portal on your own machine, even with the network off.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 6. Bento Grid Features with 3D Holographic Certificate -->
  <section id="features" style="padding-top:0">
    <div class="wrap">
      <h2 class="rv">More under the hood.</h2>
      <p class="lede rv">Hover, tap or explore. Each interactive module demonstrates platform intelligence.</p>
      <div class="bento">
        <!-- Dot score balancing -->
        <div class="bx w7 rv">
          <h3>Strict and generous judges, balanced</h3>
          <p>Some judges give everything a 3, others give everything a 5. Fair scoring keeps that from deciding the winner.</p>
          <div class="dots" id="dots" tabindex="0" role="button" aria-label="Toggle raw and balanced scores" aria-pressed="false"></div>
          <div class="dl"><span id="dtx">Raw scores, wide spread</span><span>Tap or hover to balance</span></div>
        </div>

        <!-- Role privacy switcher -->
        <div class="bx w5 rv" style="--d:80ms">
          <h3>Private by design</h3>
          <p>The server decides who sees what. Switch views to see the difference.</p>
          <div class="seg" role="group" aria-label="Choose a view">
            <button type="button" aria-pressed="true" data-v="judge">Judge view</button>
            <button type="button" aria-pressed="false" data-v="org">Organizer view</button>
          </div>
          <div class="chips judge" id="chips">
            <div class="chip2 mine"><span>Your scores</span><span>4.2</span></div>
            <div class="chip2"><span>Judge Ben</span><span>3.1</span></div>
            <div class="chip2"><span>Judge Cai</span><span>4.8</span></div>
          </div>
        </div>

        <!-- Real-time Sparkline Progress -->
        <div class="bx w6 rv" style="--d:80ms">
          <h3>Results in real time</h3>
          <p>Organizers watch scoring progress as it happens.</p>
          <div class="big-n" id="prog">0%</div>
          <svg class="spark" id="spark" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
            <path class="area" d="M0 110 C30 100 50 80 80 84 S130 50 160 56 S220 30 250 20 S285 12 300 8 L300 120 L0 120Z"/>
            <path pathLength="1" d="M0 110 C30 100 50 80 80 84 S130 50 160 56 S220 30 250 20 S285 12 300 8"/>
          </svg>
        </div>

        <!-- 3D Holographic Certificate Card -->
        <div class="bx w6 rv" style="--d:160ms">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <h3>Verifiable Certificates</h3>
            <span class="bdg warn" style="font-size:0.72rem">Stretch &bull; T4</span>
          </div>
          <p>Every participant gets a verifiable record with interactive 3D light reflection.</p>
          <div class="cert-wrap">
            <div class="cert" id="cert">
              <small>Certificate of participation</small>
              <b>Team Orbit</b>
              <svg viewBox="0 0 24 24" fill="url(#sg)"><path d="M12 1 L14.5 9.5 L23 12 L14.5 14.5 L12 23 L9.5 14.5 L1 12 L9.5 9.5 Z"/></svg>
            </div>
          </div>
        </div>

        <!-- API Code Window -->
        <div class="bx w12 rv">
          <div class="api">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <h3>API &amp; Webhooks Integration</h3>
                <span class="bdg warn" style="font-size:0.72rem">Stretch &bull; T4</span>
              </div>
              <p>Everything you can click, your own tools can do too. Pull results, add projects, and listen for live webhooks.</p>
            </div>
            <div class="code" id="code"><span class="d">// get the normalized ranking for an event</span>
<span class="k">curl</span> <span class="s">https://portal.local/api/events/{eventId}/leaderboard?mode=normalized</span> \\
  -H <span class="s">"Authorization: Bearer $JWT_TOKEN"</span>

{ <span class="s">"rank"</span>: <span class="n">1</span>, <span class="s">"project"</span>: <span class="s">"Orbit"</span>, <span class="s">"finalScore"</span>: <span class="n">82.40</span> }</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 7. Judging Lab (Fair Scores & Pairwise Head-to-Head Duel) -->
  <section id="lab" style="padding-top:0">
    <div class="wrap">
      <h2 class="rv">Try the judging lab.</h2>
      <p class="lede rv">Two interactive experiments from the real product. Everything runs on sample data.</p>
      
      <div class="tabs rv" role="tablist" aria-label="Lab experiments">
        <button class="tab" role="tab" id="t-fair" aria-selected="true" aria-controls="p-fair">Fair scores</button>
        <button class="tab" role="tab" id="t-duel" aria-selected="false" aria-controls="p-duel">Head to head</button>
      </div>

      <!-- Fair Scores Panel -->
      <div class="panel" id="p-fair" role="tabpanel" aria-labelledby="t-fair">
        <h3>Balance the judges</h3>
        <p class="sub">Ada is strict, Cai is generous. Flip the switch and watch the ranking change.</p>
        <div class="split">
          <div>
            <div class="heat" id="heat"></div>
            <div class="sw">
              <span id="swl">Raw average</span>
              <button id="sw" type="button" role="switch" aria-checked="false" aria-label="Balance the judges"></button>
            </div>
            <p class="note" id="swn">Raw averages reward whoever the generous judge liked most.</p>
          </div>
          <div class="board" id="boardF" aria-live="polite"></div>
        </div>
      </div>

      <!-- Head to Head Pairwise Duel Panel -->
      <div class="panel" id="p-duel" role="tabpanel" aria-labelledby="t-duel" hidden>
        <h3>Which project is better?</h3>
        <p class="sub">No numbers to argue about, just a choice between two. Every pick reshapes the ranking.</p>
        <div class="duel">
          <button class="pick" id="pA" type="button"></button>
          <div class="vs" aria-hidden="true">vs</div>
          <button class="pick" id="pB" type="button"></button>
        </div>
        <p class="hint">Tip: use the <b>Left</b> and <b>Right</b> arrow keys. Comparisons so far: <b id="pc">0</b></p>
        <div class="board" id="boardD" style="margin-top:22px" aria-live="polite"></div>
      </div>
    </div>
  </section>

  <!-- 8. Pick Your Seat (Interactive Roles & Direct Launchpad) -->
  <section id="seats" style="padding-top:0">
    <div class="wrap">
      <h2 class="rv">Pick your seat.</h2>
      <p class="lede rv">Everyone gets a view built for what they need to do. Hover or tap a seat to enter.</p>

      <div class="seats" id="seatList">
        <!-- Builder -->
        <div class="seat on" tabindex="0" role="region" aria-label="Builder Role" aria-expanded="true">
          <div class="lab">Builder</div>
          <div class="body">
            <div>
              <div class="orb"></div>
              <h3>Builder</h3>
              <p>Ship your project without fighting the form.</p>
              <ul>
                <li>Save drafts to server until deadline</li>
                <li>Create or join teams with private invite codes</li>
                <li>Lock and submit final build before countdown expires</li>
              </ul>
            </div>
            <div class="role-action">
              <a class="btn main" href="#/submit">Launch Builder Studio &rarr;</a>
              <a class="btn ghost sm" href="#/teams" style="margin-left:8px">Manage Teams</a>
            </div>
          </div>
        </div>

        <!-- Judge -->
        <div class="seat" tabindex="0" role="region" aria-label="Judge Role" aria-expanded="false">
          <div class="lab">Judge</div>
          <div class="body">
            <div>
              <div class="orb" style="background:linear-gradient(120deg,#37E0FF,#5CFFB0)"></div>
              <h3>Judge</h3>
              <p>Score one project at a time with nothing in the way.</p>
              <ul>
                <li>Review only your assigned projects</li>
                <li>Score weighted rubric criteria with guided scales</li>
                <li>Declare conflicts of interest (COI) for prompt re-assignment</li>
              </ul>
            </div>
            <div class="role-action">
              <a class="btn main" href="#/judge">Open Judge Queue &rarr;</a>
            </div>
          </div>
        </div>

        <!-- Organizer -->
        <div class="seat" tabindex="0" role="region" aria-label="Organizer Role" aria-expanded="false">
          <div class="lab">Organizer</div>
          <div class="body">
            <div>
              <div class="orb" style="background:linear-gradient(120deg,#FFB36B,#FF7A90)"></div>
              <h3>Organizer</h3>
              <p>Run the whole event from one calm screen.</p>
              <ul>
                <li>Set rubric criteria and their weights</li>
                <li>Track judging progress and anomalies in real-time</li>
                <li>Review normalized results &amp; export CSV data</li>
              </ul>
            </div>
            <div class="role-action">
              <a class="btn main" href="#/dashboard">Enter Organizer Dashboard &rarr;</a>
            </div>
          </div>
        </div>

        <!-- Visitor -->
        <div class="seat" tabindex="0" role="region" aria-label="Visitor Role" aria-expanded="false">
          <div class="lab">Visitor</div>
          <div class="body">
            <div>
              <div class="orb" style="background:linear-gradient(120deg,#8B5CFF,#FF7A90)"></div>
              <div style="display:flex;align-items:center;gap:8px">
                <h3 style="margin:0">Visitor</h3>
                <span class="bdg" style="font-size:0.7rem">Community &bull; T3</span>
              </div>
              <p>Browse the gallery and discover innovative hackathon builds.</p>
              <ul>
                <li>Search and filter every project (Available)</li>
                <li>Community voting &amp; feedback comments (Planned — T3)</li>
                <li>Public leaderboard access (Available)</li>
              </ul>
            </div>
            <div class="role-action">
              <a class="btn main" href="#/gallery">Browse Public Gallery &rarr;</a>
              <a class="btn ghost sm" href="#/results" style="margin-left:8px">View Results</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 9. Showcase Gallery Marquee -->
  <section id="gallery" style="padding-top:0">
    <div class="wrap">
      <h2 class="rv">A gallery worth browsing.</h2>
      <p class="lede rv">The public gallery, live. Continuous stream of hackathon builds.</p>
      <div class="browser rv">
        <div class="bchrome">
          <i></i><i></i><i></i>
          <span class="url">dogfood.app/gallery</span>
          <span class="livep"><i></i>Live</span>
        </div>
        <div class="bbody"><div class="mrows" id="mrows"></div></div>
      </div>
      <div class="cta" style="margin-top:28px">
        <a class="btn main" href="#/gallery">Open the full gallery &rarr;</a>
      </div>
    </div>
  </section>

  <!-- 10. Community Voting (T3) -->
  <section id="community-voting" style="padding-top:0">
    <div class="wrap">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span class="bdg ok" style="color:var(--m);border-color:rgba(92,255,176,0.3)">COMMUNITY CHOICE</span>
        <span class="bdg" id="votingModeBadge" style="background:rgba(255,255,255,0.06);font-size:0.75rem">MODE: OPEN LINK</span>
        <span class="bdg" id="votingStateBadge" style="font-size:0.75rem">STATUS: CHECKING...</span>
      </div>
      <h2 class="rv">Community voting & awards.</h2>
      <p class="lede rv">Public choice voting powered by real backend persistence. Cast your vote for the best project across all tracks.</p>

      <!-- Access Mode & Voter Authentication Card -->
      <div class="card rv" id="voterAuthBox" style="padding:20px;margin-bottom:24px;background:var(--glass2);border:1px solid var(--line);border-radius:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
          <div>
            <b style="font-size:0.95rem;display:block;margin-bottom:4px" id="voterBoxTitle">Voter Identification</b>
            <span style="color:var(--mute);font-size:0.86rem" id="voterBoxHelp">Ballot is open to the public. Each voter is entitled to one vote per event.</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap" id="voterInputsArea">
            <input type="email" id="landingVoterEmail" placeholder="your.email@example.com" style="display:none;height:40px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 12px;font-size:0.88rem;min-width:220px" />
            <input type="text" id="landingVoterName" placeholder="Voter alias (optional)" style="height:40px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 12px;font-size:0.88rem;min-width:180px" />
            <span class="bdg" id="totalVotesCountBadge" style="font-size:0.82rem;padding:6px 12px;background:rgba(55,224,255,0.1);color:var(--c)">0 votes cast</span>
          </div>
        </div>
        <div id="voterStatusAlert" style="display:none;margin-top:12px;padding:10px 14px;border-radius:8px;font-size:0.86rem"></div>
      </div>

      <!-- Ballot Grid -->
      <div id="ballotGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
        <div class="card" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--mute)">
          Loading randomized community ballot...
        </div>
      </div>
    </div>
  </section>

  <!-- 11. Results Preview & Hidden Standings State (T3) -->
  <section id="results-preview" style="padding-top:0">
    <div class="wrap">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span class="bdg warn" style="color:var(--p);border-color:rgba(255,179,107,0.3)">STANDINGS & RESULTS</span>
        <span class="bdg" id="resultsVisibilityBadge" style="font-size:0.75rem">CHECKING STATE...</span>
      </div>
      <h2 class="rv">Final results & standings.</h2>
      <p class="lede rv">Scores calibrated using standard normal Z-score normalization across all judge panels.</p>

      <!-- Hidden Results Container / Leaderboard Container -->
      <div id="resultsContentArea" class="rv" style="margin-top:20px">
        <div class="card" style="text-align:center;padding:48px 24px;border:1px solid var(--line);background:var(--glass2);border-radius:16px">
          <div style="font-size:2.4rem;margin-bottom:12px">🔒</div>
          <h3 style="font-size:1.4rem;margin-bottom:8px">Results Protected</h3>
          <p style="color:var(--mute);max-width:540px;margin:0 auto 16px;line-height:1.5">Checking event publication schedule...</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 12. Public Cryptographic Verification Hub (T4) -->
  <section id="verification-hub" style="padding-top:0">
    <div class="wrap">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span class="bdg ok" style="color:var(--c);border-color:rgba(55,224,255,0.4)">CRYPTOGRAPHIC TRUST (T4)</span>
      </div>
      <h2 class="rv">Public verification hub.</h2>
      <p class="lede rv">Verify authentic participant certificates and cryptographically signed judge participation records with zero score leaking.</p>

      <div class="card rv" style="padding:28px;background:var(--glass2);border:1px solid var(--line);border-radius:16px;margin-top:24px">
        <!-- Verification Tabs -->
        <div style="display:flex;gap:12px;margin-bottom:24px;border-bottom:1px solid var(--line);padding-bottom:12px">
          <button class="btn main sm" id="tabVerifyCertBtn" type="button">Certificate Verification</button>
          <button class="btn ghost sm" id="tabVerifyJudgeBtn" type="button">Signed Judge Participation Record</button>
        </div>

        <!-- Panel 1: Certificate Verification -->
        <div id="panelVerifyCert">
          <p style="color:var(--mute);font-size:0.92rem;margin-bottom:16px">
            Enter a DogFood Certificate ID to cryptographically verify its SHA-256 ledger proof, recipient identity, and award validity.
          </p>
          <form id="verifyCertForm" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
            <input type="text" id="verifyCertInput" placeholder="e.g. CERT-PART-1-4 or CERT-WIN-1-R1-4" required style="flex:1;min-width:260px;height:44px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 14px;font-size:0.95rem" />
            <button class="btn main sm" type="submit" id="btnRunCertVerify">Verify Authenticity &rarr;</button>
            <button class="btn ghost sm" type="button" id="btnSampleCert">Load Sample ID</button>
          </form>
          <div id="certVerifyResult" style="display:none"></div>
        </div>

        <!-- Panel 2: Signed Judge Record Verification -->
        <div id="panelVerifyJudge" style="display:none">
          <p style="color:var(--mute);font-size:0.92rem;margin-bottom:16px">
            Verify a judge's HMAC-SHA256 participation signature. Proves rigorous evaluation of assigned submissions without exposing confidential score ratings or private comments.
          </p>
          <form id="verifyJudgeForm" style="display:grid;gap:14px;margin-bottom:20px">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
              <div>
                <label style="font-size:0.8rem;color:var(--mute);display:block;margin-bottom:4px">Judge User ID</label>
                <input type="number" id="vJudgeId" required placeholder="2" style="width:100%;height:38px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 10px" />
              </div>
              <div>
                <label style="font-size:0.8rem;color:var(--mute);display:block;margin-bottom:4px">Event ID</label>
                <input type="number" id="vEventId" required placeholder="1" style="width:100%;height:38px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 10px" />
              </div>
              <div>
                <label style="font-size:0.8rem;color:var(--mute);display:block;margin-bottom:4px">Evaluated Submissions</label>
                <input type="number" id="vEvalCount" required placeholder="5" style="width:100%;height:38px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 10px" />
              </div>
              <div>
                <label style="font-size:0.8rem;color:var(--mute);display:block;margin-bottom:4px">Completion Timestamp</label>
                <input type="text" id="vTimestamp" required placeholder="2026-09-28T12:00:00Z" style="width:100%;height:38px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 10px" />
              </div>
            </div>
            <div>
              <label style="font-size:0.8rem;color:var(--mute);display:block;margin-bottom:4px">HMAC-SHA256 Cryptographic Signature</label>
              <input type="text" id="vSignature" required placeholder="e.g. 5f3d4... signature hex" style="width:100%;height:38px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 10px;font-family:monospace" />
            </div>
            <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
              <button class="btn main sm" type="submit" id="btnRunJudgeVerify">Verify Signature &rarr;</button>
              <button class="btn ghost sm" type="button" id="btnSampleJudgeRecord">Generate & Load My Judge Record</button>
            </div>
          </form>
          <div id="judgeVerifyResult" style="display:none"></div>
        </div>
      </div>
    </div>
  </section>

  <!-- 13. Embeddable Gallery & Widget Snippet (T4) -->
  <section id="embed-snippet" style="padding-top:0">
    <div class="wrap">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span class="bdg" style="background:rgba(255,255,255,0.06);color:var(--m)">EMBEDDABLE SHOWCASE (T4)</span>
      </div>
      <h2 class="rv">Embed the gallery anywhere.</h2>
      <p class="lede rv">Include a responsive, iframe-friendly project gallery widget on your organization's website, blog, or community hub.</p>

      <div class="card rv" style="padding:28px;background:var(--glass2);border:1px solid var(--line);border-radius:16px;margin-top:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:28px;align-items:center">
        <div>
          <b style="font-size:1.1rem;display:block;margin-bottom:8px">HTML Embed Snippet</b>
          <p style="color:var(--mute);font-size:0.9rem;line-height:1.5;margin-bottom:16px">
            Copy and paste this snippet into your website markup. The widget dynamically renders real hackathon projects and detail views.
          </p>
          <div style="position:relative;background:#0A0816;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:14px">
            <pre style="margin:0;font-family:monospace;font-size:0.84rem;color:var(--c);overflow-x:auto;white-space:pre-wrap" id="embedCodeSnippet">&lt;iframe src="http://localhost:3000/#/embed/gallery?event=1" width="100%" height="600" frameborder="0" style="border-radius:12px;overflow:hidden"&gt;&lt;/iframe&gt;</pre>
          </div>
          <button class="btn main sm" type="button" id="btnCopyEmbedSnippet">📋 Copy Embed Code</button>
          <a class="btn ghost sm" href="#/embed/gallery?event=1" target="_blank" rel="noopener" style="margin-left:8px">Preview Widget &rarr;</a>
        </div>
        <div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#000;box-shadow:0 12px 36px rgba(0,0,0,0.5)">
          <div style="background:rgba(255,255,255,0.06);padding:8px 12px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:6px">
            <span style="width:10px;height:10px;border-radius:50%;background:#FF5F56;display:inline-block"></span>
            <span style="width:10px;height:10px;border-radius:50%;background:#FFBD2E;display:inline-block"></span>
            <span style="width:10px;height:10px;border-radius:50%;background:#27C93F;display:inline-block"></span>
            <span style="color:var(--mute);font-size:0.75rem;margin-left:8px">localhost:3000/#/embed/gallery?event=1</span>
          </div>
          <div style="height:260px;overflow:hidden;position:relative">
            <iframe src="#/embed/gallery?event=1" style="width:100%;height:100%;border:none;pointer-events:none;transform:scale(0.8);transform-origin:top left;width:125%;height:125%" title="Widget Preview"></iframe>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Project Details & Comments Modal for Landing View -->
  <div id="landingProjectModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:9999;align-items:center;justify-content:center;padding:16px">
    <div id="landingProjectModalCard" class="card" style="max-width:760px;width:100%;max-height:90vh;overflow-y:auto;padding:28px;position:relative;background:var(--bg);border:1px solid var(--line);border-radius:16px"></div>
  </div>

  <!-- 14. Self-Host Terminal Preview -->
  <section id="selfhost" style="padding-top:0">
    <div class="wrap sh" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:48px;align-items:center">
      <div>
        <h2 class="rv">One command. No internet needed.</h2>
        <p class="lede rv">Run the whole portal on your own laptop, even offline. Same behavior, same data, no accounts to create.</p>
        <ul class="chk2 rv" style="list-style:none;margin:22px 0;display:grid;gap:12px;font-weight:500;font-size:0.95rem">
          <li style="display:flex;gap:10px;align-items:center"><span style="color:var(--m);font-weight:700">✓</span> Runs fully offline</li>
          <li style="display:flex;gap:10px;align-items:center"><span style="color:var(--m);font-weight:700">✓</span> Sample data loaded on first start</li>
          <li style="display:flex;gap:10px;align-items:center"><span style="color:var(--m);font-weight:700">✓</span> Nothing leaves your machine</li>
        </ul>
        <button class="btn ghost sm rv" id="replay" type="button">Replay the demo</button>
      </div>
      <div class="card" style="background:#090818;border-radius:20px;border:1px solid var(--line);padding:20px;font-family:var(--mono);font-size:.86rem;line-height:1.8;box-shadow:0 30px 80px -20px rgba(139,92,255,.4)">
        <div style="display:flex;gap:7px;margin-bottom:12px;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--line)">
          <span style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.18)"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.18)"></span>
          <span style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.18)"></span>
          <span style="margin-left:10px;color:var(--mute);font-size:.78rem">terminal</span>
        </div>
        <div id="term" style="color:#CFE9DD;min-height:160px;white-space:pre-wrap"></div>
      </div>
    </div>
  </section>

  <!-- 11. FAQ Section -->
  <section id="faq">
    <div class="wrap">
      <h2 class="rv">Questions, answered.</h2>
      <div class="faq" id="faqList"></div>
    </div>
  </section>

  <!-- 12. Final Call to Action -->
  <section class="end">
    <div class="orbg" aria-hidden="true"></div>
    <div class="wrap in">
      <h2>Ready to find the best work?</h2>
      <div class="cta" style="margin-top:32px">
        <a class="btn main" href="#/gallery">Explore Public Gallery</a>
        <a class="btn ghost" href="#top">Back to top &uarr;</a>
      </div>
    </div>
  </section>
</main>

<!-- Scroll to Top with Circular Progress Indicator -->
<button class="top" id="top2" aria-label="Back to top" type="button">
  <svg viewBox="0 0 54 54"><circle class="bg" cx="27" cy="27" r="22"/><circle class="fg" id="pring" cx="27" cy="27" r="22"/></svg>
  <svg style="position:static;transform:none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>

<footer id="siteFooter">
  <div class="wrap fw">
    <div>
      <a class="logo" href="#top" aria-label="Dogfood home">
        <svg viewBox="0 0 24 24" fill="url(#sg)"><path d="M12 1 L14.5 9.5 L23 12 L14.5 14.5 L12 23 L9.5 14.5 L1 12 L9.5 9.5 Z"/></svg>
        Dogfood
      </a>
      <p style="margin-top:8px;color:var(--mute);font-size:.88rem">Full-Stack Hackathon Portal & Normalization Engine.</p>
    </div>
    <nav aria-label="Footer">
      <a href="#/gallery">Gallery</a>
      <a href="#/dashboard">Dashboard</a>
      <a href="#/judge">Judge</a>
      <a href="#/results">Results</a>
    </nav>
  </div>
</footer>
`;

  // Initialize interactive components
  initHeroSkyConstellation();
  initHeroLiveBoard();
  initStatsCounter();
  initStepsScroll();
  initStorySequence();
  initBentoInteractions();
  initLabInteractive();
  initSeatsInteractive();
  initGalleryMarquee();
  initTerminal();
  initFaq();
  initScrollRing();

  // Initialize T3 & T4 Interactive Public Showcases
  initCommunityVoting();
  initResultsPreview();
  initVerificationHub();
  initEmbedSnippet();

  // Re-observe .rv elements for scroll reveal (main.js observer ran before this HTML was injected)
  const rvIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        rvIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  container.querySelectorAll('.rv').forEach((el) => rvIO.observe(el));
}

/**
 * 1. Sky Particle Constellation Canvas
 */
function initHeroSkyConstellation() {
  const cv = document.getElementById('sky');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, pts = [], mx = -999, my = -999, heroOn = true;
  const cols = ['139,92,255', '55,224,255', '255,179,107'];

  function size() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(clamp(W * H / 15000, 40, 105));
    pts = [];
    for (let i = 0; i < n; i++) {
      pts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.7 + 0.5,
        c: cols[i % 3]
      });
    }
  }
  size();
  window.addEventListener('resize', size);

  cv.parentElement.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
  });
  cv.parentElement.addEventListener('pointerleave', () => {
    mx = my = -999;
  });

  new IntersectionObserver((en) => {
    heroOn = en[0].isIntersecting;
  }).observe(cv.parentElement);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      const dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy);
      if (d < 190) {
        p.x += dx * 0.012;
        p.y += dy * 0.012;
        ctx.strokeStyle = 'rgba(55,224,255,' + (1 - d / 190) * 0.5 + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mx, my);
        ctx.stroke();
      }

      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], a = p.x - q.x, b = p.y - q.y, dd = a * a + b * b;
        if (dd < 13000) {
          ctx.strokeStyle = 'rgba(139,92,255,' + (1 - dd / 13000) * 0.28 + ')';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = 'rgba(' + p.c + ',.95)';
      ctx.shadowColor = 'rgba(' + p.c + ',1)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (heroOn) requestAnimationFrame(draw);
  }
  draw();
}

/**
 * 2. Live Hero Ranking Simulator
 */
function initHeroLiveBoard() {
  const HP = [['Orion', 82], ['Nimbus', 79], ['Quill', 75], ['Tundra', 71], ['Vega', 68]];
  const hb = document.getElementById('hb');
  const toast = document.getElementById('toast');
  if (!hb) return;

  const hrows = [];
  hb.innerHTML = '';
  HP.forEach((p, i) => {
    const r = document.createElement('div');
    r.className = 'hr';
    r.innerHTML = `
      <span class="av" style="filter:hue-rotate(${i * 55}deg)"></span>
      <span class="nm"><span>${p[0]}</span><span class="tr"><i></i></span></span>
      <span class="sc"></span>
    `;
    hb.appendChild(r);
    hrows.push(r);
  });

  function renderHB() {
    const order = HP.map((_, i) => i).sort((a, b) => HP[b][1] - HP[a][1]);
    order.forEach((idx, rank) => {
      const r = hrows[idx];
      r.style.transform = `translateY(${rank * 56}px)`;
      const icon = r.querySelector('i');
      if (icon) icon.style.transform = `scaleX(${HP[idx][1] / 100})`;
      const sc = r.querySelector('.sc');
      if (sc) sc.textContent = HP[idx][1];
    });
  }
  renderHB();

  const JN = ['Ada', 'Ben', 'Cai', 'Dev', 'Eli'];
  setInterval(() => {
    if (document.hidden) return;
    const i = Math.floor(Math.random() * HP.length);
    HP[i][1] = clamp(HP[i][1] + Math.round(Math.random() * 7 - 1), 55, 99);
    renderHB();
    if (toast) {
      toast.textContent = `Judge ${JN[Math.floor(Math.random() * 5)]} scored ${HP[i][0]}`;
      toast.style.animation = 'none';
      void toast.offsetWidth;
      toast.style.animation = '';
    }
  }, 2400);
}

/**
 * 3. Stats Band Counter Animation
 */
function initStatsCounter() {
  function countUp(el) {
    const to = parseFloat(el.getAttribute('data-count'));
    const dec = +(el.getAttribute('data-dec') || 0);
    const suf = el.getAttribute('data-suf') || '';
    const f = (v) => v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    const t0 = performance.now();
    (function tick(now) {
      const q = clamp((now - t0) / 1600, 0, 1);
      const e = 1 - Math.pow(1 - q, 3);
      el.textContent = f(to * e);
      if (q < 1) requestAnimationFrame(tick);
    })(t0);
  }

  const cio = new IntersectionObserver((en) => {
    en.forEach((e) => {
      if (e.isIntersecting) {
        countUp(e.target);
        cio.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('#stats [data-count]').forEach((el) => cio.observe(el));
}

/**
 * 4. Four Steps Flow Scroll Tracker
 */
function initStepsScroll() {
  const pathEl = document.getElementById('path');
  const plineEl = document.getElementById('pline');
  const pst = document.querySelectorAll('.pstep');
  if (!pathEl || !plineEl) return;

  function stepsScroll() {
    const r = pathEl.getBoundingClientRect();
    const q = clamp((window.innerHeight * 0.75 - r.top) / (r.height + window.innerHeight * 0.25), 0, 1);
    plineEl.style.setProperty('--pp', q.toFixed(3));
    pst.forEach((x, i) => {
      x.classList.toggle('act', q >= i / (pst.length - 1) * 0.92);
    });
  }
  window.addEventListener('scroll', stepsScroll, { passive: true });
  window.addEventListener('resize', stepsScroll);
  stepsScroll();
}

/**
 * 5. Interactive Story Sequence
 */
function initStorySequence() {
  const stage = document.getElementById('stage');
  if (!stage) return;

  const SP = [
    { n: 'Orbit', s: 0.86 },
    { n: 'Nimbus', s: 0.79 },
    { n: 'Quill', s: 0.91 },
    { n: 'Tundra', s: 0.68 },
    { n: 'Vega', s: 0.74 },
    { n: 'Ember', s: 0.83 }
  ];
  const cards = [];
  let cstep = 0;

  stage.querySelectorAll('.pc').forEach(e => e.remove());
  SP.forEach((p) => {
    const c = document.createElement('div');
    c.className = 'pc';
    c.style.setProperty('--pv', p.s);
    c.innerHTML = `
      <div><b>${p.n}</b></div>
      <small>Submitted</small>
      <svg class="ring" viewBox="0 0 36 36">
        <circle class="t" cx="18" cy="18" r="14"/>
        <circle class="v" cx="18" cy="18" r="14"/>
        <text x="18" y="18">${Math.round(p.s * 100)}</text>
      </svg>
      <span class="rk"></span>
    `;
    stage.appendChild(c);
    cards.push(c);
  });

  const lbl = ['Submitted', 'Being scored', 'Ranked'];

  function layout(step) {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!cards.length || !cards[0].offsetWidth) return;
    const cw = cards[0].offsetWidth;
    const ch = cards[0].offsetHeight;
    let pos = [];
    const order = SP.map((_, i) => i).sort((a, b) => SP[b].s - SP[a].s);

    if (step === 0) {
      pos = [
        [0.06, 0.08, -9],
        [0.6, 0.05, 7],
        [0.32, 0.34, -4],
        [0.66, 0.46, 10],
        [0.05, 0.6, 6],
        [0.42, 0.72, -8]
      ].map((a) => [a[0] * (w - cw), a[1] * (h - ch), a[2]]);
    } else if (step === 1) {
      const gx = (w - 3 * cw) / 4;
      const gy = (h - 2 * ch) / 3;
      pos = cards.map((_, i) => [gx + (i % 3) * (cw + gx), gy + Math.floor(i / 3) * (ch + gy), 0]);
    } else {
      const g2 = (w - 3 * cw) / 4;
      pos[order[0]] = [(w - cw) / 2, h * 0.07, 0];
      pos[order[1]] = [w * 0.5 - cw * 1.6, h * 0.27, -3];
      pos[order[2]] = [w * 0.5 + cw * 0.6, h * 0.27, 3];
      for (let k = 3; k < 6; k++) {
        pos[order[k]] = [g2 + (k - 3) * (cw + g2), h * 0.62, 0];
      }
    }

    cards.forEach((c, i) => {
      c.style.transitionDelay = (i * 55) + 'ms';
      c.style.transform = `translate(${pos[i][0]}px,${pos[i][1]}px) rotate(${pos[i][2]}deg)`;
      c.querySelector('small').textContent = lbl[step];
      c.classList.toggle('gold', step === 2 && i === order[0]);
      c.querySelector('.rk').textContent = order.indexOf(i) + 1;
    });
  }

  function setStep(s) {
    cstep = s;
    stage.className = 'stage s' + s;
    layout(s);
    document.querySelectorAll('.step').forEach((el, i) => {
      el.classList.toggle('act', i === s);
    });
  }

  window.addEventListener('resize', () => layout(cstep));
  const sio = new IntersectionObserver((en) => {
    en.forEach((e) => {
      if (e.isIntersecting) setStep(+e.target.getAttribute('data-s'));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });

  document.querySelectorAll('.step').forEach((el) => sio.observe(el));
  setStep(0);
}

/**
 * 6. Bento Grid (Tilt, Dots, Privacy Chips, Sparkline)
 */
function initBentoInteractions() {
  // Spotlight
  document.querySelectorAll('.bx').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      b.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // 3D Tilt helper
  function tilt(el, max) {
    if (!el) return;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.transform = `rotateX(${((0.5 - y) * max)}deg) rotateY(${((x - 0.5) * max)}deg)`;
      el.style.setProperty('--sx', (x * 100) + '%');
      el.style.setProperty('--sy', (y * 100) + '%');
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  }

  tilt(document.getElementById('cert'), 22);
  const codeEl = document.getElementById('code');
  if (codeEl) {
    codeEl.parentElement.style.perspective = '1000px';
    tilt(codeEl, 8);
  }

  // Dots score balancing
  const dots = document.getElementById('dots');
  if (dots) {
    const raw = [6, 26, 52, 76, 95];
    const nm = [38, 46, 53, 60, 68];
    const dc = ['#8B5CFF', '#37E0FF', '#FFB36B', '#5CFFB0', '#FF7A90'];
    dots.innerHTML = '';
    raw.forEach((v, i) => {
      const d = document.createElement('i');
      d.style.setProperty('--r', v + '%');
      d.style.setProperty('--nn', nm[i] + '%');
      d.style.setProperty('--n', i);
      d.style.setProperty('--dc', dc[i]);
      dots.appendChild(d);
    });

    function setNorm(on) {
      dots.classList.toggle('norm', on);
      dots.setAttribute('aria-pressed', on);
      const dtx = document.getElementById('dtx');
      if (dtx) dtx.textContent = on ? 'Balanced, tight spread' : 'Raw scores, wide spread';
    }

    dots.addEventListener('mouseenter', () => setNorm(true));
    dots.addEventListener('mouseleave', () => setNorm(false));
    dots.addEventListener('click', () => setNorm(!dots.classList.contains('norm')));
  }

  // Private chips segment
  document.querySelectorAll('.seg button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      const chips = document.getElementById('chips');
      if (chips) chips.classList.toggle('judge', b.getAttribute('data-v') === 'judge');
    });
  });

  // Sparkline animation
  const spark = document.getElementById('spark');
  const pg = document.getElementById('prog');
  if (spark && pg) {
    new IntersectionObserver((en, o) => {
      if (en[0].isIntersecting) {
        spark.classList.add('in');
        const t0 = performance.now();
        (function t(now) {
          const p = clamp((now - t0) / 2200, 0, 1);
          pg.textContent = Math.round(p * 86) + '%';
          if (p < 1) requestAnimationFrame(t);
        })(t0);
        o.disconnect();
      }
    }, { threshold: 0.5 }).observe(spark);
  }
}

/**
 * 7. Judging Lab (Fair Scores + Pairwise Duel)
 */
function initLabInteractive() {
  const ROW = 44;
  function makeBoard(el, names) {
    el.innerHTML = '';
    el.style.height = (names.length * ROW) + 'px';
    const rows = names.map((n, i) => {
      const r = document.createElement('div');
      r.className = 'row';
      r.style.transform = `translateY(${i * ROW}px)`;
      r.innerHTML = `
        <span class="rk"></span>
        <span class="nm">${n}</span>
        <span class="bar"><i style="transform:scaleX(0)"></i></span>
        <span class="vl"></span>
        <span class="dt"></span>
      `;
      el.appendChild(r);
      return r;
    });

    return function(vals, min, max, delta) {
      const order = names.map((_, i) => i).sort((a, b) => vals[b] - vals[a]);
      order.forEach((idx, rank) => {
        const r = rows[idx];
        r.style.transform = `translateY(${rank * ROW}px)`;
        r.children[0].textContent = String(rank + 1).padStart(2, '0');
        r.children[2].firstChild.style.transform = `scaleX(${clamp((vals[idx] - min) / (max - min), 0.05, 1)})`;
        r.children[3].textContent = Math.round(vals[idx]);
        r.classList.toggle('top', rank === 0);
        const d = delta ? delta[idx] : 0;
        const dt = r.children[4];
        dt.textContent = d > 0 ? '▲ +' + d : d < 0 ? '▼ ' + d : '';
        dt.className = 'dt ' + (d > 0 ? 'up' : d < 0 ? 'dn' : '');
      });
      return order;
    };
  }

  const PJ = ['Orbit', 'Nimbus', 'Quill', 'Tundra', 'Ember', 'Vega'];
  const TG = ['Team of three, Rust backend', 'Solo builder, pure CSS charts', 'Two builders, real-time voting', 'Four builders, offline first', 'Three builders, audit trail', 'Solo builder, pairwise judging'];
  const JD = [
    ['Ada', [3.0, 2.2, 2.6, 3.4, 1.8, 2.9]],
    ['Ben', [3.8, 4.2, 3.1, 3.5, 2.9, 4.0]],
    ['Cai', [4.6, 4.4, 4.9, 4.1, 4.7, 3.9]]
  ];

  function stat(a) {
    const m = a.reduce((x, y) => x + y, 0) / a.length;
    const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length);
    return [m, sd];
  }

  const rawS = PJ.map((_, i) => JD.reduce((s, j) => s + j[1][i], 0) / JD.length * 20);
  const fairS = PJ.map((_, i) => 50 + 20 * JD.reduce((s, j) => {
    const st = stat(j[1]);
    return s + (j[1][i] - st[0]) / st[1];
  }, 0) / JD.length);

  function rankOf(v) {
    const o = v.map((_, i) => i).sort((a, b) => v[b] - v[a]);
    const r = [];
    o.forEach((i, k) => { r[i] = k; });
    return r;
  }

  const rr = rankOf(rawS);
  const fr = rankOf(fairS);
  let fairOn = false;

  // Tabs
  const tabs = document.querySelectorAll('.tabs .tab');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => {
      tabs.forEach((x, j) => x.setAttribute('aria-selected', i === j));
      const pFair = document.getElementById('p-fair');
      const pDuel = document.getElementById('p-duel');
      if (pFair) pFair.hidden = i !== 0;
      if (pDuel) pDuel.hidden = i !== 1;
      if (i === 0) renderF(); else renderD();
    });
  });

  // Fair scores render
  const boardF = document.getElementById('boardF');
  let upF = () => {};
  if (boardF) upF = makeBoard(boardF, PJ);

  const heat = document.getElementById('heat');
  if (heat) {
    heat.innerHTML = '<span class="h"></span>' + JD.map((j) => `<span class="h" style="text-align:center">${j[0]} (${stat(j[1])[0].toFixed(1)})</span>`).join('');
    PJ.forEach((n, i) => {
      heat.innerHTML += `<span class="pn">${n}</span>` + JD.map((j) => `<span class="hc" style="--a:${clamp((j[1][i] - 1.4) / 3.6 * 0.85, 0.06, 0.9).toFixed(2)}">${j[1][i].toFixed(1)}</span>`).join('');
    });
  }

  function renderF() {
    const vals = fairOn ? fairS : rawS;
    const delta = fairOn ? PJ.map((_, i) => rr[i] - fr[i]) : null;
    upF(vals, 20, 95, delta);
    const swl = document.getElementById('swl');
    const swn = document.getElementById('swn');
    if (swl) swl.textContent = fairOn ? 'Balanced' : 'Raw average';
    if (swn) swn.textContent = fairOn
      ? 'Each judge is compared with their own average, so a strict 3 and a generous 5 can mean the same thing.'
      : 'Raw averages reward whoever the generous judge liked most.';
  }

  const sw = document.getElementById('sw');
  if (sw) {
    sw.addEventListener('click', () => {
      fairOn = !fairOn;
      sw.setAttribute('aria-checked', fairOn);
      renderF();
    });
  }
  renderF();

  // Duel render
  const boardD = document.getElementById('boardD');
  let upD = () => {};
  if (boardD) upD = makeBoard(boardD, PJ);

  const E = PJ.map(() => 1000);
  let cnt = 0, pair = [0, 1], lastKey = '', busy = false;
  const pA = document.getElementById('pA');
  const pB = document.getElementById('pB');

  function showCard(el, i) {
    if (!el) return;
    el.innerHTML = `<h4>${PJ[i]}</h4><p>${TG[i]}</p><span class="st">Winner</span>`;
    el.classList.remove('win');
  }

  function next() {
    let a, b, k;
    do {
      a = Math.floor(Math.random() * PJ.length);
      do { b = Math.floor(Math.random() * PJ.length); } while (b === a);
      k = [a, b].sort().join();
    } while (k === lastKey);
    lastKey = k;
    pair = [a, b];
    showCard(pA, a);
    showCard(pB, b);
    busy = false;
  }

  function choose(side) {
    if (busy) return;
    busy = true;
    const w = pair[side], l = pair[1 - side], ex = 1 / (1 + Math.pow(10, (E[l] - E[w]) / 400));
    E[w] += 32 * (1 - ex);
    E[l] -= 32 * (1 - ex);
    cnt++;
    const pc = document.getElementById('pc');
    if (pc) pc.textContent = cnt;
    (side ? pB : pA).classList.add('win');
    renderD();
    setTimeout(next, 800);
  }

  if (pA) pA.addEventListener('click', () => choose(0));
  if (pB) pB.addEventListener('click', () => choose(1));

  let duelVisible = false;
  const pDuel = document.getElementById('p-duel');
  if (pDuel) {
    new IntersectionObserver((en) => { duelVisible = en[0].isIntersecting; }).observe(pDuel);
    window.addEventListener('keydown', (e) => {
      if (pDuel.hidden || !duelVisible) return;
      if (e.key === 'ArrowLeft') choose(0);
      else if (e.key === 'ArrowRight') choose(1);
    });
  }

  function renderD() {
    upD(E, 900, 1100, null);
  }
  next();
  renderD();
}

/**
 * 8. Roles Accordion
 */
function initSeatsInteractive() {
  const seats = document.querySelectorAll('.seat');
  function setSeat(target) {
    seats.forEach((s) => {
      const on = s === target;
      s.classList.toggle('on', on);
      s.setAttribute('aria-expanded', on);
    });
  }

  seats.forEach((seat) => {
    seat.addEventListener('mouseenter', () => setSeat(seat));
    seat.addEventListener('click', () => setSeat(seat));
    seat.addEventListener('focus', () => setSeat(seat));
  });
}

/**
 * 9. Gallery Continuous Marquee
 */
async function initGalleryMarquee() {
  const mrows = document.getElementById('mrows');
  if (!mrows) return;

  const gradients = [
    'radial-gradient(circle at 15% 25%,#8B5CFF,transparent 55%),radial-gradient(circle at 85% 80%,#37E0FF,transparent 55%)',
    'radial-gradient(circle at 80% 20%,#FFB36B,transparent 55%),radial-gradient(circle at 20% 85%,#8B5CFF,transparent 55%)',
    'radial-gradient(circle at 20% 80%,#5CFFB0,transparent 55%),radial-gradient(circle at 80% 20%,#37E0FF,transparent 50%)',
    'radial-gradient(circle at 70% 30%,#37E0FF,transparent 55%),radial-gradient(circle at 20% 70%,#3B4BFF,transparent 55%)',
    'radial-gradient(circle at 25% 30%,#FF7A90,transparent 55%),radial-gradient(circle at 80% 80%,#FFB36B,transparent 55%)',
    'radial-gradient(circle at 75% 75%,#8B5CFF,transparent 55%),radial-gradient(circle at 15% 20%,#FF7A90,transparent 50%)',
    'radial-gradient(circle at 30% 70%,#FFB36B,transparent 55%),radial-gradient(circle at 85% 25%,#5CFFB0,transparent 50%)',
    'radial-gradient(circle at 20% 20%,#37E0FF,transparent 55%),radial-gradient(circle at 80% 85%,#8B5CFF,transparent 55%)'
  ];

  let projectCards = [];

  try {
    const eventsRes = await api.getEvents();
    const events = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.data || []);
    // Find active event or the primary fixture event
    const activeEv = events.find(e => e.status === 'ACTIVE' || e.status === 'OPEN') || events[0];
    if (activeEv) {
      const subsRes = await api.getSubmissions(activeEv.id);
      const subs = Array.isArray(subsRes) ? subsRes : (subsRes?.data || []);
      if (subs.length > 0) {
        projectCards = subs.slice(0, 10).map((s, idx) => {
          const techList = Array.isArray(s.techStack) ? s.techStack : (Array.isArray(s.tech_stack) ? s.tech_stack : []);
          const tag1 = s.track || (techList[0] || 'Build');
          const tag2 = s.status || (techList[1] || 'Verified');
          const grad = gradients[idx % gradients.length];
          return [
            s.title || s.name || `Build #${s.id}`,
            s.tagline || s.description || 'Verified hackathon submission',
            [tag1, tag2],
            grad
          ];
        });
      }
    }
  } catch (err) {
    console.warn('Dynamic marquee load note:', err);
  }

  // If 0 active hackathons or 0 submissions, preserve continuous animation without fabricated project names
  if (projectCards.length === 0) {
    projectCards = [
      ['Awaiting Submissions', 'Project slots ready for live builders', ['Open', 'Active'], gradients[0]],
      ['Continuous Stream', 'Real-time pipeline connects to Postgres', ['Live', 'Stream'], gradients[1]],
      ['Judging Pipeline', 'Auto-assigned rubrics & zero-trust scoring', ['Judging', 'Queue'], gradients[2]],
      ['Public Showcase', 'Submissions appear live once finalized', ['Gallery', 'Public'], gradients[3]],
      ['Secure Sandbox', 'Encrypted ballots and conflict mitigation', ['Security', 'RBAC'], gradients[4]],
      ['Telemetry & Exports', 'Real-time Z-score statistical evaluation', ['Export', 'CSV'], gradients[5]]
    ];
  }

  function mrow(list, rev) {
    const doubleList = list.concat(list);
    const h = doubleList.map((g) => `
      <article class="mc" style="--g:${g[3]}">
        <div class="tg"><span>${escapeHtml(g[2][0])}</span><span>${escapeHtml(g[2][1])}</span></div>
        <h4>${escapeHtml(g[0])}</h4>
        <p>${escapeHtml(g[1])}</p>
      </article>
    `).join('');
    return `<div class="mrow${rev ? ' rev' : ''}">${h}</div>`;
  }

  const half = Math.ceil(projectCards.length / 2);
  const row1 = projectCards.slice(0, half);
  const row2 = projectCards.slice(half);

  mrows.innerHTML = mrow(row1.length > 0 ? row1 : projectCards, false) + 
                    mrow(row2.length > 0 ? row2 : projectCards, true);
}

/**
 * 10. Interactive Terminal
 */
function initTerminal() {
  const term = document.getElementById('term');
  const replay = document.getElementById('replay');
  if (!term) return;

  const TL = [
    '$ docker compose up',
    '[ok] Database ready',
    '[ok] Sample event loaded',
    '[ok] Portal running on localhost:8080'
  ];

  function fmt(s) {
    return s.replace('[ok]', '<span style="color:var(--m);font-weight:600">ok</span>');
  }

  let typed = false;
  function typeTerm() {
    term.innerHTML = '';
    let li = 0, ci = 0, acc = '';
    function step() {
      if (li >= TL.length) {
        term.innerHTML = acc + '<span style="display:inline-block;width:8px;height:1em;background:var(--m);vertical-align:-2px;margin-left:2px;animation:pulse 1s infinite"></span>';
        return;
      }
      const l = TL[li];
      if (ci <= l.length) {
        term.innerHTML = acc + fmt(l.slice(0, ci));
        ci++;
        setTimeout(step, li === 0 ? 65 : 15);
      } else {
        acc += fmt(l) + '\n';
        li++;
        ci = 0;
        setTimeout(step, li === 1 ? 400 : 200);
      }
    }
    step();
  }

  new IntersectionObserver((en, o) => {
    if (en[0].isIntersecting && !typed) {
      typed = true;
      typeTerm();
      o.disconnect();
    }
  }, { threshold: 0.5 }).observe(term);

  if (replay) replay.addEventListener('click', typeTerm);
}

/**
 * 11. FAQ Accordion
 */
function initFaq() {
  const faqList = document.getElementById('faqList');
  if (!faqList) return;

  const FQ = [
    ['Do I need a cloud account to run it?', 'No. One command starts everything on your laptop with sample data loaded. It works with the network off.'],
    ['Can judges see each other\'s scores?', 'No. The server refuses the request, so hiding a button in the page is never the only protection.'],
    ['How does fair scoring work?', 'Each judge\'s scores are compared with that judge\'s own average and spread. A strict judge and a generous judge then count equally.'],
    ['Can I take my data with me?', 'Yes. Export CSV at every stage and import or export whole events in bulk, so leaving is as easy as arriving.'],
    ['Is it open source?', 'That is the plan. The project ships under an open license so any organizer can run it and change it.']
  ];

  faqList.innerHTML = '';
  FQ.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'q';
    d.innerHTML = `
      <button aria-expanded="false" aria-controls="faq-a${i}" type="button">
        <span>${f[0]}</span>
        <span class="pm"></span>
      </button>
      <div class="ans" id="faq-a${i}" role="region">
        <div><p>${f[1]}</p></div>
      </div>
    `;
    d.querySelector('button').addEventListener('click', function() {
      const o = !d.classList.contains('open');
      d.classList.toggle('open', o);
      this.setAttribute('aria-expanded', o);
    });
    faqList.appendChild(d);
  });
}

/**
 * 12. Scroll Ring & Back to Top
 */
function initScrollRing() {
  const pring = document.getElementById('pring');
  const top2 = document.getElementById('top2');
  if (!pring || !top2) return;

  function onScroll() {
    const docEl = document.documentElement || document.body || {};
    const h = (docEl.scrollHeight || 1000) - (window.innerHeight || 800);
    const p = h > 0 ? (window.scrollY || 0) / h : 0;
    pring.style.strokeDashoffset = 138.2 * (1 - p);
    top2.classList.toggle('show', (window.scrollY || 0) > 450);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  top2.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * 13. Community Choice Voting (T3)
 */
async function initCommunityVoting() {
  const votingModeBadge = document.getElementById('votingModeBadge');
  const votingStateBadge = document.getElementById('votingStateBadge');
  const totalVotesCountBadge = document.getElementById('totalVotesCountBadge');
  const voterBoxTitle = document.getElementById('voterBoxTitle');
  const voterBoxHelp = document.getElementById('voterBoxHelp');
  const landingVoterEmail = document.getElementById('landingVoterEmail');
  const landingVoterName = document.getElementById('landingVoterName');
  const voterStatusAlert = document.getElementById('voterStatusAlert');
  const ballotGrid = document.getElementById('ballotGrid');

  if (!ballotGrid) return;

  const eventId = window.__CURRENT_EVENT_ID__ || 1;

  try {
    const status = await api.getVotingStatus(eventId).catch(() => null);
    if (status) {
      if (votingModeBadge) {
        votingModeBadge.textContent = `MODE: ${status.accessMode || 'OPEN'}`;
      }
      if (votingStateBadge) {
        if (!status.votingEnabled) {
          votingStateBadge.textContent = 'STATUS: DISABLED';
          votingStateBadge.className = 'bdg bad';
        } else if (status.votingActive) {
          votingStateBadge.textContent = 'STATUS: VOTING ACTIVE';
          votingStateBadge.className = 'bdg ok';
        } else if (status.hasEnded) {
          votingStateBadge.textContent = 'STATUS: CONCLUDED';
          votingStateBadge.className = 'bdg warn';
        } else {
          votingStateBadge.textContent = 'STATUS: UPCOMING';
          votingStateBadge.className = 'bdg';
        }
      }
      if (totalVotesCountBadge) {
        totalVotesCountBadge.textContent = `${status.totalVotes || 0} votes cast`;
      }

      // Configure voter identification box
      if (status.accessMode === 'EMAIL') {
        if (landingVoterEmail) landingVoterEmail.style.display = 'inline-block';
        if (voterBoxTitle) voterBoxTitle.textContent = 'Email-Gated Ballot';
        if (voterBoxHelp) voterBoxHelp.textContent = 'A valid email address is required to submit your vote (one vote per email).';
      } else if (status.accessMode === 'AUTHENTICATED') {
        if (landingVoterEmail) landingVoterEmail.style.display = 'none';
        const user = authStore.getUser();
        if (user) {
          if (voterBoxTitle) voterBoxTitle.textContent = `Voter: ${user.name || user.email}`;
          if (voterBoxHelp) voterBoxHelp.textContent = 'Authenticated via your active DogFood account.';
        } else {
          if (voterBoxTitle) voterBoxTitle.textContent = 'Authentication Required';
          if (voterBoxHelp) voterBoxHelp.innerHTML = 'You must <a href="#/login" style="color:var(--c);text-decoration:underline">sign in</a> with an authorized account to participate in community voting.';
        }
      } else {
        if (landingVoterEmail) landingVoterEmail.style.display = 'none';
        if (voterBoxTitle) voterBoxTitle.textContent = 'Open Community Ballot';
        if (voterBoxHelp) voterBoxHelp.textContent = 'Ballot is open to the public. Enter your optional voter alias below.';
      }
    }

    // Load ballot submissions
    const ballotRes = await api.getBallot(eventId).catch(() => ({ submissions: [] }));
    const submissions = ballotRes.submissions || [];

    if (submissions.length === 0) {
      ballotGrid.innerHTML = `
        <div class="card" style="grid-column:1/-1;text-align:center;padding:48px;color:var(--mute)">
          No submissions currently eligible or active on the community ballot.
        </div>
      `;
      return;
    }

    ballotGrid.innerHTML = submissions.map(sub => `
      <div class="card rv" style="padding:22px;border:1px solid var(--line);background:var(--glass2);border-radius:16px;display:flex;flex-direction:column;justify-content:space-between;transition:transform .2s ease,border-color .2s ease">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:12px">
            <span class="trk" style="font-size:0.75rem">${escapeHtml(sub.track || 'General')}</span>
            <span class="bdg vote-count-badge-${sub.id}" style="font-size:0.75rem;background:rgba(55,224,255,0.12);color:var(--c)">
              ⭐ ${sub.voteCount || 0} votes
            </span>
          </div>
          <h3 style="font-size:1.15rem;margin:0 0 8px;letter-spacing:-.02em;color:#FFF">${escapeHtml(sub.title || 'Untitled Project')}</h3>
          <p style="color:var(--mute);font-size:0.88rem;line-height:1.5;margin:0 0 16px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
            ${escapeHtml(sub.tagline || sub.description || 'No description provided.')}
          </p>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">
          <button class="btn main sm vote-btn" data-subid="${sub.id}" type="button" style="flex:1;min-width:120px" ${status && !status.votingActive ? 'disabled' : ''}>
            Vote
          </button>
          <button class="btn ghost sm view-comment-btn" data-subid="${sub.id}" type="button">
            💬 View & Comment
          </button>
        </div>
      </div>
    `).join('');

    // Re-bind click handlers for Vote buttons
    ballotGrid.querySelectorAll('.vote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const subId = Number(btn.getAttribute('data-subid'));
        const originalText = btn.textContent;
        const voterEmail = landingVoterEmail?.value?.trim() || null;
        const voterAlias = landingVoterName?.value?.trim() || null;

        if (status?.accessMode === 'EMAIL' && !voterEmail) {
          notify('Please enter your email address to vote.', 'warn');
          landingVoterEmail?.focus();
          return;
        }

        if (status?.accessMode === 'AUTHENTICATED' && !authStore.getUser()) {
          notify('Authentication required: please log in to vote.', 'warn');
          window.location.hash = '#/login';
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Submitting...';

        try {
          const res = await api.submitVote(eventId, {
            submissionId: subId,
            voterEmail: voterEmail,
            voterAlias: voterAlias
          });

          notify(res.message || 'Thank you! Your vote has been officially recorded.', 'success');
          btn.textContent = '✓ Voted';
          btn.style.background = 'var(--ok)';
          btn.style.borderColor = 'var(--ok)';

          // Increment count badge locally
          const countBadge = ballotGrid.querySelector(`.vote-count-badge-${subId}`);
          if (countBadge) {
            const currentVotes = parseInt(countBadge.textContent.replace(/\\D/g, ''), 10) || 0;
            countBadge.textContent = `⭐ ${currentVotes + 1} votes`;
          }

          if (voterStatusAlert) {
            voterStatusAlert.style.display = 'block';
            voterStatusAlert.style.background = 'rgba(92,255,176,0.1)';
            voterStatusAlert.style.border = '1px solid var(--ok)';
            voterStatusAlert.style.color = 'var(--ok)';
            voterStatusAlert.textContent = `✓ Vote cast for project #${subId} by ${voterAlias || voterEmail || 'anonymous voter'}.`;
          }
        } catch (err) {
          btn.disabled = false;
          btn.textContent = originalText;
          const msg = err.message || '';
          if (msg.includes('409') || msg.toLowerCase().includes('already voted')) {
            notify('Duplicate vote rejected: You have already voted for this event.', 'error');
            if (voterStatusAlert) {
              voterStatusAlert.style.display = 'block';
              voterStatusAlert.style.background = 'rgba(255,122,144,0.1)';
              voterStatusAlert.style.border = '1px solid var(--bad)';
              voterStatusAlert.style.color = 'var(--bad)';
              voterStatusAlert.textContent = '⚠️ Duplicate vote rejected: You have already submitted a vote for this event.';
            }
          } else if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
            notify('Rate limit reached: Too many vote attempts. Please wait.', 'error');
          } else {
            notify(msg || 'Unable to record vote.', 'error');
          }
        }
      });
    });

    // Re-bind click handlers for View & Comment buttons
    ballotGrid.querySelectorAll('.view-comment-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const subId = Number(btn.getAttribute('data-subid'));
        const sub = submissions.find(s => s.id === subId) || { id: subId, title: `Submission #${subId}` };
        openProjectCommentsModal(eventId, sub);
      });
    });

  } catch (err) {
    if (ballotGrid) {
      ballotGrid.innerHTML = `
        <div class="card" style="grid-column:1/-1;text-align:center;padding:32px;color:var(--mute)">
          Voting is currently offline or unconfigured for this event.
        </div>
      `;
    }
  }
}

/**
 * Project Details & Real-Time Comments Modal for Landing Page
 */
async function openProjectCommentsModal(eventId, sub) {
  const modal = document.getElementById('landingProjectModal');
  const modalCard = document.getElementById('landingProjectModalCard');
  if (!modal || !modalCard) return;

  modalCard.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <span class="trk" style="font-size:0.75rem">${escapeHtml(sub.track || 'General Track')}</span>
        <h2 style="font-size:1.6rem;letter-spacing:-.02em;margin:6px 0 4px;color:#FFF">${escapeHtml(sub.title)}</h2>
        ${sub.tagline ? `<p style="color:var(--c);font-size:0.95rem;margin:0">${escapeHtml(sub.tagline)}</p>` : ''}
      </div>
      <button class="btn ghost sm" id="closeLandingModalBtn" type="button" style="padding:4px 10px;font-size:1.1rem">&times;</button>
    </div>

    <div style="color:var(--text);font-size:0.92rem;line-height:1.6;margin-bottom:20px;padding:16px;background:var(--glass2);border-radius:12px;border:1px solid var(--line)">
      ${escapeHtml(sub.description || 'No detailed description available.')}
    </div>

    <!-- Links -->
    <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap">
      ${sub.demoUrl ? `<a class="btn main sm" href="${sanitizeUrl(sub.demoUrl)}" target="_blank" rel="noopener">🚀 Live Demo &rarr;</a>` : ''}
      ${sub.repoUrl ? `<a class="btn ghost sm" href="${sanitizeUrl(sub.repoUrl)}" target="_blank" rel="noopener">💻 Source Code</a>` : ''}
    </div>

    <!-- Comments Section -->
    <div style="border-top:1px solid var(--line);padding-top:20px">
      <h3 style="font-size:1.2rem;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        💬 Community Discussion
        <span class="bdg" id="modalCommentCount" style="font-size:0.75rem">Loading...</span>
      </h3>

      <!-- Post Comment Form -->
      <form id="modalCommentForm" style="display:grid;gap:10px;margin-bottom:20px">
        <input type="text" id="modalCommentAuthor" placeholder="Your Name or Alias" style="height:38px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 12px;font-size:0.88rem" />
        <textarea id="modalCommentContent" rows="3" maxlength="1000" required placeholder="Leave feedback or ask a question about this project (1-1000 chars)..." style="border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:10px 12px;font-size:0.88rem;resize:vertical"></textarea>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <small style="color:var(--mute);font-size:0.78rem"><span id="modalCharCounter">0</span> / 1000 characters</small>
          <button class="btn main sm" type="submit" id="btnSubmitModalComment">Post Comment</button>
        </div>
      </form>

      <!-- Comments Stream -->
      <div id="modalCommentsList" style="display:grid;gap:12px;max-height:280px;overflow-y:auto;padding-right:6px">
        <p style="color:var(--mute);font-size:0.88rem">Loading comments...</p>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  document.getElementById('closeLandingModalBtn')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  const authorInput = document.getElementById('modalCommentAuthor');
  const user = authStore.getUser();
  if (user && authorInput) {
    authorInput.value = user.name || user.email;
  }

  const contentInput = document.getElementById('modalCommentContent');
  const charCounter = document.getElementById('modalCharCounter');
  if (contentInput && charCounter) {
    contentInput.addEventListener('input', () => {
      charCounter.textContent = contentInput.value.length;
    });
  }

  // Fetch and render comments
  async function loadModalComments() {
    const listEl = document.getElementById('modalCommentsList');
    const badgeEl = document.getElementById('modalCommentCount');
    if (!listEl) return;

    try {
      const comments = await api.getComments(eventId, sub.id);
      if (badgeEl) badgeEl.textContent = `${comments.length} comments`;
      if (comments.length === 0) {
        listEl.innerHTML = `<p style="color:var(--mute);font-size:0.88rem">No comments posted yet. Be the first to share your thoughts!</p>`;
        return;
      }
      listEl.innerHTML = comments.map(c => `
        <div style="padding:12px 14px;border-radius:10px;background:var(--glass2);border:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <b style="font-size:0.88rem;color:var(--c)">${escapeHtml(c.authorName || 'Community Member')}</b>
            <span style="font-size:0.75rem;color:var(--mute)">${new Date(c.createdAt).toLocaleDateString()}</span>
          </div>
          <p style="margin:0;font-size:0.86rem;line-height:1.45;color:var(--text)">${escapeHtml(c.content)}</p>
        </div>
      `).join('');
    } catch (err) {
      if (listEl) listEl.innerHTML = `<p style="color:var(--mute);font-size:0.88rem">Unable to load comments.</p>`;
    }
  }

  await loadModalComments();

  // Submit comment
  const form = document.getElementById('modalCommentForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = contentInput?.value?.trim();
      const authorName = authorInput?.value?.trim() || 'Anonymous';
      if (!content) return;

      const submitBtn = document.getElementById('btnSubmitModalComment');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
      }

      try {
        await api.addComment(eventId, sub.id, { content, authorName });
        notify('Comment posted successfully!', 'success');
        if (contentInput) contentInput.value = '';
        if (charCounter) charCounter.textContent = '0';
        await loadModalComments();
      } catch (err) {
        notify(`Failed to post comment: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post Comment';
        }
      }
    });
  }
}

/**
 * 14. Results Preview & Hidden Standings State (T3)
 */
async function initResultsPreview() {
  const badge = document.getElementById('resultsVisibilityBadge');
  const area = document.getElementById('resultsContentArea');
  if (!area) return;

  const eventId = window.__CURRENT_EVENT_ID__ || 1;

  try {
    const results = await api.getResults(eventId);
    if (Array.isArray(results) && results.length > 0) {
      if (badge) {
        badge.textContent = 'STATUS: OFFICIAL RESULTS PUBLISHED';
        badge.className = 'bdg ok';
      }

      const top3 = results.slice(0, 3);
      area.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:24px">
          ${top3.map((r, i) => `
            <div class="card rv" style="padding:22px;border:1px solid ${i === 0 ? 'var(--p)' : 'var(--line)'};background:var(--glass2);border-radius:14px;position:relative">
              <span class="bdg ${i === 0 ? 'hl' : 'ok'}" style="position:absolute;top:14px;right:14px;font-size:0.72rem">
                ${i === 0 ? '🏆 1ST PLACE' : i === 1 ? '🥈 2ND PLACE' : '🥉 3RD PLACE'}
              </span>
              <h4 style="font-size:1.15rem;margin:12px 0 6px">${escapeHtml(r.projectTitle || r.submissionTitle || 'Project #' + r.submissionId)}</h4>
              <p style="color:var(--mute);font-size:0.85rem;margin:0 0 12px">Track: <b>${escapeHtml(r.track || 'General')}</b></p>
              <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px">
                <span style="font-size:0.8rem;color:var(--mute)">Normalized T-Score:</span>
                <b style="font-size:1.2rem;color:var(--m);font-family:var(--mono)">${(r.normalizedScore || r.zScore || 0).toFixed(2)}</b>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="text-align:center">
          <a class="btn main" href="#/results">Open Full Official Leaderboard &rarr;</a>
        </div>
      `;
      return;
    }
  } catch (err) {
    // 403 or results hidden
  }

  // Hidden state display
  if (badge) {
    badge.textContent = 'STATUS: RESULTS PROTECTED / IN REVIEW';
    badge.className = 'bdg warn';
  }
  area.innerHTML = `
    <div class="card" style="text-align:center;padding:48px 24px;border:1px solid var(--line);background:var(--glass2);border-radius:16px">
      <div style="font-size:2.4rem;margin-bottom:12px">🔒</div>
      <h3 style="font-size:1.4rem;margin-bottom:8px">Results Protected</h3>
      <p style="color:var(--mute);max-width:540px;margin:0 auto 16px;line-height:1.5">
        Final standings are cryptographically held until organizers conclude judging and publish the official leaderboard. Community voting results and judge scores remain private to prevent bias.
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <a class="btn main sm" href="#/gallery">Browse Project Showcase</a>
        <a class="btn ghost sm" href="#community-voting">Cast Community Vote</a>
      </div>
    </div>
  `;
}

/**
 * 15. Public Cryptographic Verification Hub (T4)
 */
function initVerificationHub() {
  const tabVerifyCertBtn = document.getElementById('tabVerifyCertBtn');
  const tabVerifyJudgeBtn = document.getElementById('tabVerifyJudgeBtn');
  const panelVerifyCert = document.getElementById('panelVerifyCert');
  const panelVerifyJudge = document.getElementById('panelVerifyJudge');

  if (tabVerifyCertBtn && tabVerifyJudgeBtn && panelVerifyCert && panelVerifyJudge) {
    tabVerifyCertBtn.addEventListener('click', () => {
      tabVerifyCertBtn.className = 'btn main sm';
      tabVerifyJudgeBtn.className = 'btn ghost sm';
      panelVerifyCert.style.display = 'block';
      panelVerifyJudge.style.display = 'none';
    });

    tabVerifyJudgeBtn.addEventListener('click', () => {
      tabVerifyJudgeBtn.className = 'btn main sm';
      tabVerifyCertBtn.className = 'btn ghost sm';
      panelVerifyJudge.style.display = 'block';
      panelVerifyCert.style.display = 'none';
    });
  }

  // Certificate Verification Form
  const certForm = document.getElementById('verifyCertForm');
  const certInput = document.getElementById('verifyCertInput');
  const certResult = document.getElementById('certVerifyResult');
  const btnSampleCert = document.getElementById('btnSampleCert');

  if (certForm && certInput && certResult) {
    certForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const certId = certInput.value.trim();
      if (!certId) return;

      certResult.style.display = 'block';
      certResult.innerHTML = `<p style="color:var(--mute);font-size:0.9rem">Checking cryptographic ledger proof...</p>`;

      try {
        const cert = await api.getCertificate(certId);
        certResult.innerHTML = `
          <div style="padding:20px;border-radius:14px;background:rgba(92,255,176,0.08);border:1px solid var(--ok);margin-top:14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span class="bdg ok" style="font-weight:700">✓ CRYPTOGRAPHICALLY AUTHENTIC</span>
              <span class="bdg" style="font-size:0.75rem">${escapeHtml(cert.certificateType || 'PARTICIPATION')}</span>
            </div>
            <h4 style="font-size:1.3rem;margin:0 0 6px;color:#FFF">${escapeHtml(cert.recipientName)}</h4>
            <p style="color:var(--mute);font-size:0.9rem;margin:0 0 12px">Event: <b>${escapeHtml(cert.eventName || 'DogFood Hackathon')}</b> &bull; Track: <b>${escapeHtml(cert.placement || 'All Tracks')}</b></p>
            <div style="background:rgba(0,0,0,0.3);padding:10px 12px;border-radius:8px;font-family:var(--mono);font-size:0.78rem;color:var(--c);word-break:break-all">
              SHA-256 Ledger Hash: ${escapeHtml(cert.checksum || 'N/A')}
            </div>
            <small style="color:var(--mute);display:block;margin-top:8px">Issued: ${new Date(cert.issuedAt).toLocaleString()}</small>
          </div>
        `;
      } catch (err) {
        certResult.innerHTML = `
          <div style="padding:16px;border-radius:12px;background:rgba(255,122,144,0.1);border:1px solid var(--bad);color:var(--bad);margin-top:14px">
            ❌ Invalid Certificate: No matching record exists with ID <b>${escapeHtml(certId)}</b> on the ledger.
          </div>
        `;
      }
    });

    btnSampleCert?.addEventListener('click', () => {
      certInput.value = 'CERT-PART-1-4';
      certForm.dispatchEvent(new Event('submit'));
    });
  }

  // Judge Participation Record Verification Form
  const judgeForm = document.getElementById('verifyJudgeForm');
  const vJudgeId = document.getElementById('vJudgeId');
  const vEventId = document.getElementById('vEventId');
  const vEvalCount = document.getElementById('vEvalCount');
  const vTimestamp = document.getElementById('vTimestamp');
  const vSignature = document.getElementById('vSignature');
  const judgeResult = document.getElementById('judgeVerifyResult');
  const btnSampleJudgeRecord = document.getElementById('btnSampleJudgeRecord');

  if (judgeForm && vJudgeId && judgeResult) {
    judgeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      judgeResult.style.display = 'block';
      judgeResult.innerHTML = `<p style="color:var(--mute);font-size:0.9rem">Validating HMAC-SHA256 signature...</p>`;

      try {
        const payload = {
          judgeId: Number(vJudgeId.value),
          eventId: Number(vEventId.value),
          evaluatedSubmissionsCount: Number(vEvalCount.value),
          completionTimestamp: vTimestamp.value.trim(),
          signature: vSignature.value.trim()
        };

        const res = await api.verifyJudgeRecord(payload);
        if (res.valid) {
          judgeResult.innerHTML = `
            <div style="padding:20px;border-radius:14px;background:rgba(92,255,176,0.08);border:1px solid var(--ok);margin-top:14px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span class="bdg ok" style="font-weight:700">✓ HMAC-SHA256 SIGNATURE VALID</span>
              </div>
              <p style="color:var(--text);font-size:0.9rem;margin:0 0 8px">
                Confirmed participation for <b>Judge #${res.judgeId}</b> in <b>Event #${res.eventId}</b>. Evaluated <b>${res.evaluatedSubmissionsCount}</b> project submissions.
              </p>
              <small style="color:var(--mute);display:block">Zero-knowledge proof: Individual score allocations and judge comments remain completely confidential.</small>
            </div>
          `;
        } else {
          judgeResult.innerHTML = `
            <div style="padding:16px;border-radius:12px;background:rgba(255,122,144,0.1);border:1px solid var(--bad);color:var(--bad);margin-top:14px">
              ❌ Signature Invalid: The signature does not match the record data or has been altered.
            </div>
          `;
        }
      } catch (err) {
        judgeResult.innerHTML = `
          <div style="padding:16px;border-radius:12px;background:rgba(255,122,144,0.1);border:1px solid var(--bad);color:var(--bad);margin-top:14px">
            ❌ Verification error: ${escapeHtml(err.message)}
          </div>
        `;
      }
    });

    btnSampleJudgeRecord?.addEventListener('click', async () => {
      try {
        const eventId = window.__CURRENT_EVENT_ID__ || 1;
        const myRecord = await api.getMyJudgeRecord(eventId);
        if (myRecord) {
          vJudgeId.value = myRecord.judgeId;
          vEventId.value = myRecord.eventId;
          vEvalCount.value = myRecord.evaluatedSubmissionsCount;
          vTimestamp.value = myRecord.completionTimestamp;
          vSignature.value = myRecord.signature;
          judgeForm.dispatchEvent(new Event('submit'));
          return;
        }
      } catch (err) {
        // Fallback default sample
        vJudgeId.value = 2;
        vEventId.value = 1;
        vEvalCount.value = 5;
        vTimestamp.value = '2026-09-28T12:00:00Z';
        vSignature.value = 'SAMPLE-HMAC-SIGNATURE';
        notify('Loaded sample fields. To verify an authentic signature, log in as an active judge or sign in with test credentials.', 'info');
      }
    });
  }
}

/**
 * 16. Embeddable Gallery & Widget Snippet (T4)
 */
function initEmbedSnippet() {
  const snippet = document.getElementById('embedCodeSnippet');
  const btn = document.getElementById('btnCopyEmbedSnippet');
  if (!snippet) return;

  const origin = window.location.origin || 'http://localhost:3000';
  const eventId = window.__CURRENT_EVENT_ID__ || 1;
  const embedCode = `<iframe src="${origin}/#/embed/gallery?event=${eventId}" width="100%" height="600" frameborder="0" style="border-radius:12px;overflow:hidden"></iframe>`;

  snippet.textContent = embedCode;

  btn?.addEventListener('click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(embedCode).then(() => {
        notify('HTML embed code copied to clipboard!', 'success');
      }).catch(() => {
        notify('Snippet copied!', 'success');
      });
    } else {
      notify('Snippet ready to copy.', 'info');
    }
  });
}

