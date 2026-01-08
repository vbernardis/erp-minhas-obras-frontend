// src/pages/RelatorioPedidosCompra.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiFileText } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Pedido {
  id: number;
  codigo: string;
  data_pedido: string;
  status: string;
  valor_total: number;
  fornecedores: { nome_fantasia: string };
}

interface Obra {
  nome: string;
}

const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function RelatorioPedidosCompra() {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [obraNome, setObraNome] = useState('Carregando...');
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    try {
      const [obraRes, pedidosRes] = await Promise.all([
        axios.get<Obra>(`https://erp-minhas-obras-backend.onrender.com/obras/${obraId}`),
        axios.get<Pedido[]>(`https://erp-minhas-obras-backend.onrender.com/pedidos-compra?obra_id=${obraId}`)
      ]);
      setObraNome(obraRes.data.nome);
      setPedidos(pedidosRes.data);
    } catch (err) {
      alert('Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (obraId) carregarDados();
  }, [obraId]);

  const exportarPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(16);
    doc.text('ERP MINHAS OBRAS', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Relatório de Pedidos de Compra', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Obra: ${obraNome}`, 20, 35);

    const tableData = pedidos.map(p => [
      p.codigo || `PC-${String(p.id).padStart(4, '0')}`,
      p.fornecedores?.nome_fantasia || '—',
      p.data_pedido || '—',
      p.status || 'solicitado',
      formatarMoeda(p.valor_total || 0)
    ]);

    (doc as any).autoTable({
      startY: 45,
      head: [['Código', 'Fornecedor', 'Data', 'Status', 'Valor Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 35, halign: 'right' }
      }
    });

    doc.save(`pedidos-compra-${obraNome.replace(/\s+/g, '-')}.pdf`);
  };

  const exportarExcel = () => {
    const data = [
      ['Código', 'Fornecedor', 'Data', 'Status', 'Valor Total'],
      ...pedidos.map(p => [
        p.codigo || `PC-${String(p.id).padStart(4, '0')}`,
        p.fornecedores?.nome_fantasia || '—',
        p.data_pedido || '—',
        p.status || 'solicitado',
        p.valor_total || 0
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos de Compra');
    XLSX.writeFile(wb, `pedidos-compra-${obraNome.replace(/\s+/g, '-')}.xlsx`);
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pedidos de Compra</h1>
        <div className="flex gap-3">
          <button onClick={exportarPDF} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded">
            <FiFileText className="mr-2" /> PDF
          </button>
          <button onClick={exportarExcel} className="flex items-center px-4 py-2 bg-green-600 text-white rounded">
            <FiFileText className="mr-2" /> Excel
          </button>
          <button onClick={() => navigate('/relatorios')} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded">
            <FiArrowLeft className="mr-2" /> Voltar
          </button>
        </div>
      </div>

      <p className="mb-4"><strong>Obra:</strong> {obraNome}</p>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-500">Nenhum pedido encontrado.</td></tr>
            ) : (
              pedidos.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-mono text-blue-600">{p.codigo || `PC-${String(p.id).padStart(4, '0')}`}</td>
                  <td className="px-4 py-2">{p.fornecedores?.nome_fantasia || '—'}</td>
                  <td className="px-4 py-2 text-center">{p.data_pedido || '—'}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      {p.status || 'solicitado'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{formatarMoeda(p.valor_total || 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}