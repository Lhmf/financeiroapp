import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Wallet, ShieldCheck, LineChart, Sparkles } from "lucide-react";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.35),transparent_45%),radial-gradient(circle_at_80%_90%,rgba(14,165,233,0.25),transparent_45%)]"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">FinanceiroApp</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">
                Finanças pessoais
              </p>
            </div>
          </div>

          <div className="mt-16 max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
              Clareza antes de decisão
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight">
              Saiba exatamente quanto você tem, deve e pode usar.
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-white/75">
              Receitas, despesas, dívidas e contas em um só lugar — com o
              realizado sempre separado do previsto.
            </p>
          </div>

          <div className="mt-12 space-y-3">
            {[
              {
                icon: ShieldCheck,
                title: "Dados isolados por usuário",
                description:
                  "Cada conta enxerga apenas as próprias movimentações.",
              },
              {
                icon: LineChart,
                title: "Saldo que reflete a realidade",
                description:
                  "Só entram no saldo receitas recebidas e despesas pagas.",
              },
              {
                icon: Sparkles,
                title: "Pronto para crescer",
                description:
                  "Base preparada para planejamento, patrimônio e investimentos.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/70">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[10px] uppercase tracking-[0.16em] text-white/60">
          Uso pessoal · Dados persistentes · Acesso remoto futuro
        </p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Wallet className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">
                FinanceiroApp
              </p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
                Finanças pessoais
              </p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
