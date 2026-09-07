// Minimal UI sound effects, six files pulled from uisfx's "minimal" pack
// (CC0 audio) — dry and clicky, matching this site's restrained look. See
// public/sfx/ for the files and .superpowers/sound-report.md for the pick.
//
// Audio elements are created lazily on first actual play(), never on load,
// and every failure (blocked autoplay, missing file, no Audio support) is
// swallowed silently — a broken sound must never break the interaction it
// accompanies.

const KEY = 'shifan-sound';
const VOLUME = 0.3;
const FLOOR_MS = 80;

const FILES = {
  success: '/sfx/success.mp3',
  blocked: '/sfx/blocked.mp3',
  copy: '/sfx/copy.mp3',
  toggle: '/sfx/toggle-on.mp3',
  open: '/sfx/open.mp3',
  select: '/sfx/select.mp3',
} as const;

export type SoundName = keyof typeof FILES;

const cache = new Map<SoundName, HTMLAudioElement>();
const lastPlayed = new Map<SoundName, number>();
let mutedState: boolean | null = null;

function readStored(): 'on' | 'off' | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  if (mutedState !== null) return mutedState;
  const stored = readStored();
  if (stored) {
    mutedState = stored === 'off';
  } else {
    let reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      /* matchMedia unsupported */
    }
    mutedState = reduced;
  }
  return mutedState;
}

export function setMuted(next: boolean): void {
  mutedState = next;
  try {
    localStorage.setItem(KEY, next ? 'off' : 'on');
  } catch {
    /* private mode */
  }
}

export function toggleMuted(): boolean {
  setMuted(!isMuted());
  return mutedState as boolean;
}

export function play(name: SoundName): void {
  try {
    if (isMuted()) return;
    const now = Date.now();
    if (now - (lastPlayed.get(name) ?? 0) < FLOOR_MS) return;
    lastPlayed.set(name, now);
    let audio = cache.get(name);
    if (!audio) {
      audio = new Audio(FILES[name]);
      audio.volume = VOLUME;
      cache.set(name, audio);
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    /* never let audio break the interaction it accompanies */
  }
}
