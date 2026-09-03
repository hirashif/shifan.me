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
    desc: 'built a tax dashboard over php and c# sync services, and event-driven tasking across microservices. stabilized a sync process that hung at tens of thousands of requests a minute.',
    dates: 'sep 2024 – jun 2026',
  },
  {
    title: 'alpha kappa psi',
    role: 'co-founder, vp finance',
    desc: 'founded the lambda chi chapter at texas a&m and ran its finances for the first year.',
    dates: 'aug 2023 – may 2024',
  },
  {
    title: 'resi media',
    role: 'software engineer intern',
    desc: 'content library team. backend apis for the live-streaming pipeline, redis caching, and a mapping-framework rewrite.',
    dates: 'may 2023 – aug 2023',
  },
  {
    title: 'resi media',
    role: 'software engineer intern',
    desc: 'media team. rtmp pipeline work for youtube and twitch, and unit tests up to 85% coverage.',
    dates: 'may 2022 – aug 2022',
  },
  {
    title: 'aga khan foundation',
    role: 'intern',
    desc: 'hyderabad.',
    dates: 'jun 2019 – jul 2019',
  },
  {
    title: 'texas a&m',
    role: 'b.s. computer science',
    desc: 'business concentration. distinguished student, three semesters.',
    dates: '2020 – 2024',
  },
];
