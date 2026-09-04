export interface Skill {
  slug: string;
  label: string;
}

export const stack: Skill[] = [
  { slug: 'go', label: 'go' },
  { slug: 'openjdk', label: 'java' },
  { slug: 'python', label: 'python' },
  { slug: 'typescript', label: 'typescript' },
  { slug: 'postgresql', label: 'postgres' },
  { slug: 'apachekafka', label: 'kafka' },
  { slug: 'redis', label: 'redis' },
  { slug: 'springboot', label: 'spring boot' },
  { slug: 'kubernetes', label: 'kubernetes' },
  { slug: 'docker', label: 'docker' },
  { slug: 'claude', label: 'claude code' },
  { slug: 'cursor', label: 'cursor' },
  { slug: 'opencode', label: 'opencode' },
  { slug: 'react', label: 'react' },
];
