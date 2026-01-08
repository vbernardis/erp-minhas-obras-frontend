// src/pages/RelatorioContasAPagar.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiFileText } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface NotaFiscal {
  id: number;
  numero_nota: string;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string | null;
  valor_total: number | null;
  valor_pago: number | null;
  status: string;
  fornecedores: { nome_fantasia: string } | null;
}

interface Obra {
  nome: string;
}

// ✅ Função segura para formatar moeda (aceita null/undefined)
const formatarMoeda = (valor: number | null | undefined): string => {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(valor);
};

// ✅ Função para garantir número válido
const valorOuZero = (valor: number | null | undefined): number => {
  return valor != null && !isNaN(valor) ? valor : 0;
};

export default function RelatorioContasPagas() {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();

  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [obraNome, setObraNome] = useState('Carregando...');
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
  try {
    const [obraRes, todasNotasRes] = await Promise.all([
      axios.get<Obra>(`https://erp-minhas-obras-backend.onrender.com/obras/${obraId}`),
      axios.get<NotaFiscal[]>(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais?obra_id=${obraId}`)
    ]);
    setObraNome(obraRes.data.nome);
    // ✅ Filtrar LOCALMENTE as notas com status = "pendente"
    const notasAPagar = todasNotasRes.data.filter(n => n.status === 'pendente');
    setNotas(notasAPagar);
  } catch (err) {
    alert('Erro ao carregar dados.');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (obraId) carregarDados();
  }, [obraId]);

  // ✅ Exportar PDF (com proteção)
  const exportarPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(16);
    doc.text('ERP MINHAS OBRAS', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Relatório de Contas Pagas', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Obra: ${obraNome}`, 20, 35);

    const tableData = notas.map(n => [
      n.numero_nota || '—',
      n.fornecedores?.nome_fantasia || '—',
      n.data_emissao || '—',
      n.data_vencimento || '—',
      n.data_pagamento || '—',
      formatarMoeda(n.valor_total),
      formatarMoeda(n.valor_pago)
    ]);

    (doc as any).autoTable({
      startY: 45,
      head: [['NF', 'Fornecedor', 'Emissão', 'Vencimento', 'Pagamento', 'Valor Total', 'Valor Pago']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 45 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 30, halign: 'right' },
        6: { cellWidth: 30, halign: 'right' }
      }
    });

    doc.save(`contas-pagas-${obraNome.replace(/\s+/g, '-')}.pdf`);
  };

  // ✅ Exportar Excel (com proteção)
  const exportarExcel = () => {
    const data = [
      ['NF', 'Fornecedor', 'Emissão', 'Vencimento', 'Pagamento', 'Valor Total', 'Valor Pago'],
      ...notas.map(n => [
        n.numero_nota || '—',
        n.fornecedores?.nome_fantasia || '—',
        n.data_emissao || '—',
        n.data_vencimento || '—',
        n.data_pagamento || '—',
        valorOuZero(n.valor_total),
        valorOuZero(n.valor_pago)
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    // Ajustar largura
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contas Pagas');
    XLSX.writeFile(wb, `contas-pagas-${obraNome.replace(/\s+/g, '-')}.xlsx`);
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contas Pagas</h1>
        <div className="flex gap-3">
          <button
            onClick={exportarPDF}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiFileText className="mr-2" /> PDF
          </button>
          <button
            onClick={exportarExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FiFileText className="mr-2" /> Excel
          </button>
          <button
            onClick={() => navigate('/relatorios')}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <FiArrowLeft className="mr-2" /> Voltar
          </button>
        </div>
      </div>

      <p className="mb-4"><strong>Obra:</strong> {obraNome}</p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">NF</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Emissão</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Vencimento</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Pagamento</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Valor Total</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Valor Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {notas.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-500">Nenhuma conta paga encontrada.</td></tr>
            ) : (
              notas.map(n => (
                <tr key={n.id}>
                  <td className="px-4 py-2">{n.numero_nota || '—'}</td>
                  <td className="px-4 py-2">{n.fornecedores?.nome_fantasia || '—'}</td>
                  <td className="px-4 py-2 text-center">{n.data_emissao || '—'}</td>
                  <td className="px-4 py-2 text-center">{n.data_vencimento || '—'}</td>
                  <td className="px-4 py-2 text-center">{n.data_pagamento || '—'}</td>
                  <td className="px-4 py-2 text-right">{formatarMoeda(n.valor_total)}</td>
                  <td className="px-4 py-2 text-right font-bold text-blue-700">{formatarMoeda(n.valor_pago)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}