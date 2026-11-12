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

describe("parseStatementFile PDF", () => {
  it("lê data, descrição, valor e sinal em colunas com saldo", () => {
    const pdf = `Data Descrição Valor
10/11/2026 PIX RECEBIDO JOAO 1.000,00 C 2.500,00
11/11/2026 COMPRA MERCADO 150,45 D 2.349,55
12/11/2026 APLICACAO RDB 500,00 D 1.849,55
13/11/2026 RENDIMENTO POUPANCA 12,34 C 1.861,89`;

    const result = parseStatementFile(pdf, "extrato.pdf", {
      fallbackDate: FALLBACK_DATE,
      format: "pdf",
    });

    expect(result.format).toBe("pdf");
    expect(result.entries).toHaveLength(4);
    expect(result.entries[0]).toMatchObject({
      date: "2026-11-10",
      description: "PIX RECEBIDO JOAO",
      amountCents: 100_000,
      kind: "income",
    });
    expect(result.entries[1]).toMatchObject({
      date: "2026-11-11",
      description: "COMPRA MERCADO",
      amountCents: 15_045,
      kind: "expense",
    });
    expect(result.entries[2]).toMatchObject({
      description: "APLICACAO RDB",
      kind: "expense",
      isTransfer: true,
    });
    expect(result.entries[3]).toMatchObject({
      description: "RENDIMENTO POUPANCA",
      amountCents: 1_234,
      kind: "income",
    });
  });

  it("acumula descrição em várias linhas até encontrar o valor", () => {
    const pdf = `10/11/2026
PIX RECEBIDO
JOAO DA SILVA
1.000,00 C
11/11/2026
COMPRA
MERCADO CENTRO
150,45 D`;

    const result = parseStatementFile(pdf, "extrato.pdf", {
      fallbackDate: FALLBACK_DATE,
      format: "pdf",
    });

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      date: "2026-11-10",
      description: "PIX RECEBIDO JOAO DA SILVA",
      amountCents: 100_000,
      kind: "income",
    });
    expect(result.entries[1]).toMatchObject({
      date: "2026-11-11",
      description: "COMPRA MERCADO CENTRO",
      amountCents: 15_045,
      kind: "expense",
    });
  });

  it("usa a data de referência para datas curtas e para PDF sem data", () => {
    const shortDates = parseStatementFile(
      "05/11 LOJA X 50,00 D",
      "extrato.pdf",
      { fallbackDate: FALLBACK_DATE, format: "pdf" },
    );
    expect(shortDates.entries[0]).toMatchObject({
      date: "2026-11-05",
      amountCents: 5_000,
      kind: "expense",
    });

    const withoutDates = parseStatementFile(
      "COMPRA LOJA X 50,00",
      "extrato.pdf",
      { fallbackDate: FALLBACK_DATE, format: "pdf" },
    );
    expect(withoutDates.entries[0]).toMatchObject({
      date: FALLBACK_DATE,
      description: "COMPRA LOJA X",
      kind: "expense",
    });
    expect(withoutDates.warnings.join(" ")).toContain(
      "não trouxe datas legíveis",
    );
  });

  it("não confunde datas na descrição com valores", () => {
    const pdf = `10/11/2026 PAGAMENTO AGENDADO 12/11/2026 99,90 D
11/11/2026 R$ -25,00 PIX ENVIADO`;

    const result = parseStatementFile(pdf, "extrato.pdf", {
      fallbackDate: FALLBACK_DATE,
      format: "pdf",
    });

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      description: "PAGAMENTO AGENDADO 12/11/2026",
      amountCents: 9_990,
      kind: "expense",
    });
    expect(result.entries[1]).toMatchObject({
      date: "2026-11-11",
      description: "PIX ENVIADO",
      amountCents: 2_500,
      kind: "expense",
    });
  });

  it("ignora valores ambíguos no modo automático e respeita a escolha manual", () => {
    const pdf = "10/11/2026 LOJA X 50,00";

    const automatic = parseStatementFile(pdf, "extrato.pdf", {
      fallbackDate: FALLBACK_DATE,
      format: "pdf",
    });
    expect(automatic.entries).toHaveLength(0);
    expect(automatic.warnings.join(" ")).toContain("sem sinal ou tipo");

    const asExpense = parseStatementFile(pdf, "extrato.pdf", {
      fallbackDate: FALLBACK_DATE,
      format: "pdf",
      positiveMeans: "expense",
    });
    expect(asExpense.entries[0]).toMatchObject({
      amountCents: 5_000,
      kind: "expense",
    });
  });

  it("reconhece a extensão .pdf e orienta quando não há lançamentos", () => {
    const fromExtension = parseStatementFile(
      "10/11/2026 COMPRA 10,00 D",
      "EXTRATO.PDF",
      { fallbackDate: FALLBACK_DATE },
    );
    expect(fromExtension.format).toBe("pdf");
    expect(fromExtension.entries).toHaveLength(1);

    const empty = parseStatementFile("Texto sem valores nem datas", "extrato.pdf", {
      fallbackDate: FALLBACK_DATE,
      format: "pdf",
    });
    expect(empty.entries).toHaveLength(0);
    expect(empty.warnings[0]).toContain("Não encontramos lançamentos no PDF");
    expect(empty.warnings[0]).toContain("CSV");
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
