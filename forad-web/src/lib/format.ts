const nf = (min: number, max: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });

export const num = (x: number, decimals = 0) => nf(decimals, decimals).format(x);

/** 0.0275 -> "2.75%" */
export const pct = (x: number, decimals = 2) => `${nf(decimals, decimals).format(x * 100)}%`;

export const money = (x: number, currency: 'USD' | 'JPY' | 'EUR', decimals = 0) => {
  const sym = currency === 'USD' ? '$' : currency === 'JPY' ? '¥' : '€';
  return `${x < 0 ? '−' : ''}${sym}${nf(decimals, decimals).format(Math.abs(x))}`;
};

/** Signed change in percentage points: 0.0005 -> "+0.05 pp" */
export const ppChange = (delta: number) => {
  if (Math.abs(delta) < 1e-9) return '';
  return `${delta > 0 ? '+' : '−'}${nf(2, 2).format(Math.abs(delta * 100))} pp`;
};

export const signed = (delta: number, decimals = 0, prefix = '') => {
  if (Math.abs(delta) < 1e-9) return '';
  return `${delta > 0 ? '+' : '−'}${prefix}${nf(decimals, decimals).format(Math.abs(delta))}`;
};

export const longDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

export const deadlineLabel = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix',
  }) + ' (Arizona)';

/** "4 days 11 hrs left", "5 hrs 20 min left", or "Closed" */
export function timeLeft(iso: string, now = new Date()): { text: string; urgent: boolean; closed: boolean } {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return { text: 'Closed', urgent: true, closed: true };
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hrs = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const text = days > 0 ? `${days} day${days === 1 ? '' : 's'} ${hrs} hr${hrs === 1 ? '' : 's'} left` : `${hrs} hr${hrs === 1 ? '' : 's'} ${m} min left`;
  return { text, urgent: ms < 24 * 3600 * 1000, closed: false };
}
