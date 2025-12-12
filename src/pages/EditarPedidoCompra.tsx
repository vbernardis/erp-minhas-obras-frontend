// src/pages/EditarPedidoCompra.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

interface ItemPedido {
  id: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  impostos: number;
  valor_total: number;
}

export default function EditarPedidoCompra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [formData, setFormData] = useState({
    obra_id: '',
    fornecedor_id: '',
    data_pedido: '',
    frete: '',
    cidade: '',
    uf: '',
    observacoes: ''
  });
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Estado para rascunhos dos campos numéricos
  const [valorEmEdicao, setValorEmEdicao] = useState<Record<string, string>>({});

  const carregarDados = async () => {
    try {
      const [obrasRes, fornecedoresRes, pedidoRes] = await Promise.all([
        axios.get<Obra[]>('http://localhost:3001/obras'),
        axios.get<Fornecedor[]>('http://localhost:3001/fornecedores'),
        axios.get<any>(`http://localhost:3001/pedidos-compra/${id}`)
      ]);

      setObras(obrasRes.data);
      setFornecedores(fornecedoresRes.data);

      const pedido = pedidoRes.data;
      setFormData({
        obra_id: pedido.obra_id?.toString() || '',
        fornecedor_id: pedido.fornecedor_id?.toString() || '',
        data_pedido: pedido.data_pedido || '',
        frete: pedido.frete?.toString() || '',
        cidade: pedido.cidade || '',
        uf: pedido.uf || '',
        observacoes: pedido.observacoes || ''
      });

      setItens(Array.isArray(pedido.itens) ? pedido.itens.map((item: any, idx: number) => ({
        id: idx,
        descricao: item.descricao || '',
        quantidade: item.quantidade || 1,
        unidade: item.unidade || '',
        valor_unitario: item.valor_unitario || 0,
        impostos: item.impostos || 0,
        valor_total: item.valor_total || 0
      })) : [{ id: 0, descricao: '', quantidade: 1, unidade: '', valor_unitario: 0, impostos: 0, valor_total: 0 }]);
    } catch (err) {
      alert('Erro ao carregar dados do pedido.');
      navigate('/suprimentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) carregarDados();
  }, [id]);

  const adicionarItem = () => {
    setItens([...itens, { id: Date.now(), descricao: '', quantidade: 1, unidade: '', valor_unitario: 0, impostos: 0, valor_total: 0 }]);
  };

  const removerItem = (id: number) => {
    if (itens.length > 1) {
      setItens(itens.filter(item => item.id !== id));
      // Limpa rascunhos ao remover item
      setValorEmEdicao(prev => {
        const novo = { ...prev };
        delete novo[`qtd_${id}`];
        delete novo[`unit_${id}`];
        delete novo[`imp_${id}`];
        return novo;
      });
    }
  };

  const atualizarItem = (id: number, campo: keyof ItemPedido, valor: any) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        const novoItem = { ...item, [campo]: valor };
        novoItem.valor_total = (novoItem.quantidade * novoItem.valor_unitario) + novoItem.impostos;
        return novoItem;
      }
      return item;
    }));
  };

  // ✅ Função para exibir número com vírgula
  const numeroParaInput = (valor: number | undefined): string => {
    if (valor === undefined || valor === null || isNaN(valor)) return '';
    return valor.toString().replace('.', ',');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.obra_id || !formData.fornecedor_id) {
      alert('Obra e fornecedor são obrigatórios.');
      return;
    }

    try {
      await axios.put(`http://localhost:3001/pedidos-compra/${id}`, {
        obra_id: formData.obra_id,
        fornecedor_id: formData.fornecedor_id,
        data_pedido: formData.data_pedido,
        frete: formData.frete || 0,
        cidade: formData.cidade,
        uf: formData.uf,
        itens: itens,
        observacoes: formData.observacoes
      });

      alert('Pedido atualizado com sucesso!');
      navigate('/suprimentos');
    } catch (err: any) {
      alert('Erro ao salvar pedido: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/suprimentos')}
        className="flex items-center text-blue-600 mb-6 hover:underline"
      >
        <FiArrowLeft className="mr-2" /> Voltar para Suprimentos
      </button>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Pedido de Compra</h1>

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
                    <th className="px-3 py-2">Impostos</th>
                    <th className="px-3 py-2">Total</th>
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
                        {/* ✅ Quantidade com vírgula */}
                        <input
                          type="text"
                          value={valorEmEdicao[`qtd_${item.id}`] !== undefined 
                            ? valorEmEdicao[`qtd_${item.id}`] 
                            : numeroParaInput(item.quantidade)}
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
                        {/* ✅ Valor Unitário com vírgula */}
                        <input
                          type="text"
                          value={valorEmEdicao[`unit_${item.id}`] !== undefined 
                            ? valorEmEdicao[`unit_${item.id}`] 
                            : numeroParaInput(item.valor_unitario)}
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
                      <td className="px-3 py-2">
                        {/* ✅ Impostos com vírgula */}
                        <input
                          type="text"
                          value={valorEmEdicao[`imp_${item.id}`] !== undefined 
                            ? valorEmEdicao[`imp_${item.id}`] 
                            : numeroParaInput(item.impostos)}
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
                        {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Salvar Alterações
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