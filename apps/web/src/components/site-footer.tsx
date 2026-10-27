import { footer, product, publisher } from '@/content/copy';

export function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <p>{product.name}</p>
        <p>
          {publisher.zh} · {publisher.en}
        </p>
        <p lang="en">{footer.trademark}</p>
        <p>{footer.apple}</p>
      </div>
    </footer>
  );
}
