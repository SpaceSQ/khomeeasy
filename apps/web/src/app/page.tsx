import type { Metadata } from 'next';
import { Heading, Stacked } from '@/components/bilingual';
import { FloorPlan } from '@/components/floor-plan';
import { PageFrame } from '@/components/page-frame';
import { home, legal } from '@/content/copy';

export const metadata: Metadata = {
  title: { absolute: home.title },
  description: home.description
};

export default function HomePage() {
  return (
    <PageFrame current="home">
      <div className="hero">
        <div>
          <p className="kicker">{home.kicker}</p>
          <h1>{home.title}</h1>
          <Stacked en={home.lede.en} de={home.lede.de} />
        </div>
        <FloorPlan />
      </div>

      <section>
        <Heading en={home.path.en} de={home.path.de} />
        <Stacked en={home.path.lede.en} de={home.path.lede.de} />
        <div className="grid">
          {home.cards.map((card) => (
            <article key={card.en} className="module">
              <h3>
                {card.en}
                <span lang="de">{card.de}</span>
              </h3>
              <p>{card.body.en}</p>
              <p className="alt" lang="de">
                {card.body.de}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <Heading en={home.signIn.en} de={home.signIn.de} />
        <Stacked en={home.signIn.lede.en} de={home.signIn.lede.de} />
      </section>

      <section>
        <Heading en={home.purchase.en} de={home.purchase.de} />
        <Stacked en={home.purchase.lede.en} de={home.purchase.lede.de} />
      </section>

      <div className="notice">
        <p>
          <strong>{home.notice.en}</strong>
        </p>
        <p className="alt" lang="de">
          <strong>{home.notice.de}</strong>
        </p>
        <p>{legal.en}</p>
        <p className="alt" lang="de">
          {legal.de}
        </p>
      </div>

      <p>
        {home.close.enLead} <a href="/support">{home.close.support}</a>. {home.close.enMid}{' '}
        <a href="/privacy">{home.close.privacy}</a>.
      </p>
      <p className="alt" lang="de">
        {home.close.deLead} <a href="/support">{home.close.supportDe}</a>. {home.close.deMid}{' '}
        <a href="/privacy">{home.close.privacyDe}</a>.
      </p>
    </PageFrame>
  );
}
