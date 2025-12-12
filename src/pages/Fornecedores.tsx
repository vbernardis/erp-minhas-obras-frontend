// src/pages/Fornecedores.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash } from 'react-icons/fi';

interface Fornecedor {
  id: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentFornecedor, setCurrentFornecedor] = useState<Fornecedor | null>(null);
  const [formData, setFormData] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    inscricao_estadual: '',
    telefone: '',
    email: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: ''
  });

  const carregarFornecedores = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Fornecedor[]>('https://erp-minhas-obras-backend.onrender.com/fornecedores');
      setFornecedores(res.data);
    } catch (err) {
      alert('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setCurrentFornecedor(fornecedor);
    setFormData({
      nome_fantasia: fornecedor.nome_fantasia || '',
      razao_social: fornecedor.razao_social || '',
      cnpj: fornecedor.cnpj || '',
      inscricao_estadual: fornecedor.inscricao_estadual || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      cep: fornecedor.cep || '',
      logradouro: fornecedor.logradouro || '',
      numero: fornecedor.numero || '',
      complemento: fornecedor.complemento || '',
      bairro: fornecedor.bairro || '',
      cidade: fornecedor.cidade || '',
      uf: fornecedor.uf || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      await axios.delete(`https://erp-minhas-obras-backend.onrender.com/fornecedores/${id}`);
      alert('Fornecedor excluído com sucesso!');
      carregarFornecedores();
    } catch (err: any) {
      alert('Erro ao excluir fornecedor: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_fantasia || !formData.razao_social) {
      alert('Nome Fantasia e Razão Social são obrigatórios.');
      return;
    }

    try {
      if (currentFornecedor) {
        await axios.put(`https://erp-minhas-obras-backend.onrender.com/fornecedores/${currentFornecedor.id}`, formData);
        alert('Fornecedor atualizado com sucesso!');
      } else {
        await axios.post('https://erp-minhas-obras-backend.onrender.com/fornecedores', formData);
        alert('Fornecedor criado com sucesso!');
      }

      setShowModal(false);
      carregarFornecedores();
    } catch (err: any) {
      alert('Erro ao salvar fornecedor: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
        <button
          onClick={() => {
            setCurrentFornecedor(null);
            setFormData({
              nome_fantasia: '',
              razao_social: '',
              cnpj: '',
              inscricao_estadual: '',
              telefone: '',
              email: '',
              cep: '',
              logradouro: '',
              numero: '',
              complemento: '',
              bairro: '',
              cidade: '',
              uf: ''
            });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <FiPlus className="mr-2" /> Novo Fornecedor
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : fornecedores.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">Nenhum fornecedor cadastrado.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FiPlus className="mr-2 inline" /> Cadastrar Primeiro Fornecedor
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {fornecedores.map((fornecedor) => (
            <div
              key={fornecedor.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{fornecedor.nome_fantasia}</h3>
                  <p className="text-gray-600">{fornecedor.razao_social}</p>
                  {fornecedor.cnpj && <p className="text-sm text-gray-500">CNPJ: {fornecedor.cnpj}</p>}
                  {fornecedor.email && <p className="text-sm text-gray-500">E-mail: {fornecedor.email}</p>}
                  <p className="text-sm text-gray-500">
                    {fornecedor.logradouro && `${fornecedor.logradouro}, `}
                    {fornecedor.numero && `${fornecedor.numero} - `}
                    {fornecedor.bairro && `${fornecedor.bairro}, `}
                    {fornecedor.cidade && `${fornecedor.cidade} - `}
                    {fornecedor.uf}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(fornecedor)}
                    className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition"
                    title="Editar"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(fornecedor.id)}
                    className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition"
                    title="Excluir"
                  >
                    <FiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {currentFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Fantasia *
                    </label>
                    <input
                      type="text"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razão Social *
                    </label>
                    <input
                      type="text"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inscrição Estadual</label>
                    <input
                      type="text"
                      value={formData.inscricao_estadual}
                      onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                    <input
                      type="text"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                  <input
                    type="text"
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={formData.complemento}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
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