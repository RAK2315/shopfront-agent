export const SHOP_ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'OUT_OF_STOCK',
  'MULTI_SELLER',
  'FORBIDDEN',
  'CHECKOUT_EXPIRED',
  'NOT_REFUNDABLE',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'CONFLICT',
  'SELLER_NOT_READY',
] as const;

export type ShopErrorCode = (typeof SHOP_ERROR_CODES)[number];

export class ShopError extends Error {
  readonly code: ShopErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ShopErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ShopError';
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) } };
  }
}

export function isShopError(e: unknown): e is ShopError {
  return e instanceof ShopError;
}
