// src/pages/Suprimentos.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash, FiFileText } from 'react-icons/fi';

export default function Suprimentos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const navigate = useNavigate();

  const carregarPedidos = async () => {
    try {
      const res = await axios.get('http://localhost:3001/pedidos-compra');
      setPedidos(res.data);
    } catch (err) {
      alert('Erro ao carregar pedidos.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await axios.delete(`http://localhost:3001/pedidos-compra/${id}`);
      alert('Pedido excluído com sucesso!');
      carregarPedidos();
    } catch (err: any) {
      alert('Erro ao excluir pedido: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Suprimentos</h1>
        <div className="flex gap-3">
  <button
    onClick={() => navigate('/suprimentos/novo-pedido')}
    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
  >
    <FiPlus className="mr-2" /> Novo Pedido
  </button>
  <button
    onClick={() => navigate('/fornecedores')}
    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
  >
    <FiPlus className="mr-2" /> Novo Fornecedor
  </button>
  <button
    onClick={() => navigate('/fornecedores/lista')}
    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
  >
    <FiFileText className="mr-2" /> Lista de Fornecedores
  </button>
</div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obra</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : (
              pedidos.map(pedido => (
                <tr key={pedido.id}>
                  <td className="px-6 py-4 font-mono text-sm font-bold text-blue-600">{pedido.codigo || `PC-${String(pedido.id).padStart(4, '0')}`}</td>
                  <td className="px-6 py-4">{pedido.obras?.nome || '—'}</td>
                  <td className="px-6 py-4">{pedido.fornecedores?.nome_fantasia || '—'}</td>
                  <td className="px-6 py-4">{pedido.data_pedido || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      {pedido.status || 'solicitado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/suprimentos/editar/${pedido.id}`)}
                        className="text-gray-600 hover:text-green-600 p-1"
                        title="Editar"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open(`http://localhost:3001/pedidos-compra/${pedido.id}/pdf`, '_blank')}
                        className="text-gray-600 hover:text-blue-600 p-1"
                        title="Exportar PDF"
                      >
                        <FiFileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(pedido.id)}
                        className="text-gray-600 hover:text-red-600 p-1"
                        title="Excluir"
                      >
                      <FiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}