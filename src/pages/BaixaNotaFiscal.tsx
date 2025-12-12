// src/pages/BaixaNotaFiscal.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';

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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

const formatInputNumber = (value: string): string => {
  let cleaned = value.replace(/\D/g, '');
  if (cleaned === '') return '';
  if (cleaned.length > 17) cleaned = cleaned.slice(0, 17);

  let integerPart = cleaned;
  let decimalPart = '';

  if (cleaned.length > 2) {
    decimalPart = cleaned.slice(-2);
    integerPart = cleaned.slice(0, -2);
  } else if (cleaned.length === 1) {
    decimalPart = '0' + cleaned;
    integerPart = '0';
  } else if (cleaned.length === 2) {
    decimalPart = cleaned;
    integerPart = '0';
  }

  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${integerPart},${decimalPart}`;
};

const parseToFloat = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
};

export default function BaixaNotaFiscal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notaId = parseInt(id || '0', 10);
  const [nota, setNota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dataPagamento, setDataPagamento] = useState('');
  const [jurosInput, setJurosInput] = useState('');
  const [descontoInput, setDescontoInput] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const usuarioLogado = getUsuarioLogado();

  useEffect(() => {
    const fetchNota = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/notas-fiscais/${notaId}`);
        setNota(response.data);
        // Se a nota já tiver data_pagamento, use-a como valor inicial no campo
        if (response.data.data_pagamento) {
          setDataPagamento(response.data.data_pagamento);
        }
        setLoading(false);
      } catch (err) {
        alert('Erro ao carregar nota fiscal. Verifique se ela existe.');
        navigate('/financeiro/contas-pagar');
      }
    };
    fetchNota();
  }, [notaId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataPagamento) {
      alert('Data de pagamento é obrigatória.');
      return;
    }

    const juros = parseToFloat(jurosInput);
    const desconto = parseToFloat(descontoInput);
    const valorOriginal = parseFloat(nota.valor_total);
    const valorPago = valorOriginal + juros - desconto;

    if (valorPago <= 0) {
      alert('O valor pago deve ser maior que zero.');
      return;
    }

    try {
      await axios.post(`http://localhost:3001/notas-fiscais/${notaId}/baixa`, {
        data_pagamento: dataPagamento,
        juros: juros,
        desconto: desconto,
        observacoes: observacoes,
        usuario_baixa: usuarioLogado
      });
      alert('Baixa registrada com sucesso!');
      navigate('/financeiro/contas-pagas');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro desconhecido';
      alert('Erro ao registrar baixa: ' + msg);
    }
  };

  if (loading) return <div className="p-6 text-center">Carregando nota fiscal...</div>;
  if (!nota) return <div className="p-6 text-center text-red-600">Nota não encontrada.</div>;

  const valorOriginal = parseFloat(nota.valor_total);
  const juros = parseToFloat(jurosInput);
  const desconto = parseToFloat(descontoInput);
  const valorCalculado = valorOriginal + juros - desconto;

  // Função para formatar data YYYY-MM-DD para DD/MM/YYYY
  const formatarDataParaExibicao = (dataISO: string | null | undefined): string => {
    if (!dataISO) return '—';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-blue-600 mb-6"
      >
        <FiArrowLeft className="mr-2" /> Voltar
      </button>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Dados da Nota Fiscal</h2>
        <div className="text-sm space-y-1">
          {/* ✅ Corrigido: Acessa o nome do fornecedor dentro do objeto aninhado */}
          <div><span className="font-medium">Fornecedor:</span> {nota.fornecedores?.nome_fantasia || '—'}</div>
          <div><span className="font-medium">Nº da Nota:</span> {nota.numero_nota}</div>
          <div>
  <span className="font-medium">
    {/* ✅ Alteração: Exibe rótulo apropriado */}
    {nota.data_pagamento ? 'Data de Pagamento:' : 'Vencimento:'}
  </span>{' '}
  {/* ✅ Corrigido: Exibe a data formatada como DD/MM/YYYY sem conversão de fuso */}
  {nota.data_pagamento ? formatarDataParaExibicao(nota.data_pagamento) : formatarDataParaExibicao(nota.data_vencimento)}
</div>
          <div><span className="font-medium">Valor Original:</span> {formatCurrency(valorOriginal)}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Registrar Pagamento</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data do Pagamento *</label>
            <input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
  <label className="block text-sm font-medium mb-1">Juros (R$)</label>
  <input
    type="text"
    value={jurosInput}
    onChange={(e) => {
      let value = e.target.value;
      // Remove tudo que não é dígito ou vírgula
      value = value.replace(/[^\d,]/g, '');
      // Garante no máximo uma vírgula
      const parts = value.split(',');
      if (parts.length > 2) {
        value = parts[0] + ',' + parts[1];
      }
      // Não formata com ponto de milhar durante a digitação (evita pular cursor)
      setJurosInput(value);
    }}
    placeholder="0,00"
    className="w-full p-2 border rounded"
  />
</div>

<div>
  <label className="block text-sm font-medium mb-1">Desconto (R$)</label>
  <input
    type="text"
    value={descontoInput}
    onChange={(e) => {
      let value = e.target.value;
      value = value.replace(/[^\d,]/g, '');
      const parts = value.split(',');
      if (parts.length > 2) {
        value = parts[0] + ',' + parts[1];
      }
      setDescontoInput(value);
    }}
    placeholder="0,00"
    className="w-full p-2 border rounded"
  />
</div>

          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm">
              <span className="font-medium">Valor a Pagar:</span> {formatCurrency(valorCalculado)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Registrado por</label>
            <input
              type="text"
              value={usuarioLogado}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          >
            Confirmar Baixa
          </button>
        </div>
      </form>
    </div>
  );
}