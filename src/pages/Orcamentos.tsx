// src/pages/Orcamentos.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { hasPermission } from '../utils/permissions';
import * as XLSX from 'xlsx';
import API_BASE from '../api/config';
import axios from 'axios'; // ← ✅ ADICIONE ESTA LINHA


type Obra = {
  id: number;
  nome: string;
};

type ItemOrcamento = {
  id: string;
  nivel: 'local' | 'etapa' | 'subetapa' | 'servico';
  descricao: string;
  unidade?: string;
  quantidade?: number;
  valor_unitario_material?: number;
  valor_unitario_mao_obra?: number;
};

// ======================
// IMPORTAÇÃO DE EXCEL
// ======================


// Função para converter valores com vírgula (padrão BR) para string no formato "X.XX"
const parseValorBR = (valor: any): string | null => {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  // Se for número (Excel converte automaticamente), formata para 2 casas
  if (typeof valor === 'number') {
    return valor.toFixed(2);
  }

  // Se for string, limpa e converte
  let str = valor.toString().trim();
  if (str === '') return null;

  // Remove R$, espaços e símbolos
  str = str.replace(/[R$\s]/g, '');

  // Substitui vírgula por ponto (padrão JS)
  str = str.replace(',', '.');

  // Remove pontos de milhar (ex: 1.000 → 1000)
  const partes = str.split('.');
  if (partes.length > 2) {
    const decimal = partes.pop();
    str = partes.join('') + '.' + decimal;
  }

  const num = parseFloat(str);
  if (isNaN(num)) return null;

  return num.toFixed(2);
};

