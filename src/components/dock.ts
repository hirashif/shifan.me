import { isMuted, play, toggleMuted } from '../lib/sound';

const KEY = 'shifan-theme';

function current(): 'dark' | 'light' {
  return document.documentElement.classList.contains('th-light') ? 'light' : 'dark';
}

export function setTheme(next: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.toggle('th-light', next === 'light');
  root.classList.toggle('th-dark', next === 'dark');
  try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
  document.querySelectorAll<HTMLElement>('[data-theme-icon]').forEach((el) => {
    el.style.display = el.dataset.themeIcon === next ? '' : 'none';
  });
}

export function toggleTheme() {
  setTheme(current() === 'dark' ? 'light' : 'dark');
  play('toggle');
}

function renderSoundButton(btn: HTMLButtonElement) {
  const muted = isMuted();
  btn.setAttribute('aria-pressed', String(muted));
  btn.setAttribute('aria-label', muted ? 'unmute sounds' : 'mute sounds');
  btn.dataset.tip = muted ? 'unmute sounds' : 'mute sounds';
  document.querySelectorAll<HTMLElement>('[data-sound-icon]').forEach((el) => {
    el.style.display = el.dataset.soundIcon === (muted ? 'off' : 'on') ? '' : 'none';
  });
}

export function initSound() {
  const btn = document.querySelector<HTMLButtonElement>('[data-sound-toggle]');
  if (!btn) return;
  renderSoundButton(btn);
  btn.addEventListener('click', () => {
    toggleMuted();
    renderSoundButton(btn);
  });
}

export function initTheme() {
  setTheme(current());
  document.querySelector('[data-theme-toggle]')
    ?.addEventListener('click', toggleTheme);
}

function typing(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  if (!n) return false;
  return n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable;
}

export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (typing(e.target)) return;
    if (e.key === 't') { toggleTheme(); return; }
    if (e.key === 'g') {
      const plot = document.getElementById('plot');
      if (!plot) return;
      const y = plot.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
}
