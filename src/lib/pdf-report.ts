import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/utils';

interface LancamentoData {
  descricao: string;
  tipo: string;
  valor: number;
  data_competencia: string;
  data_vencimento?: string;
  status: string;
  categoria_nome?: string;
}

interface ReportOptions {
  title: string;
  userName: string;
  periodo: string;
  lancamentos: LancamentoData[];
  resumo: {
    totalReceitas: number;
    totalDespesas: number;
    saldo: number;
  };
}

export function generateActivityReport(options: ReportOptions) {
  const { title, userName, periodo, lancamentos, resumo } = options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // ─── Header ────────────────────────────────
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Control GP', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Gestão Financeira Empresarial', 14, 26);
  doc.text(`Emitido: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, 14, 33);

  // Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 52);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Usuário: ${userName}  |  Período: ${periodo}`, 14, 59);

  // ─── Summary Cards ─────────────────────────
  const cardY = 66;
  const cardW = (pageWidth - 42) / 3;

  const cards = [
    { label: 'Receitas', value: formatCurrency(resumo.totalReceitas), color: [16, 185, 129] as [number, number, number] },
    { label: 'Despesas', value: formatCurrency(resumo.totalDespesas), color: [239, 68, 68] as [number, number, number] },
    { label: 'Saldo', value: formatCurrency(resumo.saldo), color: resumo.saldo >= 0 ? [59, 130, 246] as [number, number, number] : [239, 68, 68] as [number, number, number] },
  ];

  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 7);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(x, cardY, cardW, 24, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 6, cardY + 9);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 6, cardY + 18);
  });

  // ─── Lançamentos por Mês ──────────────────
  let currentY = cardY + 32;

  // Agrupar por mês
  const grouped: Record<string, LancamentoData[]> = {};
  lancamentos.forEach(l => {
    const d = l.data_competencia || l.data_vencimento;
    const key = d ? d.substring(0, 7) : 'Sem Data';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(l);
  });

  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  sortedMonths.forEach(monthKey => {
    // Add page if near bottom before starting a new month
    if (currentY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      currentY = 20;
    }

    const monthLancs = grouped[monthKey];
    monthLancs.sort((a, b) => (b.data_competencia || '').localeCompare(a.data_competencia || '')); // Descendente

    // Título do Mês
    let monthName = monthKey;
    if (monthKey !== 'Sem Data') {
      const [year, month] = monthKey.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }

    // Totais do Mês
    const recTotal = monthLancs.filter(l => l.tipo === 'receita').reduce((sum, l) => sum + l.valor, 0);
    const despTotal = monthLancs.filter(l => l.tipo === 'despesa').reduce((sum, l) => sum + l.valor, 0);
    const saldo = recTotal - despTotal;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(monthName, 14, currentY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(`Receitas: ${formatCurrency(recTotal)}`, 14, currentY + 6);
    doc.setTextColor(239, 68, 68); // rose
    doc.text(` |  Despesas: ${formatCurrency(despTotal)}`, 14 + doc.getTextWidth(`Receitas: ${formatCurrency(recTotal)}`), currentY + 6);
    doc.setTextColor(saldo >= 0 ? 59 : 239, saldo >= 0 ? 130 : 68, saldo >= 0 ? 246 : 68); // blue ou rose
    doc.text(` |  Saldo: ${formatCurrency(saldo)}`, 14 + doc.getTextWidth(`Receitas: ${formatCurrency(recTotal)} |  Despesas: ${formatCurrency(despTotal)}`), currentY + 6);

    currentY += 10;

    const tableData = monthLancs.map(l => [
      l.data_competencia ? new Date(l.data_competencia + 'T12:00:00').toLocaleDateString('pt-BR') : '-',
      l.descricao,
      l.tipo === 'receita' ? 'Receita' : l.tipo === 'despesa' ? 'Despesa' : 'Transf.',
      formatCurrency(l.valor),
      l.status === 'pago' ? 'Pago' : l.status === 'pendente' ? 'Pendente' : l.status === 'vencido' ? 'Vencido' : l.status,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Descrição', 'Tipo', 'Valor', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 22 },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  });

  // ─── Footer ────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Control GP — Documento gerado automaticamente. Assinatura digital do sistema.', 14, pageHeight - 12);
    doc.text(`Página ${i}/${pageCount}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
  }

  // Save
  const fileName = `ControlGP_Relatorio_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
