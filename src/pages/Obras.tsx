// src/pages/Obras.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash, FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

interface Obra {
  id: number;
  nome: string;
  endereco: string;
  "A R T": string | null;
  cno: string | null;
  eng_responsavel: string;
  proprietario: string;
  data_inicio: string | null;
  previsao_termino: string | null;
  valor_previsto: number;
  valor_realizado: number;
  created_at: string;
}

export default function Obras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentObra, setCurrentObra] = useState<Obra | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    art: '', // frontend usa "art" para facilitar
    cno: '',
    eng_responsavel: '',
    proprietario: '',
    data_inicio: '',
    previsao_termino: ''
  });

  const navigate = useNavigate();

  const carregarObras = async () => {
    setLoading(true);
    try {
      const resposta = await axios.get<Obra[]>('http://localhost:3001/obras');
      setObras(resposta.data);
    } catch (falha) {
      if (falha instanceof Error) {
        alert('Falha ao carregar obras: ' + falha.message);
      } else {
        alert('Falha ao carregar obras: Erro desconhecido');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setCurrentObra(null);
    setFormData({
      nome: '',
      endereco: '',
      art: '',
      cno: '',
      eng_responsavel: '',
      proprietario: '',
      data_inicio: '',
      previsao_termino: ''
    });
    setShowModal(true);
  };

  const handleEdit = (obra: Obra) => {
    setCurrentObra(obra);
    setFormData({
      nome: obra.nome,
      endereco: obra.endereco,
      art: obra["A R T"] || '',
      cno: obra.cno || '',
      eng_responsavel: obra.eng_responsavel,
      proprietario: obra.proprietario,
      data_inicio: obra.data_inicio || '',
      previsao_termino: obra.previsao_termino || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar esta obra?')) return;

    try {
      await axios.delete(`http://localhost:3001/obras/${id}`);
      alert('Obra deletada com sucesso!');
      carregarObras();
    } catch (falha) {
      if (falha instanceof Error) {
        alert('Falha ao deletar obra: ' + falha.message);
      } else {
        alert('Falha ao deletar obra: Erro desconhecido');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nome: formData.nome,
        endereco: formData.endereco,
        "A R T": formData.art || null,
        cno: formData.cno || null,
        eng_responsavel: formData.eng_responsavel,
        proprietario: formData.proprietario,
        data_inicio: formData.data_inicio || null,
        previsao_termino: formData.previsao_termino || null,
        valor_previsto: 0,
        valor_realizado: 0
      };

      if (currentObra) {
        await axios.put(`http://localhost:3001/obras/${currentObra.id}`, payload);
        alert('Obra atualizada com sucesso!');
      } else {
        await axios.post('http://localhost:3001/obras', payload);
        alert('Obra criada com sucesso!');
      }

      setShowModal(false);
      carregarObras();
    } catch (falha: any) {
      alert('Erro ao salvar: ' + (falha.response?.data?.error || falha.message));
    }
  };

  const formatarData = (data: string | null) => {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor: number) => {
    if (!valor || valor <= 0) return '—';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  useEffect(() => {
    carregarObras();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Obras</h1>
          <p className="text-gray-600 text-sm mt-1">
            Cadastre, edite e acompanhe todas as suas obras
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
        >
          <FiPlus className="mr-2" /> Nova Obra
        </button>
      </div>

      {/* Tabela Compacta */}
{loading ? (
  <div className="text-center py-10">Carregando...</div>
) : obras.length === 0 ? (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
    <p className="text-gray-500 mb-4">Nenhuma obra cadastrada.</p>
    <button
      onClick={handleCreate}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      <FiPlus className="mr-2 inline" /> Criar Primeira Obra
    </button>
  </div>
) : (
  <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
  <table className="min-w-full bg-white text-xs table-fixed"> {/* 👈 ADICIONADO table-fixed */}
    <thead className="bg-gray-50">
      <tr>
        <th className="w-1/4 px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Obra</th>
        <th className="w-10 px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">A.R.T.</th>
        <th className="w-16 px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Eng. Resp.</th>
        <th className="w-12 px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Início</th>
        <th className="w-12 px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Término</th>
        <th className="w-14 px-2 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Previsto</th>
        <th className="w-14 px-2 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Realizado</th>
        <th className="w-12 px-2 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">Ações</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      {obras.map((obra) => (
        <tr key={obra.id} className="hover:bg-gray-50">
          <td className="w-1/4 px-2 py-2 whitespace-nowrap">
            <div className="font-medium text-gray-900 truncate">{obra.nome}</div>
            <div className="text-gray-500 truncate text-xs">{obra.endereco}</div>
          </td>
          <td className="w-10 px-2 py-2 whitespace-nowrap text-gray-900 truncate">{obra["A R T"] || '—'}</td>
          <td className="w-16 px-2 py-2 whitespace-nowrap text-gray-900 truncate">{obra.eng_responsavel}</td>
          <td className="w-12 px-2 py-2 whitespace-nowrap text-gray-700">{formatarData(obra.data_inicio)}</td>
          <td className="w-12 px-2 py-2 whitespace-nowrap text-gray-700">{formatarData(obra.previsao_termino)}</td>
          <td className="w-14 px-2 py-2 whitespace-nowrap text-right text-green-600 font-medium">
            {formatarMoeda(obra.valor_previsto)}
          </td>
          <td className="w-14 px-2 py-2 whitespace-nowrap text-right text-orange-600 font-medium">
            {formatarMoeda(obra.valor_realizado)}
          </td>
          <td className="w-12 px-2 py-2 whitespace-nowrap text-center">
            <div className="flex justify-center space-x-1">
              <button
                onClick={() => handleEdit(obra)}
                className="text-gray-600 hover:text-green-600 p-0.5"
                title="Editar"
              >
                <FiEdit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDelete(obra.id)}
                className="text-gray-600 hover:text-red-600 p-0.5"
                title="Deletar"
              >
                <FiTrash className="w-3 h-3" />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
)}

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {currentObra ? 'Editar Obra' : 'Nova Obra'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço *</label>
                    <input
                      type="text"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Corrigido: rótulo agora é "A.R.T." */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">A.R.T.</label>
                  <input
                    type="text"
                    value={formData.art}
                    onChange={(e) => setFormData({ ...formData, art: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Ex: 123456/2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° do CNO</label>
                  <input
                    type="text"
                    value={formData.cno}
                    onChange={(e) => setFormData({ ...formData, cno: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Ex: 123456789"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Engenheiro Responsável *</label>
                    <input
                      type="text"
                      value={formData.eng_responsavel}
                      onChange={(e) => setFormData({ ...formData, eng_responsavel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proprietário *</label>
                    <input
                      type="text"
                      value={formData.proprietario}
                      onChange={(e) => setFormData({ ...formData, proprietario: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                    <input
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de Término</label>
                    <input
                      type="date"
                      value={formData.previsao_termino}
                      onChange={(e) => setFormData({ ...formData, previsao_termino: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    Salvar
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
    </div>
  );
}