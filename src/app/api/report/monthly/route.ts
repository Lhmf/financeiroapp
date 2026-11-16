import { requireUser } from "@/lib/session";
import { getMonthlyReport } from "@/services/reports";

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") ?? undefined;
  const report = await getMonthlyReport(user.id, mes);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-relatorio-${report.month.key}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