export default function Orcamentos() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPermission('orcamentos:read')) {
      alert('Você não tem permissão para acessar esta página.');
      navigate('/dashboard');
    }
  }, [navigate]);

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState<number | ''>('');
  const [itens, setItens] = useState<ItemOrcamento[]>([{ id: '1', nivel: 'local', descricao: '' }]);
  const [taxaAdministracao, setTaxaAdministracao] = useState<number>(0);
  const [dataBase, setDataBase] = useState<string>(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Em desenvolvimento');

  // ✅ Estado para rascunhos dos campos em edição
  const [valorEmEdicao, setValorEmEdicao] = useState<Record<string, string>>({});

  // Carregar obras
  useEffect(() => {
    const carregarObras = async () => {
      try {
        const res = await axios.get(`${API_BASE}/obras`);
        setObras(res.data);
      } catch (err) {
        console.error('Erro ao carregar obras:', err);
        alert('Erro ao carregar lista de obras.');
      }
    };
    carregarObras();
  }, []);

  const adicionarLinha = (nivel: ItemOrcamento['nivel'], afterId?: string) => {
    const novoId = Date.now().toString();
    const novoItem = { id: novoId, nivel, descricao: '' };
    
    if (afterId) {
      const index = itens.findIndex(item => item.id === afterId);
      if (index !== -1) {
        const novosItens = [...itens];
        novosItens.splice(index + 1, 0, novoItem);
        setItens(novosItens);
        return;
      }
    }
    setItens(prev => [...prev, novoItem]);
  };

  const atualizarItem = (id: string, campo: keyof ItemOrcamento, valor: any) => {
    setItens(prev =>
      prev.map(item => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const removerItem = (id: string) => {
    setItens(prev => prev.filter(item => item.id !== id));
    // Limpa rascunhos ao remover item
    setValorEmEdicao(prev => {
      const novo = { ...prev };
      delete novo[id + '_qtd'];
      delete novo[id + '_mat'];
      delete novo[id + '_mao'];
      return novo;
    });
  };

  // ✅ Geração correta do código hierárquico
  const gerarCodigo = (index: number): string => {
    const item = itens[index];
    if (!item) return '';

    if (item.nivel === 'local') {
      const locais = itens.filter(i => i.nivel === 'local');
      const seq = locais.indexOf(item) + 1;
      return String(seq).padStart(2, '0');
    }

    if (item.nivel === 'etapa') {
      // Encontrar o local pai (último local antes deste item)
      let localIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        if (itens[i].nivel === 'local') {
          localIndex = i;
          break;
        }
      }
      if (localIndex === -1) return '01.01'; // fallback

      const localSeq = gerarCodigo(localIndex);
      const etapasDoLocal = itens
        .slice(0, index)
        .filter(i => i.nivel === 'etapa' && gerarCodigo(itens.indexOf(i)).startsWith(localSeq));
      const seq = etapasDoLocal.length + 1;
      return `${localSeq}.${String(seq).padStart(2, '0')}`;
    }

    if (item.nivel === 'subetapa') {
      // Encontrar a etapa pai (última etapa antes deste item)
      let etapaIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        if (itens[i].nivel === 'etapa') {
          etapaIndex = i;
          break;
        }
      }
      if (etapaIndex === -1) return '01.01.01';

      const etapaCodigo = gerarCodigo(etapaIndex);
      const subetapasDaEtapa = itens
        .slice(0, index)
        .filter(i => i.nivel === 'subetapa' && gerarCodigo(itens.indexOf(i)).startsWith(etapaCodigo));
      const seq = subetapasDaEtapa.length + 1;
      return `${etapaCodigo}.${String(seq).padStart(2, '0')}`;
    }

    if (item.nivel === 'servico') {
      // Encontrar a subetapa ou etapa pai
      let parentIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        if (itens[i].nivel === 'subetapa' || itens[i].nivel === 'etapa') {
          parentIndex = i;
          break;
        }
      }
      if (parentIndex === -1) return '01.01.01.01';

      const parentCodigo = gerarCodigo(parentIndex);
      const servicosDoPai = itens
        .slice(0, index)
        .filter(i => i.nivel === 'servico' && gerarCodigo(itens.indexOf(i)).startsWith(parentCodigo));
      const seq = servicosDoPai.length + 1;
      return `${parentCodigo}.${String(seq).padStart(2, '0')}`;
    }

    return '';
  };

  // Cálculos
  const subtotal = itens
    .filter(i => i.nivel === 'servico')
    .reduce((sum, i) => {
      const qtd = i.quantidade || 0;
      const mat = i.valor_unitario_material || 0;
      const mao = i.valor_unitario_mao_obra || 0;
      return sum + qtd * (mat + mao);
    }, 0);

  const valorTotal = subtotal * (1 + taxaAdministracao / 100);

  // Formatação
  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função auxiliar para exibir número com vírgula (sem milhar)
  const numeroParaInput = (valor: number | undefined): string => {
    if (valor === undefined || valor === null || isNaN(valor)) return '';
    return valor.toString().replace('.', ',');
  };

  // Salvar
  const salvarOrcamento = async () => {
    if (!obraSelecionada) {
      alert('Selecione uma obra.');
      return;
    }
    try {
      await api.post('/orcamentos', {
        obra_id: obraSelecionada,
        data_base: dataBase,
        taxa_administracao: taxaAdministracao,
        status,
        itens: itens.map(item => ({
          nivel: item.nivel,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valor_unitario_material: item.valor_unitario_material,
          valor_unitario_mao_obra: item.valor_unitario_mao_obra
        }))
      });
      alert('Orçamento salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err);
      alert('Erro ao salvar orçamento.');
    }
  };

  const exportarPDF = () => {
    alert('Após salvar o orçamento, o PDF estará disponível na listagem.');
  };

  // Função para importar Excel - CORRIGIDA
const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const bstr = evt.target?.result as string;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (jsonData.length < 2) {
        alert('Planilha vazia ou sem dados.');
        return;
      }

      const headers = jsonData[0] as string[];
      const requiredColumns = [
        'nivel', 'codigo', 'descricao',
        'unidade', 'quantidade',
        'valor_unitario_material', 'valor_unitario_mao_obra'
      ];

      const lowerHeaders = headers.map(h => h?.toLowerCase().trim());
      for (const col of requiredColumns) {
        if (!lowerHeaders.includes(col)) {
          alert(`Coluna obrigatória ausente: "${col}". Use o modelo fornecido.`);
          return;
        }
      }

      const colIndex: Record<string, number> = {};
      headers.forEach((h, i) => {
        colIndex[h.toLowerCase().trim()] = i;
      });

      const novosItens: ItemOrcamento[] = [];
      let idCounter = 1; // Para garantir IDs únicos

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        const nivelTexto = (row[colIndex['nivel']] || '').toString().toLowerCase().trim();
        if (!['local', 'etapa', 'subetapa', 'servico'].includes(nivelTexto)) {
          alert(`Linha ${i+1}: nível inválido. Use: local, etapa, subetapa ou servico.`);
          return;
        }

        const nivel = nivelTexto as 'local' | 'etapa' | 'subetapa' | 'servico';
        const descricao = (row[colIndex['descricao']] || '').toString().trim();
        if (!descricao) {
          alert(`Linha ${i+1}: descrição não preenchida.`);
          return;
        }

        const isServico = nivel === 'servico';
        const unidade = isServico ? (row[colIndex['unidade']] || '').toString().trim() || undefined : undefined;

        // Função para converter valor brasileiro para número
        const parseToNumber = (valor: any): number | undefined => {
          if (valor === null || valor === undefined || valor === '') {
            return undefined;
          }
          if (typeof valor === 'number') {
            return valor;
          }
          let str = valor.toString().trim();
          if (str === '') return undefined;
          str = str.replace(/[R$\s]/g, '');
          str = str.replace(',', '.');
          const partes = str.split('.');
          if (partes.length > 2) {
            const decimal = partes.pop();
            str = partes.join('') + '.' + decimal;
          }
          const num = parseFloat(str);
          return isNaN(num) ? undefined : num;
        };

        const quantidade = isServico ? parseToNumber(row[colIndex['quantidade']]) : undefined;
        const valor_unitario_material = isServico ? parseToNumber(row[colIndex['valor_unitario_material']]) : undefined;
        const valor_unitario_mao_obra = isServico ? parseToNumber(row[colIndex['valor_unitario_mao_obra']]) : undefined;

        novosItens.push({
          id: `imported_${Date.now()}_${idCounter++}`, // ID único
          nivel,
          descricao,
          unidade,
          quantidade,
          valor_unitario_material,
          valor_unitario_mao_obra
        });
      }

      // ✅ Usa seu estado EXISTENTE
      setItens(novosItens);

      // ✅ Limpa o rascunho de edição (importante!)
      setValorEmEdicao({});

      alert(`Orçamento importado com sucesso! ${novosItens.length} itens.`);
    } catch (err) {
      console.error('Erro ao importar:', err);
      alert('Erro ao processar a planilha. Use o modelo correto.');
    }
  };
  reader.readAsBinaryString(file);
};
    return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={salvarOrcamento}
            disabled={!hasPermission('orcamentos:write')}
            className={`px-4 py-2 rounded-md text-white text-sm ${
              hasPermission('orcamentos:write')
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Salvar Orçamento
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/orcamentos/lista')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-800 text-sm"
          >
            Ver Orçamentos Salvos
          </button>

          <button
          type="button"
          onClick={() => document.getElementById('import-orcamento')?.click()}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm"
        >
          📥 Importar Excel
        </button>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleImportExcel}
          className="hidden"
          id="import-orcamento"
        />

        </div>
      </div>

      {/* Cabeçalho */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Obra *</label>
            <select
              value={obraSelecionada}
              onChange={e => setObraSelecionada(Number(e.target.value) || '')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Selecione uma obra</option>
              {obras.map(obra => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="Em desenvolvimento">Em desenvolvimento</option>
              <option value="Em uso">Em uso</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Base</label>
            <input
              type="date"
              value={dataBase}
              onChange={e => setDataBase(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Taxa de Administração (%)</label>
            <input
              type="number"
              step="0.01"
              value={taxaAdministracao}
              onChange={e => setTaxaAdministracao(Number(e.target.value) || 0)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            
          </div>
        </div>
      </div>
      
      {/* Tabela */}
      <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => adicionarLinha('local')}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            + Local
          </button>
          <button
            type="button"
            onClick={() => adicionarLinha('etapa')}
            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            + Etapa
          </button>
          <button
            type="button"
            onClick={() => adicionarLinha('subetapa')}
            className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
          >
            + Subetapa
          </button>
          <button
            type="button"
            onClick={() => adicionarLinha('servico')}
            className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
          >
            + Serviço
          </button>
        </div>

        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600">
              <th className="p-2">Cód.</th>
              <th className="p-2">Descrição</th>
              <th className="p-2">Und</th>
              <th className="p-2 text-right">Qtd</th>
              <th className="p-2 text-right">R$ Unit. Mat.</th>
              <th className="p-2 text-right">R$ Unit. Mão Obra</th>
              <th className="p-2 text-right">R$ Total Mat.</th>
              <th className="p-2 text-right">R$ Total Mão Obra</th>
              <th className="p-2 text-right">R$ Total</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-50">
            {itens.map((item, idx) => {
              const codigo = gerarCodigo(idx);
              const isServico = item.nivel === 'servico';
              const qtd = item.quantidade || 0;
              const matUnit = item.valor_unitario_material || 0;
              const maoUnit = item.valor_unitario_mao_obra || 0;
              const totalMat = qtd * matUnit;
              const totalMao = qtd * maoUnit;
              const total = totalMat + totalMao;

              return (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="p-2 font-mono font-medium">{codigo}</td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={e => atualizarItem(item.id, 'descricao', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs bg-white"
                      placeholder="Descrição"
                    />
                  </td>
                  <td className="p-2">
                    {isServico ? (
                      <input
                        type="text"
                        value={item.unidade || ''}
                        onChange={e => atualizarItem(item.id, 'unidade', e.target.value)}
                        className="w-16 border rounded px-2 py-1 text-xs bg-white"
                        placeholder="m²"
                      />
                    ) : null}
                  </td>
                  <td className="p-2 text-right">
                    {isServico ? (
                      <input
                        type="text"
                        value={valorEmEdicao[item.id + '_qtd'] !== undefined 
                          ? valorEmEdicao[item.id + '_qtd'] 
                          : numeroParaInput(item.quantidade)}
                        onChange={e => {
                          let valor = e.target.value;
                          valor = valor.replace(/[^0-9,]/g, '');
                          if (valor.startsWith(',')) valor = '0' + valor;
                          setValorEmEdicao(prev => ({ ...prev, [item.id + '_qtd']: valor }));
                        }}
                        onBlur={e => {
                          const raw = valorEmEdicao[item.id + '_qtd'] || '';
                          const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
                          if (!isNaN(num) && num >= 0 && num <= 1000000) {
                            atualizarItem(item.id, 'quantidade', num);
                          } else {
                            atualizarItem(item.id, 'quantidade', undefined);
                          }
                          setValorEmEdicao(prev => {
                            const novo = { ...prev };
                            delete novo[item.id + '_qtd'];
                            return novo;
                          });
                        }}
                        className="w-20 border rounded px-2 py-1 text-xs text-right bg-white"
                        placeholder="0,00"
                      />
                    ) : null}
                  </td>
                  <td className="p-2 text-right">
                    {isServico ? (
                      <input
                        type="text"
                        value={valorEmEdicao[item.id + '_mat'] !== undefined 
                          ? valorEmEdicao[item.id + '_mat'] 
                          : numeroParaInput(item.valor_unitario_material)}
                        onChange={e => {
                          let valor = e.target.value;
                          valor = valor.replace(/[^0-9,]/g, '');
                          if (valor.startsWith(',')) valor = '0' + valor;
                          setValorEmEdicao(prev => ({ ...prev, [item.id + '_mat']: valor }));
                        }}
                        onBlur={e => {
                          const raw = valorEmEdicao[item.id + '_mat'] || '';
                          const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
                          if (!isNaN(num) && num >= 0 && num <= 1000000000000) {
                            atualizarItem(item.id, 'valor_unitario_material', num);
                          } else {
                            atualizarItem(item.id, 'valor_unitario_material', undefined);
                          }
                          setValorEmEdicao(prev => {
                            const novo = { ...prev };
                            delete novo[item.id + '_mat'];
                            return novo;
                          });
                        }}
                        className="w-24 border rounded px-2 py-1 text-xs text-right bg-white"
                        placeholder="0,00"
                      />
                    ) : null}
                  </td>
                  <td className="p-2 text-right">
                    {isServico ? (
                      <input
                        type="text"
                        value={valorEmEdicao[item.id + '_mao'] !== undefined 
                          ? valorEmEdicao[item.id + '_mao'] 
                          : numeroParaInput(item.valor_unitario_mao_obra)}
                        onChange={e => {
                          let valor = e.target.value;
                          valor = valor.replace(/[^0-9,]/g, '');
                          if (valor.startsWith(',')) valor = '0' + valor;
                          setValorEmEdicao(prev => ({ ...prev, [item.id + '_mao']: valor }));
                        }}
                        onBlur={e => {
                          const raw = valorEmEdicao[item.id + '_mao'] || '';
                          const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
                          if (!isNaN(num) && num >= 0 && num <= 1000000000000) {
                            atualizarItem(item.id, 'valor_unitario_mao_obra', num);
                          } else {
                            atualizarItem(item.id, 'valor_unitario_mao_obra', undefined);
                          }
                          setValorEmEdicao(prev => {
                            const novo = { ...prev };
                            delete novo[item.id + '_mao'];
                            return novo;
                          });
                        }}
                        className="w-24 border rounded px-2 py-1 text-xs text-right bg-white"
                        placeholder="0,00"
                      />
                    ) : null}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {isServico ? formatarMoeda(totalMat) : ''}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {isServico ? formatarMoeda(totalMao) : ''}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {isServico ? formatarMoeda(total) : ''}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => removerItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remover
                      </button>
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            adicionarLinha(e.target.value as any, item.id);
                            e.target.value = '';
                          }
                        }}
                        className="border rounded px-1 py-0 text-xs"
                        defaultValue=""
                      >
                        <option value="">+ Inserir abaixo</option>
                        <option value="local">Local</option>
                        <option value="etapa">Etapa</option>
                        <option value="subetapa">Subetapa</option>
                        <option value="servico">Serviço</option>
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totais */}
      <div className="mt-6 bg-gray-100 p-4 rounded-lg max-w-md ml-auto">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span className="font-medium">{formatarMoeda(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span>BDI ({taxaAdministracao}%):</span>
          <span className="font-medium">{formatarMoeda(subtotal * (taxaAdministracao / 100))}</span>
        </div>
        <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-300">
          <span>Total:</span>
          <span>{formatarMoeda(valorTotal)}</span>
        </div>
      </div>
     </div>
  );
}