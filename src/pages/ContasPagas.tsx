// src/pages/ContasPagas.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiX } from 'react-icons/fi';
import { hasPermission } from '../utils/permissions';

// Função para formatar data no padrão brasileiro
const formatarDataBR = (dataISO: string | null): string => {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
};

interface NotaFiscal {
  id: number;
  numero_nota: string;
  data_emissao: string;
  data_vencimento: string;     // ← adicionado
  data_pagamento: string | null;
  valor_total: number;
  valor_pago: number | null; // ← ADICIONE ESTA LINHA
  status: string;
  obras: { nome: string };
  usuario_baixa?: string; // ✅ Adicione esta linha
  fornecedores: { nome_fantasia: string };
}

export default function ContasPagas() {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleCancelarBaixa = async (id: number) => {
    if (!window.confirm('Cancelar a baixa dessa nota? Ela retornará para Contas a Pagar.')) return;

    try {
      await axios.post(`http://localhost:3001/notas-fiscais/${id}/cancelar-baixa`);
      alert('Baixa cancelada com sucesso!');
      carregarNotas();
    } catch (err: any) {
      alert('Erro ao cancelar baixa: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    if (!hasPermission('financeiro:read')) {
      alert('Você não tem permissão para acessar esta página.');
      navigate('/dashboard');
      return;
    }
    carregarNotas();
  }, [navigate]);

  const carregarNotas = async () => {
    try {
      const res = await axios.get('https://erp-minhas-obras-backend.onrender.com/financeiro/contas-pagas');
      setNotas(res.data);
    } catch (err) {
      alert('Erro ao carregar contas pagas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contas Pagas</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/financeiro')}
            className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            <FiArrowLeft className="mr-2" /> Voltar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emissão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Pago</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário da Baixa</th> {/* Adicione esta coluna */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma conta paga encontrada.
                  </td>
                </tr>
              ) : (
                notas.map(nota => (
                  <tr key={nota.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{nota.numero_nota}</td>
                    <td className="px-6 py-4">{nota.obras?.nome || '—'}</td>
                    <td className="px-6 py-4">{nota.fornecedores?.nome_fantasia || '—'}</td>
                    <td className="px-6 py-4">{formatarDataBR(nota.data_emissao)}</td>
                    <td className="px-6 py-4">{formatarDataBR(nota.data_vencimento)}</td>
                    <td className="px-6 py-4">{formatarDataBR(nota.data_pagamento)}</td>
                    <td className="px-6 py-4">R$ {nota.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">R$ {(nota.valor_pago ?? nota.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{nota.usuario_baixa || '—'}</td> {/* Adicione esta célula */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {/* ✅ REMOVIDO botão de edição — notas pagas não devem ser editadas */}
                        <button
                          onClick={() => handleCancelarBaixa(nota.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Cancelar Baixa"
                        >
                          <FiX className="w-4 h-4" />
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