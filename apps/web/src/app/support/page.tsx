import type { Metadata } from 'next';
import { Heading, Pair, Stacked, TwinList } from '@/components/bilingual';
import { PageFrame } from '@/components/page-frame';
import { support, supportIssuesUrl } from '@/content/copy';

export const metadata: Metadata = {
  title: { absolute: 'KHomeEasy Support' },
  description: support.description
};

export default function SupportPage() {
  return (
    <PageFrame current="support">
      <p className="kicker">{support.kicker}</p>
      <h1>{support.heading}</h1>
      <Stacked en={support.lede.en} de={support.lede.de} />

      <section>
        <Heading en={support.contact.en} de={support.contact.de} />
        <div className="contact">
          <Pair
            en={
              <>
                <p>
                  {support.contact.body.en}{' '}
                  <a href={supportIssuesUrl}>{supportIssuesUrl}</a>
                </p>
                <p>{support.contact.facts.en}</p>
              </>
            }
            de={
              <>
                <p>
                  {support.contact.body.de}{' '}
                  <a href={supportIssuesUrl}>{supportIssuesUrl}</a>
                </p>
                <p>{support.contact.facts.de}</p>
              </>
            }
          />
        </div>
      </section>

      <section>
        <Heading en={support.use.en} de={support.use.de} />
        <Pair en={<p>{support.use.intro.en}</p>} de={<p>{support.use.intro.de}</p>} />
        <TwinList en={support.use.items.en} de={support.use.items.de} />
      </section>

      <section>
        <Heading en={support.review.en} de={support.review.de} />
        <TwinList en={support.review.items.en} de={support.review.items.de} />
      </section>

      <section>
        <Heading en={support.stuck.en} de={support.stuck.de} />
        <TwinList en={support.stuck.items.en} de={support.stuck.items.de} />
      </section>

      <section>
        <Heading en={support.device.en} de={support.device.de} />
        <TwinList en={support.device.items.en} de={support.device.items.de} />
        <Pair
          en={
            <p>
              {support.device.more.enLead} <a href="/privacy">{support.device.more.enLink}</a>.
            </p>
          }
          de={
            <p>
              {support.device.more.deLead} <a href="/privacy">{support.device.more.deLink}</a>.
            </p>
          }
        />
      </section>

      <section>
        <Heading en={support.permissions.en} de={support.permissions.de} />
        <Pair en={<p>{support.permissions.intro.en}</p>} de={<p>{support.permissions.intro.de}</p>} />
        <TwinList en={support.permissions.items.en} de={support.permissions.items.de} />
      </section>

      <section>
        <Heading en={support.pass.en} de={support.pass.de} />
        <Pair
          en={
            <>
              <p>{support.pass.body.en}</p>
              <p>{support.pass.legal.en}</p>
            </>
          }
          de={
            <>
              <p>{support.pass.body.de}</p>
              <p>{support.pass.legal.de}</p>
            </>
          }
        />
      </section>

      <section>
        <Heading en={support.electrical.en} de={support.electrical.de} />
        <Pair
          en={
            <>
              <p>{support.electrical.body.en}</p>
              <p>{support.electrical.legal.en}</p>
            </>
          }
          de={
            <>
              <p>{support.electrical.body.de}</p>
              <p>{support.electrical.legal.de}</p>
            </>
          }
        />
      </section>
    </PageFrame>
  );
}
