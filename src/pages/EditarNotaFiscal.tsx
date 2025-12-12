// src/pages/EditarNotaFiscal.tsx
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

export default function EditarNotaFiscal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notaId = parseInt(id || '0', 10);

  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [servicos, setServicos] = useState<ServicoOrcamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    obra_id: '',
    fornecedor_id: '',
    numero_nota: '',
    data_emissao: '',
    data_vencimento: '',
    data_pagamento: '',
    forma_pagamento: '',
    frete: 0,
    status: 'pendente'
  });

  const [itens, setItens] = useState<ItemNota[]>([]);

  // ✅ Estados para rascunhos dos campos numéricos
  const [valorEmEdicao, setValorEmEdicao] = useState<Record<string, string>>({});

  // ✅ Função segura para exibir número com vírgula
  const numeroParaInput = (valor: number | undefined | null): string => {
    if (valor == null || isNaN(valor)) return '';
    return valor.toString().replace('.', ',');
  };

  // ✅ Função para converter string com vírgula em número
  const stringParaNumero = (valor: string): number => {
    if (!valor) return 0;
    const numStr = valor.replace(',', '.');
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [obrasRes, fornecedoresRes, notaRes] = await Promise.all([
          axios.get<Obra[]>('http://localhost:3001/obras'),
          axios.get<Fornecedor[]>('http://localhost:3001/fornecedores'),
          axios.get<any>(`http://localhost:3001/notas-fiscais/${notaId}`)
        ]);
        setObras(obrasRes.data);
        setFornecedores(fornecedoresRes.data);
        const nota = notaRes.data;
        setFormData({
          obra_id: nota.obra_id?.toString() || '',
          fornecedor_id: nota.fornecedor_id?.toString() || '',
          numero_nota: nota.numero_nota || '',
          data_emissao: nota.data_emissao || '',
          data_vencimento: nota.data_vencimento || '',
          data_pagamento: nota.data_pagamento || '',
          forma_pagamento: nota.forma_pagamento || '',
          frete: nota.frete || 0,
          status: nota.status || 'pendente'
        });
        setItens(Array.isArray(nota.itens) ? nota.itens.map((item: any, idx: number) => ({
          id: idx,
          descricao: item.descricao || '',
          unidade: item.unidade || '',
          quantidade: item.quantidade || 1,
          preco_unit: item.preco_unit || 0,
          imposto: item.imposto || 0,
          preco_total: item.preco_total || 0,
          orcamento_item_id: item.orcamento_item_id || null
        })) : []);
      } catch (err) {
        alert('Erro ao carregar nota fiscal.');
        navigate('/financeiro');
      } finally {
        setLoading(false);
      }
    };
    if (notaId) carregarDados();
  }, [id]);

  // Carregar serviços quando obra muda
  useEffect(() => {
    if (formData.obra_id) {
      axios.get<ServicoOrcamento[]>(`http://localhost:3001/obras/${formData.obra_id}/servicos-orcamento`)
        .then(res => setServicos(res.data))
        .catch(err => setServicos([]));
    } else {
      setServicos([]);
    }
  }, [formData.obra_id]);

  // ✅ Função de atualização de item numérico com vírgula
  const atualizarItemNumerico = (id: number, campo: keyof ItemNota, valor: string) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        const novoItem = { ...item };
        // Atualiza o rascunho
        setValorEmEdicao(prev => ({ ...prev, [`${campo}_${id}`]: valor }));
        // Processa o valor para número
        let num = 0;
        if (valor) {
          const numStr = valor.replace(',', '.');
          const parsed = parseFloat(numStr);
          if (!isNaN(parsed)) {
            num = parsed;
          }
        }
        // Atualiza o item com o valor numérico
        if (campo === 'quantidade' || campo === 'preco_unit' || campo === 'imposto') {
          novoItem[campo] = num;
          // Recalcula total
          novoItem.preco_total = (novoItem.quantidade * novoItem.preco_unit) + novoItem.imposto;
        }
        return novoItem;
      }
      return item;
    }));
  };

  // ✅ Função para salvar o valor numérico do item
  const salvarItemNumerico = (id: number, campo: keyof ItemNota) => {
    const raw = valorEmEdicao[`${campo}_${id}`] || '';
    const num = stringParaNumero(raw);
    setItens(itens.map(item => {
      if (item.id === id) {
        const novoItem = { ...item, [campo]: num };
        if (campo === 'quantidade' || campo === 'preco_unit' || campo === 'imposto') {
          novoItem.preco_total = (novoItem.quantidade * novoItem.preco_unit) + novoItem.imposto;
        }
        return novoItem;
      }
      return item;
    }));
    // Limpa o rascunho
    setValorEmEdicao(prev => {
      const novo = { ...prev };
      delete novo[`${campo}_${id}`];
      return novo;
    });
  };

  // ✅ Função para atualizar o frete com formato brasileiro
  const atualizarFrete = (valor: string) => {
    valor = valor.replace(/[^0-9,]/g, ''); // Apenas números e vírgula
    const partes = valor.split(',');
    if (partes.length > 2) {
      valor = partes[0] + ',' + partes[1]; // Apenas uma vírgula
    }
    if (valor.startsWith(',')) {
      valor = '0' + valor; // Adiciona zero à esquerda se começar com vírgula
    }
    setFormData({ ...formData, frete: stringParaNumero(valor) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Calcular valor_total a partir dos itens + frete
    const totalItens = itens.reduce((sum, item) => sum + (item.preco_total || 0), 0);
    const valorTotal = totalItens + (formData.frete || 0);

    try {
      await axios.put(`http://localhost:3001/notas-fiscais/${notaId}`, {
        ...formData,
        valor_total: valorTotal,
        itens: itens.map(item => ({
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          preco_unit: item.preco_unit,
          imposto: item.imposto,
          preco_total: item.preco_total,
          orcamento_item_id: item.orcamento_item_id
        }))
      });
      alert('Nota fiscal atualizada com sucesso!');
      navigate('/financeiro');
    } catch (err: any) {
      alert('Erro ao atualizar nota fiscal: ' + (err.response?.data?.error || err.message));
    }
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Nota Fiscal</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Obra e Fornecedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obra *</label>
              <select
                value={formData.obra_id}
                onChange={e => setFormData({ ...formData, obra_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled
              >
                <option value="">Selecione uma obra</option>
                {obras.map(obra => (
                  <option key={obra.id} value={obra.id}>{obra.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor *</label>
              <select
                value={formData.fornecedor_id}
                onChange={e => setFormData({ ...formData, fornecedor_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled
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
                value={formData.numero_nota}
                onChange={e => setFormData({ ...formData, numero_nota: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Emissão *</label>
              <input
                type="date"
                value={formData.data_emissao}
                onChange={e => setFormData({ ...formData, data_emissao: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento *</label>
              <input
                type="date"
                value={formData.data_vencimento}
                onChange={e => setFormData({ ...formData, data_vencimento: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento</label>
              <input
                type="date"
                value={formData.data_pagamento}
                onChange={e => setFormData({ ...formData, data_pagamento: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
              <select
                value={formData.forma_pagamento}
                onChange={e => setFormData({ ...formData, forma_pagamento: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="Boleto">Boleto</option>
                <option value="Pix">Pix</option>
                <option value="Depósito">Depósito</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Frete (R$)</label>
            {/* ✅ Campo de frete com formatação brasileira */}
            <input
              type="text"
              value={numeroParaInput(formData.frete)}
              onChange={(e) => atualizarFrete(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tabela de Itens */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Itens da Nota Fiscal</h2>
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
                    <th className="px-3 py-2">Apropriação</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={e => {
                            setItens(itens.map(i => i.id === item.id ? { ...i, descricao: e.target.value } : i));
                          }}
                          className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.unidade}
                          onChange={e => {
                            setItens(itens.map(i => i.id === item.id ? { ...i, unidade: e.target.value } : i));
                          }}
                          className="w-16 text-sm px-2 py-1 border border-gray-300 rounded"
                          placeholder="m²"
                          required
                        />
                      </td>
                      {/* ✅ QUANTIDADE com formatação brasileira */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`quantidade_${item.id}`] !== undefined
                              ? valorEmEdicao[`quantidade_${item.id}`]
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
                            atualizarItemNumerico(item.id, 'quantidade', valor);
                          }}
                          className="w-20 text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      {/* ✅ PREÇO UNITÁRIO com formatação brasileira */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`preco_unit_${item.id}`] !== undefined
                              ? valorEmEdicao[`preco_unit_${item.id}`]
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
                            atualizarItemNumerico(item.id, 'preco_unit', valor);
                          }}
                          className="w-24 text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                        />
                      </td>
                      {/* ✅ IMPOSTO com formatação brasileira */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={
                            valorEmEdicao[`imposto_${item.id}`] !== undefined
                              ? valorEmEdicao[`imposto_${item.id}`]
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
                            atualizarItemNumerico(item.id, 'imposto', valor);
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
                          onChange={e => {
                            setItens(itens.map(i => i.id === item.id ? { ...i, orcamento_item_id: e.target.value ? Number(e.target.value) : null } : i));
                          }}
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
              Salvar Alterações
            </button>
            <button
              type="button"
              onClick={() => navigate('/financeiro')}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}