export const learnings = [
  'sleep is a performance optimization.',
  'the gym is therapy.',
  "you will not remember the thing you're anxious about in a year. you will remember who showed up.",
  'nobody is thinking about you as much as you think they are. this is good news.',
  "everything today traces back to something small you've already forgotten.",
  'reading is the cheapest way into a better mind than your own.',
  "it isn't hard. it's just new.",
  'fc barcelona, lewis hamilton, houston rockets.',
  'you can just do things.',
  'delayed gratification is a skill, not a personality trait.',
  'ask what would make this wrong before asking what would make it faster.',
  "a result you can't reproduce isn't a result.",
  'write it down before you fix it. the fix changes what you remember.',
  'being wrong early is cheap. being wrong late is not.',
  'measure it before you argue about it.',
] as const;

// CLAUDE.md: learnings is capped at 15. Fail the build, not just a test.
if (learnings.length !== 15) {
  throw new Error(`learnings must be exactly 15, got ${learnings.length}`);
}
