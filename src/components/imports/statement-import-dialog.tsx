"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileUp,
  Loader2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { importStatement, extractStatementPdfText } from "@/actions/imports";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import {
  formatDate,
  parseMonthKey,
  toDateInput,
  todayUTC,
} from "@/lib/dates";
import { formatCents } from "@/lib/money";
import {
  decodeStatementBuffer,
  MAX_STATEMENT_FILE_BYTES,
  parseStatementFile,
  suggestCategoryId,
  type ParsedStatementEntry,
  type StatementFormat,
  type StatementImportResult,
  type StatementPositiveMeans,
} from "@/lib/statement";
import { cn } from "@/lib/utils";
import type { AccountType, CategoryType } from "@/generated/prisma/enums";

const INITIAL_VISIBLE_ENTRIES = 100;

const POSITIVE_MEANS_OPTIONS: Array<{
  value: StatementPositiveMeans;
  label: string;
}> = [
  { value: "auto", label: "Automático (sinal ou tipo)" },
  { value: "income", label: "Valores positivos são entradas" },
  { value: "expense", label: "Valores positivos são saídas" },
];

export type StatementImportAccount = {
  id: string;
  name: string;
  type: AccountType;
};

export type StatementImportCategory = {
  id: string;
  name: string;
  type: CategoryType;
};

type DraftEntry = ParsedStatementEntry & {
  selected: boolean;
  categoryId: string;
};

type SummaryTileProps = {
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral";
};

