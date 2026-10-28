export interface Project {
  name: string;
  desc: string;
  href?: string;
}

export const projects: Project[] = [
  {
    name: 'meterline',
    href: 'https://github.com/hirashif/meterline',
    desc: 'prepaid usage billing. metered once, tiered pricing, auto-recharge, reconciliation that catches drift.',
  },
  {
    name: 'signal-router',
    href: 'https://github.com/hirashif/signal-router',
    desc: 'lead router into hubspot. enrichment, icp scoring, owner routing, nightly drift check.',
  },
  {
    name: 'bakeoff',
    href: 'https://github.com/bakeoff-dev/bakeoff',
    desc: 'race coding agents on your real issues. merge the winner.',
  },
  {
    name: 'tally',
    href: 'https://github.com/hirashif/tally',
    desc: 'double-entry ledger in java. idempotency keys, row-level locking, balance enforced by postgres.',
  },
  {
    name: 'tickstream',
    href: 'https://github.com/hirashif/tickstream',
    desc: 'go services streaming exchange data into kafka, on aks with terraform.',
  },
  {
    name: 'gridloom',
    href: 'https://github.com/hirashif/gridloom',
    desc: 'byok image studio. one prompt across 13 models, keys never leave the browser.',
  },
  {
    name: 'qs509',
    href: 'https://github.com/CSCE482QuantumCryptography/qs509',
    desc: 'post-quantum crypto primitives in go. capstone with l3harris.',
  },
  {
    name: 'the cross desk',
    desc: 'coming soon.',
  },
];
