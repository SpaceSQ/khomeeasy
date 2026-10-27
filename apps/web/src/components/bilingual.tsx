import type { ReactNode } from 'react';

export function Stacked({ en, de }: { en: string; de: string }) {
  return (
    <>
      <p className="lede">{en}</p>
      <p className="alt" lang="de">
        {de}
      </p>
    </>
  );
}

export function Pair({ en, de }: { en: ReactNode; de: ReactNode }) {
  return (
    <div className="split">
      <div>{en}</div>
      <div lang="de">{de}</div>
    </div>
  );
}

export function Heading({ en, de }: { en: string; de: string }) {
  return (
    <h2>
      {en} <span lang="de">{de}</span>
    </h2>
  );
}

export function TwinList({ en, de }: { en: readonly string[]; de: readonly string[] }) {
  return (
    <Pair
      en={
        <ul>
          {en.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      }
      de={
        <ul>
          {de.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      }
    />
  );
}
