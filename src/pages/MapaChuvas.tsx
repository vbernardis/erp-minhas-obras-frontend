// src/components/MapaChuvas.tsx
import { useState, useEffect } from 'react';

interface MapaChuvasProps {
  obraNome?: string;
  onConfirmar: (diasImprodutivos: number[]) => void;
  onCancel: () => void;
  diasImprodutivosIniciais?: number[]; // ex: [3, 5, 12]
  dataReferencia: string; // ex: "2025-04"
}

export default function MapaChuvas({
  obraNome,
  onConfirmar,
  onCancel,
  diasImprodutivosIniciais = [],
  dataReferencia
}: MapaChuvasProps) {
  const [diasImprodutivos, setDiasImprodutivos] = useState<number[]>(diasImprodutivosIniciais);
  const [confirmado, setConfirmado] = useState(false);

  // Determina quantos dias tem o mês
  const ano = parseInt(dataReferencia.split('-')[0]);
  const mes = parseInt(dataReferencia.split('-')[1]) - 1;
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  useEffect(() => {
    setDiasImprodutivos(diasImprodutivosIniciais);
  }, [diasImprodutivosIniciais]);

  const alternarDia = (dia: number) => {
    if (diasImprodutivos.includes(dia)) {
      setDiasImprodutivos(diasImprodutivos.filter(d => d !== dia));
    } else {
      setDiasImprodutivos([...diasImprodutivos, dia]);
    }
  };

  const handleConfirmar = () => {
    onConfirmar(diasImprodutivos);
    setConfirmado(true);
  };

  // Função para gerar os setores do círculo
  const renderizarSetores = () => {
    const r = 120; // raio
    const cx = 150;
    const cy = 150;
    const anguloTotal = 360;
    const anguloPorDia = anguloTotal / totalDias;

    return dias.map((dia, index) => {
      const startAngle = (index * anguloPorDia - 90) * (Math.PI / 180);
      const endAngle = ((index + 1) * anguloPorDia - 90) * (Math.PI / 180);

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);

      const cor = diasImprodutivos.includes(dia) ? '#3b82f6' : '#f9fafb'; // azul ou branco
      const largeArcFlag = anguloPorDia > 180 ? 1 : 0;

      const pathData = [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      return (
        <g key={dia}>
          <path
            d={pathData}
            fill={cor}
            stroke="#e5e7eb"
            strokeWidth="1"
            onClick={() => alternarDia(dia)}
            style={{ cursor: 'pointer' }}
          />
          <text
            x={cx + (r - 25) * Math.cos((startAngle + endAngle) / 2)}
            y={cy + (r - 25) * Math.sin((startAngle + endAngle) / 2)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="bold"
            fill={diasImprodutivos.includes(dia) ? 'white' : 'black'}
            style={{ pointerEvents: 'none' }}
          >
            {dia}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">🌧️ Mapa de Chuvas Circular</h2>
            {obraNome && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {obraNome}
              </span>
            )}
          </div>

          <p className="text-gray-600 mb-4">
            Mês: <strong>{new Date(ano, mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
          </p>

          {/* Legenda */}
          <div className="flex gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Chuvoso / Improdutivo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
              <span>Útil / Produtivo</span>
            </div>
          </div>

          {/* Calendário Circular */}
          <div className="flex justify-center mb-6">
            <svg width="300" height="300" viewBox="0 0 300 300">
              {renderizarSetores()}
            </svg>
          </div>

          <p className="text-xs text-gray-500 text-center mb-6">
            Clique em um dia para marcar/desmarcar como <strong>improdutivo</strong>.
          </p>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={confirmado}
              className={`px-4 py-2 rounded-lg font-medium ${
                confirmado
                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {confirmado ? '✅ Confirmado' : '✅ Confirmar Mapa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}