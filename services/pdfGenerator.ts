/**
 * PDF 报告生成服务 — 使用 jsPDF + html2canvas 将 React 组件渲染为 PDF
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

async function waitForReportAssets(pageElements: HTMLElement[]): Promise<void> {
  if ('fonts' in document) await document.fonts.ready;
  const images = pageElements.flatMap(page => Array.from(page.querySelectorAll('img')));
  await Promise.all(images.map(async image => {
    if (!image.complete) {
      await new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }
    if (typeof image.decode === 'function') await image.decode().catch(() => undefined);
  }));
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export async function generatePDF(
  pageElements: HTMLElement[],
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  await waitForReportAssets(pageElements);
  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let i = 0; i < pageElements.length; i++) {
    onProgress?.(i + 1, pageElements.length);

    const canvas = await html2canvas(pageElements[i], {
      scale: 2.25,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
      imageTimeout: 30000,
      removeContainer: true,
      onclone: clonedDocument => {
        clonedDocument.querySelectorAll<HTMLElement>('*').forEach(element => {
          element.style.animation = 'none';
          element.style.transition = 'none';
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');

    if (i > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
  }

  pdf.setProperties({
    title: fileName.replace(/\.pdf$/i, ''),
    subject: 'Posture photogrammetry and coach-reviewed training prescription',
    creator: 'NeonFit Studio Manager',
  });
  pdf.save(fileName);
}
