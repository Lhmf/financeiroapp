import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SkipLink } from "@/components/layout/skip-link";
import { requireUser } from "@/lib/session";
import { ensureDefaultCategories } from "@/services/categories";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  await ensureDefaultCategories(user.id);

  return (
    <>
      <SkipLink />
      <AppShell user={{ name: user.name, email: user.email }}>
        {children}
      </AppShell>
    </>
  );
}
