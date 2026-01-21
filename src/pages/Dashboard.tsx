import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';
import axios from 'axios';
import { FiRefreshCw, FiDollarSign, FiClipboard, FiFile, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';

// Interface simplificada — NÃO tem valor_realizado_calculado
interface Obra {
  id: number;
  nome: string;
  endereco: string;
  "A R T": string | null;
  cno: string | null;
  eng_responsavel: string;
  proprietario: string;
  data_inicio: string | null;
  previsao_termino: string | null;
  valor_previsto: number;
  valor_realizado: number; // ← VEM DIRETO DO BANCO, SEM CÁLCULO
  created_at: string;
}

export default function Dashboard() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState({
    total_obras: 0,
    valor_previsto_total: 0,
    valor_realizado_total: 0
  });
  const navigate = useNavigate();

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Cálculo de evolução usa valor_realizado DIRETO
  const calcularEvolucaoFisica = (obra: Obra): number => {
    if (obra.valor_previsto <= 0) return 0;
    const percentual = (obra.valor_realizado / obra.valor_previsto) * 100;
    return Math.min(100, Math.max(0, percentual));
  };

  // Carregar obras SEM chamadas extras
  const carregarObras = async () => {
    setLoading(true);
    try {
      const obrasRes = await axios.get<Obra[]>('https://erp-minhas-obras-backend.onrender.com/obras');
      const listaObras = obrasRes.data;

      setObras(listaObras);

      const total_obras = listaObras.length;
      const valor_previsto_total = listaObras.reduce((sum, obra) => sum + obra.valor_previsto, 0);
      const valor_realizado_total = listaObras.reduce((sum, obra) => sum + obra.valor_realizado, 0);

      setResumo({
        total_obras,
        valor_previsto_total,
        valor_realizado_total
      });
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
      alert('Erro ao carregar dados das obras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPermission('obras.listar')) {
      alert('Você não tem permissão para acessar esta página.');
      navigate('/login');
      return;
    }
    carregarObras();
  }, [navigate]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Dashboard - Visão Geral</h1>
          <p className="text-gray-600 mt-2 text-sm">Acompanhe o desempenho de todas as suas obras em tempo real</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={carregarObras}
            disabled={loading}
            className="flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 text-sm font-medium"
          >
            <FiRefreshCw className={`mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar Dados'}
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-5 text-white border border-blue-800">
          <div className="flex items-center">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <FiClipboard className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">Total de Obras</p>
              <p className="text-2xl font-bold mt-1">{resumo.total_obras}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-5 text-white border border-green-800">
          <div className="flex items-center">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <FiDollarSign className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-green-100 uppercase tracking-wide">Valor Previsto Total</p>
              <p className="text-2xl font-bold mt-1">{formatarMoeda(resumo.valor_previsto_total)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl shadow-lg p-5 text-white border border-orange-800">
          <div className="flex items-center">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">
              <FiDollarSign className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-orange-100 uppercase tracking-wide">Valor Realizado Total</p>
              <p className="text-2xl font-bold mt-1">{formatarMoeda(resumo.valor_realizado_total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Título da Seção */}
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900">Detalhamento por Obra</h2>
        <p className="text-gray-600 text-sm">Clique em qualquer obra para editar no módulo de Obras</p>
      </div>

      {/* Lista de Obras */}
      {obras.length === 0 && !loading ? (
        <div className="text-center py-12">
          <FiFile className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-lg mb-4">Nenhuma obra cadastrada ainda.</p>
          {hasPermission('obras:write') && (
            <button
              onClick={() => navigate('/obras')}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
            >
              <FiPlus className="mr-1 inline w-4 h-4" /> Cadastrar Primeira Obra
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {obras.map((obra) => {
            const evolucao = calcularEvolucaoFisica(obra);
            return (
              <div
                key={obra.id}
                className="bg-white rounded-xl shadow-lg border border-gray-300 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                onClick={() => navigate('/obras')}
              >
                {/* Cabeçalho com evolução */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold">{obra.nome}</h3>
                    <span className="px-2.5 py-1 bg-blue-700 bg-opacity-50 rounded-full text-xs font-bold">
                      {evolucao.toFixed(1)}% Concluída
                    </span>
                  </div>
                </div>

                {/* Corpo com detalhes */}
                <div className="p-5 space-y-4">
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">📍 {obra.endereco}</p>
                    <p className="text-gray-600 mt-1">Proprietário: <span className="font-medium">{obra.proprietario}</span></p>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-xs font-semibold text-gray-700">A.R.T.</span>
                        <span className="text-sm font-medium text-gray-900">{obra["A R T"] || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-xs font-semibold text-gray-700">Valor Previsto</span>
                        <span className="text-sm font-bold text-green-600">{formatarMoeda(obra.valor_previsto)}</span>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-xs font-semibold text-gray-700">Valor Realizado</span>
                        <span className="text-sm font-bold text-orange-600">{formatarMoeda(obra.valor_realizado)}</span> {/* ← USANDO VALOR DIRETO */}
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 border border-gray-300">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full"
                          style={{ width: `${evolucao}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-800">Eng. Responsável:</span> {obra.eng_responsavel}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Troca de senha */}
      <div className="mt-6">
        <Link
          to="/change-password"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          🔐 Trocar minha senha
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-3 text-gray-600">Carregando obras...</p>
        </div>
      )}
    </div>
  );
}