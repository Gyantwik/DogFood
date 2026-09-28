/**
 * systemView.js — Design System Reference & Interactive UI Token Kit
 */

import { h } from '../lib/dom.js';

export function renderSystem(container) {
  container.innerHTML = `
<section class="view enter" id="v-system">
  <div class="vh">
    <span class="bdg ok">Dogfood UI/UX Tokens</span>
    <h2 class="vt" style="margin-top:6px">Design System & Component Kit</h2>
    <p class="vs">Standardized foundations, glass surfaces, accent palettes, and accessible micro-interactions.</p>
  </div>

  <div class="card" style="margin-top:24px">
    <h3>Color Palette & Contrast</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:16px">
      <div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--bg)">
        <div style="height:60px;background:#06050D"></div>
        <div style="padding:10px;font-size:0.8rem">Background<br><code>#06050D</code></div>
      </div>
      <div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--bg)">
        <div style="height:60px;background:#0D0B1A"></div>
        <div style="padding:10px;font-size:0.8rem">Surface<br><code>#0D0B1A</code></div>
      </div>
      <div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--bg)">
        <div style="height:60px;background:#8B5CFF"></div>
        <div style="padding:10px;font-size:0.8rem">Violet Brand<br><code>#8B5CFF</code></div>
      </div>
      <div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--bg)">
        <div style="height:60px;background:#37E0FF"></div>
        <div style="padding:10px;font-size:0.8rem">Cyan Highlight<br><code>#37E0FF</code></div>
      </div>
      <div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--bg)">
        <div style="height:60px;background:#5CFFB0"></div>
        <div style="padding:10px;font-size:0.8rem">Mint Success<br><code>#5CFFB0</code></div>
      </div>
      <div style="border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--bg)">
        <div style="height:60px;background:#FF7A90"></div>
        <div style="padding:10px;font-size:0.8rem">Rose Danger<br><code>#FF7A90</code></div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:20px">
    <h3>Typography Scale</h3>
    <div style="margin-top:16px;display:grid;gap:12px">
      <div style="font-family:var(--display);font-weight:800;font-size:2.8rem">Display 800 &mdash; Syne</div>
      <div style="font-family:var(--display);font-weight:700;font-size:1.6rem">Heading 700 &mdash; Syne</div>
      <p style="font-family:var(--ui);font-size:1rem;color:var(--text);max-width:60ch">Body 400 &mdash; Manrope with 1.65 line-height for clean readability across high-density judging queues.</p>
      <code style="font-family:var(--mono);color:var(--c);font-size:0.9rem">JetBrains Mono &mdash; 0.9rem for scores, tokens, and z-score calculations</code>
    </div>
  </div>
</section>
`;
}
