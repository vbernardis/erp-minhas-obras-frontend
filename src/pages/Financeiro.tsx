// src/pages/Financeiro.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiFileText, FiPlus, FiArrowLeft, FiTrash, FiEdit2 } from 'react-icons/fi';
import { hasPermission } from '../utils/permissions';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';

const formatarDataBR = (dataISO: string | null | undefined): string => {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
};

const formatarMoeda = (valor: number | string | null | undefined): string => {
  const num = typeof valor === 'string'
    ? parseFloat(valor.replace(',', '.'))
    : typeof valor === 'number'
      ? valor
      : 0;
  return isNaN(num) ? '0,00' : num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface Obra {
  id: number;
  nome: string;
}

// ✅ Interface atualizada com novos campos financeiros
interface NotaFiscal {
  id: number;
  numero_nota: string;
  data_emissao: string;
  data_vencimento: string;
  data_lancamento?: string | null;
  data_pagamento: string | null;
  valor_total: number;
  valor_pago: number;
  status: string;
  usuario_baixa?: string;
  usuario_lancamento?: string;
  obras: { nome: string };
  fornecedores: { nome_fantasia: string };
  // ✅ Novos campos para PDF
  desconto?: number | null;
  juros?: number | null;
  impostos_retidos?: number | null;
}

export default function Financeiro() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [obraFiltro, setObraFiltro] = useState<number | ''>('');
  
  // ✅ NOVO: Filtro por status
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPermission('financeiro:read')) {
      alert('Você não tem permissão para acessar esta página.');
      navigate('/dashboard');
      return;
    }
    carregarDados();
  }, [navigate]);

  const carregarDados = async () => {
    try {
      const [obrasRes, notasRes] = await Promise.all([
        // ✅ URLs corrigidas (sem espaços no final)
        axios.get<Obra[]>('https://erp-minhas-obras-backend.onrender.com/obras'),
        axios.get<NotaFiscal[]>('https://erp-minhas-obras-backend.onrender.com/notas-fiscais')
      ]);
      setObras(obrasRes.data);
      setNotas(notasRes.data);
    } catch (err) {
      alert('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const carregarNotas = async () => {
    try {
      // ✅ URL corrigida
      const res = await axios.get('https://erp-minhas-obras-backend.onrender.com/notas-fiscais');
      setNotas(res.data);
    } catch (err) {
      alert('Erro ao carregar notas fiscais.');
    }
  };

  // ✅ Filtro combinado: obra + status
  const notasFiltradas = notas.filter(nota => {
    const filtroObra = !obraFiltro || (nota.obras?.nome && nota.obras.nome === obras.find(o => o.id === obraFiltro)?.nome);
    const filtroStatus = !statusFiltro || nota.status === statusFiltro;
    return filtroObra && filtroStatus;
  });

  // ✅ PDF Export atualizado com novas colunas
  // ✅ PDF Export ajustado: Imp. Retidos só aparece quando status = 'pago'
const exportarPDFLista = () => {
  if (notasFiltradas.length === 0) {
    alert('Nenhuma nota para exportar.');
    return;
  }

  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ERP MINHAS OBRAS', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.text('LISTA DE NOTAS FISCAIS', pageWidth / 2, 25, { align: 'center' });

  const obraNome = obraFiltro
    ? (obras.find(o => o.id === obraFiltro)?.nome || 'Todas as obras')
    : 'Todas as obras';
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Obra: ${obraNome}`, 20, 35);

  // ✅ Dados da tabela: Imp. Retidos só mostra valor se status === 'pago'
  const tableData = notasFiltradas.map(nota => [
    nota.numero_nota,
    nota.obras?.nome || '—',
    nota.fornecedores?.nome_fantasia || '—',
    formatarDataBR(nota.data_lancamento),
    formatarDataBR(nota.data_emissao),
    formatarDataBR(nota.data_vencimento),
    `R$ ${formatarMoeda(nota.valor_total)}`,
    `R$ ${formatarMoeda(nota.valor_pago || 0)}`,
    `R$ ${formatarMoeda(nota.desconto || 0)}`,
    `R$ ${formatarMoeda(nota.juros || 0)}`,
    // ✅ CONDIÇÃO: só exibe impostos_retidos se a nota estiver PAGA
    nota.status === 'pago' 
      ? `R$ ${formatarMoeda(nota.impostos_retidos || 0)}` 
      : '—',
    nota.status,
    nota.usuario_lancamento || 'Não informado'
  ]);

  // ✅ Larguras ajustadas para 13 colunas
  const colWidths = [20, 25, 30, 18, 18, 18, 22, 22, 18, 18, 20, 18, 25];

  // @ts-ignore
  (doc as any).autoTable({
    startY: 42,
    head: [['NF', 'Obra', 'Fornecedor', 'Lançamento', 'Emissão', 'Vencimento', 'Vlr. Total', 'Vlr. Pago', 'Desconto', 'Juros', 'Imp. Retidos', 'Status', 'Usuário']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [43, 108, 176], 
      textColor: [255, 255, 255],
      fontSize: 8 
    },
    bodyStyles: { 
      fontSize: 7,
      cellPadding: 1
    },
    columnStyles: colWidths.reduce((acc, width, index) => {
      acc[index] = { cellWidth: width };
      // Alinhamento direito para valores monetários (colunas 6-10)
      if ([6, 7, 8, 9, 10].includes(index)) acc[index].halign = 'right';
      // Centralizar datas e status
      if ([3, 4, 5, 11].includes(index)) acc[index].halign = 'center';
      return acc;
    }, {} as Record<number, { cellWidth: number; halign?: 'left' | 'center' | 'right' }>),
    styles: { 
      overflow: 'linebreak', 
      cellWidth: 'wrap',
      font: 'helvetica'
    }
  });

  // @ts-ignore
  const finalY = (doc as any).lastAutoTable?.finalY || 280;
  doc.setFontSize(9);
  doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, finalY + 10, { align: 'center' });

  doc.save(`lista-notas-fiscais-${obraNome.replace(/\s+/g, '-')}.pdf`);
};

  const handleDelete = async (id: number) => {
    const nota = notas.find(n => n.id === id);
    if (nota?.status === 'pago') {
      alert('Não é possível excluir uma nota já paga. Primeiro cancele a baixa em "Contas Pagas".');
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir esta nota fiscal?')) return;

    try {
      // ✅ URL corrigida
      await axios.delete(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais/${id}`);
      alert('Nota excluída com sucesso!');
      carregarNotas();
    } catch (err: any) {
      alert('Erro ao excluir nota: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/financeiro/nova-nota')}
            className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="mr-1" /> Nova Nota
          </button>
          
          <button
            onClick={() => navigate('/financeiro/contas-a-pagar')}
            className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            Contas a Pagar
          </button>
          <button
            onClick={() => navigate('/financeiro/contas-pagas')}
            className="flex items-center px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
          >
            Contas Pagas
          </button>

          <button
            onClick={exportarPDFLista}
            className="flex items-center px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700"
          >
            <FiFileText className="mr-1" /> Exportar PDF
          </button>
          
          <button
            onClick={() => {
              const params = obraFiltro ? `?obra_id=${obraFiltro}` : '';
              // ✅ URL corrigida
              window.open(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais/excel${params}`, '_blank');
            }}
            className="flex items-center px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
          >
            <FiFileText className="mr-1" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros: Obra + Status */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Filtro por Obra */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Obra</label>
          <select
            value={obraFiltro}
            onChange={e => setObraFiltro(Number(e.target.value) || '')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as obras</option>
            {obras.map(obra => (
              <option key={obra.id} value={obra.id}>{obra.nome}</option>
            ))}
          </select>
        </div>

        {/* ✅ NOVO: Filtro por Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Status</label>
          <select
            value={statusFiltro}
            onChange={e => setStatusFiltro(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="lançada">Lançada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        // ✅ CORREÇÃO PRINCIPAL: overflow-x-auto para habilitar rolagem lateral
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NF</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obra</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lançamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emissão</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-3 text-center text-gray-500 text-sm">
                    Nenhuma nota fiscal encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                notasFiltradas.map(nota => (
                  <tr key={nota.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{nota.numero_nota}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{nota.obras?.nome || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 truncate max-w-xs" title={nota.fornecedores?.nome_fantasia}>
                      {nota.fornecedores?.nome_fantasia || '—'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{formatarDataBR(nota.data_lancamento)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{formatarDataBR(nota.data_emissao)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{formatarDataBR(nota.data_vencimento)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 text-right">R$ {formatarMoeda(nota.valor_total)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 text-right">R$ {formatarMoeda(nota.valor_pago || 0)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        nota.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                        nota.status === 'pago' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {nota.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 truncate max-w-[100px]" title={nota.usuario_lancamento || 'Não informado'}>
                      {nota.usuario_lancamento || 'Não informado'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex gap-2">
                        {nota.status === 'pago' ? (
                          <button
                            disabled
                            className="text-gray-400 cursor-not-allowed p-1"
                            title="Não é possível editar uma nota já paga"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/financeiro/editar-nota/${nota.id}`)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Editar Nota Fiscal"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(nota.id)}
                          disabled={nota.status === 'pago'}
                          className={`p-1 ${nota.status === 'pago' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                          title={nota.status === 'pago' ? 'Não é possível excluir notas pagas' : 'Excluir nota'}
                        >
                          <FiTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}