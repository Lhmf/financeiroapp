"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents, formatCentsCompact } from "@/lib/money";

export function EvolutionChart({
  data,
}: {
  data: Array<{
    month: string;
    receitas: number;
    despesas: number;
    resultado: number;
  }>;
}) {
  const hasData = data.some(
    (item) => item.receitas > 0 || item.despesas > 0,
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
          Receitas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-rose-500" />
          Despesas
        </span>
        <span className="ml-auto hidden text-[10px] font-normal text-slate-600 sm:inline">
          Valores realizados
        </span>
      </div>

      {hasData ? (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              accessibilityLayer
            >
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                dy={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                width={64}
                tickFormatter={(value) =>
                  formatCentsCompact(Number(value) * 100)
                }
              />
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                formatter={(value, name) => [
                  formatCents(Number(value) * 100),
                  name === "receitas"
                    ? "Receitas"
                    : name === "despesas"
                      ? "Despesas"
                      : "Resultado",
                ]}
              />
              <Area
                type="monotone"
                dataKey="receitas"
                name="receitas"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#incomeFill)"
              />
              <Area
                type="monotone"
                dataKey="despesas"
                name="despesas"
                stroke="#e11d48"
                strokeWidth={2}
                fill="url(#expenseFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Ainda não há movimentações
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Receitas recebidas e despesas pagas aparecem aqui.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
