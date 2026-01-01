// src/pages/ListaFornecedores.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiEdit2, FiTrash, FiFileText, FiArrowLeft } from 'react-icons/fi';
import jsPDF from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';

interface Fornecedor {
  id: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  uf: string;
}

export default function ListaFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const carregarFornecedores = async () => {
    try {
      // ✅ Corrigido: removido espaço extra na URL
      const res = await axios.get<Fornecedor[]>('https://erp-minhas-obras-backend.onrender.com/fornecedores');
      setFornecedores(res.data);
    } catch (err) {
      alert('Erro ao carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    try {
      // ✅ Corrigido: removido espaço extra na URL
      await axios.delete(`https://erp-minhas-obras-backend.onrender.com/fornecedores/${id}`);
      alert('Fornecedor excluído com sucesso!');
      carregarFornecedores();
    } catch (err: any) {
      alert('Erro ao excluir fornecedor: ' + (err.response?.data?.error || err.message));
    }
  };

  // ✅ Função de PDF no frontend (modelo Financeiro.tsx)
  const exportarPDF = () => {
    if (fornecedores.length === 0) {
      alert('Nenhum fornecedor para exportar.');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ERP MINHAS OBRAS', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.text('LISTA DE FORNECEDORES', pageWidth / 2, 25, { align: 'center' });

    // Dados
    const tableData = fornecedores.map(f => [
      `#${f.id}`,
      f.razao_social || '—',
      f.nome_fantasia || '—',
      f.cnpj || '—',
      f.email || '—',
      f.telefone || '—',
      f.cidade && f.uf ? `${f.cidade}/${f.uf}` : '—'
    ]);

    // Larguras das colunas (total ~277mm)
    const colWidths = [20, 45, 45, 35, 40, 30, 32];

    // @ts-ignore
    (doc as any).autoTable({
      startY: 35,
      head: [['ID', 'Razão Social', 'Nome Fantasia', 'CNPJ', 'E-mail', 'Telefone', 'Cidade/UF']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [43, 108, 176], 
        textColor: [255, 255, 255],
        fontSize: 9 
      },
      bodyStyles: { 
        fontSize: 8,
        cellPadding: 1.5
      },
      columnStyles: colWidths.reduce((acc, width, index) => {
        acc[index] = { cellWidth: width };
        return acc;
      }, {} as Record<number, { cellWidth: number }>),
      styles: { 
        overflow: 'linebreak', 
        cellWidth: 'wrap',
        font: 'helvetica'
      }
    });

    // Rodapé
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable?.finalY || 280;
    doc.setFontSize(9);
    doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, finalY + 10, { align: 'center' });

    doc.save('lista-fornecedores.pdf');
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/fornecedores')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FiEdit2 className="mr-2" /> Cadastrar Fornecedor
          </button>
          <button
            onClick={exportarPDF}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            <FiFileText className="mr-2" /> Exportar PDF
          </button>
          <button
            onClick={() => navigate('/suprimentos')}
            className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            <FiArrowLeft className="mr-2" /> Voltar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razão Social</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome Fantasia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cidade/UF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              ) : (
                fornecedores.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">#{f.id}</td>
                    <td className="px-6 py-4 text-sm">{f.razao_social}</td>
                    <td className="px-6 py-4 text-sm">{f.nome_fantasia}</td>
                    <td className="px-6 py-4 text-sm font-mono">{f.cnpj || '—'}</td>
                    <td className="px-6 py-4 text-sm">{f.email || '—'}</td>
                    <td className="px-6 py-4 text-sm">{f.telefone || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      {f.cidade && f.uf ? `${f.cidade}/${f.uf}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/fornecedores/editar/${f.id}`)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Editar"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="text-red-600 hover:text-red-800 p-1"
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
      )}
    </div>
  );
}