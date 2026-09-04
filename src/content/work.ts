export interface WorkRow {
  title: string;
  role: string;
  desc: string;
  dates: string;
  isCurrent?: boolean;
  logo?: string;
}

export const work: WorkRow[] = [
  {
    title: 'paycom',
    role: 'software developer II, crm team',
    desc: 'backend crm services and internal tools.',
    dates: 'sep 2024 – may 2026',
    logo: '/logos/paycom.png',
  },
  {
    title: 'alpha kappa psi',
    role: 'co-founder, vp finance',
    desc: 'founded the lambda chi chapter and ran its finances.',
    dates: 'aug 2023 – may 2024',
    logo: '/logos/akpsi.png',
  },
  {
    title: 'resi media',
    role: 'software engineer intern',
    desc: 'content library team. backend apis for the live-streaming pipeline.',
    dates: 'may 2023 – aug 2023',
    logo: '/logos/resi.png',
  },
  {
    title: 'resi media',
    role: 'software engineer intern',
    desc: 'media team. rtmp pipeline work for youtube and twitch.',
    dates: 'may 2022 – aug 2022',
    logo: '/logos/resi.png',
  },
  {
    title: 'aga khan foundation',
    role: 'intern',
    desc: 'wash and education outreach in hyderabad.',
    dates: 'jun 2019 – jul 2019',
    logo: '/logos/akf.png',
  },
];
