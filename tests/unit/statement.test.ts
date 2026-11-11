import { describe, expect, it } from "vitest";
import {
  decodeStatementBuffer,
  isTransferDescription,
  parseStatementAmount,
  parseStatementDate,
  parseStatementFile,
  suggestCategoryId,
  type StatementCategory,
} from "@/lib/statement";

const CATEGORIES: StatementCategory[] = [
  { id: "salary", name: "Salário", type: "INCOME" },
  { id: "services", name: "Serviços", type: "INCOME" },
  { id: "other-income", name: "Outras receitas", type: "INCOME" },
  { id: "food", name: "Alimentação", type: "EXPENSE" },
  { id: "transport", name: "Transporte", type: "EXPENSE" },
  { id: "debts", name: "Dívidas", type: "EXPENSE" },
  { id: "other-expense", name: "Outras despesas", type: "EXPENSE" },
];

const FALLBACK_DATE = "2026-11-01";

describe("parseStatementAmount", () => {
  it("aceita os formatos brasileiro e internacional", () => {
    expect(parseStatementAmount("R$ 1.234,56")).toEqual({
      cents: 123_456,
      sign: 1,
      explicitSign: false,
    });
    expect(parseStatementAmount("1,234.56")).toEqual({
      cents: 123_456,
      sign: 1,
      explicitSign: false,
    });
    expect(parseStatementAmount("1.234.567,89")?.cents).toBe(123_456_789);
  });

  it("lê sinais explícitos, D/C e parênteses", () => {
    expect(parseStatementAmount("-45,90")).toMatchObject({
      cents: 4_590,
      sign: -1,
      explicitSign: true,
    });
    expect(parseStatementAmount("45,90 D")).toMatchObject({
      cents: 4_590,
      sign: -1,
      explicitSign: true,
    });
    expect(parseStatementAmount("D 45,90")).toMatchObject({
      cents: 4_590,
      sign: -1,
      explicitSign: true,
    });
    expect(parseStatementAmount("45.90 C")).toMatchObject({
      cents: 4_590,
      sign: 1,
      explicitSign: true,
    });
    expect(parseStatementAmount("(120,00)")).toMatchObject({
      cents: 12_000,
      sign: -1,
      explicitSign: true,
    });
  });

  it("rejeita zero, texto e valores inválidos", () => {
    expect(parseStatementAmount("0,00")).toBeNull();
    expect(parseStatementAmount("abc")).toBeNull();
    expect(parseStatementAmount("")).toBeNull();
    expect(parseStatementAmount("1.2.3")).toBeNull();
  });
});

describe("parseStatementDate", () => {
  it("normaliza os formatos comuns de extrato", () => {
    expect(parseStatementDate("10/11/2026")).toBe("2026-11-10");
    expect(parseStatementDate("2026-11-10")).toBe("2026-11-10");
    expect(parseStatementDate("20261110")).toBe("2026-11-10");
    expect(parseStatementDate("20261110120000[-3:BRT]")).toBe("2026-11-10");
    expect(parseStatementDate("10/11/26")).toBe("2026-11-10");
    expect(parseStatementDate("2026-11-10T12:00:00")).toBe("2026-11-10");
  });

  it("aceita mês/dia quando o dia não cabe em mês e rejeita datas inválidas", () => {
    expect(parseStatementDate("11/25/2026")).toBe("2026-11-25");
    expect(parseStatementDate("31/02/2026")).toBeNull();
    expect(parseStatementDate("sem data")).toBeNull();
  });
});

