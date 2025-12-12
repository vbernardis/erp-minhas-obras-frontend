// src/pages/ListaNotasFiscais.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiFileText, FiPlus, FiArrowLeft } from 'react-icons/fi';

export default function ListaNotasFiscais() {
  const [notas, setNotas] = useState<any[]>([]);
  const navigate = useNavigate();

  const carregarNotas = async () => {
    try {
      const res = await axios.get('http://localhost:3001/notas-fiscais');
      setNotas(res.data);
    } catch (err) {
      alert('Erro ao carregar notas fiscais.');
    }
  };

  useEffect(() => {
    carregarNotas();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notas Fiscais</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/financeiro/nova-nota')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="mr-2" /> Nova Nota Fiscal
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            <FiArrowLeft className="mr-2" /> Voltar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NF</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obra</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emissão</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {notas.map(nota => (
              <tr key={nota.id}>
                <td className="px-6 py-4">{nota.numero_nota}</td>
                <td className="px-6 py-4">{nota.obras?.nome || '—'}</td>
                <td className="px-6 py-4">{nota.fornecedores?.nome_fantasia || '—'}</td>
                <td className="px-6 py-4">{nota.data_emissao}</td>
                <td className="px-6 py-4">R$ {nota.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    nota.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                    nota.status === 'pago' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {nota.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}