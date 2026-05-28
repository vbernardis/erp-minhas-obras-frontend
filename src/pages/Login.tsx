import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiLogIn } from 'react-icons/fi';
import api from '../api/config'; // ✅ Importa a instância configurada com interceptors

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('E-mail e senha são obrigatórios.');
      setLoading(false);
      return;
    }

    try {
      // ✅ Usa a instância 'api' com interceptors configurados
      const response = await api.post('/login', {
        email,
        password
      });

      // ✅ EXTRAÇÃO SEGURA DOS DADOS DO USUÁRIO
      const userData = response.data.user;
      
      // ✅ Garante que permissions e authorizedObras sejam arrays válidos
      const permissions = Array.isArray(userData.permissions) 
        ? userData.permissions 
        : [];
      
      const authorizedObras = Array.isArray(userData.authorizedObras) 
        ? userData.authorizedObras 
        : [];

      // ✅ Salva TODOS os dados do usuário no localStorage
      localStorage.setItem('user', JSON.stringify({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        permissions: permissions,              // ✅ Permissões (array de strings)
        authorizedObras: authorizedObras,       // ✅ Obras autorizadas (array de strings)
        created_at: userData.created_at
      }));
      
      localStorage.setItem('isLoggedIn', 'true');

      // ✅ Dispara evento para atualizar UI em outras partes do app
      window.dispatchEvent(new Event('userPermissionsUpdated'));

      alert('✅ Login realizado com sucesso!');
      
      // Redireciona para dashboard
      navigate('/dashboard');
      
    } catch (err: any) {
      // ✅ Tratamento seguro de erro
      const mensagem = err.response?.data?.error || 'E-mail ou senha inválidos.';
      setError(mensagem);
      console.error('Erro no login:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto mb-6 border border-white/30">
            <FiLogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ERP Minhas Obras</h1>
          <p className="text-blue-100">Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2 ml-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm transition"
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2 ml-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm transition"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-blue-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Entrando...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <FiLogIn className="mr-2 w-5 h-5" />
                Entrar na Conta
              </div>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/forgot-password" className="text-sm font-medium text-blue-200 hover:text-white hover:underline transition">
            Esqueci minha senha
          </Link>
        </div>
      </div>
    </div>
  );
}