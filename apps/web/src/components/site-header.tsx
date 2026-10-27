import { nav, product, publisher } from '@/content/copy';

export type SitePage = 'home' | 'support' | 'privacy' | 'none';

const links = [
  { id: 'home' as const, href: '/', label: nav.home },
  { id: 'support' as const, href: '/support', label: nav.support },
  { id: 'privacy' as const, href: '/privacy', label: nav.privacy }
];

export function SiteHeader({ current }: { current: SitePage }) {
  return (
    <header className="site">
      <a className="skip" href="#content">
        {nav.skip}
      </a>
      <div className="wrap bar">
        <a className="brand" href="/">
          <img src="/logo.png" alt="" width={36} height={36} />
          <span className="brand-text">
            {product.name}
            <small>{publisher.zh}</small>
          </span>
        </a>
        <nav aria-label={nav.label}>
          {links.map((link) => (
            <a key={link.id} href={link.href} aria-current={current === link.id ? 'page' : undefined}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
