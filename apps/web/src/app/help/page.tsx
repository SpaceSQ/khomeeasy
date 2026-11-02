import type { Metadata } from 'next';
import { Heading, Pair, Stacked, TwinList } from '@/components/bilingual';
import { PageFrame } from '@/components/page-frame';
import { helpPage } from '@/content/copy';

export const metadata: Metadata = {
  title: { absolute: 'KHomeEasy Help' },
  description: helpPage.lede.en
};

export default function HelpPage() {
  const pricing = helpPage.pricing;
  return (
    <PageFrame current="help">
      <p className="kicker">{helpPage.kicker}</p>
      <h1>{helpPage.heading.en}</h1>
      <Stacked en={helpPage.lede.en} de={helpPage.lede.de} />

      <section id="pricing">
        <Heading en={pricing.en} de={pricing.de} />
        <Pair en={<p>{pricing.body.en}</p>} de={<p>{pricing.body.de}</p>} />
        <Pair en={<p>{pricing.note.en}</p>} de={<p>{pricing.note.de}</p>} />

        <Heading en={pricing.ownerTitle.en} de={pricing.ownerTitle.de} />
        <Pair
          en={
            <>
              <p>
                <strong>{pricing.free.en}</strong>
              </p>
            </>
          }
          de={
            <>
              <p>
                <strong>{pricing.free.de}</strong>
              </p>
            </>
          }
        />
        <TwinList en={pricing.ownerFree.en} de={pricing.ownerFree.de} />
        <Pair
          en={
            <>
              <p>
                <strong>{pricing.paid.en}</strong>
              </p>
            </>
          }
          de={
            <>
              <p>
                <strong>{pricing.paid.de}</strong>
              </p>
            </>
          }
        />
        <TwinList en={pricing.ownerPaid.en} de={pricing.ownerPaid.de} />

        <Heading en={pricing.installerTitle.en} de={pricing.installerTitle.de} />
        <TwinList en={pricing.installerItems.en} de={pricing.installerItems.de} />
      </section>
    </PageFrame>
  );
}
