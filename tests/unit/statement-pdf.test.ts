import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseStatementFile } from "@/lib/statement";
import { extractPdfText } from "@/lib/statement-pdf";

const FIXTURE = new URL("../fixtures/extrato.pdf", import.meta.url);

describe("extractPdfText", () => {
  it("extrai o texto de um PDF com texto selecionável", async () => {
    const file = await readFile(FIXTURE);
    const buffer = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength,
    ) as ArrayBuffer;

    const text = await extractPdfText(buffer);

    expect(text).toContain("PIX RECEBIDO JOAO");
    expect(text).toContain("COMPRA MERCADO");

    const result = parseStatementFile(text, "extrato.pdf", {
      fallbackDate: "2026-11-01",
      format: "pdf",
    });

    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]).toMatchObject({
      date: "2026-11-10",
      description: "PIX RECEBIDO JOAO",
      amountCents: 100_000,
      kind: "income",
    });
    expect(result.entries[1]).toMatchObject({
      description: "COMPRA MERCADO",
      amountCents: 15_045,
      kind: "expense",
    });
    expect(result.entries[2]).toMatchObject({
      description: "APLICACAO RDB",
      kind: "expense",
      isTransfer: true,
    });
  });
});
