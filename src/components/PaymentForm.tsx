'use client';

import { useState } from 'react';
import { PAYMENT_TYPE_META, getPaymentIconType, getPaymentMeta } from '@/lib/pay-utils';

export interface MethodLimitInfo {
  available: boolean;
  remaining: number | null;
  /** 单笔限额，0 = 使用全局 maxAmount */
  singleMax?: number;
  /** 手续费率百分比，0 = 无手续费 */
  feeRate?: number;
}

interface PaymentFormProps {
  userId: number;
  userName?: string;
  userBalance?: number;
  enabledPaymentTypes: string[];
  methodLimits?: Record<string, MethodLimitInfo>;
  minAmount: number;
  maxAmount: number;
  onSubmit: (amount: number, paymentType: string) => Promise<void>;
  loading?: boolean;
  dark?: boolean;
  pendingBlocked?: boolean;
  pendingCount?: number;
  usdExchangeRate?: number;
  balanceRatio?: number;
}

const QUICK_CREDIT_AMOUNTS = [10, 50, 100, 200, 500];
const AMOUNT_TEXT_PATTERN = /^\d*(\.\d{0,2})?$/;

function hasValidCentPrecision(num: number): boolean {
  return Math.abs(Math.round(num * 100) - num * 100) < 1e-8;
}

