import type { Metadata } from 'next';
import { Heading, Pair, Stacked } from '@/components/bilingual';
import { PageFrame } from '@/components/page-frame';
import { privacy, supportIssuesUrl } from '@/content/copy';

export const metadata: Metadata = {
  title: { absolute: 'KHomeEasy Privacy' },
  description: privacy.description
};

export default function PrivacyPage() {
  return (
    <PageFrame current="privacy">
      <p className="kicker">{privacy.kicker}</p>
      <h1>{privacy.heading}</h1>
      <Stacked en={privacy.lede.en} de={privacy.lede.de} />

      <section>
        <Heading en={privacy.apple.en} de={privacy.apple.de} />
        <Pair en={<p>{privacy.apple.body.en}</p>} de={<p>{privacy.apple.body.de}</p>} />
      </section>

      <section>
        <Heading en={privacy.account.en} de={privacy.account.de} />
        <Pair en={<p>{privacy.account.body.en}</p>} de={<p>{privacy.account.body.de}</p>} />
      </section>

      <section>
        <Heading en={privacy.designs.en} de={privacy.designs.de} />
        <Pair en={<p>{privacy.designs.body.en}</p>} de={<p>{privacy.designs.body.de}</p>} />
      </section>

      <section>
        <Heading en={privacy.pass.en} de={privacy.pass.de} />
        <Pair en={<p>{privacy.pass.body.en}</p>} de={<p>{privacy.pass.body.de}</p>} />
      </section>

      <section>
        <Heading en={privacy.site.en} de={privacy.site.de} />
        <Pair en={<p>{privacy.site.body.en}</p>} de={<p>{privacy.site.body.de}</p>} />
      </section>

      <section>
        <Heading en={privacy.questions.en} de={privacy.questions.de} />
        <Pair
          en={
            <p>
              {privacy.questions.before.en} <a href={supportIssuesUrl}>{supportIssuesUrl}</a>. {privacy.questions.after.enLead}{' '}
              <a href="/support">{privacy.questions.after.enLink}</a>.
            </p>
          }
          de={
            <p>
              {privacy.questions.before.de} <a href={supportIssuesUrl}>{supportIssuesUrl}</a>. {privacy.questions.after.deLead}{' '}
              <a href="/support">{privacy.questions.after.deLink}</a>.
            </p>
          }
        />
      </section>
    </PageFrame>
  );
}
