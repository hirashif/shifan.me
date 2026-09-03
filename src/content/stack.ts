export interface Skill {
  slug: string;
  label: string;
  note: string;
}

export const stack: Skill[] = [
  {
    slug: 'go',
    label: 'go',
    note: "ledger's transfer service and the market pipeline consumers.",
  },
  {
    slug: 'openjdk',
    label: 'java',
    note: 'two years of it at paycom. tax engine, crm, a lot of spring.',
  },
  {
    slug: 'python',
    label: 'python',
    note: "the cross desk's analysts and every one-off script i've ever regretted.",
  },
  {
    slug: 'typescript',
    label: 'typescript',
    note: 'gridloom and anything with a browser in front of it.',
  },
  {
    slug: 'postgresql',
    label: 'postgres',
    note: 'balances table with a check constraint that has saved me twice.',
  },
  {
    slug: 'apachekafka',
    label: 'kafka',
    note: 'partitioned by symbol so order holds where it matters.',
  },
  {
    slug: 'redis',
    label: 'redis',
    note: 'idempotency keys with a ttl. nothing fancier than that.',
  },
  {
    slug: 'springboot',
    label: 'spring boot',
    note: 'the paycom default. i know its transaction manager too well.',
  },
  {
    slug: 'kubernetes',
    label: 'kubernetes',
    note: 'enough to ship, not enough to enjoy.',
  },
  {
    slug: 'docker',
    label: 'docker',
    note: 'every project has a compose file before it has a readme.',
  },
  {
    slug: 'terraform',
    label: 'terraform',
    note: 'cloud run + pubsub for ledger, all in one state file.',
  },
  {
    slug: 'claude',
    label: 'claude code',
    note: 'pair programmer. see the token bill in the footer.',
  },
];
