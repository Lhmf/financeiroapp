import { extractText, getDocumentProxy } from "unpdf";
import { MAX_STATEMENT_PDF_PAGES } from "./statement";

/**
 * Extrai o texto de um PDF usando uma build serverless do PDF.js.
 *
 * PDFs digitalizados (somente imagem) não têm texto para extrair. Eles são
 * rejeitados com uma mensagem clara na action que chama esta função.
 */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    maxImageSize: 16_777_216,
  });

  try {
    if (pdf.numPages > MAX_STATEMENT_PDF_PAGES) {
      throw new Error("statement-pdf-too-many-pages");
    }

    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } finally {
    await pdf.cleanup();
  }
}
