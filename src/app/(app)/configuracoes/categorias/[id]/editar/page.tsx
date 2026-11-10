import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryForm } from "@/components/forms/category-form";
import { updateCategory } from "@/actions/categories";
import { requireUser } from "@/lib/session";
import { getCategory } from "@/services/categories";

export const metadata = {
  title: "Editar categoria",
};

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const category = await getCategory(user.id, id);

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-6">
      <PageHeader
        title="Editar categoria"
        description="O tipo não pode ser alterado depois que a categoria é criada."
      />
      <Card>
        <CardContent>
          <CategoryForm
            action={updateCategory}
            defaultValues={{
              id: category.id,
              name: category.name,
              type: category.type,
              color: category.color,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