function SummaryTile({ label, value, tone }: SummaryTileProps) {
  const tones = {
    income: "border-emerald-200 bg-emerald-50 text-emerald-700",
    expense: "border-rose-200 bg-rose-50 text-rose-700",
    neutral: "border-slate-200 bg-white text-slate-900",
  } as const;

  return (
    <div className={cn("rounded-xl border px-3 py-2", tones[tone])}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="tabular mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

export function StatementImportDialog({
  accounts,
  categories,
  defaultMonth,
  onClose,
}: {
  accounts: StatementImportAccount[];
  categories: StatementImportCategory[];
  defaultMonth: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = React.useId();
  const descriptionId = React.useId();
  const formId = React.useId();
  const fileInputId = React.useId();
  const accountFieldId = React.useId();
  const monthFieldId = React.useId();
  const positiveMeansFieldId = React.useId();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef("");
  const formatHintRef = React.useRef<StatementFormat | undefined>(undefined);

  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [month, setMonth] = React.useState(defaultMonth);
  const [positiveMeans, setPositiveMeans] =
    React.useState<StatementPositiveMeans>("auto");
  const [fileName, setFileName] = React.useState("");
  const [format, setFormat] = React.useState<StatementFormat | null>(null);
  const [entries, setEntries] = React.useState<DraftEntry[]>([]);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [error, setError] = React.useState("");
  const [reading, setReading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(
    INITIAL_VISIBLE_ENTRIES,
  );
  const [result, setResult] = React.useState<StatementImportResult | null>(
    null,
  );

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !importing) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [importing, onClose]);

  const incomeCategories = React.useMemo(
    () => categories.filter((category) => category.type === "INCOME"),
    [categories],
  );
  const expenseCategories = React.useMemo(
    () => categories.filter((category) => category.type === "EXPENSE"),
    [categories],
  );

  const selectedEntries = React.useMemo(
    () => entries.filter((entry) => entry.selected),
    [entries],
  );

  const totals = React.useMemo(() => {
    let incomeCents = 0;
    let expenseCents = 0;

    for (const entry of selectedEntries) {
      if (entry.kind === "income") incomeCents += entry.amountCents;
      else expenseCents += entry.amountCents;
    }

    return {
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
    };
  }, [selectedEntries]);

  const outsideMonthEntries = React.useMemo(
    () => entries.filter((entry) => entry.date.slice(0, 7) !== month),
    [entries, month],
  );
  const selectedOutsideMonth = React.useMemo(
    () =>
      selectedEntries.filter((entry) => entry.date.slice(0, 7) !== month)
        .length,
    [selectedEntries, month],
  );
  const transferCount = React.useMemo(
    () => entries.filter((entry) => entry.isTransfer).length,
    [entries],
  );
  const visibleEntries = entries.slice(0, visibleCount);
  const hasPreview = entries.length > 0;
  const canImport =
    accounts.length > 0 &&
    accountId.length > 0 &&
    parseMonthKey(month) !== null &&
    selectedEntries.length > 0 &&
    !reading &&
    !importing;

  const analyze = React.useCallback(
    (
      content: string,
      name: string,
      monthValue: string,
      positiveMeansValue: StatementPositiveMeans,
      formatHint: StatementFormat | undefined = formatHintRef.current,
    ) => {
      const monthDate = parseMonthKey(monthValue);
      const fallbackDate = toDateInput(monthDate ?? todayUTC());
      const parsed = parseStatementFile(content, name, {
        fallbackDate,
        positiveMeans: positiveMeansValue,
        format: formatHint,
      });

      setFormat(parsed.format);
      setWarnings(parsed.warnings);
      setResult(null);
      setError("");

      if (parsed.entries.length === 0) {
        setEntries([]);
        return;
      }

      const drafts: DraftEntry[] = parsed.entries.map((entry) => ({
        ...entry,
        selected: !entry.isTransfer,
        categoryId: suggestCategoryId(entry, categories) ?? "",
      }));

      setEntries(drafts);
      setVisibleCount(INITIAL_VISIBLE_ENTRIES);
    },
    [categories],
  );

  function clearPreview(fileNameValue: string, message: string) {
    contentRef.current = "";
    formatHintRef.current = undefined;
    setFileName(fileNameValue);
    setFormat(null);
    setEntries([]);
    setWarnings([]);
    setError(message);
  }

  async function loadFile(file: File) {
    setError("");
    setResult(null);

    const safeName = file.name.slice(0, 180);

    if (file.size > MAX_STATEMENT_FILE_BYTES) {
      clearPreview(safeName, "Arquivo muito grande. O limite é 5 MB.");
      return;
    }

    setReading(true);

    try {
      const isPdf =
        file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      let text: string;
      let formatHint: StatementFormat | undefined;

      if (isPdf) {
        const formData = new FormData();
        formData.append("file", file);
        const extraction = await extractStatementPdfText(formData);

        if (!extraction.ok) {
          clearPreview(safeName, extraction.error);
          return;
        }

        text = extraction.text;
        formatHint = "pdf";
      } else {
        const buffer = await file.arrayBuffer();
        text = decodeStatementBuffer(buffer);
      }

      if (!text.trim()) {
        clearPreview(safeName, "O arquivo está vazio.");
        return;
      }

      contentRef.current = text;
      formatHintRef.current = formatHint;
      setFileName(safeName);
      analyze(text, safeName, month, positiveMeans, formatHint);
    } catch {
      clearPreview(
        safeName,
        "Não foi possível ler o arquivo. Verifique se ele é um CSV, OFX ou PDF válido.",
      );
    } finally {
      setReading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void loadFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }

  function handleMonthChange(value: string) {
    setMonth(value);
    setResult(null);

    if (!parseMonthKey(value)) {
      setEntries([]);
      setWarnings([]);
      setFormat(null);
      return;
    }

    if (contentRef.current) {
      analyze(contentRef.current, fileName, value, positiveMeans);
    }
  }

  function handlePositiveMeansChange(value: StatementPositiveMeans) {
    setPositiveMeans(value);
    setResult(null);
    if (contentRef.current) {
      analyze(contentRef.current, fileName, month, value);
    }
  }

  function updateEntry(
    sourceIndex: number,
    patch: Partial<Pick<DraftEntry, "selected" | "categoryId">>,
  ) {
    setEntries((current) =>
      current.map((entry) =>
        entry.sourceIndex === sourceIndex ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function setAllSelected(selected: boolean) {
    setEntries((current) =>
      current.map((entry) => ({ ...entry, selected })),
    );
  }

  function deselectOutsideMonth() {
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        selected:
          entry.date.slice(0, 7) === month ? entry.selected : false,
      })),
    );
  }

  function requestClose() {
    if (!importing) onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canImport) return;

    setImporting(true);
    setError("");

    try {
      const response = await importStatement({
        financialAccountId: accountId,
        referenceMonth: month,
        fileName: fileName || "extrato",
        transactions: selectedEntries.map((entry) => ({
          sourceIndex: entry.sourceIndex,
          date: entry.date,
          description: entry.description,
          amountCents: entry.amountCents,
          kind: entry.kind,
          categoryId: entry.categoryId || undefined,
        })),
      });

      if (!response.ok) {
        setError(response.error);
        return;
      }

      setResult(response);
      router.refresh();
    } catch {
      setError("Não foi possível importar o extrato. Tente novamente.");
    } finally {
      setImporting(false);
    }
  }

  const resultImported = result?.ok
    ? result.importedIncomes + result.importedExpenses
    : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <FileUp className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-sm font-semibold text-slate-900"
              >
                Importar extrato
              </h2>
              <p
                id={descriptionId}
                className="mt-0.5 text-[11px] leading-relaxed text-slate-600"
              >
                CSV, OFX ou PDF com texto selecionável. O app identifica entradas,
                saídas e sugere categorias antes de lançar.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Fechar importação"
            onClick={requestClose}
            disabled={importing}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {accounts.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-5 w-5" />}
              title="Cadastre uma conta primeiro"
              description="A importação precisa de uma conta ativa para lançar as receitas e despesas."
              action={
                <LinkButton href="/contas/nova" size="sm">
                  Cadastrar conta
                </LinkButton>
              }
            />
          ) : result?.ok ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Extrato importado</p>
                  <p className="mt-0.5 text-xs leading-relaxed">
                    Os lançamentos já foram atualizados no dashboard e nas
                    listas de receitas e despesas.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <SummaryTile
                  label="Receitas importadas"
                  value={String(result.importedIncomes)}
                  tone="income"
                />
                <SummaryTile
                  label="Despesas importadas"
                  value={String(result.importedExpenses)}
                  tone="expense"
                />
                <SummaryTile
                  label="Já existiam"
                  value={String(result.skipped)}
                  tone="neutral"
                />
              </div>

              <Alert tone={resultImported > 0 ? "success" : "info"}>
                {resultImported > 0
                  ? "As entradas foram criadas como recebidas e as saídas como pagas, usando as datas do extrato."
                  : "Nenhum lançamento novo foi criado."}
                {result.skipped > 0
                  ? ` ${result.skipped} ${result.skipped === 1 ? "lançamento já existia" : "lançamentos já existiam"} e ${result.skipped === 1 ? "foi ignorado" : "foram ignorados"} pela proteção contra duplicidade.`
                  : ""}
              </Alert>
            </div>
          ) : (
            <form
              id={formId}
              className="space-y-4"
              onSubmit={handleSubmit}
            >
              {error ? <Alert tone="error">{error}</Alert> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Conta"
                  htmlFor={accountFieldId}
                  hint="Onde o dinheiro entrou ou saiu."
                >
                  <Select
                    id={accountFieldId}
                    value={accountId}
                    onChange={(event) => {
                      setAccountId(event.target.value);
                      setResult(null);
                    }}
                    disabled={importing}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {ACCOUNT_TYPE_LABELS[account.type]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Mês de referência"
                  htmlFor={monthFieldId}
                  hint="Usado para lançamentos sem data e para conferência."
                >
                  <Input
                    id={monthFieldId}
                    type="month"
                    value={month}
                    onChange={(event) => handleMonthChange(event.target.value)}
                    disabled={importing || reading}
                    required
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_230px]">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-700">
                    Arquivo do extrato
                  </span>
                  <label
                    htmlFor={fileInputId}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-3 transition",
                      dragging
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-300 bg-slate-50/60 hover:border-emerald-300 hover:bg-emerald-50/40",
                      reading && "pointer-events-none opacity-70",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                      {reading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-slate-800">
                        {fileName || "Selecionar CSV, OFX ou PDF"}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        Arraste aqui ou clique. PDF precisa ter texto
                        selecionável. Limite de 5 MB.
                      </span>
                    </span>
                    <input
                      id={fileInputId}
                      type="file"
                      accept=".csv,.ofx,.qfx,.txt,.pdf,text/csv,application/x-ofx,application/vnd.intu.qfx,application/pdf"
                      className="sr-only"
                      onChange={handleFileChange}
                      disabled={reading || importing}
                    />
                  </label>
                </div>

                <Field
                  label="Valores positivos"
                  htmlFor={positiveMeansFieldId}
                  hint="Só vale quando o arquivo não traz sinal nem tipo."
                >
                  <Select
                    id={positiveMeansFieldId}
                    value={positiveMeans}
                    onChange={(event) =>
                      handlePositiveMeansChange(
                        event.target.value as StatementPositiveMeans,
                      )
                    }
                    disabled={importing}
                  >
                    {POSITIVE_MEANS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {warnings.length > 0 ? (
                <Alert tone="info">
                  {warnings[0]}
                  {warnings.length > 1
                    ? ` (+${warnings.length - 1} ${warnings.length - 1 === 1 ? "aviso" : "avisos"})`
                    : ""}
                </Alert>
              ) : null}

              {hasPreview ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Prévia do extrato
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Confira as entradas, as saídas e as categorias antes de
                        importar.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {format ? (
                        <Badge tone="blue">{format.toUpperCase()}</Badge>
                      ) : null}
                      <Badge
                        tone={
                          selectedEntries.length === entries.length
                            ? "green"
                            : "slate"
                        }
                      >
                        {selectedEntries.length} de {entries.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <SummaryTile
                      label="Entradas selecionadas"
                      value={formatCents(totals.incomeCents)}
                      tone="income"
                    />
                    <SummaryTile
                      label="Saídas selecionadas"
                      value={formatCents(totals.expenseCents)}
                      tone="expense"
                    />
                    <SummaryTile
                      label="Saldo do extrato"
                      value={formatCents(totals.balanceCents)}
                      tone="neutral"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAllSelected(true)}
                      className="font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setAllSelected(false)}
                      className="font-medium text-slate-600 hover:text-slate-800"
                    >
                      Limpar seleção
                    </button>
                    {outsideMonthEntries.length > 0 ? (
                      <>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={deselectOutsideMonth}
                          className="font-medium text-slate-600 hover:text-slate-800"
                        >
                          Desmarcar fora do mês
                        </button>
                      </>
                    ) : null}
                  </div>

                  {transferCount > 0 || selectedOutsideMonth > 0 ? (
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {transferCount > 0
                        ? "Transferências, aplicações e pagamentos de fatura vêm desmarcados para evitar dupla contagem. "
                        : ""}
                      {selectedOutsideMonth > 0
                        ? `${selectedOutsideMonth} ${selectedOutsideMonth === 1 ? "lançamento selecionado está" : "lançamentos selecionados estão"} fora do mês de referência.`
                        : ""}
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    {visibleEntries.map((entry) => {
                      const options =
                        entry.kind === "income"
                          ? incomeCategories
                          : expenseCategories;

                      return (
                        <div
                          key={entry.sourceIndex}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border p-3 transition",
                            entry.selected
                              ? "border-slate-200 bg-white"
                              : "border-slate-100 bg-slate-50/70 opacity-80",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={entry.selected}
                            onChange={(event) =>
                              updateEntry(entry.sourceIndex, {
                                selected: event.target.checked,
                              })
                            }
                            disabled={importing}
                            aria-label={`Selecionar ${entry.description}`}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-600"
                          />

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-medium text-slate-600">
                                {formatDate(entry.date)}
                              </span>
                              {entry.isTransfer ? (
                                <Badge tone="amber">Transferência</Badge>
                              ) : null}
                              {entry.date.slice(0, 7) !== month ? (
                                <Badge tone="slate">Fora do mês</Badge>
                              ) : null}
                            </div>

                            <p className="truncate text-sm font-medium text-slate-900">
                              {entry.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                              <Select
                                aria-label={`Categoria de ${entry.description}`}
                                value={entry.categoryId}
                                onChange={(event) =>
                                  updateEntry(entry.sourceIndex, {
                                    categoryId: event.target.value,
                                  })
                                }
                                disabled={importing}
                                className="h-8 max-w-[220px] text-xs"
                              >
                                <option value="">Sem categoria</option>
                                {options.map((category) => (
                                  <option
                                    key={category.id}
                                    value={category.id}
                                  >
                                    {category.name}
                                  </option>
                                ))}
                              </Select>

                              <span
                                className={cn(
                                  "tabular text-sm font-semibold",
                                  entry.kind === "income"
                                    ? "text-emerald-700"
                                    : "text-rose-700",
                                )}
                              >
                                {entry.kind === "income" ? "+" : "−"}{" "}
                                {formatCents(entry.amountCents)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {entries.length > visibleCount ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVisibleCount((current) => current + 100)
                      }
                    >
                      Mostrar mais {Math.min(100, entries.length - visibleCount)}
                    </Button>
                  ) : null}
                </div>
              ) : warnings.length === 0 && !error ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
                  Selecione um arquivo para ver a análise automática.
                </p>
              ) : null}
            </form>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="text-[10px] leading-relaxed text-slate-500">
            Importado como realizado: receitas recebidas e despesas pagas.
          </p>
          <div className="flex items-center gap-2">
            {accounts.length === 0 || result?.ok ? (
              <Button type="button" onClick={onClose}>
                Fechar
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestClose}
                  disabled={importing}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form={formId}
                  disabled={!canImport}
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    `Importar ${selectedEntries.length} ${selectedEntries.length === 1 ? "lançamento" : "lançamentos"}`
                  )}
                </Button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
