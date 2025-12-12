// src/pages/Relatorios.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';

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
  valor_realizado: number;
}

// Função de formatação de moeda
const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

// Componente de Card de Obra (idêntico ao Dashboard)
const ObraSummaryCard = ({ obra, onAction }: { obra: Obra; onAction?: (tipo: string, id: number) => void }) => {
  const evolucao = obra.valor_previsto > 0
    ? Math.min(100, Math.max(0, (obra.valor_realizado / obra.valor_previsto) * 100))
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-300 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold">{obra.nome}</h3>
          <span className="px-2.5 py-1 bg-blue-700 bg-opacity-50 rounded-full text-xs font-bold">
            {evolucao.toFixed(1)}% Concluída
          </span>
        </div>
      </div>
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
              <span className="text-sm font-bold text-orange-600">{formatarMoeda(obra.valor_realizado)}</span>
            </div>
          </div>
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
        {onAction && (
          <div className="pt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onAction('orcamento-comparativo', obra.id)}
              className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Orçado x Realizado
            </button>
            <button
              onClick={() => onAction('contas-pagas', obra.id)}
              className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Contas Pagas
            </button>
            <button
              onClick={() => onAction('contas-pagar', obra.id)}
              className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
            >
              Contas a Pagar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Relatorios() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [obras, setObras] = useState<Obra[]>([]);
  // Estados reativos à URL
const [tipoRelatorio, setTipoRelatorio] = useState<string | null>(null);
const [obraIdRelatorio, setObraIdRelatorio] = useState<string | null>(null);

// Atualiza os estados sempre que a URL mudar
useEffect(() => {
  const params = new URLSearchParams(location.search);
  setTipoRelatorio(params.get('tipo'));
  setObraIdRelatorio(params.get('obra_id'));
}, [location.search]); // ← depende da URL
  // Estados para o relatório "Orçado x Realizado"
  const [itensOrcamento, setItensOrcamento] = useState<any[]>([]);
  const [carregandoOrcamento, setCarregandoOrcamento] = useState(false);
  const [obraNome, setObraNome] = useState('');

  // Carregar lista de obras
  useEffect(() => {
    axios.get('https://erp-minhas-obras-backend.onrender.com/obras')
      .then(res => setObras(res.data))
      .catch(err => console.error('Erro ao carregar obras:', err));
  }, []);

  const handleRelatorio = (tipo: string, obraId?: number) => {
    const params = new URLSearchParams();
    params.set('tipo', tipo);
    if (obraId) params.set('obra_id', String(obraId));
    navigate(`/relatorios?${params.toString()}`);
  };

  const handleVoltar = () => {
    setTipoRelatorio(null);
    setObraIdRelatorio(null);
    navigate('/relatorios');
  };

  // Função para exportar Excel com autenticação
const handleExportarExcel = async () => {
  if (!obraIdRelatorio) return;

  try {
    // ✅ Buscar usuário do localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      alert('Você precisa estar logado para exportar.');
      return;
    }

    const user = JSON.parse(userStr);
    if (!user.id) {
      alert('ID do usuário inválido. Faça login novamente.');
      return;
    }

    // ✅ Fazer requisição com X-User-ID
    const response = await axios.get(
      `https://erp-minhas-obras-backend.onrender.com/relatorios/obra/${obraIdRelatorio}/orcado-x-realizado/excel`,
      {
        responseType: 'blob',
        headers: {
          'X-User-ID': String(user.id) // ← Garantir que seja string
        }
      }
    );

    // ✅ Disparar download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orcado-x-realizado-obra-${obraIdRelatorio}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('Erro ao exportar Excel:', err);
    if (err.response?.data?.error === 'Usuário não autenticado') {
      alert('Sua sessão expirou. Faça login novamente.');
    } else {
      alert('Erro ao gerar arquivo Excel. Verifique o console.');
    }
  }
};

  // Efeito para carregar "Orçado x Realizado"
  useEffect(() => {
    if (tipoRelatorio === 'orcamento-comparativo' && obraIdRelatorio) {
      setCarregandoOrcamento(true);
      const carregarDados = async () => {
  try {
    console.log('🔍 Carregando dados para obra ID:', obraIdRelatorio);
    
    const resObra = await axios.get(`https://erp-minhas-obras-backend.onrender.com/obras/${obraIdRelatorio}`);
    setObraNome(resObra.data.nome);

    const resOrc = await axios.get(`https://erp-minhas-obras-backend.onrender.com/obras/${obraIdRelatorio}/itens-orcamento`);
    const itens = resOrc.data; // ✅ DECLARAÇÃO CORRETA AQUI

    const resReal = await axios.get(`https://erp-minhas-obras-backend.onrender.com/relatorios/obra/${obraIdRelatorio}/realizado-por-item`);

    // Agora "itens" existe!
    console.log('Itens do orçamento (do frontend):', itens.map((i: any) => ({ id: i.id, nivel: i.nivel, descricao: i.descricao })));
    console.log('Realizado recebido (do backend):', resReal.data);

    const realizadoMap = new Map<number, number>();
    resReal.data.forEach((r: any) => {
      realizadoMap.set(r.orcamento_item_id, parseFloat(r.valor_realizado));
    });

    const itensComRealizado = itens.map((item: any) => ({
      ...item,
      realizado: realizadoMap.get(item.id) || 0,
      total_item: parseFloat(item.total_item) || 0,
      quantidade: item.quantidade ? parseFloat(item.quantidade) : null,
      valor_unitario_material: item.valor_unitario_material ? parseFloat(item.valor_unitario_material) : null,
      valor_unitario_mao_obra: item.valor_unitario_mao_obra ? parseFloat(item.valor_unitario_mao_obra) : null,
    }));

    setItensOrcamento(itensComRealizado);
  } catch (err) {
    console.error('💥 Erro ao carregar relatório:', err);
    alert('Erro ao carregar dados do relatório: verifique o console.');
  } finally {
    setCarregandoOrcamento(false);
  }
};
      carregarDados();
    }
  }, [tipoRelatorio, obraIdRelatorio]);

  const formatarQuantidade = (qtd: number | null): string => {
    if (qtd === null) return '—';
    return qtd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const getIndentLevel = (codigo: string) => {
    return codigo.split('.').length - 1;
  };

  // === TELA DETALHADA: ORÇADO X REALIZADO ===
  if (tipoRelatorio === 'orcamento-comparativo' && obraIdRelatorio) {
    return (
      <div className="p-6">
                <div className="flex justify-end gap-3 mb-6">
                <button
                  onClick={handleVoltar}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center"
                >
                  <FiArrowLeft className="mr-1 w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={() => window.open(`https://erp-minhas-obras-backend.onrender.com/relatorios/obra/${obraIdRelatorio}/orcado-x-realizado/pdf`, '_blank')}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Exportar PDF
                </button>
                <button
                onClick={handleExportarExcel}                  
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Exportar Excel
                </button>
              </div>
        <h1 className="text-2xl font-bold mb-4">Orçado x Realizado</h1>
        <p className="mb-4">Obra: {obraNome}</p>

        {carregandoOrcamento ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-3 text-gray-600">Carregando relatório...</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Descrição</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider">Und</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Qtd</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Vlr Unit. Mat.</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Vlr Unit. Mão Obra</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Orçado Total</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Realizado</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">% Executado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {itensOrcamento.map((item) => {
                  const indent = getIndentLevel(item.codigo) * 20;
                  const percentual = item.total_item > 0
                    ? ((item.realizado / item.total_item) * 100)
                    : 0;
                  const isServico = item.nivel === 'servico';
                  const isBold = !isServico; // Local, Etapa, Subetapa → negrito

                  return (
                    <tr key={item.id} className={isServico ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm" style={{ paddingLeft: indent + 8, fontWeight: isBold ? 'bold' : 'normal' }}>
                        {item.codigo}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ fontWeight: isBold ? 'bold' : 'normal' }}>
                        {item.descricao}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{item.unidade || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatarQuantidade(item.quantidade)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.valor_unitario_material !== null ? formatarMoeda(item.valor_unitario_material) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.valor_unitario_mao_obra !== null ? formatarMoeda(item.valor_unitario_mao_obra) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right" style={{ fontWeight: isBold ? 'bold' : 'normal' }}>
                        {formatarMoeda(item.total_item)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">
                        {formatarMoeda(item.realizado)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.total_item > 0 ? `${percentual.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}

        <div className="mt-4">
        </div>
      </div>
    );
  }

  // === TELA PRINCIPAL: RESUMO POR OBRA (com cards) ===
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Relatórios Gerenciais</h1>

      {/* Substitui a tabela por cards */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Resumo por Obra</h2>
        {obras.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Nenhuma obra cadastrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {obras.map(obra => (
              <ObraSummaryCard
                key={obra.id}
                obra={obra}
                onAction={handleRelatorio}
              />
            ))}
          </div>
        )}
      </div>

      {/* Botões para relatórios gerais */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Relatórios Gerais</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleRelatorio('pedidos-compra')}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Pedidos de Compra
          </button>
          <button
            onClick={() => handleRelatorio('mapa-chuvas')}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            disabled
          >
            Mapa de Chuvas (em breve)
          </button>
          <button
            onClick={() => handleRelatorio('curva-s')}
            className="px-3 py-1 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
            disabled
          >
            Curva S (em breve)
          </button>
        </div>
      </div>
    </div>
  );
}