export const BIRTH = Date.UTC(2002, 10, 26); // 2002-11-26
export const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

export function calcUptime(): string {
  return ((Date.now() - BIRTH) / YEAR_MS).toFixed(9);
}

export function initUptime() {
  const el = document.querySelector<HTMLElement>('[data-uptime]');
  if (!el) return;
  const tick = () => {
    el.textContent = calcUptime();
  };
  tick();
  setInterval(tick, 100);
}
