// src/components/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [validToken, setValidToken] = useState(true);

  const token = searchParams.get('token');
  const userId = searchParams.get('id');

  // Verifica se os parâmetros existem
  useEffect(() => {
    if (!token || !userId) {
      setValidToken(false);
      setMessage('Link inválido ou expirado.');
    }
  }, [token, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    if (newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!token || !userId) return;

    setLoading(true);
    try {
      await axios.post('https://erp-minhas-obras-backend.onrender.com/users/reset-password', {
        token,
        userId,
        newPassword
      });
      alert('Senha redefinida com sucesso! Faça login com sua nova senha.');
      navigate('/login');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao redefinir senha.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">Link inválido</h2>
        <p>O link de recuperação é inválido ou expirou.</p>
        <button
          onClick={() => navigate('/forgot-password')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Solicitar novo link
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Redefinir Senha</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nova Senha *
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar Nova Senha *
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition disabled:opacity-50"
        >
          {loading ? 'Redefinindo...' : 'Redefinir Senha'}
        </button>
      </form>
    </div>
  );
}