export function countdown(due, now = Date.now()) {
  const remaining = new Date(due).getTime() - now;
  if (remaining <= 0) return { value: '已到期', unit: '', expired: true };
  if (remaining >= 86400000) return { value: Math.floor(remaining / 86400000), unit: '天', expired: false };
  const hours = Math.floor(remaining / 360000) / 10;
  return { value: hours < 0.1 ? '< 0.1' : hours.toFixed(1), unit: '小时', expired: false };
}
