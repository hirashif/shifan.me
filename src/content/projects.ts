export interface Project {
  name: string;
  desc: string;
  href?: string;
}

export const projects: Project[] = [
  {
    name: 'ledger',
    href: 'https://github.com/hirashif/ledger',
    desc: 'double-entry ledger in java. idempotency keys, row-level locking, balance enforced by postgres.',
  },
  {
    name: 'crypto-market-pipeline',
    href: 'https://github.com/hirashif/crypto-market-pipeline',
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