export default function PaymentForm({
  userId,
  userName,
  userBalance,
  enabledPaymentTypes,
  methodLimits,
  minAmount,
  maxAmount,
  onSubmit,
  loading,
  dark = false,
  pendingBlocked = false,
  pendingCount = 0,
  usdExchangeRate = 6.9,
  balanceRatio = 10,
}: PaymentFormProps) {
  const [paymentType, setPaymentType] = useState(enabledPaymentTypes[0] || 'alipay');
  const [creditText, setCreditText] = useState('');  // 到账余额 USD
  const [usdText, setUsdText] = useState('');         // 实付 USD
  const [cnyText, setCnyText] = useState('');          // 实付 CNY

  const effectivePaymentType = enabledPaymentTypes.includes(paymentType)
    ? paymentType
    : enabledPaymentTypes[0] || 'stripe';

  const cnyAmount = parseFloat(cnyText) || 0;
  const creditUsdDisplay = parseFloat(creditText) || 0;

  const isMethodAvailable = !methodLimits || methodLimits[effectivePaymentType]?.available !== false;
  const methodSingleMax = methodLimits?.[effectivePaymentType]?.singleMax;
  const effectiveMax = methodSingleMax !== undefined && methodSingleMax > 0 ? methodSingleMax : maxAmount;

  const isValid =
    cnyAmount >= minAmount &&
    cnyAmount <= effectiveMax &&
    hasValidCentPrecision(cnyAmount) &&
    isMethodAvailable;

  const handleCreditChange = (val: string) => {
    if (!AMOUNT_TEXT_PATTERN.test(val)) return;
    setCreditText(val);
    if (val === '' || val === '.') {
      setUsdText('');
      setCnyText('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const usdPay = num / balanceRatio;
      const cnyPay = usdPay * usdExchangeRate;
      setUsdText(usdPay.toFixed(2));
      setCnyText(cnyPay.toFixed(2));
    }
  };

  const handleUsdChange = (val: string) => {
    if (!AMOUNT_TEXT_PATTERN.test(val)) return;
    setUsdText(val);
    if (val === '' || val === '.') {
      setCreditText('');
      setCnyText('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const credit = num * balanceRatio;
      const cnyPay = num * usdExchangeRate;
      setCreditText(credit.toFixed(2));
      setCnyText(cnyPay.toFixed(2));
    }
  };

  const handleCnyChange = (val: string) => {
    if (!AMOUNT_TEXT_PATTERN.test(val)) return;
    setCnyText(val);
    if (val === '' || val === '.') {
      setCreditText('');
      setUsdText('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const usdPay = num / usdExchangeRate;
      const credit = usdPay * balanceRatio;
      setCreditText(credit.toFixed(2));
      setUsdText(usdPay.toFixed(2));
    }
  };

  const handleQuickAmount = (creditVal: number) => {
    const usdPay = creditVal / balanceRatio;
    const cnyPay = usdPay * usdExchangeRate;
    setCreditText(creditVal.toFixed(2));
    setUsdText(usdPay.toFixed(2));
    setCnyText(cnyPay.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    await onSubmit(cnyAmount, effectivePaymentType);
  };

  const renderPaymentIcon = (type: string) => {
    const iconType = getPaymentIconType(type);
    if (iconType === 'alipay') {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#00AEEF] text-xl font-bold leading-none text-white">
          支
        </span>
      );
    }
    if (iconType === 'wxpay') {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07C160] text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M10 3C6.13 3 3 5.58 3 8.75c0 1.7.84 3.23 2.17 4.29l-.5 2.21 2.4-1.32c.61.17 1.25.27 1.93.27.22 0 .43-.01.64-.03C9.41 13.72 9 12.88 9 12c0-3.31 3.13-6 7-6 .26 0 .51.01.76.03C15.96 3.98 13.19 3 10 3z" />
            <path d="M16 8c-3.31 0-6 2.24-6 5s2.69 5 6 5c.67 0 1.31-.1 1.9-.28l2.1 1.15-.55-2.44C20.77 15.52 22 13.86 22 12c0-2.21-2.69-4-6-4z" />
          </svg>
        </span>
      );
    }
    if (iconType === 'stripe') {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635bff] text-white">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </span>
      );
    }
    return null;
  };

  const inputClass = [
    'w-full rounded-lg border py-3 pl-8 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
    dark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900',
  ].join(' ');

  const prefixClass = [
    'absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium',
    dark ? 'text-slate-400' : 'text-gray-500',
  ].join(' ');

  const labelClass = ['mb-1 block text-xs font-medium', dark ? 'text-slate-400' : 'text-slate-500'].join(' ');

  // Filter quick amounts to those whose CNY is within range
  const validQuickAmounts = QUICK_CREDIT_AMOUNTS.filter((credit) => {
    const cny = (credit / balanceRatio) * usdExchangeRate;
    return cny >= minAmount && cny <= effectiveMax;
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* User Info */}
      <div
        className={[
          'rounded-xl border p-4',
          dark ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-slate-50',
        ].join(' ')}
      >
        <div className={['text-xs uppercase tracking-wide', dark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
          充值账户
        </div>
        <div className={['mt-1 text-base font-medium', dark ? 'text-slate-100' : 'text-slate-900'].join(' ')}>
          {userName || `用户 #${userId}`}
        </div>
        {userBalance !== undefined && (
          <div className={['mt-1 text-sm', dark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
            当前余额: <span className="font-medium text-green-600">${userBalance.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Credit USD Input */}
      <div>
        <label className={['mb-2 block text-sm font-medium', dark ? 'text-slate-200' : 'text-slate-700'].join(' ')}>
          到账余额（美元）
        </label>
        <div className="relative">
          <span className={prefixClass}>$</span>
          <input
            type="text"
            inputMode="decimal"
            value={creditText}
            onChange={(e) => handleCreditChange(e.target.value)}
            placeholder="输入到账金额"
            className={inputClass}
          />
        </div>
      </div>

      {/* Quick Amounts */}
      {validQuickAmounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {validQuickAmounts.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAmount(val)}
              className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
                creditText === val.toFixed(2)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : dark
                    ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              ${val}
            </button>
          ))}
        </div>
      )}

      {/* Pay Amount — USD + CNY side by side */}
      <div>
        <div className={['mb-2 text-sm font-medium', dark ? 'text-slate-200' : 'text-slate-700'].join(' ')}>
          实付金额
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>美元</label>
            <div className="relative">
              <span className={prefixClass}>$</span>
              <input
                type="text"
                inputMode="decimal"
                value={usdText}
                onChange={(e) => handleUsdChange(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>人民币（实付）</label>
            <div className="relative">
              <span className={prefixClass}>¥</span>
              <input
                type="text"
                inputMode="decimal"
                value={cnyText}
                onChange={(e) => handleCnyChange(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Validation error */}
      {cnyText !== '' && !isValid && (() => {
        const num = parseFloat(cnyText);
        let msg = '金额需在范围内，且最多支持 2 位小数（精确到分）';
        if (!isNaN(num)) {
          if (num < minAmount) msg = `单笔最低充值 ¥${minAmount}（约 $${(minAmount * balanceRatio / usdExchangeRate).toFixed(2)} USD 到账）`;
          else if (num > effectiveMax) msg = `单笔最高充值 ¥${effectiveMax}（约 $${(effectiveMax * balanceRatio / usdExchangeRate).toFixed(2)} USD 到账）`;
        }
        return <div className={['text-xs', dark ? 'text-amber-300' : 'text-amber-700'].join(' ')}>{msg}</div>;
      })()}

      {/* Payment Type — only show when multiple types available */}
      {enabledPaymentTypes.length > 1 && (
        <div>
          <label className={['mb-2 block text-sm font-medium', dark ? 'text-slate-200' : 'text-gray-700'].join(' ')}>
            支付方式
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            {enabledPaymentTypes.map((type) => {
              const meta = PAYMENT_TYPE_META[type];
              const isSelected = effectivePaymentType === type;
              const limitInfo = methodLimits?.[type];
              const isUnavailable = limitInfo !== undefined && !limitInfo.available;

              return (
                <button
                  key={type}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => !isUnavailable && setPaymentType(type)}
                  title={isUnavailable ? '今日充值额度已满，请使用其他支付方式' : undefined}
                  className={[
                    'relative flex h-[58px] flex-col items-center justify-center rounded-lg border px-3 transition-all sm:flex-1',
                    isUnavailable
                      ? dark
                        ? 'cursor-not-allowed border-slate-700 bg-slate-800/50 opacity-50'
                        : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                      : isSelected
                        ? `${meta?.selectedBorder || 'border-blue-500'} ${dark ? (meta?.selectedBgDark || 'bg-blue-950') : (meta?.selectedBg || 'bg-blue-50')} ${dark ? 'text-slate-100' : 'text-slate-900'} shadow-sm`
                        : dark
                          ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                          : 'border-gray-300 bg-white text-slate-700 hover:border-gray-400',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    {renderPaymentIcon(type)}
                    <span className="flex flex-col items-start leading-none">
                      <span className="text-xl font-semibold tracking-tight">{meta?.label || type}</span>
                      {isUnavailable ? (
                        <span className="text-[10px] tracking-wide text-red-400">今日额度已满</span>
                      ) : meta?.sublabel ? (
                        <span
                          className={`text-[10px] tracking-wide ${dark ? (isSelected ? 'text-slate-300' : 'text-slate-400') : 'text-slate-600'}`}
                        >
                          {meta.sublabel}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {(() => {
            const limitInfo = methodLimits?.[effectivePaymentType];
            if (!limitInfo || limitInfo.available) return null;
            return (
              <p className={['mt-2 text-xs', dark ? 'text-amber-300' : 'text-amber-600'].join(' ')}>
                所选支付方式今日额度已满，请切换到其他支付方式
              </p>
            );
          })()}
        </div>
      )}

      {/* Pending order limit warning */}
      {pendingBlocked && (
        <div
          className={[
            'rounded-lg border p-3 text-sm',
            dark
              ? 'border-amber-700 bg-amber-900/30 text-amber-300'
              : 'border-amber-200 bg-amber-50 text-amber-700',
          ].join(' ')}
        >
          您有 {pendingCount} 个待支付订单，请先完成或取消后再充值
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || loading || pendingBlocked}
        className={`w-full rounded-lg py-3 text-center font-medium text-white transition-colors ${
          isValid && !loading && !pendingBlocked
            ? getPaymentMeta(effectivePaymentType).buttonClass
            : dark
              ? 'cursor-not-allowed bg-slate-700 text-slate-300'
              : 'cursor-not-allowed bg-gray-300'
        }`}
      >
        {loading
          ? '处理中...'
          : pendingBlocked
            ? '待支付订单过多'
            : isValid
              ? `立即支付 ¥${cnyAmount.toFixed(2)} → 到账 $${creditUsdDisplay.toFixed(2)} USD`
              : '立即支付'}
      </button>
    </form>
  );
}
