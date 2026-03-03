// src/pages/RelatorioContasPagas.tsx
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
  // ✅ Novos campos financeiros
  desconto?: number | null;
  juros?: number | null;
  impostos_retidos?: number | null;
}

interface Obra {
  nome: string;
}

// ✅ Função centralizada para formatar data como DD/MM/AAAA
const formatarDataBR = (dataISO: string | null | undefined): string => {
  if (!dataISO) return '—';
  const partes = dataISO.trim().split(/[-T]/);
  if (partes.length >= 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return '—';
};

// ✅ Função para formatar moeda no padrão brasileiro
const formatarMoedaBR = (valor: number | null | undefined): string => {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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
  
  // ✅ NOVOS ESTADOS para filtro de período
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  const carregarDados = async () => {
    try {
      // ✅ URLs corrigidas (sem espaços extras)
      const [obraRes, todasNotasRes] = await Promise.all([
        axios.get<Obra>(`https://erp-minhas-obras-backend.onrender.com/obras/${obraId}`),
        axios.get<NotaFiscal[]>(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais?obra_id=${obraId}`)
      ]);
      setObraNome(obraRes.data.nome);
      const notasPagas = todasNotasRes.data.filter(n => n.status === 'pago');
      setNotas(notasPagas);
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

  // ✅ Filtrar notas pelo período selecionado
  const notasFiltradas = notas.filter(nota => {
    if (!nota.data_pagamento) return false;
    if (dataInicio && nota.data_pagamento < dataInicio) return false;
    if (dataFim && nota.data_pagamento > dataFim) return false;
    return true;
  });

  // ✅ Exportar PDF com colunas ajustadas para A4 paisagem (297mm)
  const exportarPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width; // 297mm
    const margin = 8; // margem reduzida
    const usableWidth = pageWidth - (margin * 2); // ~281mm utilizáveis

    doc.setFontSize(16);
    doc.text('ERP MINHAS OBRAS', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Relatório de Contas Pagas', pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Obra: ${obraNome}`, margin, 32);
    
    // ✅ Mostrar período no PDF se filtrado
    if (dataInicio || dataFim) {
      doc.text(`Período: ${dataInicio ? formatarDataBR(dataInicio) : '—'} até ${dataFim ? formatarDataBR(dataFim) : '—'}`, margin, 38);
    }

    // ✅ Dados da tabela com NOVAS COLUNAS: Desconto, Juros, Imp. Retidos
    const tableData = notasFiltradas.map(n => [
      n.numero_nota || '—',
      n.fornecedores?.nome_fantasia || '—',
      formatarDataBR(n.data_emissao),
      formatarDataBR(n.data_vencimento),
      formatarDataBR(n.data_pagamento),
      formatarMoedaBR(n.valor_total),
      formatarMoedaBR(n.valor_pago),
      formatarMoedaBR(n.desconto),        // ✅ Nova coluna
      formatarMoedaBR(n.juros),            // ✅ Nova coluna
      formatarMoedaBR(n.impostos_retidos)  // ✅ Nova coluna
    ]);

    // ✅ Larguras das colunas somando ~281mm (usando toda a largura da página)
    // Total: 18+55+20+20+20+24+24+20+18+20 = 239mm + margens = ~255mm (sobra espaço)
    const columnWidths = {
      0: { cellWidth: 18, halign: 'center' },      // NF
      1: { cellWidth: 55, halign: 'left' },         // Fornecedor (maior para nomes longos)
      2: { cellWidth: 20, halign: 'center' },       // Emissão
      3: { cellWidth: 20, halign: 'center' },       // Vencimento
      4: { cellWidth: 20, halign: 'center' },       // Pagamento
      5: { cellWidth: 24, halign: 'right' },        // Vlr. Total
      6: { cellWidth: 24, halign: 'right' },        // Vlr. Pago
      7: { cellWidth: 20, halign: 'right' },        // Desconto
      8: { cellWidth: 18, halign: 'right' },        // Juros
      9: { cellWidth: 20, halign: 'right' }         // Imp. Retidos
    };

    (doc as any).autoTable({
      startY: dataInicio || dataFim ? 45 : 38,
      margin: { left: margin, right: margin },
      // ✅ Cabeçalho com novas colunas
      head: [['NF', 'Fornecedor', 'Emissão', 'Vencimento', 'Pagamento', 'Vlr. Total', 'Vlr. Pago', 'Desconto', 'Juros', 'Imp. Retidos']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontSize: 8,           // ✅ Fonte menor para cabeçalho caber
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2
      },
      bodyStyles: { 
        fontSize: 7,           // ✅ Fonte menor para corpo
        cellPadding: 2,
        overflow: 'visible'    // ✅ Evita quebra de texto nas células
      },
      columnStyles: columnWidths,
      styles: {
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      // ✅ Garantir que a tabela use toda a largura disponível
      tableWidth: usableWidth
    });

    doc.save(`contas-pagas-${obraNome.replace(/\s+/g, '-')}.pdf`);
  };

  // ✅ Exportar Excel com datas DD/MM/AAAA, números formatados como moeda BR + novas colunas
  const exportarExcel = () => {
    const data = [
      ['NF', 'Fornecedor', 'Emissão', 'Vencimento', 'Pagamento', 'Valor Total', 'Valor Pago', 'Desconto', 'Juros', 'Imp. Retidos'],
      ...notasFiltradas.map(n => [
        n.numero_nota || '—',
        n.fornecedores?.nome_fantasia || '—',
        formatarDataBR(n.data_emissao),
        formatarDataBR(n.data_vencimento),
        formatarDataBR(n.data_pagamento),
        valorOuZero(n.valor_total),
        valorOuZero(n.valor_pago),
        valorOuZero(n.desconto),        // ✅ Nova coluna
        valorOuZero(n.juros),            // ✅ Nova coluna
        valorOuZero(n.impostos_retidos)  // ✅ Nova coluna
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // ✅ Ajustar largura das colunas (10 colunas agora)
    ws['!cols'] = [
      { wch: 12 },  // NF
      { wch: 30 },  // Fornecedor
      { wch: 12 },  // Emissão
      { wch: 12 },  // Vencimento
      { wch: 12 },  // Pagamento
      { wch: 16 },  // Valor Total
      { wch: 16 },  // Valor Pago
      { wch: 14 },  // Desconto
      { wch: 14 },  // Juros
      { wch: 16 }   // Imp. Retidos
    ];
    
    // ✅ Aplicar formatação de moeda brasileira nas colunas de valores (índices 5 a 9)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      for (let C = 5; C <= 9; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cellAddress]) {
          ws[cellAddress].z = 'R$ #.##0,00'; // ✅ Formato monetário brasileiro
          ws[cellAddress].t = 'n'; // ✅ Tipo numérico
        }
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contas Pagas');
    XLSX.writeFile(wb, `contas-pagas-${obraNome.replace(/\s+/g, '-')}.xlsx`);
  };

  // ✅ Limpar filtros
  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
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

      {/* ✅ FILTRO DE PERÍODO */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={limparFiltros}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Limpar Filtro
          </button>
          <span className="text-sm text-gray-500">
            {notasFiltradas.length} de {notas.length} contas
          </span>
        </div>
      </div>

      {/* ✅ Tabela com NOVAS COLUNAS e rolagem horizontal */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
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
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Desconto</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Juros</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Imp. Retidos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {notasFiltradas.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-4 text-center text-gray-500">Nenhuma conta paga encontrada no período selecionado.</td></tr>
            ) : (
              notasFiltradas.map(n => (
                <tr key={n.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{n.numero_nota || '—'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{n.fornecedores?.nome_fantasia || '—'}</td>
                  {/* ✅ Datas formatadas como DD/MM/AAAA */}
                  <td className="px-4 py-2 text-center whitespace-nowrap">{formatarDataBR(n.data_emissao)}</td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">{formatarDataBR(n.data_vencimento)}</td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">{formatarDataBR(n.data_pagamento)}</td>
                  {/* ✅ Valores formatados como moeda */}
                  <td className="px-4 py-2 text-right whitespace-nowrap">{formatarMoedaBR(n.valor_total)}</td>
                  <td className="px-4 py-2 text-right font-bold text-blue-700 whitespace-nowrap">{formatarMoedaBR(n.valor_pago)}</td>
                  <td className="px-4 py-2 text-right text-red-600 whitespace-nowrap">{formatarMoedaBR(n.desconto)}</td>
                  <td className="px-4 py-2 text-right text-green-600 whitespace-nowrap">{formatarMoedaBR(n.juros)}</td>
                  <td className="px-4 py-2 text-right text-purple-600 whitespace-nowrap">{formatarMoedaBR(n.impostos_retidos)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}