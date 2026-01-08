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

  // ✅ Estado principal do formulário (igual ao NovaNotaFiscal)
  const [formData, setFormData] = useState({
    obra_id: '',
    fornecedor_id: '',
    numero_nota: '',
    data_emissao: '',
    data_vencimento: '',
    data_pagamento: '',
    forma_pagamento: '',
    frete: 0,
    desconto: 0, // ✅ Adicionado
    status: 'pendente'
  });

  const [itens, setItens] = useState<ItemNota[]>([]);

  // ✅ Estados para digitação com vírgula
  const [freteEmEdicao, setFreteEmEdicao] = useState<string | undefined>(undefined);
  const [descontoEmEdicao, setDescontoEmEdicao] = useState<string | undefined>(undefined);
  const [valorEmEdicao, setValorEmEdicao] = useState<Record<string, string>>({});

  const numeroParaInput = (valor: number | undefined | null): string => {
    if (valor == null || isNaN(valor)) return '';
    return valor.toString().replace('.', ',');
  };

  const stringParaNumero = (valor: string): number => {
    if (!valor) return 0;
    const numStr = valor.replace(',', '.');
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // ✅ Verificar se NF está paga (bloqueia edição)
  const isPago = formData.status === 'pago';

  // Carregar dados
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [obrasRes, fornecedoresRes, notaRes] = await Promise.all([
          axios.get<Obra[]>('https://erp-minhas-obras-backend.onrender.com/obras'),
          axios.get<Fornecedor[]>('https://erp-minhas-obras-backend.onrender.com/fornecedores'),
          axios.get<any>(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais/${notaId}`)
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
          desconto: nota.desconto || 0, // ✅ Inclui desconto
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

  // Carregar serviços da obra
  useEffect(() => {
    if (formData.obra_id) {
      axios.get<ServicoOrcamento[]>(`https://erp-minhas-obras-backend.onrender.com/obras/${formData.obra_id}/servicos-orcamento`)
        .then(res => setServicos(res.data))
        .catch(err => setServicos([]));
    } else {
      setServicos([]);
    }
  }, [formData.obra_id]);

  const atualizarItem = (id: number, campo: keyof ItemNota, valor: any) => {
    if (isPago) return; // ✅ Bloqueia se pago
    setItens(itens.map(item => {
      if (item.id === id) {
        const novoItem = { ...item, [campo]: valor };
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

  const adicionarItem = () => {
    if (isPago) return;
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
    if (isPago || itens.length <= 1) return;
    setItens(itens.filter(item => item.id !== id));
    setValorEmEdicao(prev => {
      const novo = { ...prev };
      delete novo[`qtd_${id}`];
      delete novo[`unit_${id}`];
      delete novo[`imp_${id}`];
      return novo;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPago) {
      alert('Não é possível editar uma nota fiscal já paga.');
      return;
    }

    const totalItens = itens.reduce((sum, item) => sum + (item.preco_total || 0), 0);
    const valorTotal = totalItens + (formData.frete || 0) - (formData.desconto || 0); // ✅ Inclui desconto

    try {
      await axios.put(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais/${notaId}`, {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isPago ? 'Visualizar Nota Fiscal' : 'Editar Nota Fiscal'}
        </h1>

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
                disabled={isPago}
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
                disabled={isPago}
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
                disabled={isPago}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Lançamento</label>
              <input
                type="text"
                value={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento</label>
              <input
                type="date"
                value={formData.data_pagamento}
                onChange={e => setFormData({ ...formData, data_pagamento: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPago}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
              <select
                value={formData.forma_pagamento}
                onChange={e => setFormData({ ...formData, forma_pagamento: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPago}
              >
                <option value="">Selecione</option>
                <option value="Boleto">Boleto</option>
                <option value="Pix">Pix</option>
                <option value="Depósito">Depósito</option>
              </select>
            </div>
          </div>

          {/* ✅ Campos de Frete e Desconto (com vírgula) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Frete (R$)</label>
              <input
                type="text"
                value={freteEmEdicao !== undefined ? freteEmEdicao : (formData.frete > 0 ? formData.frete.toString().replace('.', ',') : '')}
                onChange={(e) => {
                  let valor = e.target.value;
                  valor = valor.replace(/[^0-9,]/g, '');
                  const partes = valor.split(',');
                  if (partes.length > 2) valor = partes[0] + ',' + partes[1];
                  if (valor.startsWith(',')) valor = '0' + valor;
                  setFreteEmEdicao(valor);
                }}
                onBlur={(e) => {
                  let valor = freteEmEdicao || e.target.value;
                  if (valor === '') {
                    setFormData({ ...formData, frete: 0 });
                    setFreteEmEdicao('');
                    return;
                  }
                  let num = parseFloat(valor.replace(',', '.'));
                  if (isNaN(num) || num < 0) num = 0;
                  setFormData({ ...formData, frete: num });
                  setFreteEmEdicao(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
                disabled={isPago}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (R$)</label>
              <input
                type="text"
                value={descontoEmEdicao !== undefined ? descontoEmEdicao : (formData.desconto > 0 ? formData.desconto.toString().replace('.', ',') : '')}
                onChange={(e) => {
                  let valor = e.target.value;
                  valor = valor.replace(/[^0-9,]/g, '');
                  const partes = valor.split(',');
                  if (partes.length > 2) valor = partes[0] + ',' + partes[1];
                  if (valor.startsWith(',')) valor = '0' + valor;
                  setDescontoEmEdicao(valor);
                }}
                onBlur={(e) => {
                  let valor = descontoEmEdicao || e.target.value;
                  if (valor === '') {
                    setFormData({ ...formData, desconto: 0 });
                    setDescontoEmEdicao('');
                    return;
                  }
                  let num = parseFloat(valor.replace(',', '.'));
                  if (isNaN(num) || num < 0) num = 0;
                  setFormData({ ...formData, desconto: num });
                  setDescontoEmEdicao(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
                disabled={isPago}
              />
            </div>
          </div>

          {/* Tabela de Itens */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Itens da Nota Fiscal</label>
              {!isPago && (
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="text-sm text-blue-600 flex items-center"
                >
                  <FiPlus className="mr-1" /> Adicionar Item
                </button>
              )}
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
                    {!isPago && <th className="px-3 py-2"></th>}
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
                          disabled={isPago}
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
                          disabled={isPago}
                        />
                      </td>
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
                            if (partes.length > 2) valor = partes[0] + ',' + partes[1];
                            if (valor.startsWith(',')) valor = '0' + valor;
                            setValorEmEdicao(prev => ({ ...prev, [`qtd_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`qtd_${item.id}`] || '';
                            let num = 1;
                            if (raw) {
                              const numStr = raw.replace(',', '.');
                              const parsed = parseFloat(numStr);
                              if (!isNaN(parsed) && parsed >= 1) num = parsed;
                            }
                            atualizarItem(item.id, 'quantidade', num);
                            setValorEmEdicao(prev => {
                              const novo = { ...prev };
                              delete novo[`qtd_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-20 text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                          disabled={isPago}
                        />
                      </td>
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
                            if (partes.length > 2) valor = partes[0] + ',' + partes[1];
                            if (valor.startsWith(',')) valor = '0' + valor;
                            setValorEmEdicao(prev => ({ ...prev, [`unit_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`unit_${item.id}`] || '';
                            let num = 0;
                            if (raw) {
                              const numStr = raw.replace(',', '.');
                              const parsed = parseFloat(numStr);
                              if (!isNaN(parsed) && parsed >= 0) num = parsed;
                            }
                            atualizarItem(item.id, 'preco_unit', num);
                            setValorEmEdicao(prev => {
                              const novo = { ...prev };
                              delete novo[`unit_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-24 text-sm px-2 py-1 border border-gray-300 rounded"
                          required
                          disabled={isPago}
                        />
                      </td>
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
                            if (partes.length > 2) valor = partes[0] + ',' + partes[1];
                            if (valor.startsWith(',')) valor = '0' + valor;
                            setValorEmEdicao(prev => ({ ...prev, [`imp_${item.id}`]: valor }));
                          }}
                          onBlur={(e) => {
                            const raw = valorEmEdicao[`imp_${item.id}`] || '';
                            let num = 0;
                            if (raw) {
                              const numStr = raw.replace(',', '.');
                              const parsed = parseFloat(numStr);
                              if (!isNaN(parsed) && parsed >= 0) num = parsed;
                            }
                            atualizarItem(item.id, 'imposto', num);
                            setValorEmEdicao(prev => {
                              const novo = { ...prev };
                              delete novo[`imp_${item.id}`];
                              return novo;
                            });
                          }}
                          className="w-24 text-sm px-2 py-1 border border-gray-300 rounded"
                          disabled={isPago}
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
                          disabled={isPago}
                        >
                          <option value="">Selecione um serviço</option>
                          {servicos.map(servico => (
                            <option key={servico.id} value={servico.id}>
                              {servico.codigo} - {servico.descricao}
                            </option>
                          ))}
                        </select>
                      </td>
                      {!isPago && (
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
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

                    {/* ✅ TOTALIZADOR VISUAL */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-blue-800 mb-2">Resumo da Nota Fiscal</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total dos Itens:</span>
                <span className="font-medium">R$ {itens.reduce((sum, item) => sum + (item.preco_total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete:</span>
                <span className="font-medium">R$ {formData.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Desconto:</span>
                <span className="font-medium text-red-600">- R$ {formData.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between font-bold text-lg text-blue-900">
                <span>Valor Total:</span>
                <span>
                  R$ {(
                    itens.reduce((sum, item) => sum + (item.preco_total || 0), 0) +
                    (formData.frete || 0) -
                    (formData.desconto || 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {!isPago && (
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
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}