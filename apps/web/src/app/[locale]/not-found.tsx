import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function LocaleNotFound() {
  const t = await getTranslations('NotFound');
  const header = await getTranslations('Header');

  return (
    <main className="mx-auto max-w-page px-6 py-24">
      <h1 className="font-serif text-4xl font-semibold">{t('title')}</h1>
      <p className="mt-4 text-lg text-muted">{t('body')}</p>
      <p className="mt-8">
        <Link href="/" className="font-semibold text-brass underline">
          {header('brand')}
        </Link>
      </p>
    </main>
  );
}
