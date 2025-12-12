// src/pages/NovaNotaFiscal.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiPlus, FiTrash } from 'react-icons/fi';

interface Obra {
  id: number;
  nome: string;
}

interface Fornecedor {
  id: number;
  nome_fantasia: string;
}

interface ServicoOrcamento {
  id: number;
  codigo: string;
  descricao: string;
}

interface ItemNota {
  id: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unit: number;
  imposto: number;
  preco_total: number;
  orcamento_item_id: number | null;
}

// ✅ Interface atualizada para incluir data_lancamento
interface NotaFiscalPayload {
  obra_id: number;
  fornecedor_id: number;
  numero_nota: string;
  data_emissao: string;
  data_vencimento: string;
  data_lancamento: string; // ✅ Campo adicionado
  data_pagamento?: string;
  forma_pagamento?: string;
  frete: number;
  itens: Omit<ItemNota, 'id' | 'preco_total'>[]; // Omitindo campos não necessários no backend
}

export default function NovaNotaFiscal() {
  const navigate = useNavigate();

  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [servicos, setServicos] = useState<ServicoOrcamento[]>([]);

  const [obraId, setObraId] = useState<number | ''>('');
  const [fornecedorId, setFornecedorId] = useState<number | ''>('');
  const [numeroNota, setNumeroNota] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'Boleto' | 'Pix' | 'Depósito' | ''>('');
  const [frete, setFrete] = useState<number>(0);

  // ✅ Estado para a data de lançamento (fixa no dia atual)
  const [dataLancamento] = useState(() => new Date().toISOString().split('T')[0]);

  const [itens, setItens] = useState<ItemNota[]>([
    { id: 1, descricao: '', unidade: '', quantidade: 1, preco_unit: 0, imposto: 0, preco_total: 0, orcamento_item_id: null }
  ]);

  // ✅ Estado para rascunhos dos campos numéricos
  const [valorEmEdicao, setValorEmEdicao] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);

  const [dataVencimento, setDataVencimento] = useState('');

  // ✅ Estados para anexos
  const [anexoNF, setAnexoNF] = useState<File | null>(null);
  const [anexoBoleto, setAnexoBoleto] = useState<File | null>(null);

  // ✅ Função segura para exibir número com vírgula
  const numeroParaInput = (valor: number | undefined | null): string => {
    if (valor == null || isNaN(valor)) return '';
    return valor.toString().replace('.', ',');
  };

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [obrasRes, fornecedoresRes] = await Promise.all([
          axios.get<Obra[]>('http://localhost:3001/obras'),
          axios.get<Fornecedor[]>('http://localhost:3001/fornecedores')
        ]);
        setObras(obrasRes.data);
        setFornecedores(fornecedoresRes.data);
      } catch (err) {
        alert('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  // Carregar serviços quando obra muda
  useEffect(() => {
    if (obraId) {
      axios.get<ServicoOrcamento[]>(`http://localhost:3001/obras/${obraId}/servicos-orcamento`)
        .then(res => setServicos(res.data))
        .catch(err => {
          console.error('Erro ao carregar serviços:', err);
          setServicos([]);
        });
    } else {
      setServicos([]);
    }
  }, [obraId]);

  const adicionarItem = () => {
    setItens([...itens, { 
      id: Date.now(), 
      descricao: '', 
      unidade: '', 
      quantidade: 1, 
      preco_unit: 0, 
      imposto: 0, 
      preco_total: 0, 
      orcamento_item_id: null 
    }]);
  };

  const removerItem = (id: number) => {
    if (itens.length > 1) {
      setItens(itens.filter(item => item.id !== id));
      // Limpar rascunhos
      setValorEmEdicao(prev => {
        const novo = { ...prev };
        delete novo[`qtd_${id}`];
        delete novo[`unit_${id}`];
        delete novo[`imp_${id}`];
        return novo;
      });
    }
  };

  const atualizarItem = (id: number, campo: keyof ItemNota, valor: any) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        const novoItem = { ...item, [campo]: valor };
        // Recalcular total apenas se for campo numérico
        if (campo === 'quantidade' || campo === 'preco_unit' || campo === 'imposto') {
          const qtd = novoItem.quantidade || 0;
          const unit = novoItem.preco_unit || 0;
          const imp = novoItem.imposto || 0;
          novoItem.preco_total = qtd * unit + imp;
        }
        return novoItem;
      }
      return item;
    }));
  };

  // Exemplo de onde adicionar no arquivo de criação da NF
