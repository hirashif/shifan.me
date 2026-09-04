export interface WorkRow {
  title: string;
  role: string;
  desc: string;
  dates: string;
  isCurrent?: boolean;
}

export const work: WorkRow[] = [
  {
    title: 'paycom',
    role: 'software developer ii, crm team',
    desc: 'backend crm services and internal tools. tax dashboards and event-driven tasking.',
    dates: 'sep 2024 – jun 2026',
  },
  {
    title: 'alpha kappa psi',
    role: 'co-founder, vp finance',
    desc: 'founded the lambda chi chapter and ran its finances.',
    dates: 'aug 2023 – may 2024',
  },
  {
    title: 'resi media',
    role: 'software engineer intern',
    desc: 'content library team. backend apis for the live-streaming pipeline.',
    dates: 'may 2023 – aug 2023',
  },
  {
    title: 'resi media',
    role: 'software engineer intern',
    desc: 'media team. rtmp pipeline work for youtube and twitch.',
    dates: 'may 2022 – aug 2022',
  },
  {
    title: 'aga khan foundation',
    role: 'intern',
    desc: 'wash and education outreach in hyderabad.',
    dates: 'jun 2019 – jul 2019',
  },
];