describe("parseStatementFile CSV", () => {
  it("lê CSV com preâmbulo, ponto e vírgula e valores com sinal", () => {
    const csv = [
      "Extrato de conta",
      "Data;Descrição;Valor",
      "10/11/2026;Supermercado Centro;-150,45",
      "11/11/2026;Salário;5.000,00",
      "12/11/2026;Aplicação RDB;-1.000,00",
    ].join("\n");

    const result = parseStatementFile(csv, "extrato.csv", {
      fallbackDate: FALLBACK_DATE,
    });

    expect(result.format).toBe("csv");
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]).toMatchObject({
      sourceIndex: 1,
      date: "2026-11-10",
      description: "Supermercado Centro",
      amountCents: 15_045,
      kind: "expense",
      isTransfer: false,
    });
    expect(result.entries[1]).toMatchObject({
      sourceIndex: 2,
      date: "2026-11-11",
      description: "Salário",
      amountCents: 500_000,
      kind: "income",
    });
    expect(result.entries[2]).toMatchObject({
      description: "Aplicação RDB",
      amountCents: 100_000,
      kind: "expense",
      isTransfer: true,
    });
  });

  it("lê colunas separadas de débito e crédito e campo entre aspas", () => {
    const csv = [
      "Data;Histórico;Débito;Crédito",
      '10/11/2026;"Mercado; Centro";25,90;',
      "11/11/2026;Cliente;;1.200,00",
    ].join("\n");

    const result = parseStatementFile(csv, "extrato.csv", {
      fallbackDate: FALLBACK_DATE,
    });

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      description: "Mercado; Centro",
      amountCents: 2_590,
      kind: "expense",
    });
    expect(result.entries[1]).toMatchObject({
      description: "Cliente",
      amountCents: 120_000,
      kind: "income",
    });
  });

  it("usa a coluna de tipo para decidir entrada ou saída", () => {
    const csv = [
      "Data,Descrição,Valor,Tipo",
      "10/11/2026,Compra no débito,50.00,D",
      "11/11/2026,Recebimento de cliente,100.00,C",
    ].join("\n");

    const result = parseStatementFile(csv, "extrato.csv", {
      fallbackDate: FALLBACK_DATE,
    });

    expect(result.entries.map((entry) => entry.kind)).toEqual([
      "expense",
      "income",
    ]);
  });

  it("aplica a opção de valores positivos quando não há sinal nem tipo", () => {
    const csv = [
      "Data;Descrição;Valor",
      "10/11/2026;Loja X;50,00",
      "11/11/2026;Loja Y;25,00",
    ].join("\n");

    const automatic = parseStatementFile(csv, "extrato.csv", {
      fallbackDate: FALLBACK_DATE,
    });
    const asExpenses = parseStatementFile(csv, "extrato.csv", {
      fallbackDate: FALLBACK_DATE,
      positiveMeans: "expense",
    });

    expect(automatic.entries.every((entry) => entry.kind === "income")).toBe(
      true,
    );
    expect(
      automatic.warnings.some((warning) =>
        warning.includes("Valores positivos"),
      ),
    ).toBe(true);
    expect(asExpenses.entries.every((entry) => entry.kind === "expense")).toBe(
      true,
    );
  });

  it("usa o mês de referência quando o CSV não tem coluna de data", () => {
    const csv = ["Descrição;Valor", "Mercado;10,00"].join("\n");

    const result = parseStatementFile(csv, "extrato.csv", {
      fallbackDate: FALLBACK_DATE,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].date).toBe(FALLBACK_DATE);
  });

  it("ignora linhas de saldo e respeita o limite de lançamentos", () => {
    const csv = [
      "Data;Descrição;Valor",
      "10/11/2026;Saldo anterior;100,00",
      "11/11/2026;Mercado;-10,00",
      "12/11/2026;Padaria;-5,00",
    ].join("\n");

    const result = parseStatementFile(csv, "extrato.csv", {
      fallbackDate: FALLBACK_DATE,
      maxEntries: 1,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].description).toBe("Mercado");
    expect(
      result.warnings.some((warning) => warning.includes("Limite de 1")),
    ).toBe(true);
  });

  it("avisa quando a data é inválida", () => {
    const csv = [
      "Data;Descrição;Valor",
      "31/02/2026;Mercado;10,00",
    ].join("\n");

    const result = parseStatementFile(csv, "extrato.csv", {
      fallbackDate: FALLBACK_DATE,
    });

    expect(result.entries).toHaveLength(0);
    expect(
      result.warnings.some((warning) => warning.includes("data inválida")),
    ).toBe(true);
  });
});

