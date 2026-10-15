'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPaise, formatPaiseCompact } from '@/lib/money';
import type { DailyAmount } from '@/types/api';

/** Fills in zero-days so a quiet week looks quiet instead of connecting two distant points. */
function fillDays(points: DailyAmount[], days = 14): DailyAmount[] {
  const byDay = new Map(points.map((p) => [p.day, p.amountPaise]));
  const result: DailyAmount[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = date.toISOString().slice(0, 10);
    result.push({ day: key, amountPaise: byDay.get(key) ?? 0 });
  }
  return result;
}

export function AmountAreaChart({ points, label, color = '#C6F432' }: { points: DailyAmount[]; label: string; color?: string }) {
  const data = fillDays(points).map((p) => ({ ...p, short: p.day.slice(5).replace('-', '/') }));
  const hasData = data.some((p) => p.amountPaise > 0);

  return (
    <figure>
      <div className="h-64 w-full" role="img" aria-label={`${label} over the last 14 days`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`fill-${label.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="short" tick={{ fill: '#9A8FB3', fontSize: 12 }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fill: '#9A8FB3', fontSize: 12 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatPaiseCompact(v)} />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
              contentStyle={{ background: '#251B36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F7F4FC' }}
              formatter={(value: number) => [formatPaise(value), label]}
              labelFormatter={(l: string) => `Day ${l}`}
            />
            <Area type="monotone" dataKey="amountPaise" stroke={color} strokeWidth={2} fill={`url(#fill-${label.replace(/\W/g, "")})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!hasData && <figcaption className="mt-2 text-center text-sm text-fog-400">No payouts in the last 14 days yet.</figcaption>}
    </figure>
  );
}
