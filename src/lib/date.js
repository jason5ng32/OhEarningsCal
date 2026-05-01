const MONTH_MAP = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function shiftDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function* dateRange(startISO, count) {
  let cursor = startISO;
  for (let i = 0; i < count; i++) {
    yield cursor;
    cursor = shiftDays(cursor, 1);
  }
}

// "Mar 15, 2025" -> "2025-03-15"
export function parseNasdaqAsOf(text) {
  const m = text?.match?.(/(\w+) (\d+), (\d+)/);
  if (!m) return null;
  const [, mon, day, year] = m;
  const mm = MONTH_MAP[mon];
  if (!mm) return null;
  return `${year}-${mm}-${String(day).padStart(2, '0')}`;
}