describe("parseStatementFile OFX", () => {
  it("lê transações OFX, datas compactas e entidades HTML", () => {
    const ofx = `<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20261110120000[-3:BRT]</DTPOSTED>
<TRNAMT>-45.90</TRNAMT>
<FITID>1</FITID>
<NAME>Mercado &amp; Cia</NAME>
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20261111</DTPOSTED>
<TRNAMT>5000.00</TRNAMT>
<FITID>2</FITID>
<NAME>Salário</NAME>
</STMTTRN>
<STMTTRN>
<TRNTYPE>XFER</TRNTYPE>
<DTPOSTED>20261112</DTPOSTED>
<TRNAMT>1000.00</TRNAMT>
<FITID>3</FITID>
<NAME>Transferência entre contas</NAME>
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

    const result = parseStatementFile(ofx, "extrato.ofx", {
      fallbackDate: FALLBACK_DATE,
    });

    expect(result.format).toBe("ofx");
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]).toMatchObject({
      date: "2026-11-10",
      description: "Mercado & Cia",
      amountCents: 4_590,
      kind: "expense",
      isTransfer: false,
    });
    expect(result.entries[1]).toMatchObject({
      date: "2026-11-11",
      description: "Salário",
      amountCents: 500_000,
      kind: "income",
    });
    expect(result.entries[2]).toMatchObject({
      kind: "income",
      isTransfer: true,
    });
  });

  it("orienta quando o OFX não tem transações", () => {
    const result = parseStatementFile("<OFX></OFX>", "extrato.ofx", {
      fallbackDate: FALLBACK_DATE,
    });

    expect(result.entries).toHaveLength(0);
    expect(result.warnings[0]).toContain("STMTTRN");
  });
});

describe("isTransferDescription", () => {
  it("identifica aplicações, faturas, saques e transferências internas", () => {
    expect(isTransferDescription("Aplicação RDB")).toBe(true);
    expect(isTransferDescription("Pagamento de fatura")).toBe(true);
    expect(isTransferDescription("Saque")).toBe(true);
    expect(isTransferDescription("Transferência entre contas")).toBe(true);
    expect(isTransferDescription("Qualquer coisa", "XFER")).toBe(true);
  });

  it("não marca Pix e rendimentos comuns como transferência", () => {
    expect(isTransferDescription("Pix recebido")).toBe(false);
    expect(isTransferDescription("Compra no mercado")).toBe(false);
    expect(isTransferDescription("Rendimento de investimento")).toBe(false);
  });
});

describe("suggestCategoryId", () => {
  it("sugere categorias por tipo e descrição", () => {
    expect(
      suggestCategoryId(
        { description: "SALÁRIO NOVEMBRO", kind: "income" },
        CATEGORIES,
      ),
    ).toBe("salary");
    expect(
      suggestCategoryId(
        { description: "SUPERMERCADO CENTRO", kind: "expense" },
        CATEGORIES,
      ),
    ).toBe("food");
    expect(
      suggestCategoryId(
        { description: "UBER TRIP", kind: "expense" },
        CATEGORIES,
      ),
    ).toBe("transport");
    expect(
      suggestCategoryId(
        { description: "PAGAMENTO DE FATURA", kind: "expense" },
        CATEGORIES,
      ),
    ).toBe("debts");
  });

  it("usa a categoria de fallback e devolve null se ela não existir", () => {
    expect(
      suggestCategoryId(
        { description: "Loja sem palavra-chave", kind: "expense" },
        CATEGORIES,
      ),
    ).toBe("other-expense");
    expect(
      suggestCategoryId(
        { description: "Loja sem palavra-chave", kind: "expense" },
        [{ id: "food", name: "Alimentação", type: "EXPENSE" }],
      ),
    ).toBeNull();
  });
});

describe("decodeStatementBuffer", () => {
  it("decodifica UTF-8 com e sem BOM", () => {
    const utf8 = new TextEncoder().encode("Extrato ção");
    expect(decodeStatementBuffer(utf8.buffer)).toBe("Extrato ção");

    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8]);
    expect(decodeStatementBuffer(withBom.buffer)).toBe("Extrato ção");
  });

  it("cai para Windows-1252 quando o UTF-8 é inválido", () => {
    const windows1252 = new Uint8Array([0x63, 0x61, 0x66, 0xe9]);
    expect(decodeStatementBuffer(windows1252.buffer)).toBe("café");
  });
});