const getUsuarioLogado = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return 'Usuário não identificado';
    const user = JSON.parse(userStr);
    return user.name || 'Usuário';
  } catch (e) {
    console.warn('Erro ao ler usuário', e);
    return 'Usuário';
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!obraId || !fornecedorId || !numeroNota || !dataEmissao || !dataVencimento) {
      alert('Obra, fornecedor, número da nota, data de emissão e data de vencimento são obrigatórios.');
      return;
    }

    const itensSemApropriacao = itens.filter(item => item.orcamento_item_id === null);
    if (itensSemApropriacao.length > 0) {
      alert('Todos os itens devem estar vinculados a um serviço do orçamento.');
      return;
    }

    const usuarioLogado = getUsuarioLogado();

    try {
      // ✅ Criar FormData apenas se houver arquivos
      if (anexoNF || anexoBoleto) {
        const formData = new FormData();
        formData.append('obra_id', obraId.toString());
        formData.append('fornecedor_id', fornecedorId.toString());
        formData.append('numero_nota', numeroNota);
        formData.append('data_emissao', dataEmissao);
        formData.append('data_vencimento', dataVencimento);
        formData.append('data_lancamento', dataLancamento); // ✅ Adiciona a data de lançamento
        if (dataPagamento) formData.append('data_pagamento', dataPagamento);
        if (formaPagamento) formData.append('forma_pagamento', formaPagamento);
        formData.append('frete', frete.toString());
        formData.append('itens', JSON.stringify(itens.map(item => ({
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          preco_unit: item.preco_unit,
          imposto: item.imposto,
          preco_total: item.preco_total,
          orcamento_item_id: item.orcamento_item_id
        }))));

        // ✅ Adiciona o campo usuario_lancamento ao formData
        formData.append('usuario_lancamento', usuarioLogado);

        if (anexoNF) formData.append('anexo_nota_fiscal', anexoNF);
        if (anexoBoleto) formData.append('anexo_boleto', anexoBoleto);

        await axios.post('http://localhost:3001/notas-fiscais', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // ✅ Payload para envio sem arquivos
        const payload: NotaFiscalPayload = {
          obra_id: obraId,
          fornecedor_id: fornecedorId,
          numero_nota: numeroNota,
          data_emissao: dataEmissao,
          data_vencimento: dataVencimento,
          data_lancamento: dataLancamento, // ✅ Inclui a data de lançamento no payload
          data_pagamento: dataPagamento || undefined,
          forma_pagamento: formaPagamento || undefined,
          frete: frete || 0,
          itens: itens.map(item => ({
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: item.quantidade,
            preco_unit: item.preco_unit,
            imposto: item.imposto,
            preco_total: item.preco_total,
            orcamento_item_id: item.orcamento_item_id,
            usuario_lancamento: usuarioLogado
          }))
          
        };

        await axios.post('http://localhost:3001/notas-fiscais', payload);
      }

      alert('Nota fiscal criada com sucesso!');
      navigate('/financeiro');
    } catch (err: any) {
      alert('Erro ao salvar nota fiscal: ' + (err.response?.data?.error || err.message));
    }
  };

  // ✅ Função para abrir a lista de fornecedores
  const handleAbrirListaFornecedores = () => {
    // Armazena o caminho atual no sessionStorage para voltar depois
    sessionStorage.setItem('retornoAposCadastroFornecedor', '/financeiro/nova-nota');
    // Navega para a lista de fornecedores
    navigate('/fornecedores');
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/financeiro')}
        className="flex items-center text-blue-600 mb-6 hover:underline"
      >
        <FiArrowLeft className="mr-2" /> Voltar para Notas Fiscais
      </button>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Nova Nota Fiscal</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Obra e Fornecedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obra *</label>
              <select
                value={obraId}
                onChange={e => setObraId(Number(e.target.value) || '')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma obra</option>
                {obras.map(obra => (
                  <option key={obra.id} value={obra.id}>{obra.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Fornecedor *</label>
                {/* ✅ Botão alterado para redirecionar para a lista de fornecedores */}
                <button
                  type="button"
                  onClick={handleAbrirListaFornecedores} // ✅ Chama a função de redirecionamento
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <FiPlus className="mr-1 w-4 h-4" /> Novo Fornecedor
                </button>
              </div>
              <select
                value={fornecedorId}
                onChange={e => setFornecedorId(Number(e.target.value) || '')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione um fornecedor</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_fantasia}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dados da Nota */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número da NF *</label>
              <input
                type="text"
                value={numeroNota}
                onChange={e => setNumeroNota(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Emissão *</label>
              <input
                type="date"
                value={dataEmissao}
                onChange={e => setDataEmissao(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento *</label>
              <input
                type="date"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Lançamento</label>
              <input
                type="date"
                value={dataLancamento} // ✅ Valor fixo
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100" // ✅ bg-gray-100 para indicar somente leitura
                readOnly // ✅ Impede edição
              />
            </div>
            </div>
            {/* ✅ Novo campo para o usuário logado */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lançado por</label>
              <input
                type="text"
                value={getUsuarioLogado()} // ✅ Exibe o nome do usuário logado
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100" // ✅ bg-gray-100 para indicar somente leitura
                readOnly // ✅ Impede edição
              />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento</label>
              <input
                type="date"
                value={dataPagamento}
                onChange={e => setDataPagamento(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="Boleto">Boleto</option>
                <option value="Pix">Pix</option>
                <option value="Depósito">Depósito</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Frete (R$)</label>
            <input
              type="number"
              step="0.01"
              value={frete}
              onChange={e => setFrete(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ✅ Campos de anexo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anexar Nota Fiscal (PDF ou imagem)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAnexoNF(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anexar Boleto Bancário (PDF ou imagem)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAnexoBoleto(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
              />
            </div>
          </div>

          {/* Tabela de Itens */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Itens da Nota Fiscal</label>
              <button
                type="button"
                onClick={adicionarItem}
                className="text-sm text-blue-600 flex items-center"
              >
                <FiPlus className="mr-1" /> Adicionar Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-50 rounded-lg">
                <thead>
                  <tr className="bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase">
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2">Und</th>
                    <th className="px-3 py-2">Qtd</th>
                    <th className="px-3 py-2">Vlr Unit.</th>
                    <th className="px-3 py-2">Impostos</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Apropriação (Serviço do Orçamento)</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={e => atualizarItem(item.id, 'descricao', e.target.value)}
                          className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.unidade}
                          onChange={e => atualizarItem(item.id, 'unidade', e.target.value)}
                          className="w-16 text-sm px-2 py-1 border border-gray-300 rounded"
                          placeholder="m²"
                          required
                        />
                      </td>
                      {/* ✅ QUANTIDADE */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`qtd_${item.id}`] !== undefined
                              ? valorEmEdicao[`qtd_${item.id}`]
                              : numeroParaInput(item.quantidade)
                          }
                          onChange={(e) => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^0-9,]/g, '');
                            const partes = valor.split(',');
                            if (partes.length > 2) {
                              valor = partes[0] + ',' + partes[1];
                            }
                            if (valor.startsWith(',')) {
                              valor = '0' + valor;
                            }
                            setValorEmEdicao((prev) => ({ ...prev, [`qtd_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`qtd_${item.id}`] || '';
                            let num = 1;
                            if (raw) {
                              const numStr = raw.replace(',', '.');
                              const parsed = parseFloat(numStr);
                              if (!isNaN(parsed) && parsed >= 1) {
                                num = parsed;
                              }
                            }
                            atualizarItem(item.id, 'quantidade', num);
                            setValorEmEdicao((prev) => {
                              const novo = { ...prev };
                              delete novo[`qtd_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-20 text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      {/* ✅ PREÇO UNITÁRIO */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`unit_${item.id}`] !== undefined
                              ? valorEmEdicao[`unit_${item.id}`]
                              : numeroParaInput(item.preco_unit)
                          }
                          onChange={(e) => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^0-9,]/g, '');
                            const partes = valor.split(',');
                            if (partes.length > 2) {
                              valor = partes[0] + ',' + partes[1];
                            }
                            if (valor.startsWith(',')) {
                              valor = '0' + valor;
                            }
                            setValorEmEdicao((prev) => ({ ...prev, [`unit_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`unit_${item.id}`] || '';
                            let num = 0;
                            if (raw) {
                              const numStr = raw.replace(',', '.');
                              const parsed = parseFloat(numStr);
                              if (!isNaN(parsed) && parsed >= 0) {
                                num = parsed;
                              }
                            }
                            atualizarItem(item.id, 'preco_unit', num);
                            setValorEmEdicao((prev) => {
                              const novo = { ...prev };
                              delete novo[`unit_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-24 text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      {/* ✅ IMPOSTO */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`imp_${item.id}`] !== undefined
                              ? valorEmEdicao[`imp_${item.id}`]
                              : numeroParaInput(item.imposto)
                          }
                          onChange={(e) => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^0-9,]/g, '');
                            const partes = valor.split(',');
                            if (partes.length > 2) {
                              valor = partes[0] + ',' + partes[1];
                            }
                            if (valor.startsWith(',')) {
                              valor = '0' + valor;
                            }
                            setValorEmEdicao((prev) => ({ ...prev, [`imp_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`imp_${item.id}`] || '';
                            let num = 0;
                            if (raw) {
                              const numStr = raw.replace(',', '.');
                              const parsed = parseFloat(numStr);
                              if (!isNaN(parsed) && parsed >= 0) {
                                num = parsed;
                              }
                            }
                            atualizarItem(item.id, 'imposto', num);
                            setValorEmEdicao((prev) => {
                              const novo = { ...prev };
                              delete novo[`imp_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-24 text-sm px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium">
                        R$ {item.preco_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.orcamento_item_id || ''}
                          onChange={e => atualizarItem(item.id, 'orcamento_item_id', e.target.value ? Number(e.target.value) : null)}
                          className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        >
                          <option value="">Selecione um serviço</option>
                          {servicos.map(servico => (
                            <option key={servico.id} value={servico.id}>
                              {servico.codigo} - {servico.descricao}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {itens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removerItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiTrash className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Salvar Nota Fiscal
            </button>
            <button
              type="button"
              onClick={() => navigate('/financeiro')}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}