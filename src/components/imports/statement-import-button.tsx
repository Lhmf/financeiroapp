"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import {
  StatementImportDialog,
  type StatementImportAccount,
  type StatementImportCategory,
} from "./statement-import-dialog";

export function StatementImportButton({
  accounts,
  categories,
  defaultMonth,
}: {
  accounts: StatementImportAccount[];
  categories: StatementImportCategory[];
  defaultMonth: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Importar extrato"
        title="Importar extrato"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:px-3"
      >
        <FileUp className="h-4 w-4" />
        <span className="hidden sm:inline">Extrato</span>
      </button>

      {open ? (
        <StatementImportDialog
          accounts={accounts}
          categories={categories}
          defaultMonth={defaultMonth}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
