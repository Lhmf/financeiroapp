"use client";

import * as React from "react";

const SKIP_LINK_CLASS =
  "fixed left-4 top-4 z-[60] -translate-y-24 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0";

/**
 * Cria o link de salto fora da árvore gerenciada pelo React.
 *
 * Extensões do navegador podem remover links de acessibilidade do HTML antes
 * ou depois da hidratação. Mantendo o nó fora do React, essa remoção não causa
 * erro de hidratação nem quebra a reconciliação.
 */
export function SkipLink() {
  React.useEffect(() => {
    const link = document.createElement("a");
    link.href = "#conteudo";
    link.textContent = "Pular para o conteúdo";
    link.className = SKIP_LINK_CLASS;
    document.body.insertBefore(link, document.body.firstChild);

    return () => {
      link.remove();
    };
  }, []);

  return null;
}
