// src/pages/RelatorioContasPagas.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function RelatorioContasPagas() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notas, setNotas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [obraNome, setObraNome] = useState('');

  useEffect(() => {
    const carregarNotas = async () => {
      try {
        const [obraRes, notasRes] = await Promise.all([
          axios.get(`https://erp-minhas-obras-backend.onrender.com/obras/${id}`),
          axios.get(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais?obra_id=${id}`)
        ]);
        setObraNome(obraRes.data.nome);
        setNotas(notasRes.data.filter((n: any) => n.status === 'pago'));
      } catch (erro) {
        console.error(erro);
        alert('Erro ao carregar notas fiscais.');
      } finally {
        setCarregando(false);
      }
    };
    if (id) carregarNotas();
  }, [id]);

  const exportarPDF = () => {
    if (id) {
      window.open(`https://erp-minhas-obras-backend.onrender.com/notas-fiscais/pdf/lista?obra_id=${id}`, '_blank');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contas Pagas — {obraNome}</h1>
        <button
          onClick={exportarPDF}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Exportar PDF
        </button>
      </div>

      {carregando ? (
        <div>Carregando...</div>
      ) : (
        <div className="bg-white p-4 rounded shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th>NF</th>
                <th>Fornecedor</th>
                <th>Data Emissão</th>
                <th>Valor Total</th>
                <th>Valor Pago</th>
                <th>Juros</th>
                <th>Desconto</th>
                <th>Data Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {notas.map(nota => (
                <tr key={nota.id}>
                  <td>{nota.numero_nota}</td>
                  <td>{nota.fornecedores?.nome_fantasia || '—'}</td>
                  <td>{nota.data_emissao}</td>
                  <td className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valor_total)}</td>
                  <td className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valor_pago || 0)}</td>
                  <td className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.juros || 0)}</td>
                  <td className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.desconto || 0)}%</td>
                  <td>{nota.data_pagamento || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}