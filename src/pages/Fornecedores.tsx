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
  inscricao_municipal: string | null;
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
    inscricao_municipal: '',
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

  // ✅ Função para formatar CPF/CNPJ conforme o tamanho
  const formatarCpfCnpj = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
  };

  // ✅ Função para normalizar CNPJ/CPF (remover formatação para comparação)
  const normalizarDocumento = (doc: string | null): string => {
    if (!doc) return '';
    return doc.replace(/\D/g, '');
  };

  // ✅ Buscar CEP automaticamente
  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: (data.logradouro || '').toUpperCase(),
          bairro: data.bairro || '',
          cidade: (data.localidade || '').toUpperCase(),
          uf: data.uf || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

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
      inscricao_municipal: fornecedor.inscricao_municipal || '',
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

  // ✅ Função para verificar se CNPJ já existe (exceto o próprio fornecedor em edição)
  const verificarCnpjDuplicado = (cnpj: string, fornecedorId?: number): boolean => {
    const cnpjNormalizado = normalizarDocumento(cnpj);
    
    // Se CNPJ estiver vazio, não valida duplicidade
    if (!cnpjNormalizado) return false;
    
    return fornecedores.some(f => {
      // Ignora o próprio fornecedor que está sendo editado
      if (fornecedorId && f.id === fornecedorId) return false;
      
      const cnpjExistente = normalizarDocumento(f.cnpj);
      return cnpjExistente && cnpjExistente === cnpjNormalizado;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_fantasia || !formData.razao_social) {
      alert('Nome Fantasia e Razão Social são obrigatórios.');
      return;
    }

    // ✅ Validação de CNPJ duplicado
    if (formData.cnpj && verificarCnpjDuplicado(formData.cnpj, currentFornecedor?.id)) {
      alert('Fornecedor Já Cadastrado');
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
              inscricao_municipal: '',
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
                  {fornecedor.cnpj && <p className="text-sm text-gray-500">CPF/CNPJ: {fornecedor.cnpj}</p>}
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
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value.toUpperCase() })}
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
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* ✅ Campo CPF/CNPJ com formatação automática */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => {
                      const valor = e.target.value;
                      const formatado = formatarCpfCnpj(valor);
                      setFormData({ ...formData, cnpj: formatado });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ✅ Inscrição Estadual com checkbox "Isento" */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inscrição Estadual</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.inscricao_estadual === 'ISENTO' ? '' : formData.inscricao_estadual}
                        onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                        disabled={formData.inscricao_estadual === 'ISENTO'}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Digite o número ou marque 'Isento'"
                      />
                      <label className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={formData.inscricao_estadual === 'ISENTO'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, inscricao_estadual: 'ISENTO' });
                            } else {
                              setFormData({ ...formData, inscricao_estadual: '' });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Isento</span>
                      </label>
                    </div>
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

                {/* ✅ Novo campo: Inscrição Municipal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inscrição Municipal</label>
                  <input
                    type="text"
                    value={formData.inscricao_municipal}
                    onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
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

                {/* ✅ CEP com busca automática */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, cep: valor });
                        if (valor.length === 8) {
                          buscarCep(valor);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      maxLength={8}
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                    <input
                      type="text"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                  <input
                    type="text"
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value.toUpperCase() })}
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
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value.toUpperCase() })}
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