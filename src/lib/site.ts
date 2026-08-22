export const SITE = {
  title: 'David Schneidinger',
  description: 'Essays and notes, mostly on physics and things adjacent to it.',
  author: 'David Schneidinger',
  url: 'https://dschneidinger.github.io',
} as const;

export const NAV = [
  { href: '/writing', label: 'Writing' },
  { href: '/notes', label: 'Notes' },
  { href: '/reading', label: 'Reading' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
] as const;
