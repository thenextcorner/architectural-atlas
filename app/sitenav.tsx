export default function SiteNav({dark}: {dark?: boolean}) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const links = [
    {href: '/', label: 'Atlas'},
    {href: '/candidates/', label: 'Candidates'},
    {href: '/leaderboard/', label: 'Leaderboard'},
    {href: '/about/', label: 'About'},
  ];
  return <nav className={`site-nav${dark ? ' site-nav-dark' : ''}`} aria-label="Site">
    {links.map(l => (
      <a key={l.href} href={l.href} {...(path === l.href ? {'aria-current': 'page'} : {})}>{l.label}</a>
    ))}
  </nav>;
}
