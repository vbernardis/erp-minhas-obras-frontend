// src/pages/RelatorioMapaChuvas.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiFileText } from 'react-icons/fi';
import MapaChuvas from './MapaChuvas';
import jsPDF from 'jspdf';

interface Obra {
  nome: string;
}

// ✅ Interface corrigida: campo 'data' declarado explicitamente
interface DiarioObra {
  id: number;
  data: string; // ← agora está tipado e presente
  dias_improdutivos: number[];
}

export default function RelatorioMapaChuvas() {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();

  const [obraNome, setObraNome] = useState<string>('Carregando...');
  const [diasImprodutivos, setDiasImprodutivos] = useState<number[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dataReferencia, setDataReferencia] = useState<string>('');

  const carregarDados = async () => {
    if (!obraId) return;
    try {
      // ✅ URLs corrigidas: removidos os espaços extras
      const obraRes = await axios.get<Obra>(`https://erp-minhas-obras-backend.onrender.com/obras/${obraId}`);
      setObraNome(obraRes.data.nome);

      const hoje = new Date();
      const mesRef = hoje.toISOString().slice(0, 7); // ex: "2025-04"
      setDataReferencia(mesRef);

      const diariosRes = await axios.get<DiarioObra[]>(
        `https://erp-minhas-obras-backend.onrender.com/diarios-obras?obra_id=${obraId}`
      );

      const todosDias = new Set<number>();
      diariosRes.data.forEach((diario) => {
        // ✅ Proteção segura: só processa se 'data' for string válida
        if (typeof diario.data === 'string' && diario.data.startsWith(mesRef) && Array.isArray(diario.dias_improdutivos)) {
          diario.dias_improdutivos.forEach((dia) => {
            if (typeof dia === 'number' && dia >= 1 && dia <= 31) {
              todosDias.add(dia);
            }
          });
        }
      });
      setDiasImprodutivos(Array.from(todosDias));
    } catch (err) {
      console.error('Erro ao carregar Mapa de Chuvas:', err);
      alert('Erro ao carregar dados do Mapa de Chuvas.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [obraId]);

  const exportarPDF = async () => {
    if (!obraId || !dataReferencia) {
      alert('Dados insuficientes para exportar.');
      return;
    }

    try {
      const resObra = await axios.get<Obra>(`https://erp-minhas-obras-backend.onrender.com/obras/${obraId}`);
      const obra = resObra.data;

      const ano = parseInt(dataReferencia.split('-')[0]);
      const mesNum = parseInt(dataReferencia.split('-')[1]) - 1;
      const totalDias = new Date(ano, mesNum + 1, 0).getDate();

      const r = 180;
      const cx = 105;
      const cy = 120;
      let paths = '';

      for (let i = 0; i < totalDias; i++) {
        const dia = i + 1;
        const startAngle = (i / totalDias) * 360 - 90;
        const endAngle = ((i + 1) / totalDias) * 360 - 90;
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        const fill = diasImprodutivos.includes(dia) ? '#3b82f6' : '#ffffff';
        const textFill = diasImprodutivos.includes(dia) ? '#ffffff' : '#000000';
        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        const textX = cx + (r - 25) * Math.cos((startRad + endRad) / 2);
        const textY = cy + (r - 25) * Math.sin((startRad + endRad) / 2);

        paths += `
          <path d="${pathData}" fill="${fill}" stroke="#e5e7eb" stroke-width="0.3"/>
          <text x="${textX}" y="${textY}" fill="${textFill}" font-size="8" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${dia}</text>
        `;
      }

      const svgContent = `
        <svg viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg" style="font-family:Arial;">
          <text x="105" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#1e3a8a">MAPA DE CHUVAS</text>
          <text x="105" y="45" text-anchor="middle" font-size="12" fill="#333">${obra.nome} • ${dataReferencia}</text>
          ${paths}
          <rect x="30" y="240" width="8" height="8" fill="#3b82f6"/>
          <text x="42" y="247" font-size="10" fill="#333">Impraticável</text>
          <rect x="30" y="255" width="8" height="8" fill="#ffffff" stroke="#ccc"/>
          <text x="42" y="262" font-size="10" fill="#333">Praticável</text>
          <text x="30" y="280" font-size="10" fill="#333">
            <tspan x="30" dy="0">Dias impraticáveis: ${diasImprodutivos.length > 0 ? diasImprodutivos.join(', ') : 'Nenhum'}</tspan>
            <tspan x="30" dy="12">Dias úteis: ${totalDias - diasImprodutivos.length} / ${totalDias}</tspan>
          </text>
          <text x="105" y="295" text-anchor="middle" font-size="8" fill="#666">Relatório gerado pelo ERP Minhas Obras</text>
        </svg>
      `;

      const doc = new jsPDF('p', 'mm', 'a4');
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(svgUrl);
        doc.addImage(img, 'PNG', 0, 0, 210, 297);
        doc.save(`mapa-chuvas-${obra.nome.replace(/\s+/g, '-')}-${dataReferencia}.pdf`);
      };
      img.src = svgUrl;
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao gerar PDF. Verifique o console.');
    }
  };

  if (carregando) {
    return <div className="p-6">Carregando Mapa de Chuvas...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mapa de Chuvas</h1>
        <div className="flex gap-3">
          <button
            onClick={exportarPDF}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FiFileText className="mr-2" /> Exportar PDF
          </button>
          <button
            onClick={() => navigate('/relatorios')}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <FiArrowLeft className="mr-2" /> Voltar
          </button>
        </div>
      </div>

      <p className="mb-4"><strong>Obra:</strong> {obraNome}</p>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          Mês: {new Date(dataReferencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <MapaChuvas
          obraNome={obraNome}
          dataReferencia={dataReferencia}
          diasImprodutivosIniciais={diasImprodutivos}
          onConfirmar={(dias: number[]) => {
            setDiasImprodutivos(dias);
            alert('Mapa atualizado localmente (apenas visualização).');
          }}
          onCancel={() => {}}
        />
      </div>
    </div>
  );
}