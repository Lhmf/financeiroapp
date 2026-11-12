import { revalidatePath } from "next/cache";

const FINANCE_PATHS = [
  "/dashboard",
  "/receitas",
  "/despesas",
  "/dividas",
  "/contas",
  "/configuracoes",
  "/calendario",
  "/lista",
  "/contas-a-pagar",
  "/contas-a-receber",
];

/** Invalida as páginas que dependem de dados financeiros. */
export function revalidateFinance() {
  for (const path of FINANCE_PATHS) {
    revalidatePath(path);
  }
}
