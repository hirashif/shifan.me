const GLYPHS = 'abcdefghijklmnopqrstuvwxyz$#%&*';
const TARGET = 'shifan';

export function initName() {
  const btn = document.querySelector<HTMLButtonElement>('[data-name]');
  if (!btn) return;

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      const settled = Math.floor(tick / 3); // one char settles every 3 ticks
      btn.textContent = TARGET.split('')
        .map((ch, i) => (i < settled ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join('');
      if (settled >= TARGET.length) {
        clearInterval(timer);
        btn.textContent = TARGET;
      }
    }, 45);
  } else {
    btn.textContent = TARGET;
  }

  const tip = document.querySelector<HTMLElement>('[data-name-tip]');
  const setOpen = (open: boolean) => {
    if (!tip) return;
    tip.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(Boolean(tip?.hidden));
  });
  document.addEventListener('click', (e) => {
    if (tip && !tip.hidden && !btn.contains(e.target as Node) && !tip.contains(e.target as Node)) {
      setOpen(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tip && !tip.hidden) {
      setOpen(false);
      btn.focus();
    }
  });
}
