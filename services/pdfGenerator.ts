/**
 * PDF 报告生成服务 — 使用 jsPDF + html2canvas 将 React 组件渲染为 PDF
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export async function generatePDF(
  pageElements: HTMLElement[],
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let i = 0; i < pageElements.length; i++) {
    onProgress?.(i + 1, pageElements.length);

    const canvas = await html2canvas(pageElements[i], {
      scale: 2,
      useCORS: true,
      backgroundColor: '#09090b',
      logging: false,
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    if (i > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
  }

  pdf.save(fileName);
}
