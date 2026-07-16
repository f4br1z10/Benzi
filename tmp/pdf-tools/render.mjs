import fs from 'node:fs/promises';
import path from 'node:path';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const inputs = process.argv.slice(2);

for (const input of inputs) {
  const bytes = new Uint8Array(await fs.readFile(input));
  const pdf = await pdfjs.getDocument({ data: bytes, disableFontFace: false }).promise;
  const base = path.basename(input, path.extname(input)).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const outputDir = path.resolve('../pdfs', base);
  await fs.mkdir(outputDir, { recursive: true });
  const documentText = [];
  const info = { file: input, pages: pdf.numPages, dimensions: [] };

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    await fs.writeFile(path.join(outputDir, `page-${pageNumber}.png`), canvas.toBuffer('image/png'));

    const text = await page.getTextContent();
    const rows = text.items
      .filter((item) => 'str' in item && item.str.trim())
      .map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height }));
    documentText.push({ page: pageNumber, rows });
    info.dimensions.push({ page: pageNumber, width: viewport.width / 1.8, height: viewport.height / 1.8 });
  }

  await fs.writeFile(path.join(outputDir, 'text.json'), JSON.stringify(documentText, null, 2));
  await fs.writeFile(path.join(outputDir, 'info.json'), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info));
}
