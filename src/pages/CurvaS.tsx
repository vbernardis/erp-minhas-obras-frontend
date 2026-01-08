// src/pages/CurvaS.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import { FiFileText } from 'react-icons/fi';

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Obra {
  id: number;
  nome: string;
  data_inicio: string | null;
  previsao_termino: string | null;
  valor_previsto: number;
}

interface NotaFiscal {
  data_pagamento: string;
  valor_pago: number;
}

export default function CurvaS() {
  const navigate = useNavigate();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState<Obra | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chartRef = useRef<any>(null);

  // Carregar lista de obras
  useEffect(() => {
    const carregarObras = async () => {
      try {
        const res = await axios.get<Obra[]>('https://erp-minhas-obras-backend.onrender.com/obras');
        setObras(res.data);
      } catch (err) {
        console.error('Erro ao carregar obras:', err);
        alert('Erro ao carregar lista de obras.');
      }
    };
    carregarObras();
  }, []);

  // Função para gerar período mensal entre duas datas
  const gerarMeses = (inicio: Date, fim: Date) => {
    const meses: string[] = [];
    const atual = new Date(inicio);
    atual.setDate(1); // Primeiro dia do mês

    while (atual <= fim) {
      meses.push(`${atual.getFullYear()}-${String(atual.getMonth() + 1).padStart(2, '0')}`);
      atual.setMonth(atual.getMonth() + 1);
    }
    return meses;
  };

  // Função principal para gerar a curva S
  const gerarCurvaS = async (obraId: number) => {
    setLoading(true);
    setError(null);
    setChartData(null);

    try {
      // 1. Buscar detalhes da obra
      const obraRes = await axios.get<Obra>(`https://erp-minhas-obras-backend.onrender.com/obras/${obraId}`);
      const obra = obraRes.data;

      if (!obra.valor_previsto || obra.valor_previsto <= 0) {
        throw new Error('Obra não possui valor orçado.');
      }

      // 2. Buscar notas fiscais pagas
      const notasRes = await axios.get<NotaFiscal[]>(
        'https://erp-minhas-obras-backend.onrender.com/notas-fiscais',
        {
          params: { obra_id: obraId, status: 'pago' }
        }
      );

      // 3. Definir período
      const dataInicio = obra.data_inicio ? new Date(obra.data_inicio) : new Date();
      const dataFim = new Date(); // Até hoje

      // Adicionar 2 meses extras para previsão
      const dataPrevisao = new Date(obra.previsao_termino || new Date());
      dataPrevisao.setMonth(dataPrevisao.getMonth() + 2);
      if (dataPrevisao > dataFim) {
        dataFim.setTime(dataPrevisao.getTime());
      }

      // 4. Gerar lista de meses
      const meses = gerarMeses(dataInicio, dataFim);

      // 5. Inicializar realizado por mês
      const realizadoPorMes = new Map<string, number>();
      meses.forEach(mes => realizadoPorMes.set(mes, 0));

      // 6. Preencher valores realizados
      notasRes.data.forEach(nota => {
        if (!nota.data_pagamento) return;
        const data = new Date(nota.data_pagamento);
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (realizadoPorMes.has(mesAno)) {
          realizadoPorMes.set(mesAno, realizadoPorMes.get(mesAno)! + (nota.valor_pago || 0));
        }
      });

      // 7. Calcular acumulado
      let acumuladoOrçado = 0;
      let acumuladoRealizado = 0;
      const orçadoAcumulado: number[] = [];
      const realizadoAcumulado: number[] = [];

      // Orçado: distribuição linear
      const totalMeses = meses.length;
      const valorMensalOrçado = obra.valor_previsto / totalMeses;

      meses.forEach((mes, index) => {
        acumuladoOrçado += valorMensalOrçado;
        acumuladoRealizado += realizadoPorMes.get(mes) || 0;

        orçadoAcumulado.push(Math.min(100, (acumuladoOrçado / obra.valor_previsto) * 100));
        realizadoAcumulado.push((acumuladoRealizado / obra.valor_previsto) * 100);
      });

      // 8. Formatar labels (ex: "Jan/2025")
      const labels = meses.map(mes => {
        const [ano, numMes] = mes.split('-');
        const mesNome = new Date(parseInt(ano), parseInt(numMes) - 1, 1)
          .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
          .replace('.', '');
        return mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
      });

      // 9. Preparar dados do gráfico
      const data = {
        labels,
        datasets: [
          {
            label: 'Orçado Acumulado (%)',
            data: orçadoAcumulado,
            borderColor: '#3b82f6', // blue-500
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.3
          },
          {
            label: 'Realizado Acumulado (%)',
            data: realizadoAcumulado,
            borderColor: '#10b981', // emerald-500
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.3
          }
        ]
      };

      setObraSelecionada(obra);
      setChartData(data);
    } catch (err: any) {
      console.error('Erro ao gerar Curva S:', err);
      setError('Erro ao gerar Curva S: ' + (err.message || 'Verifique o console.'));
    } finally {
      setLoading(false);
    }
  };

  // Função para exportar PDF com o gráfico
  const exportarPDF = () => {
    if (!chartData || !obraSelecionada || !chartRef.current) {
      alert('Nenhum gráfico para exportar.');
      return;
    }

    try {
      // Obter o canvas do Chart.js
      const canvas = chartRef.current.canvas;
      if (!canvas) {
        alert('Gráfico não disponível para exportação.');
        return;
      }

      // Criar PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('ERP MINHAS OBRAS', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(14);
      doc.text('Relatório de Curva S', pageWidth / 2, 30, { align: 'center' });

      // Dados da obra
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Obra: ${obraSelecionada.nome}`, 20, 45);
      doc.text(`Período: ${obraSelecionada.data_inicio ? new Date(obraSelecionada.data_inicio).toLocaleDateString('pt-BR') : '—'} até hoje`, 20, 52);

      // Calcular posição do gráfico
      const imgWidth = 190; // largura do gráfico no PDF (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pageWidth - imgWidth) / 2;
      const y = 65;

      // Adicionar gráfico
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imgWidth, imgHeight);

      // Instruções (rodapé)
      const finalY = y + imgHeight + 10;
      if (finalY < pageHeight - 20) {
        doc.setFontSize(10);
        doc.text('• Orçado Acumulado: distribuição linear do valor total orçado', 20, finalY);
        doc.text('• Realizado Acumulado: soma dos pagamentos efetuados até cada mês', 20, finalY + 5);
      }

      // Data de geração
      doc.setFontSize(9);
      doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Salvar
      doc.save(`curva-s-${obraSelecionada.nome.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao gerar PDF. Verifique o console.');
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Período (Mês/Ano)',
          font: { size: 12 }
        },
        grid: { display: false }
      },
      y: {
        title: {
          display: true,
          text: 'Percentual Acumulado (%)',
          font: { size: 12 }
        },
        min: 0,
        max: 100,
        ticks: {
          callback: (value: any) => value + '%'
        }
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Curva S - Evolução da Obra</h1>
        <button
          onClick={() => navigate('/relatorios')}
          className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Voltar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione uma Obra
          </label>
          <select
            value={obraSelecionada?.id || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) gerarCurvaS(id);
            }}
            className="w-full md:w-1/3 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Escolha uma obra —</option>
            {obras.map(obra => (
              <option key={obra.id} value={obra.id}>
                {obra.nome}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Gerando Curva S...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {chartData && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-800">Curva S: {obraSelecionada?.nome}</h2>
            <button
              onClick={exportarPDF}
              className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 flex items-center"
            >
              <FiFileText className="mr-2" /> Exportar PDF
            </button>
          </div>
          <div className="h-96">
            <Line ref={chartRef} data={chartData} options={options} />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>• <strong>Orçado Acumulado</strong>: distribuição linear do valor total orçado ao longo do período</p>
            <p>• <strong>Realizado Acumulado</strong>: soma dos pagamentos efetuados até cada mês</p>
          </div>
        </div>
      )}
    </div>
  );
}