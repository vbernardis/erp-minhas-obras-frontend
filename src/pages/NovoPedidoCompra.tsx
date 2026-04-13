// src/pages/NovoPedidoCompra.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiPlus, FiTrash } from 'react-icons/fi';

interface Obra {
  id: number;
  nome: string;
  endereco: string;
}

interface Fornecedor {
  id: number;
  nome_fantasia: string;
  cidade?: string;
  uf?: string;
}

interface ServicoOrcamento {
  id: number;
  codigo: string;
  descricao: string;
}

interface ItemPedido {
  id: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  desconto: number; // ✅ Novo campo
  impostos: number;
  orcamento_item_id: number | null;
}

// ✅ Função para formatar número decimal com vírgula e 2 casas
const formatarDecimalInput = (valor: number): string => {
  if (isNaN(valor) || valor === null || valor === undefined) return '';
  return valor.toFixed(2).replace('.', ',');
};

export default function NovoPedidoCompra() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [servicos, setServicos] = useState<ServicoOrcamento[]>([]);
  const [formData, setFormData] = useState({
    obra_id: '',
    fornecedor_id: '',
    data_pedido: new Date().toISOString().split('T')[0],
    frete: '',
    cidade: '',
    uf: '',
    observacoes: ''
  });
  const [itens, setItens] = useState<ItemPedido[]>([{ 
    id: 1, 
    descricao: '', 
    quantidade: 1, 
    unidade: '', 
    valor_unitario: 0, 
    desconto: 0, // ✅ Inicializado
    impostos: 0, 
    orcamento_item_id: null 
  }]);
  const navigate = useNavigate();

  const [valorEmEdicao, setValorEmEdicao] = useState<Record<string, string>>({});

  const carregarDados = async () => {
    try {
      const [obrasRes, fornecedoresRes] = await Promise.all([
        axios.get<Obra[]>('https://erp-minhas-obras-backend.onrender.com/obras'),
        axios.get<Fornecedor[]>('https://erp-minhas-obras-backend.onrender.com/fornecedores')
      ]);
      setObras(obrasRes.data);
      setFornecedores(fornecedoresRes.data);
    } catch (err) {
      alert('Erro ao carregar dados.');
    }
  };

  // ✅ Carregar serviços do orçamento quando obra muda
  useEffect(() => {
    if (formData.obra_id) {
      axios.get<ServicoOrcamento[]>(`https://erp-minhas-obras-backend.onrender.com/obras/${formData.obra_id}/servicos-orcamento`)
        .then(res => setServicos(res.data))
        .catch(() => setServicos([]));
    } else {
      setServicos([]);
    }
  }, [formData.obra_id]);

  useEffect(() => {
    carregarDados();
  }, []);

  // ✅ Atualiza cidade e UF quando fornecedor muda
  useEffect(() => {
    if (formData.fornecedor_id) {
      const fornecedor = fornecedores.find(f => f.id === Number(formData.fornecedor_id));
      if (fornecedor) {
        setFormData(prev => ({
          ...prev,
          cidade: fornecedor.cidade || '',
          uf: fornecedor.uf || ''
        }));
      } else {
        setFormData(prev => ({ ...prev, cidade: '', uf: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, cidade: '', uf: '' }));
    }
  }, [formData.fornecedor_id, fornecedores]);

  const adicionarItem = () => {
    setItens([...itens, { 
      id: Date.now(), 
      descricao: '', 
      quantidade: 1, 
      unidade: '', 
      valor_unitario: 0, 
      desconto: 0, // ✅ Novo campo
      impostos: 0, 
      orcamento_item_id: null 
    }]);
  };

  const removerItem = (id: number) => {
    if (itens.length > 1) {
      setItens(itens.filter(item => item.id !== id));
      setValorEmEdicao(prev => {
        const novo = { ...prev };
        delete novo[`qtd_${id}`];
        delete novo[`unit_${id}`];
        delete novo[`desc_${id}`]; // ✅ Limpa desconto
        delete novo[`imp_${id}`];
        return novo;
      });
    }
  };

  const atualizarItem = (id: number, campo: keyof ItemPedido, valor: any) => {
    setItens(itens.map(item => 
      item.id === id ? { ...item, [campo]: valor } : item
    ));
  };

  // ✅ Calcular valor total do pedido
  const calcularValorTotal = () => {
    const totalItens = itens.reduce((sum, item) => {
      const subtotal = (item.quantidade * item.valor_unitario) - item.desconto;
      return sum + Math.max(0, subtotal) + item.impostos;
    }, 0);
    const frete = parseFloat(formData.frete) || 0;
    return totalItens + frete;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.obra_id || !formData.fornecedor_id) {
      alert('Obra e fornecedor são obrigatórios.');
      return;
    }

    const itensComTotal = itens.map(item => ({
      ...item,
      valor_total: Math.max(0, (item.quantidade * item.valor_unitario) - item.desconto) + item.impostos
    }));

    try {
      await axios.post('https://erp-minhas-obras-backend.onrender.com/pedidos-compra', {
        obra_id: formData.obra_id,
        fornecedor_id: formData.fornecedor_id,
        data_pedido: formData.data_pedido,
        frete: formData.frete || 0,
        cidade: formData.cidade,
        uf: formData.uf,
        itens: itensComTotal,
        observacoes: formData.observacoes
      });

      alert('Pedido de compra criado com sucesso!');
      navigate('/suprimentos');
    } catch (err: any) {
      alert('Erro ao salvar pedido: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/suprimentos')}
        className="flex items-center text-blue-600 mb-6 hover:underline"
      >
        <FiArrowLeft className="mr-2" /> Voltar para Suprimentos
      </button>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo Pedido de Compra</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Obra e Fornecedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obra *</label>
              <select
                value={formData.obra_id}
                onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione</option>
                {obras.map(obra => (
                  <option key={obra.id} value={obra.id}>{obra.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Fornecedor *</label>
                <button
                  type="button"
                  onClick={() => navigate('/fornecedores')}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <FiPlus className="mr-1 w-4 h-4" /> Novo Fornecedor
                </button>
              </div>
              <select
                value={formData.fornecedor_id}
                onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_fantasia}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data, Cidade e UF */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pedido</label>
              <input
                type="date"
                value={formData.data_pedido}
                onChange={(e) => setFormData({ ...formData, data_pedido: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Barueri"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
              <select
                value={formData.uf}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela de Itens */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Itens do Pedido</label>
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
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2">Qtd</th>
                    <th className="px-3 py-2">Unid.</th>
                    <th className="px-3 py-2">Vlr Unit.</th>
                    <th className="px-3 py-2">Desconto</th> {/* ✅ Nova coluna */}
                    <th className="px-3 py-2">Impostos</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Apropriação</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="px-3 py-2 text-sm">{index + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                          className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`qtd_${item.id}`] !== undefined
                              ? valorEmEdicao[`qtd_${item.id}`]
                              : formatarDecimalInput(item.quantidade)
                          }
                          onChange={(e) => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^0-9,]/g, '');
                            if (valor.startsWith(',')) valor = '0' + valor;
                            setValorEmEdicao(prev => ({ ...prev, [`qtd_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`qtd_${item.id}`] || '';
                            const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
                            if (!isNaN(num) && num >= 1) {
                              atualizarItem(item.id, 'quantidade', num);
                            } else {
                              atualizarItem(item.id, 'quantidade', 1);
                            }
                            setValorEmEdicao(prev => {
                              const novo = { ...prev };
                              delete novo[`qtd_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-20 text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.unidade}
                          onChange={(e) => atualizarItem(item.id, 'unidade', e.target.value)}
                          className="w-16 text-sm px-2 py-1 border border-gray-300 rounded"
                          placeholder="m²"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`unit_${item.id}`] !== undefined
                              ? valorEmEdicao[`unit_${item.id}`]
                              : formatarDecimalInput(item.valor_unitario)
                          }
                          onChange={(e) => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^0-9,]/g, '');
                            if (valor.startsWith(',')) valor = '0' + valor;
                            setValorEmEdicao(prev => ({ ...prev, [`unit_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`unit_${item.id}`] || '';
                            const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
                            if (!isNaN(num) && num >= 0) {
                              atualizarItem(item.id, 'valor_unitario', num);
                            } else {
                              atualizarItem(item.id, 'valor_unitario', 0);
                            }
                            setValorEmEdicao(prev => {
                              const novo = { ...prev };
                              delete novo[`unit_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-24 text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      {/* ✅ Campo de Desconto */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`desc_${item.id}`] !== undefined
                              ? valorEmEdicao[`desc_${item.id}`]
                              : formatarDecimalInput(item.desconto)
                          }
                          onChange={(e) => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^0-9,]/g, '');
                            if (valor.startsWith(',')) valor = '0' + valor;
                            setValorEmEdicao(prev => ({ ...prev, [`desc_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`desc_${item.id}`] || '';
                            const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
                            if (!isNaN(num) && num >= 0) {
                              atualizarItem(item.id, 'desconto', num);
                            } else {
                              atualizarItem(item.id, 'desconto', 0);
                            }
                            setValorEmEdicao(prev => {
                              const novo = { ...prev };
                              delete novo[`desc_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-24 text-sm px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`imp_${item.id}`] !== undefined
                              ? valorEmEdicao[`imp_${item.id}`]
                              : formatarDecimalInput(item.impostos)
                          }
                          onChange={(e) => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^0-9,]/g, '');
                            if (valor.startsWith(',')) valor = '0' + valor;
                            setValorEmEdicao(prev => ({ ...prev, [`imp_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`imp_${item.id}`] || '';
                            const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
                            if (!isNaN(num) && num >= 0) {
                              atualizarItem(item.id, 'impostos', num);
                            } else {
                              atualizarItem(item.id, 'impostos', 0);
                            }
                            setValorEmEdicao(prev => {
                              const novo = { ...prev };
                              delete novo[`imp_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-24 text-sm px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium">
                        {(
                          Math.max(0, (item.quantidade * item.valor_unitario) - item.desconto) + item.impostos
                        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      {/* ✅ Campo de Apropriação com datalist funcional */}
                      <td className="px-3 py-2">
                        <input
                          list={`servicos-${item.id}`}
                          placeholder="Código ou descrição..."
                          className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                          onChange={(e) => {
                            const valor = e.target.value;
                            const selected = servicos.find(s =>
                              `${s.codigo} - ${s.descricao}` === valor ||
                              s.codigo === valor ||
                              s.descricao === valor
                            );
                            atualizarItem(
                              item.id,
                              'orcamento_item_id',
                              selected ? selected.id : null
                            );
                          }}
                        />
                        <datalist id={`servicos-${item.id}`}>
                          {servicos.map(servico => (
                            <option key={servico.id} value={`${servico.codigo} - ${servico.descricao}`} />
                          ))}
                        </datalist>
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

          {/* ✅ Exibir Valor Total do Pedido */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-blue-800 mb-2">Resumo do Pedido</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total dos Itens:</span>
                <span className="font-medium">
                  R$ {itens.reduce((sum, item) => {
                    const subtotal = (item.quantidade * item.valor_unitario) - item.desconto;
                    return sum + Math.max(0, subtotal) + item.impostos;
                  }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Frete:</span>
                <span className="font-medium">
                  R$ {(parseFloat(formData.frete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between font-bold text-lg text-blue-900">
                <span>Valor Total do Pedido:</span>
                <span>R$ {calcularValorTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Frete e Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Frete (R$)</label>
              <input
                type="text"
                value={formData.frete}
                onChange={(e) => {
                  let valor = e.target.value;
                  valor = valor.replace(/[^0-9,]/g, '');
                  if (valor.startsWith(',')) valor = '0' + valor;
                  setFormData({ ...formData, frete: valor });
                }}
                onBlur={(e) => {
                  const raw = formData.frete || '';
                  const num = raw ? parseFloat(raw.replace(',', '.')) : 0;
                  setFormData({ ...formData, frete: num.toString() });
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observações adicionais..."
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Criar Pedido
            </button>
            <button
              type="button"
              onClick={() => navigate('/suprimentos')}
              className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}