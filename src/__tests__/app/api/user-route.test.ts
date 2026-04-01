import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCurrentUserByToken = vi.fn();
const mockGetUser = vi.fn();
const mockGetSystemConfig = vi.fn();
const mockQueryMethodLimits = vi.fn();
const mockGetSupportedTypes = vi.fn();
const mockGetEnv = vi.fn();

vi.mock('@/lib/sub2api/client', () => ({
  getCurrentUserByToken: (...args: unknown[]) => mockGetCurrentUserByToken(...args),
  getUser: (...args: unknown[]) => mockGetUser(...args),
}));

vi.mock('@/lib/config', () => ({
  getEnv: () => mockGetEnv(),
}));

vi.mock('@/lib/order/limits', () => ({
  queryMethodLimits: (...args: unknown[]) => mockQueryMethodLimits(...args),
}));

vi.mock('@/lib/order/service', () => ({
  getDailyOrdersRemaining: vi.fn().mockResolvedValue(3),
}));

vi.mock('@/lib/payment', () => ({
  initPaymentProviders: vi.fn(),
  paymentRegistry: {
    getSupportedTypes: (...args: unknown[]) => mockGetSupportedTypes(...args),
  },
}));

vi.mock('@/lib/pay-utils', () => ({
  getPaymentDisplayInfo: (type: string) => ({
    channel: type === 'alipay_direct' ? 'alipay' : type,
    provider: type,
  }),
}));

vi.mock('@/lib/locale', () => ({
  resolveLocale: () => 'zh',
}));

vi.mock('@/lib/system-config', () => ({
  getSystemConfig: (...args: unknown[]) => mockGetSystemConfig(...args),
}));

import { GET } from '@/app/api/user/route';

function createRequest() {
  return new NextRequest('https://pay.example.com/api/user?user_id=1&token=test-token');
}

function defaultEnv(overrides: Record<string, unknown> = {}) {
  return {
    MIN_RECHARGE_AMOUNT: 1,
    MAX_RECHARGE_AMOUNT: 1000,
    MAX_DAILY_RECHARGE_AMOUNT: 10000,
    MAX_DAILY_ORDER_COUNT: 3,
    PAY_HELP_IMAGE_URL: undefined,
    PAY_HELP_TEXT: undefined,
    STRIPE_PUBLISHABLE_KEY: 'pk_test',
    SELLING_PRICE: 7.2,
    ENABLED_PAYMENT_TYPES: [],
    PAYMENT_SUBLABEL_ALIPAY: undefined,
    PAYMENT_SUBLABEL_ALIPAY_DIRECT: undefined,
    PAYMENT_SUBLABEL_WXPAY: undefined,
    PAYMENT_SUBLABEL_WXPAY_DIRECT: undefined,
    PAYMENT_SUBLABEL_STRIPE: undefined,
    ...overrides,
  };
}

describe('GET /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEnv.mockReturnValue(defaultEnv());
    mockGetCurrentUserByToken.mockResolvedValue({ id: 1 });
    mockGetUser.mockResolvedValue({ id: 1, status: 'active' });
    mockGetSupportedTypes.mockReturnValue(['alipay', 'wxpay', 'stripe']);
    mockQueryMethodLimits.mockResolvedValue({
      alipay: { maxDailyAmount: 1000 },
      wxpay: { maxDailyAmount: 1000 },
      stripe: { maxDailyAmount: 1000 },
    });
    mockGetSystemConfig.mockImplementation(async (key: string) => {
      if (key === 'BALANCE_PAYMENT_DISABLED') return 'false';
      return undefined;
    });
  });

  it('filters enabled payment types by ENABLED_PAYMENT_TYPES env', async () => {
    mockGetEnv.mockReturnValue(defaultEnv({ ENABLED_PAYMENT_TYPES: ['alipay', 'wxpay'] }));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.config.enabledPaymentTypes).toEqual(['alipay', 'wxpay']);
    expect(mockQueryMethodLimits).toHaveBeenCalledWith(['alipay', 'wxpay']);
  });

  it('falls back to supported payment types when ENABLED_PAYMENT_TYPES is empty', async () => {
    mockGetEnv.mockReturnValue(defaultEnv({ ENABLED_PAYMENT_TYPES: [] }));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.config.enabledPaymentTypes).toEqual(['alipay', 'wxpay', 'stripe']);
    expect(mockQueryMethodLimits).toHaveBeenCalledWith(['alipay', 'wxpay', 'stripe']);
  });

  it('falls back to supported payment types when ENABLED_PAYMENT_TYPES is undefined', async () => {
    mockGetEnv.mockReturnValue(defaultEnv({ ENABLED_PAYMENT_TYPES: [] }));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.config.enabledPaymentTypes).toEqual(['alipay', 'wxpay', 'stripe']);
    expect(mockQueryMethodLimits).toHaveBeenCalledWith(['alipay', 'wxpay', 'stripe']);
  });
});
