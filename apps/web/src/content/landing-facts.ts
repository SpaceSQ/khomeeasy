import type { EvidenceLevel } from '@khomeeasy/shared-types';

export type LandingFactId =
  | 'standard'
  | 'catalogue'
  | 'count'
  | 'budget'
  | 'ranking'
  | 'handover';

export type LandingFact = {
  id: LandingFactId;
  level: EvidenceLevel;
  sourceUrl: string;
  verifiedAt: string;
};

export const landingFacts: readonly LandingFact[] = [
  {
    id: 'standard',
    level: 'E1',
    sourceUrl: 'https://support.knx.org/hc/en-us/article_attachments/360000496299',
    verifiedAt: '2026-10-20'
  },
  {
    id: 'catalogue',
    level: 'E2',
    sourceUrl: 'https://www.jung-group.com/de-DE/Service/Tools-Services/JUNG-Konfiguratoren/',
    verifiedAt: '2026-10-20'
  },
  {
    id: 'count',
    level: 'E3',
    sourceUrl: 'https://www.knx.org/find-an-installer',
    verifiedAt: '2026-10-20'
  },
  {
    id: 'budget',
    level: 'E4',
    sourceUrl: 'https://bau-lex.de/knx',
    verifiedAt: '2026-10-20'
  },
  {
    id: 'ranking',
    level: 'E1',
    sourceUrl:
      'https://support.knx.org/hc/en-us/articles/360021060119-KNX-Partner-Ranking-Credits-levels-and-benefits',
    verifiedAt: '2026-10-20'
  },
  {
    id: 'handover',
    level: 'E1',
    sourceUrl:
      'https://www.ris.bka.gv.at/Dokumente/Justiz/JJT_20151125_OGH0002_0080OB00121_15Z0000_000/JJT_20151125_OGH0002_0080OB00121_15Z0000_000.html',
    verifiedAt: '2026-10-20'
  }
];
