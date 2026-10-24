/**
 * App Store product ids for bundle com.gzzhijia.khomeeasy.
 * The project pass is a consumable so a second project can be bought.
 * The workbench product is an auto-renewable monthly subscription.
 * Paid placement is not a product. Ranking does not read these ids.
 */
export const PROJECT_PRO_PASS_ID = 'com.gzzhijia.khomeeasy.project_pro_pass';
export const PARTNER_WORKBENCH_MONTHLY_ID = 'com.gzzhijia.khomeeasy.partner_workbench_monthly';

export const PROJECT_PRO_PASS_PRICE_MILLIUNITS = 79_000;
export const PARTNER_WORKBENCH_PRICE_MILLIUNITS = 89_000;
export const PURCHASE_CURRENCY = 'EUR';

export type ProductKind = 'project_pass' | 'workbench_subscription';
export type PurchaseMode = 'purchase' | 'restore';

export type OwnedProject = {
  id: string;
  title: string;
  unlocked: boolean;
};

export type ProjectChoice = { kind: 'existing'; id: string } | { kind: 'create'; title: string };

export type PurchaseReceiptView = {
  transactionId: string;
  productKind: ProductKind;
  priceMilliunits: number;
  currency: string;
  purchasedAt: string;
  expiresAt: string | null;
  projectId: string | null;
  projectTitle: string | null;
};

export type PurchaseProjectView = {
  id: string;
  title: string;
  isProUnlocked: boolean;
};

export type PurchaseAccountView = {
  receipts: PurchaseReceiptView[];
  projects: PurchaseProjectView[];
  subscriptionActive: boolean;
  installerProfileMissing: boolean;
};

export function productKindForId(productId: string): ProductKind | null {
  if (productId === PROJECT_PRO_PASS_ID) {
    return 'project_pass';
  }
  if (productId === PARTNER_WORKBENCH_MONTHLY_ID) {
    return 'workbench_subscription';
  }
  return null;
}

export function catalogPriceMilliunits(kind: ProductKind): number {
  return kind === 'project_pass' ? PROJECT_PRO_PASS_PRICE_MILLIUNITS : PARTNER_WORKBENCH_PRICE_MILLIUNITS;
}

/** A restore must not open a second project. Only a new purchase of the consumable may. */
export function allowsProjectUnlock(mode: PurchaseMode, kind: ProductKind): boolean {
  return mode === 'purchase' && kind === 'project_pass';
}

export function subscriptionIsActive(input: {
  expiresAt: string | null;
  revokedAt: string | null;
  now: number;
}): boolean {
  if (input.revokedAt) {
    return false;
  }
  if (!input.expiresAt) {
    return false;
  }
  const expires = Date.parse(input.expiresAt);
  return Number.isFinite(expires) && expires > input.now;
}

export function isStoreKitJws(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 10 && part.length < 20000);
}

/**
 * Bind one consumable to one owned project.
 * Projects are passed newest first. An already unlocked project is not reused.
 */
export function chooseProjectForPass(input: {
  projects: readonly OwnedProject[];
  requestedProjectId: string | null;
  designTitle: string;
}): ProjectChoice {
  const title = input.designTitle.trim().slice(0, 120) || 'KHomeEasy';
  const requested = input.requestedProjectId
    ? input.projects.find((project) => project.id === input.requestedProjectId) ?? null
    : null;
  if (requested && !requested.unlocked) {
    return { kind: 'existing', id: requested.id };
  }
  const sameTitle = input.projects.find((project) => !project.unlocked && project.title === title);
  if (sameTitle) {
    return { kind: 'existing', id: sameTitle.id };
  }
  if (!requested) {
    const open = input.projects.find((project) => !project.unlocked);
    if (open) {
      return { kind: 'existing', id: open.id };
    }
  }
  return { kind: 'create', title };
}
