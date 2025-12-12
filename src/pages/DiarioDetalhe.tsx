import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';

interface DiarioObra {
  id: number;
  obra_id: number;
  data:string;
  atividades: string[];
  observacoes: string;
  turnos: {
  manha: string;
  tarde: string;
  noite: string | { clima?: string; status?: string };
  };
  efetivos: string[];
  imagens: string[];
  status: string;
  created_at: string;
  elaborado_por?: string; // <-- Adicionado
}

export default function DiarioDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [diario, setDiario] = useState<DiarioObra | null>(null);
  const [nomeObra, setNomeObra] = useState<string>('Carregando...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarDiario = async () => {
      if (!id) {
        setError('ID do diário não fornecido');
        setLoading(false);
        return;
      }

      try {
        const diarioRes = await axios.get<DiarioObra>(`http://localhost:3001/diarios-obras/${id}`);
        setDiario(diarioRes.data);

        const obraRes = await axios.get<{ nome: string }>(`http://localhost:3001/obras/${diarioRes.data.obra_id}`);
        setNomeObra(obraRes.data.nome);
      } catch (err: any) {
        console.error('Erro ao carregar diário:', err);
        setError('Erro ao carregar os dados do diário. Verifique se o ID existe.');
      } finally {
        setLoading(false);
      }
    };

    carregarDiario();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/diario')}
          className="flex items-center text-blue-600 mb-6 hover:underline"
        >
          <FiArrowLeft className="mr-2" /> Voltar para o Diário de Obra
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          Carregando diário...
        </div>
      </div>
    );
  }

  if (error || !diario) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/diario')}
          className="flex items-center text-blue-600 mb-6 hover:underline"
        >
          <FiArrowLeft className="mr-2" /> Voltar para o Diário de Obra
        </button>
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          <strong>Erro:</strong> {error || 'Diário não encontrado'}
        </div>
      </div>
    );
  }

  // Função segura para exibir o turno da noite
  const formatarTurnoNoite = (noite: any): string => {
    if (typeof noite === 'string') return noite;
    if (noite && typeof noite === 'object') {
      return noite.clima || noite.status || '—';
    }
    return '—';
  };

  const atividades = Array.isArray(diario.atividades) ? diario.atividades : [];
  const efetivos = Array.isArray(diario.efetivos) ? diario.efetivos : [];
  const turnos = diario.turnos || { manha: '', tarde: '', noite: '' };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/diario')}
        className="flex items-center text-blue-600 mb-6 hover:underline"
      >
        <FiArrowLeft className="mr-2" /> Voltar para o Diário de Obra
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Diário de Obra</h1>
          <p className="text-lg text-gray-700">
            <strong>Obra:</strong> {nomeObra}
          </p>
          <p className="text-gray-600">
            <strong>Data:</strong> {new Date(diario.data).toLocaleDateString('pt-BR')}
          </p>
          <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
            diario.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
            diario.status === 'Reprovado' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {diario.status}
          </span>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Turnos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manhã: {turnos.manha || '—'}</li>
              <li>Tarde: {turnos.tarde || '—'}</li>
              <li>Noite: {formatarTurnoNoite(turnos.noite)}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Equipes</h2>
            {efetivos.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {efetivos.map((equipe, i) => (
                  <li key={i}>{equipe || 'Sem nome'}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Nenhuma equipe registrada</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Atividades</h2>
            {atividades.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {atividades.map((ativ, i) => (
                  <li key={i}>{ativ || 'Sem descrição'}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Nenhuma atividade registrada</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Observações</h2>
            <p className="text-gray-700 italic">{diario.observacoes || 'Sem observações'}</p>
          </section>

          {/* === Exibir o nome de quem elaborou o diário === */}
          {diario.elaborado_por && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Preenchido Por</h2>
              <p><strong>Usuário:</strong> {diario.elaborado_por}</p>
            </section>
          )}

          {diario.imagens && diario.imagens.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Fotos</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {diario.imagens.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-32 object-cover rounded border"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}