import type { Metadata } from 'next';
import { Stacked } from '@/components/bilingual';
import { PageFrame } from '@/components/page-frame';
import { missing } from '@/content/copy';

export const metadata: Metadata = {
  title: { absolute: 'KHomeEasy' }
};

export default function NotFound() {
  return (
    <PageFrame current="none">
      <p className="kicker">{missing.kicker}</p>
      <h1>{missing.heading}</h1>
      <Stacked en={missing.lede.en} de={missing.lede.de} />
      <p>
        <a href="/">{missing.home}</a>
      </p>
    </PageFrame>
  );
}
