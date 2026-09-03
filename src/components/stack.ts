export function initStack() {
  const chips = document.querySelectorAll<HTMLButtonElement>('[data-skill]');
  const note = document.querySelector<HTMLElement>('[data-skill-note]');
  const noteName = note?.querySelector<HTMLElement>('[data-skill-note-name]');
  const noteText = note?.querySelector<HTMLElement>('[data-skill-note-text]');
  let open = -1;

  chips.forEach((chip, i) => {
    chip.addEventListener('click', () => {
      const wasOpen = open === i;
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));

      if (wasOpen || !note) {
        open = -1;
        if (note) note.hidden = true;
        return;
      }

      open = i;
      chip.setAttribute('aria-pressed', 'true');
      if (noteName) noteName.textContent = chip.dataset.label ?? '';
      if (noteText) noteText.textContent = chip.dataset.note ?? '';
      note.hidden = false;
    });
  });
}
