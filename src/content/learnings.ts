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
  'idempotency keys are cheaper than apologies.',
  'money bugs are different. everything else you can retry.',
  'a retry without a budget is an outage with extra steps.',
  'the bug is in the file you skimmed.',
  'say the number out loud. if it sounds wrong, it is.',
] as const;

// CLAUDE.md: learnings is capped at 15. Fail the build, not just a test.
if (learnings.length !== 15) {
  throw new Error(`learnings must be exactly 15, got ${learnings.length}`);
}
