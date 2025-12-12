// src/pages/ContasAPagar.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiEdit2, FiTrash, FiArrowLeft, FiDollarSign } from 'react-icons/fi';
import { hasPermission } from '../utils/permissions';
import { FiFileText, FiDownload } from 'react-icons/fi';

const formatarDataBR = (dataISO: string | null): string => {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
};

const SUPABASE_URL = 'https://bopdpynrmgtrdehayktb.supabase.co';

interface NotaFiscal {
  id: number;
  numero_nota: string;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  valor_total: number;
  status: string;
  forma_pagamento?: string; // ✅ Adicione esta linha
  anexo_nota_fiscal: string | null;
  anexo_boleto: string | null;
  obras: { nome: string };
  fornecedores: { nome_fantasia: string };
}

export default function ContasAPagar() {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      const res = await axios.get('https://erp-minhas-obras-backend.onrender.com/financeiro/contas-pagar');
      setNotas(res.data);
    } catch (err) {
      alert('Erro ao carregar contas a pagar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma de Pagamento</th> {/* ✅ Adicione esta coluna */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500"> {/* ✅ Atualize o colspan */}
                    Nenhuma conta a pagar encontrada.
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
                    <td className="px-6 py-4">{nota.forma_pagamento || '—'}</td> {/* ✅ Adicione esta célula */}
                    <td className="px-6 py-4">R$ {nota.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
  <div className="flex gap-2">
    {/* Botão de Download da Nota Fiscal */}
    {nota.anexo_nota_fiscal && (
      <a
        href={`${SUPABASE_URL}/storage/v1/object/public/documentos-fiscais/${nota.anexo_nota_fiscal}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 p-1"
        title="Baixar Nota Fiscal"
      >
        <FiFileText className="w-4 h-4" />
      </a>
    )}

    {/* Botão de Download do Boleto — CORRIGIDO */}
    {nota.anexo_boleto && (
      <a
        href={`${SUPABASE_URL}/storage/v1/object/public/documentos-fiscais/${nota.anexo_boleto}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-600 hover:text-green-800 p-1"
        title="Baixar Boleto"
      >
        <FiDownload className="w-4 h-4" />
      </a>
    )}

    {/* Botão de Edição (mantido) */}
    <button
      onClick={() => navigate(`/financeiro/editar-nota/${nota.id}`)}
      className="text-blue-600 hover:text-blue-800 p-1"
      title="Editar Nota Fiscal"
    >
      <FiEdit2 className="w-4 h-4" />
    </button>

    {/* Botão de Baixa (mantido) */}
    <button
      onClick={() => navigate(`/notas-fiscais/${nota.id}/baixa`)}
      className="text-green-600 hover:text-green-800 p-1"
      title="Registrar Pagamento"
    >
      <FiDollarSign className="w-4 h-4" />
    </button>

    {/* Botão de Exclusão (mantido) */}
    <button
      onClick={() => {
        if (window.confirm('Excluir nota fiscal?')) {
          axios.delete(`http://localhost:3001/notas-fiscais/${nota.id}`)
            .then(() => carregarNotas())
            .catch(err => alert('Erro ao excluir: ' + (err.response?.data?.error || err.message)));
        }
      }}
      className="text-red-600 hover:text-red-800 p-1"
      title="Excluir"
    >
      <FiTrash className="w-4 h-4" />
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