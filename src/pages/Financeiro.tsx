// src/pages/Financeiro.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiFileText, FiPlus, FiArrowLeft, FiTrash, FiEdit2 } from 'react-icons/fi';
import { hasPermission } from '../utils/permissions';

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
  usuario_lancamento?: string; // ✅ Adicionado
  obras: { nome: string };
  fornecedores: { nome_fantasia: string };
}

export default function Financeiro() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [obraFiltro, setObraFiltro] = useState<number | ''>('');
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
      const res = await axios.get('https://erp-minhas-obras-backend.onrender.com/notas-fiscais');
      setNotas(res.data);
    } catch (err) {
      alert('Erro ao carregar notas fiscais.');
    }
  };

  const notasFiltradas = obraFiltro
    ? notas.filter(nota => nota.obras?.nome && nota.obras.nome === obras.find(o => o.id === obraFiltro)?.nome)
    : notas;

  const exportarPDFLista = () => {
    const params = obraFiltro ? `?obra_id=${obraFiltro}` : '';
    window.open(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais/pdf/lista${params}`, '_blank');
  };

  const handleDelete = async (id: number) => {
    const nota = notas.find(n => n.id === id);
    if (nota?.status === 'pago') {
      alert('Não é possível excluir uma nota já paga. Primeiro cancele a baixa em "Contas Pagas".');
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir esta nota fiscal?')) return;

    try {
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
              window.open(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais/excel${params}`, '_blank');
            }}
            className="flex items-center px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
          >
            <FiFileText className="mr-1" /> Exportar Excel
          </button>

          </div>
      </div>

      {/* Filtro por Obra */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Obra</label>
        <select
          value={obraFiltro}
          onChange={e => setObraFiltro(Number(e.target.value) || '')}
          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as obras</option>
          {obras.map(obra => (
            <option key={obra.id} value={obra.id}>{obra.nome}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th> {/* ✅ Nova coluna */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-3 text-center text-gray-500 text-sm">
                    Nenhuma nota fiscal encontrada.
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