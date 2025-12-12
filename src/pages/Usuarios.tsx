import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { hasPermission } from '../utils/permissions';
import { FiRefreshCw, FiEdit2, FiTrash, FiSearch, FiPlus } from 'react-icons/fi';

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  created_at: string;
}

// Interface para Obra
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

  // Novos states para o novo sistema de permissões
  const [obras, setObras] = useState<Obra[]>([]);
  const [obrasAutorizadas, setObrasAutorizadas] = useState<string[]>([]);

  // Função para carregar a lista de obras
  const carregarObras = async () => {
    try {
      const resposta = await axios.get<Obra[]>('http://localhost:3001/obras');
      setObras(resposta.data);
    } catch (erro) {
      console.error('Erro ao carregar obras:', erro);
    }
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const resposta = await axios.get<Usuario[]>('http://localhost:3001/users');
      setUsuarios(resposta.data);
    } catch (erro) {
      alert('Erro ao carregar usuários: ' + erro);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setCurrentUsuario(null);
    setFormData({
      name: '',
      email: '',
      role: 'user',
      password: ''
    });
    setPermissions([]);
    setObrasAutorizadas([]);
    carregarObras();
    setShowModal(true);
  };

  const handleEdit = async (usuario: Usuario) => {
    try {
      const resposta = await axios.get(`http://localhost:3001/users/${usuario.id}`);
      const dados = resposta.data;

      setCurrentUsuario(dados);
      setFormData({
        name: dados.name || '',
        email: dados.email || '',
        role: dados.role || 'user',
        password: ''
      });

      // Carregar permissões
      const permRes = await axios.get(`http://localhost:3001/users/${usuario.id}/permissoes`);
      const permIds = permRes.data.map((p: any) => p.tela);
      setPermissions(permIds);

      // Carregar obras autorizadas → CONVERTER PARA STRING
      const obraRes = await axios.get(`http://localhost:3001/users/${usuario.id}/obras`);
      const obraIds = obraRes.data.map((o: any) => o.obra_id.toString());
      setObrasAutorizadas(obraIds);

      carregarObras();
      setShowModal(true);
    } catch (erro) {
      console.error('Erro ao carregar usuário:', erro);
      alert('Erro ao carregar dados do usuário');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      await axios.delete(`http://localhost:3001/users/${id}`);
      alert('Usuário deletado com sucesso!');
      carregarUsuarios();
    } catch (erro) {
      alert('Erro ao deletar usuário: ' + erro);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentUsuario) {
        await axios.put(`http://localhost:3001/users/${currentUsuario.id}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role
        });

        await axios.post(`http://localhost:3001/users/${currentUsuario.id}/permissoes`, {
          permissoes: permissions
        });

        const obrasIds = obrasAutorizadas.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        await axios.post(`http://localhost:3001/users/${currentUsuario.id}/obras`, {
          obras: obrasIds
        });

        alert('Usuário atualizado com sucesso!');
      } else {
        const resposta = await axios.post('http://localhost:3001/users', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });
        const novoUsuarioId = resposta.data.id;

        if (permissions.length > 0) {
          await axios.post(`http://localhost:3001/users/${novoUsuarioId}/permissoes`, {
            permissoes: permissions
          });
        }

        const obrasIds = obrasAutorizadas.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (obrasIds.length > 0) {
          await axios.post(`http://localhost:3001/users/${novoUsuarioId}/obras`, {
            obras: obrasIds
          });
        }

        alert('Usuário criado com sucesso!');
      }

      setShowModal(false);
      carregarUsuarios();
    } catch (erro) {
      console.error('Erro ao salvar usuário:', erro);
      alert('Erro ao salvar usuário: ' + (erro instanceof Error ? erro.message : 'Erro desconhecido'));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  useEffect(() => {
    if (!hasPermission('usuarios:write')) {
      alert('Você não tem permissão para acessar esta página.');
      navigate('/dashboard');
    }
    carregarUsuarios();
  }, [navigate]);

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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <FiPlus className="mr-2" /> Novo Usuário
          </button>
          <button
            onClick={carregarUsuarios}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Filtro de Busca */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
                  <button
                    onClick={() => handleEdit(usuario)}
                    className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition"
                    title="Editar Permissões"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  {usuario.role !== 'master' && (
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition"
                      title="Deletar"
                    >
                      <FiTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">📧 {usuario.email}</p>
              <p className="text-sm mb-3">
                <span className="font-medium">Cargo:</span> {usuario.role}
              </p>
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Permissões:</p>
                <div className="flex flex-wrap gap-1">
                  {usuario.permissions.map((perm) => (
                    <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Criado em: {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {currentUsuario ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campos de identificação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
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
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        minLength={6}
                      />
                    </div>
                  )}
                </div>

                {/* Novo campo: Permissões por tela */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    🔐 Permissões por Tela (selecione as telas que o usuário pode acessar)
  </label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
    {[
      // Obras
      { id: 'obras.listar', label: 'Visualizar Obras' },
      { id: 'obras.editar', label: 'Criar/Editar Obras' },
      
      // Orçamentos
      { id: 'orcamentos.listar', label: 'Visualizar Orçamentos' },
      { id: 'orcamentos.editar', label: 'Criar/Editar Orçamentos' },
      { id: 'orcamentos.copiar', label: 'Copiar Orçamentos' },
      
      // Diário de Obra
      { id: 'diario.listar', label: 'Visualizar Diário de Obra' },
      { id: 'diario.editar', label: 'Criar/Editar Diário de Obra' },
      { id: 'diario.exportar', label: 'Exportar Diário (PDF)' },
      
      // Financeiro - Notas Fiscais
      { id: 'financeiro.notas.lancar', label: 'Lançar Notas Fiscais' },
      { id: 'financeiro.notas.baixar', label: 'Registrar Pagamento' },
      { id: 'financeiro.notas.editar', label: 'Editar Notas Fiscais' },
      { id: 'financeiro.notas.excluir', label: 'Excluir Notas Fiscais' },
      
      // Financeiro - Contas
      { id: 'financeiro.contas-pagar', label: 'Visualizar Contas a Pagar' },
      { id: 'financeiro.contas-pagas', label: 'Visualizar Contas Pagas' },
      { id: 'financeiro.exportar-excel', label: 'Exportar Financeiro (Excel)' },
      { id: 'financeiro.exportar-pdf', label: 'Exportar Financeiro (PDF)' },
      
      // Suprimentos
      { id: 'suprimentos.fornecedores', label: 'Gerenciar Fornecedores' },
      { id: 'suprimentos.pedidos', label: 'Gerenciar Pedidos de Compra' },
      
      // Relatórios
      { id: 'relatorios.acessar', label: 'Acessar Relatórios' },
      { id: 'relatorios.mapa-chuvas', label: 'Gerar Mapa de Chuvas' },
      
      // Usuários (só para admins)
      { id: 'usuarios.gerenciar', label: 'Gerenciar Usuários' }
    ].map(perm => (
      <label key={perm.id} className="flex items-center">
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
          className="mr-2"
        />
        {perm.label}
      </label>
    ))}
  </div>
</div>

                {/* Novo campo: Obras autorizadas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🏗️ Obras Autorizadas (selecione as obras que o usuário pode acessar)
                  </label>
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
                      <option key={obra.id} value={obra.id.toString()}>
                        {obra.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    {currentUsuario ? 'Atualizar Usuário' : 'Criar Usuário'}
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