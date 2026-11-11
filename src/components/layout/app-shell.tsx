"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { StatementImportButton } from "@/components/imports/statement-import-button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { AccountType, CategoryType } from "@/generated/prisma/enums";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", icon: TrendingUp },
  { href: "/despesas", label: "Despesas", icon: TrendingDown },
  { href: "/dividas", label: "Dívidas", icon: CreditCard },
  { href: "/contas", label: "Contas", icon: Wallet },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-700/25">
        <Wallet className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-slate-900">
          FinanceiroApp
        </span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
          Finanças pessoais
        </span>
      </span>
    </Link>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <Icon
              className={cn(
                "h-4.5 w-4.5 shrink-0",
                active
                  ? "text-emerald-700"
                  : "text-slate-600 group-hover:text-slate-800",
              )}
            />
            {item.label}
            {active ? (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({
  user,
  onSignOut,
  signingOut,
}: {
  user: { name: string; email: string };
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const initials = (user.name || user.email)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="border-t border-slate-100 p-3">
      <div className="flex items-center gap-2.5 rounded-xl p-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-semibold text-white">
          {initials || "U"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {user.name}
          </p>
          <p className="truncate text-[11px] text-slate-600">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          title="Sair"
          aria-label="Sair"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  accounts,
  categories,
  defaultMonth,
  children,
}: {
  user: { name: string; email: string };
  accounts: Array<{ id: string; name: string; type: AccountType }>;
  categories: Array<{ id: string; name: string; type: CategoryType }>;
  defaultMonth: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const current =
    NAV_ITEMS.find((item) => isActive(pathname, item.href)) ?? NAV_ITEMS[0];

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Brand />
        <NavLinks pathname={pathname} />
        <UserCard
          user={user}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
      </aside>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-menu"
            aria-label="Menu de navegação"
            className="animate-drawer-in fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white shadow-2xl lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pr-3">
              <Brand />
              <button
                type="button"
                aria-label="Fechar menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <UserCard
              user={user}
              onSignOut={handleSignOut}
              signingOut={signingOut}
            />
          </aside>
        </>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-controls={mobileOpen ? "mobile-menu" : undefined}
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {current.label}
            </p>
            <p className="hidden text-[11px] text-slate-600 sm:block">
              Controle financeiro pessoal
            </p>
          </div>
          <StatementImportButton
            accounts={accounts}
            categories={categories}
            defaultMonth={defaultMonth}
          />
          <Link
            href="/configuracoes"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-semibold text-white ring-2 ring-white transition hover:from-slate-800 hover:to-slate-600"
            title="Configurações"
            aria-label="Configurações"
          >
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </Link>
        </header>

        <main
          id="conteudo"
          className="mx-auto w-full max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-8 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Navegação móvel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 pb-1.5 pt-1 text-[10px] font-medium transition-colors",
                  active
                    ? "text-emerald-700"
                    : "text-slate-600 hover:text-slate-800",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-emerald-50 text-emerald-700" : "text-slate-600",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
