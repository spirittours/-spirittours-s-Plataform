import { useTranslation as useI18nextTranslation, UseTranslationOptions } from 'react-i18next';
import { supportedLanguages } from '../i18n/i18n.config';

/**
 * Custom useTranslation Hook
 * 
 * Wrapper around react-i18next's useTranslation hook with additional
 * utilities and type safety for the Spirit Tours application.
 * 
 * @param ns - Optional namespace (default: 'translation')
 * @param options - Optional translation options
 * @returns Translation function and i18n instance with additional utilities
 * 
 * @example
 * Basic usage:
 * ```tsx
 * const { t } = useTranslation();
 * return <h1>{t('common.welcome')}</h1>;
 * ```
 * 
 * @example
 * With interpolation:
 * ```tsx
 * const { t } = useTranslation();
 * return <p>{t('tours.from_price', { price: 99.99 })}</p>;
 * // Output: "From $99.99"
 * ```
 * 
 * @example
 * With count (pluralization):
 * ```tsx
 * const { t } = useTranslation();
 * return <span>{t('tours.reviews', { count: 42 })}</span>;
 * // Output: "42 reviews"
 * ```
 * 
 * @example
 * Changing language:
 * ```tsx
 * const { changeLanguage, currentLanguage } = useTranslation();
 * const handleChange = () => changeLanguage('es');
 * ```
 * 
 * @example
 * Checking RTL:
 * ```tsx
 * const { isRTL } = useTranslation();
 * return <div style={{ textAlign: isRTL ? 'right' : 'left' }}>Content</div>;
 * ```
 * 
 * @example
 * Getting language info:
 * ```tsx
 * const { currentLanguageInfo } = useTranslation();
 * return <span>{currentLanguageInfo.nativeName}</span>;
 * // Output: "English" or "Español" or "עברית" etc.
 * ```
 */
export function useTranslation(ns?: string | string[], options?: UseTranslationOptions) {
  const { t, i18n, ready } = useI18nextTranslation(ns, options);

  /**
   * Get current language code
   */
  const currentLanguage = i18n.language;

  /**
   * Get current language information (name, native name, direction)
   */
  const currentLanguageInfo = supportedLanguages[currentLanguage as keyof typeof supportedLanguages] 
    || supportedLanguages.en;

  /**
   * Check if current language is RTL
   */
  const isRTL = currentLanguageInfo.dir === 'rtl';

  /**
   * Change language with proper direction handling
   * @param lng - Language code to switch to
   */
  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    const language = supportedLanguages[lng as keyof typeof supportedLanguages];
    if (language) {
      document.documentElement.dir = language.dir;
      document.documentElement.lang = lng;
      localStorage.setItem('i18nextLng', lng);
    }
  };

  /**
   * Get list of all supported languages
   */
  const languages = supportedLanguages;

  /**
   * Translate with fallback
   * @param key - Translation key
   * @param fallback - Fallback text if translation is missing
   * @param options - Translation options (interpolation, etc.)
   */
  const tWithFallback = (key: string, fallback: string, options?: any) => {
    const translation = t(key, options);
    return translation === key ? fallback : translation;
  };

  return {
    t,
    i18n,
    ready,
    currentLanguage,
    currentLanguageInfo,
    isRTL,
    changeLanguage,
    languages,
    tWithFallback,
  };
}

/**
 * Hook to format dates according to current locale
 * 
 * @example
 * ```tsx
 * const { formatDate } = useDateFormatter();
 * const formatted = formatDate(new Date(), 'long');
 * // Output: "January 1, 2025" (en) or "1 de enero de 2025" (es)
 * ```
 */
export function useDateFormatter() {
  const { currentLanguage } = useTranslation();

  const formatDate = (date: Date, style: 'short' | 'medium' | 'long' | 'full' = 'medium') => {
    const options: Intl.DateTimeFormatOptions = {
      short: { year: 'numeric', month: 'numeric', day: 'numeric' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    }[style];

    return new Intl.DateTimeFormat(currentLanguage, options).format(date);
  };

  const formatTime = (date: Date, includeSeconds: boolean = false) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      ...(includeSeconds && { second: 'numeric' }),
    };

    return new Intl.DateTimeFormat(currentLanguage, options).format(date);
  };

  const formatDateTime = (date: Date, style: 'short' | 'medium' | 'long' = 'medium') => {
    return `${formatDate(date, style)} ${formatTime(date)}`;
  };

  return {
    formatDate,
    formatTime,
    formatDateTime,
  };
}

/**
 * Hook to format currency according to current locale
 * 
 * @example
 * ```tsx
 * const { formatCurrency } = useCurrencyFormatter();
 * const formatted = formatCurrency(1234.56, 'USD');
 * // Output: "$1,234.56" (en) or "1.234,56 US$" (es)
 * ```
 */
export function useCurrencyFormatter() {
  const { currentLanguage } = useTranslation();

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(currentLanguage, {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatNumber = (num: number, decimals?: number) => {
    return new Intl.NumberFormat(currentLanguage, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  return {
    formatCurrency,
    formatNumber,
  };
}

/**
 * Hook to get relative time formatting (e.g., "2 hours ago")
 * 
 * @example
 * ```tsx
 * const { formatRelativeTime } = useRelativeTimeFormatter();
 * const formatted = formatRelativeTime(new Date('2025-01-01'), new Date('2025-01-03'));
 * // Output: "2 days ago" (en) or "hace 2 días" (es)
 * ```
 */
export function useRelativeTimeFormatter() {
  const { currentLanguage } = useTranslation();

  const formatRelativeTime = (date: Date, baseDate: Date = new Date()) => {
    const diffInSeconds = Math.floor((baseDate.getTime() - date.getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(currentLanguage, { numeric: 'auto' });

    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (Math.abs(diffInSeconds) < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (Math.abs(diffInSeconds) < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  };

  return {
    formatRelativeTime,
  };
}

export default useTranslation;
