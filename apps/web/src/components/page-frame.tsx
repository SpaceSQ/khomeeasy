import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader, type SitePage } from '@/components/site-header';

export function PageFrame({ current, children }: { current: SitePage; children: ReactNode }) {
  return (
    <>
      <SiteHeader current={current} />
      <main id="content">
        <div className="wrap">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
