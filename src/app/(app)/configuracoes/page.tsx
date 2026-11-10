import Link from "next/link";
import { Download, Pencil, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, Dot } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { CategoryForm } from "@/components/forms/category-form";
import { ProfileForm } from "@/components/forms/profile-form";
import { CATEGORY_TYPE_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { listCategories } from "@/services/categories";
import { createCategory, deleteCategory } from "@/actions/categories";

export const metadata = {
  title: "Configurações",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string; erro?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const categories = await listCategories(user.id);

  const incomeCategories = categories.filter(
    (category) => category.type === "INCOME",
  );
  const expenseCategories = categories.filter(
    (category) => category.type === "EXPENSE",
  );

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Configurações"
        description="Perfil, categorias e backup dos seus dados."
      />

      {params.salvo ? (
        <Alert tone="success">Alterações salvas com sucesso.</Alert>
      ) : null}
      {params.erro === "categoria-em-uso" ? (
        <Alert tone="error">
          Esta categoria está em uso por receitas ou despesas. Troque a
          categoria desses lançamentos antes de excluí-la.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-500" />
                <CardTitle>Perfil</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  E-mail da conta
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-700">
                  {user.email}
                </p>
              </div>
              <ProfileForm name={user.name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Categorias</CardTitle>
                <p className="mt-0.5 text-xs text-slate-600">
                  Organize receitas e despesas do seu jeito.
                </p>
              </div>
              <Badge tone="slate">{categories.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <CategoryForm action={createCategory} compact />

              <div className="grid gap-6 md:grid-cols-2">
                {[
                  {
                    title: "Receitas",
                    items: incomeCategories,
                    tone: "green" as const,
                  },
                  {
                    title: "Despesas",
                    items: expenseCategories,
                    tone: "red" as const,
                  },
                ].map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {group.title}
                    </h3>
                    <ul className="space-y-1.5">
                      {group.items.length === 0 ? (
                        <li className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-600">
                          Nenhuma categoria.
                        </li>
                      ) : (
                        group.items.map((category) => (
                          <li
                            key={category.id}
                            className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2"
                          >
                            <Dot color={category.color} />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                              {category.name}
                            </span>
                            <Badge tone={group.tone}>
                              {CATEGORY_TYPE_LABELS[category.type]}
                            </Badge>
                            <Link
                              href={`/configuracoes/categorias/${category.id}/editar`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                              title="Editar categoria"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            <form action={deleteCategory}>
                              <input
                                type="hidden"
                                name="id"
                                value={category.id}
                              />
                              <SubmitButton
                                size="sm"
                                variant="ghost"
                                pendingLabel="..."
                                confirmMessage="Excluir esta categoria? Só é possível se não houver lançamentos vinculados."
                                className="h-7 w-7 px-0 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </SubmitButton>
                            </form>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-slate-500" />
                <CardTitle>Backup dos dados</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[11px] leading-relaxed text-slate-600">
                Baixe um arquivo JSON com suas contas, categorias, receitas,
                despesas, dívidas e pagamentos. O arquivo não inclui senha nem
                tokens de sessão.
              </p>
              <LinkButton
                href="/api/export"
                variant="outline"
                size="sm"
                download
                className="w-full"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar JSON
              </LinkButton>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Guarde o arquivo em local seguro. A restauração automática
                ainda não faz parte do MVP.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                <CardTitle>Privacidade</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px] leading-relaxed text-slate-600">
              <p>
                Seus dados são isolados por usuário. Todas as consultas e ações
                usam o identificador da sessão autenticada.
              </p>
              <p>
                A senha é armazenada com hash pelo Better Auth; o app nunca
                recebe a senha em texto puro.
              </p>
              <p>
                Nunca compartilhe o arquivo <code>.env</code> nem o segredo do
                Better Auth.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
