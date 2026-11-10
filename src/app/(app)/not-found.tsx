import { SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-lg animate-fade-up py-12 text-center">
      <Card className="p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <SearchX className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          Recurso não encontrado
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          Este item não existe ou não pertence à sua conta. Verifique o link ou
          volte para a visão geral.
        </p>
        <LinkButton href="/dashboard" className="mt-6">
          Voltar ao dashboard
        </LinkButton>
      </Card>
    </div>
  );
}
