declare module "pdf-parse" {
  import { Buffer } from "node:buffer";

  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    [key: string]: unknown;
  }

  interface PDFMetadata {
    [key: string]: unknown;
  }

  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata?: PDFMetadata | null;
    text: string;
    version: string;
  }

  type PdfBinary = Buffer | ArrayBuffer | Uint8Array;
  type PdfSource = PdfBinary | { data: PdfBinary };

  type PdfParse = (data: PdfSource, options?: unknown) => Promise<PDFParseResult>;

  const pdfParse: PdfParse;
  export default pdfParse;
}
