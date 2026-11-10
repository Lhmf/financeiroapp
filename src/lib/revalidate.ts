import { revalidatePath } from "next/cache";

const FINANCE_PATHS = [
  "/dashboard",
  "/receitas",
  "/despesas",
  "/dividas",
  "/contas",
  "/configuracoes",
];

/** Invalida as páginas que dependem de dados financeiros. */
export function revalidateFinance() {
  for (const path of FINANCE_PATHS) {
    revalidatePath(path);
  }
}
