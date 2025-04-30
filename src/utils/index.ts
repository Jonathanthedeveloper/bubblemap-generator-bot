export function escapeMarkdownV2(text: string): string {
  if (!text) return '';
  return text.replace?.(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1') ?? '';
}

export function formatNumber(num: number | string): string {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return 'N/A';

  if (number >= 1e9) {
    return (number / 1e9).toFixed(2) + 'B';
  }
  if (number >= 1e6) {
    return (number / 1e6).toFixed(2) + 'M';
  }
  if (number >= 1e3) {
    return (number / 1e3).toFixed(2) + 'K';
  }
  // Add more formatting as needed (e.g., for very small numbers)
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatUSD(amount: number | string): string {
  const number = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(number)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(number);
}

export function shortenAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A';
}

export function formatPercentage(value: number | string): string {
  const number = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(number)) return 'N/A';
  return `${number.toFixed(2)}%`;
}

function repeat(s: string, i: number): string {
  let r: string = '';
  for (let j: number = 0; j < i; j++) r += s;
  return r;
}

export function progressBar(
  percentage: number,
  min_size: number,
  max_size: number,
): string {
  const bar_style: string = '░█';
  let d: number,
    full: number,
    m: string,
    middle: number,
    r: string,
    rest: number,
    x: number,
    min_delta: number = Number.POSITIVE_INFINITY;
  const full_symbol: string = bar_style[bar_style.length - 1],
    n: number = bar_style.length - 1;
  if (percentage == 100) return repeat(full_symbol, 10);

  percentage = percentage / 100;

  for (let i: number = max_size; i >= min_size; i--) {
    x = percentage * i;
    full = Math.floor(x);
    rest = x - full;
    middle = Math.floor(rest * n);
    if (percentage != 0 && full == 0 && middle == 0) middle = 1;
    d = Math.abs(percentage - (full + middle / n) / i) * 100;
    if (d < min_delta) {
      min_delta = d;
      m = bar_style[middle];
      if (full == i) m = '';
      r = repeat(full_symbol, full) + m + repeat(bar_style[0], i - full - 1);
    }
  }
  return r;
}
