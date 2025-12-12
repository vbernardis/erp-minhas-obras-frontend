import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { hasPermission } from '../utils/permissions';
import { FiPlus, FiRefreshCw, FiEdit2, FiTrash, FiFileText, FiDownload } from 'react-icons/fi';
import { createClient } from '@supabase/supabase-js';
import MapaChuvas from '../pages/MapaChuvas';

// ✅ Função para obter o nome do usuário logado
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

// ✅ Cliente Supabase para upload
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

interface DiarioObra {
  id: number;
  obra_id: number;
  data: string;
  atividades: string[];
  observacoes: string;
  turnos: {
    manha: string;
    tarde: string;
    noite: string;
  };
  efetivos: string[]; // era "equipes"
  imagens: string[];
  status: string;
  created_at: string;
  elaborado_por?: string; // ✅ Corrigido
}

interface Obra {
  id: number;
  nome: string;
}

export default function Diario() {
  const [diarios, setDiarios] = useState<DiarioObra[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroObra, setFiltroObra] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentDiario, setCurrentDiario] = useState<DiarioObra | null>(null);
  const [mostrarMapaChuvas, setMostrarMapaChuvas] = useState(false);
  const [mapaChuvasPreenchido, setMapaChuvasPreenchido] = useState(false);
  const [mapaChuvasId, setMapaChuvasId] = useState<number | null>(null); 
  const [diasImprodutivos, setDiasImprodutivos] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    obra_id: '',
    turno_manha: '',
    turno_tarde: '',
    turno_noite: '',
    observacoes: ''
  });

  const [registroDate, setRegistroDate] = useState(new Date().toISOString().split('T')[0]);

  const [atividades, setAtividades] = useState<string[]>(['']);
  const [ocorrencias, setOcorrencias] = useState<string[]>(['']);
  const [equipes, setEquipes] = useState<string[]>(['']);
  const [status, setStatus] = useState('Revisar');
  const [imagens, setImagens] = useState<File[]>([]);
  const [imagensPreview, setImagensPreview] = useState<string[]>([]);
  const [imagensExistentes, setImagensExistentes] = useState<string[]>([]); 
  const navigate = useNavigate();

  const carregarDiarios = useCallback(async () => {
  setLoading(true);
  try {
    let url = 'https://erp-minhas-obras-backend.onrender.com/diarios-obras?';
    const params = [];
    if (filtroObra) params.push(`obra_id=${filtroObra}`);
    if (filtroStatus) params.push(`status=${filtroStatus}`);
    if (params.length > 0) url += params.join('&');

    const resposta = await axios.get<DiarioObra[]>(url);
    console.log('Diários carregados:', resposta.data.map(d => d.id));
    setDiarios(resposta.data);
  } catch (falha) {
    if (falha instanceof Error) {
      alert('Falha ao carregar diários: ' + falha.message);
    } else {
      alert('Falha ao carregar diários: Erro desconhecido');
    }
  } finally {
    setLoading(false);
  }
}, [filtroObra, filtroStatus]); // ← dependências estáveis

  const carregarObras = useCallback(async () => {
  try {
    const resposta = await axios.get<Obra[]>('https://erp-minhas-obras-backend.onrender.com/obras');
    setObras(resposta.data);
  } catch (falha) {
    if (falha instanceof Error) {
      alert('Falha ao carregar obras: ' + falha.message);
    } else {
      alert('Falha ao carregar obras: Erro desconhecido');
    }
  }
}, []); // ← sem dependências

  const handleCreate = () => {
    setCurrentDiario(null);
    setMapaChuvasPreenchido(false); 
    setMostrarMapaChuvas(false);   
    setDiasImprodutivos([]); 
    setFormData({
      obra_id: '',
      turno_manha: '',
      turno_tarde: '',
      turno_noite: '',
      observacoes: ''
    });
    setRegistroDate(new Date().toISOString().split('T')[0]);
    setAtividades(['']);
    setOcorrencias(['']);
    setEquipes(['']);
    setStatus('Revisar');
    setImagens([]);
    setImagensPreview([]);
    setShowModal(true);
  };

  

  const handleEdit = async (diario: DiarioObra) => {
  setCurrentDiario(diario);
  setImagensExistentes(diario.imagens || []);
  setFormData({
    obra_id: diario.obra_id.toString(),
    turno_manha: diario.turnos?.manha || '',
    turno_tarde: diario.turnos?.tarde || '',
    turno_noite: diario.turnos?.noite || '',
    observacoes: diario.observacoes
  });

  setRegistroDate(diario.data);
  setAtividades(diario.atividades || ['']);
  setOcorrencias([]); // ⚠️ removido: agora tudo vai em "atividades"
  setEquipes(diario.efetivos || ['']);
  setStatus(diario.status);
  setImagensPreview(diario.imagens || []);
  setShowModal(true);
};

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este diário?')) return;

    try {
      await axios.delete(`https://erp-minhas-obras-backend.onrender.com/diarios-obras/${id}`);
      alert('Diário deletado com sucesso!');
      carregarDiarios();
    } catch (falha) {
      if (falha instanceof Error) {
        alert('Falha ao deletar diário: ' + falha.message);
      } else {
        alert('Falha ao deletar diário: Erro desconhecido');
      }
    }
  };

  const handleAddAtividade = () => {
    setAtividades([...atividades, '']);
  };

  const handleRemoveAtividade = (index: number) => {
    if (atividades.length > 1) {
      setAtividades(atividades.filter((_, i) => i !== index));
    }
  };

  const handleAtividadeChange = (index: number, value: string) => {
    const newAtividades = [...atividades];
    newAtividades[index] = value;
    setAtividades(newAtividades);
  };

  const handleAddOcorrencia = () => {
    setOcorrencias([...ocorrencias, '']);
  };

  const handleRemoveOcorrencia = (index: number) => {
    if (ocorrencias.length > 1) {
      setOcorrencias(ocorrencias.filter((_, i) => i !== index));
    }
  };

  const handleOcorrenciaChange = (index: number, value: string) => {
    const newOcorrencias = [...ocorrencias];
    newOcorrencias[index] = value;
    setOcorrencias(newOcorrencias);
  };

  const handleAddEquipe = () => {
    setEquipes([...equipes, '']);
  };

  const handleRemoveEquipe = (index: number) => {
    if (equipes.length > 1) {
      setEquipes(equipes.filter((_, i) => i !== index));
    }
  };

  const handleEquipeChange = (index: number, value: string) => {
    const newEquipes = [...equipes];
    newEquipes[index] = value;
    setEquipes(newEquipes);
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 🔒 TRAVA: impede salvar sem preencher o mapa de chuvas
  if (!mapaChuvasPreenchido) {
    alert('⚠️ O Mapa de Chuvas é obrigatório. Por favor, preencha antes de salvar.');
    return;
  }
  try {
    // Junta atividades e ocorrências em um único array
    const todasAtividades = [
      ...atividades.filter(item => item.trim() !== ''),
      ...ocorrencias.filter(item => item.trim() !== '')
    ].filter(Boolean);



// Fazer upload das imagens para o Supabase Storage
let urlsImagens: string[] = [];

if (imagens.length > 0) {
  // ✅ Upload de novas imagens
  const uploads = imagens.map(async (file) => {
    const fileName = `diario-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase
      .storage
      .from('diario-obras')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = await supabase
      .storage
      .from('diario-obras')
      .getPublicUrl(fileName);

    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('Falha ao gerar URL pública');
    return publicUrl;
  });

  urlsImagens = await Promise.all(uploads);
} else if (currentDiario) {
  // ✅ É edição e não há novas imagens → manter as existentes
  urlsImagens = imagensExistentes;
} else {
  // ✅ É criação e não há imagens → array vazio
  urlsImagens = [];
}
    const payload = {
  obra_id: parseInt(formData.obra_id),
  data: registroDate,
  turno_manha: formData.turno_manha,
  turno_tarde: formData.turno_tarde,
  turno_noite: formData.turno_noite,
  atividades: todasAtividades,
  equipes: equipes.filter(item => item.trim() !== ''),
  observacoes: formData.observacoes,
  imagens: urlsImagens,
  status,
  dias_improdutivos: mapaChuvasPreenchido ? diasImprodutivos : [], // ✅ agora funciona!
  elaborado_por: getUsuarioLogado(), // ✅ Corrigido
};

    if (currentDiario) {
      await axios.put(`https://erp-minhas-obras-backend.onrender.com/diarios-obras/${currentDiario.id}`, payload);
      alert('Diário atualizado com sucesso!');
    } else {
      await axios.post('https://erp-minhas-obras-backend.onrender.com/diarios-obras', payload);
      alert('Diário criado com sucesso!');
    }

    setShowModal(false);
    carregarDiarios();
  } catch (falha: any) {
    console.error('Erro detalhado:', falha.response?.data || falha.message);
    alert('Erro ao salvar: ' + (falha.response?.data?.error || falha.message));
  }
};

  // ✅ Mantém previews locais para o modal
  const handleImagensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 6);
      setImagens(files);
      const previews = files.map(file => URL.createObjectURL(file));
      setImagensPreview(previews);
    }
  };

  const handleExportPDF = async (id: number) => {
    try {
      const resposta = await axios.get(`https://erp-minhas-obras-backend.onrender.com/diarios-obras/${id}/pdf`, {
        responseType: 'arraybuffer'
      });
      
      if (!resposta.data || resposta.data.byteLength === 0) {
        alert('PDF vazio. Verifique os dados do diário.');
        return;
      }
      
      const blob = new Blob([resposta.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diario-obra-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
    } catch (falha: any) {
      console.error('Erro ao exportar PDF:', falha);
      alert('Erro ao exportar PDF: ' + falha.message);
    }
  };

  const handleViewPDF = (diario: DiarioObra) => {
    navigate(`/diario/${diario.id}`);
  };

  useEffect(() => {
    if (!hasPermission('obras:read')) {
      alert('Você não tem permissão para acessar esta página.');
      navigate('/dashboard');
    }
    carregarDiarios();
    carregarObras();
  }, [navigate, carregarDiarios, carregarObras]);

  useEffect(() => {
    carregarDiarios();
  }, [filtroObra, filtroStatus, carregarDiarios]);

  const condicoesClimaticas = [
    { value: '', label: 'Selecione...' },
    { value: 'Ensolarado', label: 'Ensolarado' },
    { value: 'Chuvoso', label: 'Chuvoso' },
    { value: 'Nublado', label: 'Nublado' },
    { value: 'Praticável', label: 'Praticável' },
    { value: 'Impraticável', label: 'Impraticável' }
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Diário de Obra</h1>
        <div className="flex flex-wrap gap-3">
          {hasPermission('obras:write') && (
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FiPlus className="mr-2" /> Novo Registro
            </button>
          )}
          <button
            onClick={carregarDiarios}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
          {/* Botão Exportar Mapa de Chuvas */}
<button
  onClick={() => {
    if (!filtroObra) {
      alert('Selecione uma obra nos filtros para exportar o Mapa de Chuvas.');
      return;
    }
    const mes = filtroStatus
      ? new Date().toISOString().slice(0, 7) // ou use um estado de mês, se tiver
      : new Date().toISOString().slice(0, 7);
    const url = `https://erp-minhas-obras-backend.onrender.com/mapa-chuvas/pdf?obra_id=${filtroObra}&mes=${mes}`;
    window.open(url, '_blank');
  }}
  disabled={!filtroObra}
  className={`flex items-center px-4 py-2 rounded-lg transition ${
    filtroObra
      ? 'bg-purple-600 text-white hover:bg-purple-700'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
  }`}
  title={!filtroObra ? 'Selecione uma obra primeiro' : 'Exportar Mapa de Chuvas do mês atual'}
>
  <FiDownload className="mr-2" /> Mapa de Chuvas
</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Obra</label>
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="Revisar">Revisar</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Reprovado">Reprovado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Diários */}
      {diarios.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">Nenhum registro de diário encontrado.</p>
          {hasPermission('obras:write') && (
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <FiPlus className="mr-2 inline" /> Criar Primeiro Registro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
{diarios.map((diario) => (
   <div key={diario.id} className="bg-white py-2 mb-[-15px]">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm px-3">
      <div className="flex items-center flex-1 min-w-0">
        <span className="text-gray-500 mr-2 whitespace-nowrap">
          {new Date(diario.created_at).toLocaleDateString('pt-BR')}
        </span>
        <span className="text-gray-900 truncate">
          {obras.find(o => o.id === diario.obra_id)?.nome || 'Obra não encontrada'}
        </span>
      </div>
      <span className={`inline-block px-1.5 py-0.5 text-xs rounded whitespace-nowrap ${
        diario.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
        diario.status === 'Reprovado' ? 'bg-red-100 text-red-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {diario.status}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => handleViewPDF(diario)}
          className="p-1 text-gray-500 hover:text-blue-700 rounded"
          title="Ver Relatório"
        >
          <FiFileText className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleExportPDF(diario.id)}
          className="p-1 text-gray-500 hover:text-green-700 rounded"
          title="Exportar PDF"
        >
          <FiDownload className="w-3.5 h-3.5" />  
        </button>
        {hasPermission('obras:write') && (
          <>
            <button
              onClick={() => handleEdit(diario)}
              className="p-1 text-gray-500 hover:text-blue-700 rounded"
              title="Editar"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(diario.id)}
              className="p-1 text-gray-500 hover:text-red-700 rounded"
              title="Deletar"
            >
              <FiTrash className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
    
  </div>
))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {currentDiario ? 'Editar Diário de Obra' : 'Novo Registro Diário de Obra'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Obra *</label>
                    <select
                      name="obra_id"
                      value={formData.obra_id}
                      onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione uma obra</option>
                      {obras.map((obra) => (
                        <option key={obra.id} value={obra.id}>{obra.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                    <input
                      type="date"
                      value={registroDate}
                      onChange={(e) => setRegistroDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* === Mapa de Chuvas (Obrigatório) === */}
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🌧️ Mapa de Chuvas Mensal <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setMostrarMapaChuvas(true)}
                      className={`w-full py-2 px-3 text-left rounded-lg border ${
                        mapaChuvasPreenchido
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-red-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {mapaChuvasPreenchido
                        ? '✅ Mapa de Chuvas preenchido'
                        : '📝 Clique para preencher o Mapa de Chuvas (obrigatório)'}
                    </button>
                  </div>

                {/* Turnos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manhã</label>
                    <select
                      value={formData.turno_manha}
                      onChange={(e) => setFormData({ ...formData, turno_manha: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {condicoesClimaticas.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarde</label>
                    <select
                      value={formData.turno_tarde}
                      onChange={(e) => setFormData({ ...formData, turno_tarde: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {condicoesClimaticas.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Noite</label>
                    <select
                      value={formData.turno_noite}
                      onChange={(e) => setFormData({ ...formData, turno_noite: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {condicoesClimaticas.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Equipes */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Equipes</label>
                    <button
                      type="button"
                      onClick={handleAddEquipe}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {equipes.map((equipe, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={equipe}
                          onChange={(e) => handleEquipeChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Nome da equipe"
                        />
                        {equipes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEquipe(index)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Atividades */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Atividades</label>
                    <button
                      type="button"
                      onClick={handleAddAtividade}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {atividades.map((atividade, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={atividade}
                          onChange={(e) => handleAtividadeChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Descreva a atividade"
                        />
                        {atividades.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAtividade(index)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ocorrências */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Ocorrências</label>
                    <button
                      type="button"
                      onClick={handleAddOcorrencia}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ocorrencias.map((ocorrencia, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={ocorrencia}
                          onChange={(e) => handleOcorrenciaChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Descreva a ocorrência"
                        />
                        {ocorrencias.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOcorrencia(index)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Revisar">Revisar</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Reprovado">Reprovado</option>
                  </select>
                </div>

                {/* Upload de Fotos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📸 Fotos (máximo 6)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagensChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {imagensPreview.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {imagensPreview.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}

                  {/* ✅ Exibe o nome do preenchedor no rodapé, abaixo das fotos */}
{(currentDiario?.elaborado_por || (!currentDiario && getUsuarioLogado())) && (
  <div style={{
    marginTop: '15px',
    padding: '8px',
    backgroundColor: '#f0f4f8',
    borderRadius: '4px',
    fontSize: '14px',
    textAlign: 'left',
    border: '1px solid #ccc'
  }}>
    <strong>Elaborado por:</strong> {currentDiario?.elaborado_por || getUsuarioLogado()}
  </div>
)}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    {currentDiario ? 'Atualizar' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Mapa de Chuvas */}
        {mostrarMapaChuvas && (
  <MapaChuvas
    obraNome={obras.find(o => o.id === parseInt(formData.obra_id))?.nome}
    dataReferencia={registroDate.slice(0, 7)}
    diasImprodutivosIniciais={diasImprodutivos} // opcional: para edição futura
    onConfirmar={(dias) => {
      setDiasImprodutivos(dias); // ← salva no estado do Diario.tsx
      setMapaChuvasPreenchido(true);
      setMostrarMapaChuvas(false);
    }}
    onCancel={() => setMostrarMapaChuvas(false)}
  />
)}
    </div>
  );
}