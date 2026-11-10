import { requireUser } from "@/lib/session";
import { exportUserData } from "@/services/export";

export async function GET() {
  const user = await requireUser();
  const data = await exportUserData(user.id);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
