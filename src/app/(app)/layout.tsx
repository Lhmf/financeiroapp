import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SkipLink } from "@/components/layout/skip-link";
import { monthKey, todayUTC } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { listActiveAccounts } from "@/services/accounts";
import {
  ensureDefaultCategories,
  listCategories,
} from "@/services/categories";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  await ensureDefaultCategories(user.id);

  const [accounts, categories] = await Promise.all([
    listActiveAccounts(user.id),
    listCategories(user.id),
  ]);

  return (
    <>
      <SkipLink />
      <AppShell
        user={{ name: user.name, email: user.email }}
        accounts={accounts.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          type: category.type,
        }))}
        defaultMonth={monthKey(todayUTC())}
      >
        {children}
      </AppShell>
    </>
  );
}
