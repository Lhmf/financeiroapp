"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCents } from "@/lib/money";
import { EmptyState } from "@/components/ui/empty-state";
import { PieChart as PieIcon } from "lucide-react";

export function ExpenseCategoryChart({
  data,
}: {
  data: Array<{
    name: string;
    color: string;
    amountCents: number;
    percent: number;
  }>;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PieIcon className="h-5 w-5" />}
        title="Nenhuma despesa paga neste mês"
        description="As despesas aparecem aqui quando você marca uma conta como paga."
        className="border-0 bg-transparent py-8"
      />
    );
  }

  const total = data.reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <div className="space-y-4">
      <div className="relative h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amountCents"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                fontSize: 12,
              }}
              formatter={(value) => formatCents(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Total pago
          </span>
          <span className="tabular text-base font-semibold text-slate-900">
            {formatCents(total)}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.slice(0, 6).map((item) => (
          <div key={item.name} className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
              {item.name}
            </span>
            <span className="text-[11px] text-slate-400">{item.percent}%</span>
            <span className="tabular min-w-[74px] text-right text-xs font-medium text-slate-700">
              {formatCents(item.amountCents)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
