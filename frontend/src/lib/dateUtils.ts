/**
 * Format relative time using current i18n language and Intl.RelativeTimeFormat.
 */
import i18n from 'i18next';

export function formatTimeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  const locale = i18n.language || 'en';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diff < 60) return i18n.t('time.justNow');
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return rtf.format(-mins, 'minute');
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return rtf.format(-hours, 'hour');
  }
  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return rtf.format(-days, 'day');
  }

  // After 7 days, show localized date
  const localeForDate = locale === 'vi' ? 'vi-VN' : locale;
  return date.toLocaleDateString(localeForDate, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format đầy đủ ngày giờ cho tooltip/title attribute
 */
export function formatFullDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const locale = i18n.language || 'en';
  const localeForDate = locale === 'vi' ? 'vi-VN' : locale;
  return date.toLocaleString(localeForDate, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format due date với local time
 */
export function formatDueDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const locale = i18n.language || 'en';
  const localeForDate = locale === 'vi' ? 'vi-VN' : locale;
  return d.toLocaleString(localeForDate, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format ngày ngắn gọn (chỉ ngày tháng năm)
 */
export function formatDateOnly(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const locale = i18n.language || 'en';
  const localeForDate = locale === 'vi' ? 'vi-VN' : locale;
  return d.toLocaleDateString(localeForDate, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Kiểm tra xem due date có quá hạn không
 */
export function isOverdue(iso?: string | null, completed?: boolean): boolean {
  if (!iso) return false;
  if (completed) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return Date.now() > d.getTime();
}

/**
 * Convert ISO string to datetime-local input format
 */
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Format: YYYY-MM-DDTHH:mm
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
