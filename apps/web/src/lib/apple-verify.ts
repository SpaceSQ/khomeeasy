import 'server-only';

import {
  AppStoreServerAPIClient,
  Environment,
  InAppOwnershipType,
  SignedDataVerifier,
  Type,
  VerificationException,
  type JWSTransactionDecodedPayload
} from '@apple/app-store-server-library';
import {
  PURCHASE_CURRENCY,
  catalogPriceMilliunits,
  productKindForId,
  type ProductKind
} from '@khomeeasy/shared-types';
import { APPLE_ROOT_CERTS_BASE64 } from './apple-roots';

export const APPLE_BUNDLE_ID = 'com.gzzhijia.khomeeasy';

export class PurchaseFlowError extends Error {
  constructor(
    readonly code:
      | 'missing'
      | 'session'
      | 'role'
      | 'invalid'
      | 'product'
      | 'type'
      | 'account'
      | 'conflict'
      | 'pass_not_restored'
      | 'unavailable'
  ) {
    super(code);
  }
}

export type VerifiedAppleTransaction = {
  transactionId: string;
  originalTransactionId: string | null;
  productId: string;
  productKind: ProductKind;
  purchasedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  priceMilliunits: number;
  currency: string;
  environment: Environment.SANDBOX | Environment.PRODUCTION;
  appAccountToken: string | null;
};

const verifiers = new Map<string, SignedDataVerifier>();

function appleRootCertificates(): Buffer[] {
  return APPLE_ROOT_CERTS_BASE64.map((value) => Buffer.from(value, 'base64'));
}

function appAppleId(): number | undefined {
  const raw = process.env.APPLE_APP_APPLE_ID?.trim() ?? '';
  if (!/^\d{6,}$/.test(raw)) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : undefined;
}

function verifierFor(environment: Environment.SANDBOX | Environment.PRODUCTION): SignedDataVerifier | null {
  if (environment === Environment.PRODUCTION && appAppleId() == null) {
    return null;
  }
  const cached = verifiers.get(environment);
  if (cached) {
    return cached;
  }
  const created = new SignedDataVerifier(
    appleRootCertificates(),
    true,
    environment,
    APPLE_BUNDLE_ID,
    environment === Environment.PRODUCTION ? appAppleId() : undefined
  );
  verifiers.set(environment, created);
  return created;
}

function isoMillis(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return new Date(value).toISOString();
}

function expectedStoreType(kind: ProductKind): Type {
  return kind === 'project_pass' ? Type.CONSUMABLE : Type.AUTO_RENEWABLE_SUBSCRIPTION;
}

function toVerified(decoded: JWSTransactionDecodedPayload): VerifiedAppleTransaction {
  const productId = decoded.productId ?? '';
  const productKind = productKindForId(productId);
  const transactionId = decoded.transactionId ?? '';
  const purchasedAt = isoMillis(decoded.purchaseDate);
  const environment = decoded.environment;
  if (!productKind || !transactionId || !purchasedAt) {
    throw new PurchaseFlowError('product');
  }
  if (decoded.bundleId !== APPLE_BUNDLE_ID) {
    throw new PurchaseFlowError('invalid');
  }
  if (environment !== Environment.SANDBOX && environment !== Environment.PRODUCTION) {
    throw new PurchaseFlowError('invalid');
  }
  if (decoded.type !== expectedStoreType(productKind)) {
    throw new PurchaseFlowError('type');
  }
  if (decoded.inAppOwnershipType === InAppOwnershipType.FAMILY_SHARED) {
    throw new PurchaseFlowError('account');
  }
  const price = typeof decoded.price === 'number' && Number.isFinite(decoded.price) ? decoded.price : catalogPriceMilliunits(productKind);
  return {
    transactionId,
    originalTransactionId: decoded.originalTransactionId ?? null,
    productId,
    productKind,
    purchasedAt,
    expiresAt: isoMillis(decoded.expiresDate),
    revokedAt: isoMillis(decoded.revocationDate),
    priceMilliunits: price,
    currency: decoded.currency || PURCHASE_CURRENCY,
    environment,
    appAccountToken: decoded.appAccountToken ?? null
  };
}

async function decodeForEnvironment(
  signedTransaction: string,
  environment: Environment.SANDBOX | Environment.PRODUCTION
): Promise<JWSTransactionDecodedPayload | null> {
  const verifier = verifierFor(environment);
  if (!verifier) {
    return null;
  }
  try {
    return await verifier.verifyAndDecodeTransaction(signedTransaction);
  } catch (error) {
    if (error instanceof VerificationException) {
      console.error('apple signature', error.status);
      return null;
    }
    console.error('apple signature');
    return null;
  }
}

function apiCredentials(): { signingKey: string; keyId: string; issuerId: string } | null {
  const signingKey = (process.env.APPLE_IAP_PRIVATE_KEY ?? '').replace(/\\n/g, '\n').trim();
  const keyId = process.env.APPLE_IAP_KEY_ID?.trim() ?? '';
  const issuerId = process.env.APPLE_IAP_ISSUER_ID?.trim() ?? '';
  if (!signingKey || !keyId || !issuerId) {
    return null;
  }
  return { signingKey, keyId, issuerId };
}

async function confirmOnAppStoreServer(verified: VerifiedAppleTransaction): Promise<void> {
  const credentials = apiCredentials();
  if (!credentials) {
    return;
  }
  try {
    const client = new AppStoreServerAPIClient(
      credentials.signingKey,
      credentials.keyId,
      credentials.issuerId,
      APPLE_BUNDLE_ID,
      verified.environment
    );
    const info = await client.getTransactionInfo(verified.transactionId);
    const signed = info.signedTransactionInfo;
    if (!signed) {
      throw new PurchaseFlowError('invalid');
    }
    const verifier = verifierFor(verified.environment);
    if (!verifier) {
      throw new PurchaseFlowError('unavailable');
    }
    const decoded = await verifier.verifyAndDecodeTransaction(signed);
    if (decoded.transactionId !== verified.transactionId || decoded.productId !== verified.productId) {
      throw new PurchaseFlowError('invalid');
    }
  } catch (error) {
    if (error instanceof PurchaseFlowError) {
      throw error;
    }
    console.error('apple transaction lookup');
    throw new PurchaseFlowError('invalid');
  }
}

/**
 * Checks the StoreKit 2 JWS against Apple's certificate chain and Apple's
 * revocation service. When an App Store Server API key is configured, the
 * transaction id is also loaded from Apple and checked again.
 * The signed transaction is not written to logs.
 */
export async function verifyAppleSignedTransaction(signedTransaction: string): Promise<VerifiedAppleTransaction> {
  const production = await decodeForEnvironment(signedTransaction, Environment.PRODUCTION);
  const decoded = production ?? (await decodeForEnvironment(signedTransaction, Environment.SANDBOX));
  if (!decoded) {
    throw new PurchaseFlowError('invalid');
  }
  const verified = toVerified(decoded);
  await confirmOnAppStoreServer(verified);
  return verified;
}
