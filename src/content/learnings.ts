export const learnings = [
  'idempotency keys are cheaper than apologies.',
  'call your mom. the meeting can wait.',
  "the boring design is only boring until it's wrong.",
  'nobody remembers what you said in the meeting. they remember if you were late.',
  'sleep is a performance optimization.',
  'write it down before the fix. the fix changes what you remember.',
  "you can't outwork a bad night's sleep or a bad manager.",
  'every yes is a debit somewhere.',
  "read the source. the docs are someone's memory of the source.",
  'the gym is cheaper than therapy and worse at it. do both.',
  "if the demo needs a caveat, the demo isn't ready.",
  'most meetings are a cache miss.',
  'say the number out loud. if it sounds wrong, it is.',
  'the second system is always slower. build the third one first.',
  'text back. even if it\'s just "saw this."',
  'a retry without a budget is an outage with extra steps.',
  "cook for people. it's the cheapest way to be liked.",
  'quit the thing before it quits you, but only after it taught you.',
  'nobody is thinking about you as much as you think they are. this is good news.',
  'buy the good chair.',
  'ask "what would make this wrong?" before "what would make this fast?"',
  'walk without headphones once a week.',
  "the ~7,000-person company doesn't care how clever the join was.",
  "you will not remember the thing you're anxious about in a year. you will remember who showed up.",
  'this list is capped at 25 on purpose.',
] as const;

// CLAUDE.md: learnings is capped at 25. Fail the build, not just a test.
if (learnings.length !== 25) {
  throw new Error(`learnings must be exactly 25, got ${learnings.length}`);
}
