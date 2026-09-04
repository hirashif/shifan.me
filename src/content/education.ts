export interface EducationRow {
  school: string;
  degree: string;
  meta: string;
  note?: string;
  logo?: string;
}

export const education: EducationRow[] = [
  {
    school: 'texas a&m',
    degree: 'b.s. computer science',
    meta: '2020 – 2024',
    note: 'business concentration. distinguished student, three semesters.',
    logo: '/logos/tamu.png',
  },
];
