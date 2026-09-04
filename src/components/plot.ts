import { PALETTE, cellToCoord } from '../lib/coords';
import { fmtDate as fmtDateBase } from '../lib/date';

interface PlotCell {
  cell: number;
  name: string;
  msg: string;
  color: string;
  created_at: number;
}

interface PlotResponse {
  cells: PlotCell[];
  mine: number | null;
}

const PALETTE_SET: readonly string[] = PALETTE;

// Previously omitted `timeZone: 'UTC'`, so a claim's date rendered here
// used the viewer's local timezone while every other date on the site
// (writing posts, via src/lib/date.ts) rendered in UTC — the same
// `created_at` timestamp could print a different day depending on where it
// was viewed from. Delegating to the shared formatter fixes that.
function fmtDate(ms: number): string {
  return fmtDateBase(new Date(ms));
}

function safeColor(color: string): string {
  return PALETTE_SET.includes(color) ? color : 'var(--cellEmpty)';
}

async function errorMessage(res: Response): Promise<string> {
  const fallback = 'something went wrong';
  try {
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'error' in data) {
      const err = (data as { error: unknown }).error;
      if (typeof err === 'string' && err) return err;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function initPlot() {
  const root = document.querySelector<HTMLElement>('[data-plot-root]');
  if (!root) return;

  const full = root.dataset.plotFull === 'true';
  const grid = root.querySelector<HTMLElement>('[data-plot-grid]');
  const cellButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-cell]'));
  const tooltip = root.querySelector<HTMLElement>('[data-plot-tooltip]');
  const tooltipSwatch = tooltip?.querySelector<HTMLElement>('[data-tooltip-swatch]') ?? null;
  const tooltipMsg = tooltip?.querySelector<HTMLElement>('[data-tooltip-msg]') ?? null;
  const tooltipMeta = tooltip?.querySelector<HTMLElement>('[data-tooltip-meta]') ?? null;

  const claimedLine = document.querySelector<HTMLElement>('[data-plot-claimed]');
  const claimedCoordEl = claimedLine?.querySelector<HTMLElement>('[data-plot-claimed-coord]') ?? null;

  const claimBar = document.querySelector<HTMLElement>('[data-plot-claim-bar]');
  const swatchButtons = Array.from(claimBar?.querySelectorAll<HTMLButtonElement>('[data-swatch]') ?? []);
  const nameInput = claimBar?.querySelector<HTMLInputElement>('[data-plot-name]') ?? null;
  const msgInput = claimBar?.querySelector<HTMLInputElement>('[data-plot-msg]') ?? null;
  const claimBtn = claimBar?.querySelector<HTMLButtonElement>('[data-plot-claim-btn]') ?? null;
  const cancelBtn = claimBar?.querySelector<HTMLButtonElement>('[data-plot-cancel]') ?? null;

  const errorLine = document.querySelector<HTMLElement>('[data-plot-error]');
  const countNums = document.querySelectorAll<HTMLElement>('[data-plot-count-num]');
  const recentList = document.querySelector<HTMLElement>('[data-plot-recent]');

  if (!grid || !tooltip || !tooltipSwatch || !tooltipMsg || !tooltipMeta) return;
  // Re-bind to fresh consts so their non-null type survives capture inside
  // the closures defined below (TS doesn't narrow the outer `let`-free
  // consts across function boundaries even though they're never reassigned).
  const gridEl = grid;
  const rootEl = root;
  const tooltipEl = tooltip;
  const tooltipSwatchEl = tooltipSwatch;
  const tooltipMsgEl = tooltipMsg;
  const tooltipMetaEl = tooltipMeta;

  const filled = new Map<number, PlotCell>();
  let mine: number | null = null;
  let pending: number | null = null;
  let hovered: number | null = null;
  let selectedColor: string = PALETTE[0];

  // Pick the first swatch by default so the claim bar always has a valid
  // (palette-validated) color selected before the user touches anything.
  if (swatchButtons[0]) swatchButtons[0].setAttribute('data-selected', '');

  function setCount(n: number) {
    countNums.forEach((el) => {
      el.textContent = String(n);
    });
  }

  function paintCell(entry: PlotCell) {
    filled.set(entry.cell, entry);
    const btn = cellButtons[entry.cell];
    if (!btn) return;
    btn.style.background = safeColor(entry.color);
    btn.setAttribute('data-filled', '');
    // entry.name is attacker-controlled text from arbitrary internet users.
    // setAttribute never parses its value as markup, so this is safe —
    // unlike the innerHTML/string-concatenation patterns this file must not use.
    // Wording deliberately avoids the substring "claim" (unlike "claimed by") so
    // that a role query for the *claim button* — e.g. getByRole('button', { name: /claim/ })
    // — can't accidentally match every filled/empty grid cell too.
    const coord = cellToCoord(entry.cell);
    btn.setAttribute('aria-label', `${coord}, taken by ${entry.name}`);
  }

  function showTooltipFor(i: number) {
    const entry = filled.get(i);
    const btn = cellButtons[i];
    if (!entry || !btn) {
      tooltipEl.hidden = true;
      return;
    }
    const r = btn.getBoundingClientRect();
    const w = rootEl.getBoundingClientRect();
    const x = r.left - w.left + r.width / 2;
    const y = r.top - w.top - 8;
    tooltipEl.style.left = `${Math.max(130, Math.min(w.width - 130, x))}px`;
    tooltipEl.style.top = `${y}px`;
    tooltipSwatchEl.style.background = safeColor(entry.color);
    // textContent, never innerHTML — entry.msg/entry.name are user-supplied.
    tooltipMsgEl.textContent = entry.msg;
    const coord = full ? ` · ${cellToCoord(i)}` : '';
    tooltipMetaEl.textContent = `${entry.name} · ${fmtDate(entry.created_at)}${coord}`;
    tooltipEl.hidden = false;
  }

  function hideTooltip() {
    hovered = null;
    tooltipEl.hidden = true;
  }

  // Always the real newest rows, regardless of hover state. A guestbook
  // entry showing up in both the tooltip and this list at the same time is
  // expected — the tooltip is scoped to its own container, so there's no
  // duplicate-text ambiguity for anything reading the page to resolve.
  function renderRecent() {
    if (!recentList) return;
    while (recentList.firstChild) recentList.removeChild(recentList.firstChild);
    const rows = Array.from(filled.values())
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 8);
    for (const entry of rows) {
      const row = document.createElement('div');
      row.className = 'recent-row';

      const swatch = document.createElement('span');
      swatch.className = 'recent-swatch';
      swatch.style.background = safeColor(entry.color);

      const coord = document.createElement('span');
      coord.className = 'recent-coord mono';
      coord.textContent = cellToCoord(entry.cell);

      const msg = document.createElement('span');
      msg.className = 'recent-msg';
      // textContent — entry.msg is attacker-controlled, never built via innerHTML.
      msg.textContent = entry.msg;

      const meta = document.createElement('span');
      meta.className = 'recent-meta mono';
      // textContent — entry.name is attacker-controlled, never built via innerHTML.
      meta.textContent = `${entry.name} · ${fmtDate(entry.created_at)}`;

      row.appendChild(swatch);
      row.appendChild(coord);
      row.appendChild(msg);
      row.appendChild(meta);
      recentList.appendChild(row);
    }
  }

  function showError(msg: string) {
    if (!errorLine) return;
    errorLine.textContent = msg;
    errorLine.hidden = false;
  }

  function clearError() {
    if (!errorLine) return;
    errorLine.hidden = true;
    errorLine.textContent = '';
  }

  // The entire claim bar — swatches, both inputs, and buttons — is gated on
  // pending state via the `hidden` property (not a CSS-only hide), so it's
  // fully out of the DOM's accessibility tree and tab order until an empty
  // cell is clicked, exactly like the prototype's `sc-if value="{{ claiming }}"`.
  function openClaimBar(i: number) {
    if (mine !== null) return;
    if (filled.has(i)) return;
    if (pending !== null) cellButtons[pending]?.removeAttribute('data-pending');
    pending = i;
    cellButtons[i]?.setAttribute('data-pending', '');
    if (claimBtn) claimBtn.textContent = `claim ${cellToCoord(i)}`;
    if (claimBar) claimBar.hidden = false;
    clearError();
  }

  function closeClaimBar() {
    if (pending !== null) cellButtons[pending]?.removeAttribute('data-pending');
    pending = null;
    if (claimBar) claimBar.hidden = true;
  }

  cellButtons.forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => {
      hovered = i;
      showTooltipFor(i);
    });
    btn.addEventListener('click', () => openClaimBar(i));
  });
  gridEl.addEventListener('mouseleave', hideTooltip);

  swatchButtons.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      selectedColor = PALETTE[i];
      swatchButtons.forEach((b, j) => {
        if (j === i) b.setAttribute('data-selected', '');
        else b.removeAttribute('data-selected');
      });
    });
  });

  cancelBtn?.addEventListener('click', closeClaimBar);

  async function loadPlot() {
    let res: Response;
    try {
      res = await fetch('/api/plot');
    } catch {
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as PlotResponse;
    data.cells.forEach(paintCell);
    setCount(data.cells.length);
    mine = data.mine;
    if (mine !== null) {
      if (claimedCoordEl) claimedCoordEl.textContent = cellToCoord(mine);
      if (claimedLine) claimedLine.hidden = false;
      // Once claimed, no further pixels can be picked.
      closeClaimBar();
    }
    renderRecent();
    // The fetch may resolve after a mouseenter already fired against an
    // empty (not-yet-painted) grid — re-show the tooltip now that the
    // hovered cell's data (if any) has arrived.
    if (hovered !== null) showTooltipFor(hovered);
  }

  async function submitClaim() {
    if (pending === null || !claimBtn) return;
    const cell = pending;
    const name = (nameInput?.value ?? '').trim();
    const msg = (msgInput?.value ?? '').trim();
    clearError();
    claimBtn.setAttribute('disabled', '');

    let res: Response;
    try {
      res = await fetch('/api/plot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cell, name, msg, color: selectedColor }),
      });
    } catch {
      claimBtn.removeAttribute('disabled');
      showError('something went wrong. try again.');
      return;
    }
    claimBtn.removeAttribute('disabled');

    if (res.status === 400) {
      showError(await errorMessage(res));
      return;
    }

    if (res.status === 409) {
      const message = await errorMessage(res);
      closeClaimBar();
      await loadPlot();
      showError(message);
      return;
    }

    if (res.status === 201) {
      const data = (await res.json()) as { ok: true; cell: number };
      paintCell({ cell: data.cell, name, msg, color: selectedColor, created_at: Date.now() });
      mine = data.cell;
      if (claimedCoordEl) claimedCoordEl.textContent = cellToCoord(data.cell);
      if (claimedLine) claimedLine.hidden = false;
      closeClaimBar();
      setCount(filled.size);
      renderRecent();
      if (nameInput) nameInput.value = '';
      if (msgInput) msgInput.value = '';
      return;
    }

    showError('something went wrong. try again.');
  }

  claimBtn?.addEventListener('click', submitClaim);

  void loadPlot();
}
