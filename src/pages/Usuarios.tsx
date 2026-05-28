import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';
import { FiRefreshCw, FiEdit2, FiTrash, FiSearch, FiPlus } from 'react-icons/fi';
import api from '../api/config'; // ✅ Importa a instância configurada com interceptors

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  created_at: string;
}

interface Obra {
  id: number;
  nome: string;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    password: ''
  });
  const [permissions, setPermissions] = useState<string[]>([]);
  const navigate = useNavigate();

  const [obras, setObras] = useState<Obra[]>([]);
  const [obrasAutorizadas, setObrasAutorizadas] = useState<string[]>([]);

  // ✅ Função para carregar obras - USANDO api EM VEZ DE axios + API_BASE
  const carregarObras = async () => {
    try {
      const resposta = await api.get<Obra[]>('/obras'); // ← URL relativa
      setObras(resposta.data);
    } catch (erro: any) {
      console.error('Erro ao carregar obras:', erro);
    }
  };

  // ✅ Função para carregar usuários - USANDO api EM VEZ DE axios + API_BASE
  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const resposta = await api.get<Usuario[]>('/users'); // ← URL relativa
      setUsuarios(resposta.data);
    } catch (erro: any) {
      const msg = erro.response?.data?.error || erro.message || 'Erro desconhecido';
      alert('Erro ao carregar usuários: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setCurrentUsuario(null);
    setFormData({ name: '', email: '', role: 'user', password: '' });
    setPermissions([]);
    setObrasAutorizadas([]);
    carregarObras();
    setShowModal(true);
  };

  // ✅ Função handleEdit - USANDO api EM VEZ DE axios + API_BASE
  const handleEdit = async (usuario: Usuario) => {
    try {
      const resposta = await api.get(`/users/${usuario.id}`); // ← URL relativa
      const dados = resposta.data;

      setCurrentUsuario(dados);
      setFormData({
        name: dados.name || '',
        email: dados.email || '',
        role: dados.role || 'user',
        password: ''
      });

      const permRes = await api.get(`/users/${usuario.id}/permissoes`); // ← URL relativa
      const permIds = permRes.data.map((p: any) => p.tela);
      setPermissions(permIds);

      const obraRes = await api.get(`/users/${usuario.id}/obras`); // ← URL relativa
      const obraIds = obraRes.data.map((o: any) => o.obra_id.toString());
      setObrasAutorizadas(obraIds);

      carregarObras();
      setShowModal(true);
    } catch (erro) {
      console.error('Erro ao carregar usuário:', erro);
      alert('Erro ao carregar dados do usuário');
    }
  };

  // ✅ Função handleDelete - USANDO api EM VEZ DE axios + API_BASE
  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;
    try {
      await api.delete(`/users/${id}`); // ← URL relativa
      alert('Usuário deletado com sucesso!');
      carregarUsuarios();
    } catch (erro: any) {
      const msg = erro.response?.data?.error || erro.message || 'Erro desconhecido';
      alert('Erro ao deletar usuário: ' + msg);
    }
  };

  // ✅ Função handleSubmit - USANDO api EM VEZ DE axios + API_BASE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentUsuario) {
        // Atualizar usuário existente
        await api.put(`/users/${currentUsuario.id}`, { // ← URL relativa
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password || undefined
        });

        // Enviar permissões na rota dedicada
        await api.post(`/users/${currentUsuario.id}/permissoes`, { // ← URL relativa
          permissoes: permissions
        });

        // Enviar obras autorizadas
        const obrasIds = obrasAutorizadas.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        await api.post(`/users/${currentUsuario.id}/obras`, { obras: obrasIds }); // ← URL relativa

        alert('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        const resposta = await api.post('/users', { // ← URL relativa
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });
        const novoUsuarioId = resposta.data.id;

        // Enviar permissões para novo usuário
        await api.post(`/users/${novoUsuarioId}/permissoes`, { // ← URL relativa
          permissoes: permissions
        });

        // Enviar obras autorizadas
        const obrasIds = obrasAutorizadas.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        await api.post(`/users/${novoUsuarioId}/obras`, { obras: obrasIds }); // ← URL relativa

        alert('Usuário criado com sucesso!');
      }

      setShowModal(false);
      carregarUsuarios();
    } catch (erro: any) {
      console.error('Erro ao salvar usuário:', erro);
      const msg = erro.response?.data?.error || erro.message || 'Erro desconhecido';
      alert('Erro ao salvar usuário: ' + msg);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Verificação de permissão
  useEffect(() => {
    const verificarAcesso = () => {
      try {
        if (!hasPermission('usuarios:gerenciar')) {
          alert('Você não tem permissão para acessar esta página.');
          navigate('/dashboard');
          return;
        }
        carregarUsuarios();
      } catch (e) {
        console.error('Erro ao verificar permissão:', e);
        navigate('/dashboard');
      }
    };

    verificarAcesso();
  }, [navigate]);

  // Efeito para busca com debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      carregarUsuarios();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const usuariosFiltrados = usuarios.filter(usuario =>
    usuario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ LISTA COMPLETA DE PERMISSÕES DO SISTEMA
  const listaPermissoes = [
    // Obras
    { id: 'obras:listar', label: 'Visualizar Obras' },
    { id: 'obras:criar', label: 'Criar/Editar Obras' },
    { id: 'obras:excluir', label: 'Excluir Obras' },
    
    // Orçamentos
    { id: 'orcamentos:listar', label: 'Visualizar Orçamentos' },
    { id: 'orcamentos:criar', label: 'Criar/Editar Orçamentos' },
    { id: 'orcamentos:copiar', label: 'Copiar Orçamentos' },
    
    // Diário de Obra
    { id: 'diario:listar', label: 'Visualizar Diário de Obra' },
    { id: 'diario:criar', label: 'Criar/Editar Diário de Obra' },
    { id: 'diario:exportar', label: 'Exportar Diário (PDF)' },
    
    // Financeiro / Notas Fiscais
    { id: 'financeiro:notas:listar', label: 'Visualizar Notas Fiscais' },
    { id: 'financeiro:notas:lancar', label: 'Lançar Notas Fiscais' },
    { id: 'financeiro:notas:baixar', label: 'Registrar Pagamento' },
    { id: 'financeiro:notas:editar', label: 'Editar Notas Fiscais' },
    { id: 'financeiro:notas:excluir', label: 'Excluir Notas Fiscais' },
    { id: 'financeiro:exportar', label: 'Exportar Financeiro (Excel/PDF)' },
    
    // Suprimentos
    { id: 'suprimentos:fornecedores', label: 'Gerenciar Fornecedores' },
    { id: 'suprimentos:pedidos', label: 'Gerenciar Pedidos de Compra' },
    
    // Relatórios
    { id: 'relatorios:acessar', label: 'Acessar Relatórios' },
    { id: 'relatorios:mapa-chuvas', label: 'Gerar Mapa de Chuvas' },
    
    // Usuários
    { id: 'usuarios:gerenciar', label: 'Gerenciar Usuários' }
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleCreate} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            <FiPlus className="mr-2" /> Novo Usuário
          </button>
          <button onClick={carregarUsuarios} disabled={loading} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Filtro de Busca */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Lista de Usuários */}
      {usuariosFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 text-lg mb-4">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {usuariosFiltrados.map((usuario) => (
            <div key={usuario.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{usuario.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(usuario)} className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition" title="Editar Permissões">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  {usuario.role !== 'master' && (
                    <button onClick={() => handleDelete(usuario.id)} className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition" title="Deletar">
                      <FiTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">📧 {usuario.email}</p>
              <p className="text-sm mb-3"><span className="font-medium">Cargo:</span> {usuario.role}</p>
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Permissões:</p>
                <div className="flex flex-wrap gap-1">
                  {usuario.permissions.map((perm) => (
                    <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{perm}</span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">Criado em: {new Date(usuario.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{currentUsuario ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                      <option value="user">Usuário</option>
                      <option value="admin">Administrador</option>
                      <option value="engenheiro">Engenheiro</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="gestor">Gestor</option>
                      <option value="master">Master</option>
                    </select>
                  </div>
                  {!currentUsuario && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Senha Inicial *</label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={6} />
                    </div>
                  )}
                </div>

                {/* ✅ Permissões por tela - LISTA COMPLETA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🔐 Permissões por Tela</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                    {listaPermissoes.map(perm => (
                      <label key={perm.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={permissions.includes(perm.id)} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPermissions(prev => [...prev, perm.id]);
                            } else {
                              setPermissions(prev => prev.filter(p => p !== perm.id));
                            }
                          }} 
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                        />
                        <span className="text-sm text-gray-700">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Obras autorizadas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🏗️ Obras Autorizadas</label>
                  <select 
                    multiple 
                    value={obrasAutorizadas} 
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setObrasAutorizadas(selected);
                    }} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                  >
                    {obras.map(obra => (
                      <option key={obra.id} value={obra.id.toString()}>{obra.nome}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Segure Ctrl (ou Cmd no Mac) para selecionar múltiplas obras</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                    {currentUsuario ? 'Atualizar Usuário' : 'Criar Usuário'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition">
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