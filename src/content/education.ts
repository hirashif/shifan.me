export interface EducationRow {
  school: string;
  degree: string;
  meta: string;
  note?: string;
}

export const education: EducationRow[] = [
  {
    school: 'texas a&m',
    degree: 'b.s. computer science',
    meta: '2020 – 2024',
    note: 'business concentration. distinguished student, three semesters.',
  },
  {
    school: 'the aga khan academy',
    degree: 'international baccalaureate',
    meta: 'hyderabad',
  },
];
