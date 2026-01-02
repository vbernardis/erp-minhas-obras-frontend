// src/pages/Suprimentos.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash, FiFileText } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { LOGO_BASE64 } from '../utils/pdfUtils';

export default function Suprimentos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const navigate = useNavigate();

  const carregarPedidos = async () => {
    try {
      const res = await axios.get('https://erp-minhas-obras-backend.onrender.com/pedidos-compra');
      setPedidos(res.data);
    } catch (err) {
      alert('Erro ao carregar pedidos.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await axios.delete(`https://erp-minhas-obras-backend.onrender.com/pedidos-compra/${id}`);
      alert('Pedido excluído com sucesso!');
      carregarPedidos();
    } catch (err: any) {
      alert('Erro ao excluir pedido: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  // ✅ Função corrigida: busca OBRA e FORNECEDOR completos
  const exportarPDFPedido = async (pedido: any) => {
    try {
      // ✅ Carregar OBRA completa
      const obraRes = await axios.get(`https://erp-minhas-obras-backend.onrender.com/obras/${pedido.obra_id}`);
      const obra = obraRes.data || { nome: '—', proprietario: '—', endereco: '—' };

      // ✅ Carregar FORNECEDOR completo
      const fornecedorRes = await axios.get(`https://erp-minhas-obras-backend.onrender.com/fornecedores/${pedido.fornecedor_id}`);
      const fornecedor = fornecedorRes.data || { razao_social: '—', nome_fantasia: '—', cnpj: '—' };

      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      const codigo = pedido.codigo || `PC-${String(pedido.id).padStart(4, '0')}`;
      const frete = parseFloat(pedido.frete) || 0;
      const valorTotalItens = itens.reduce((sum: number, item: any) => sum + (parseFloat(item.valor_total) || 0), 0);
      const valorTotalPedido = valorTotalItens + frete;

      const doc = new jsPDF('p', 'mm', 'a4');
      

      // Cabeçalho com logo
if (LOGO_BASE64 && LOGO_BASE64.startsWith('data:image')) {
  try {
    doc.addImage(LOGO_BASE64, 'PNG', 15, 10, 40, 15);
  } catch (e) {
    console.warn('Falha ao carregar logo:', e);
  }
}
doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.text('ERP MINHAS OBRAS', 105, 18, { align: 'center' });
doc.setFontSize(12);
doc.text('Pedido de Compra', 105, 24, { align: 'center' });
let y = 32; // ajuste a posição inicial dos dados

      // Código
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.text(`Código: ${codigo}`, 180, y, { align: 'right' });

      // Dados da Obra
      y += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DA OBRA', 20, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Obra: ${obra.nome}`, 20, y);
      y += 5;
      doc.text(`Cliente: ${obra.proprietario}`, 20, y);
      y += 5;
      doc.text(`Endereço: ${obra.endereco}`, 20, y);

      // Fornecedor
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('FORNECEDOR', 20, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Razão Social: ${fornecedor.razao_social}`, 20, y);
      y += 5;
      doc.text(`Nome Fantasia: ${fornecedor.nome_fantasia}`, 20, y);
      y += 5;
      doc.text(`CNPJ: ${fornecedor.cnpj}`, 20, y);

      // Itens
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('ITENS', 20, y);
      y += 6;

      const tableData = itens.map((item: any, i: number) => [
        i + 1,
        item.descricao || '—',
        item.quantidade || '—',
        item.unidade || '—',
        item.valor_unitario ? `R$ ${parseFloat(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
        item.impostos ? `R$ ${parseFloat(item.impostos).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
        item.valor_total ? `R$ ${parseFloat(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
      ]);

      (doc as any).autoTable({
        startY: y,
        head: [['Item', 'Descrição', 'Qtd', 'Unid.', 'Vlr Unit.', 'Impostos', 'Total']],
        body: tableData.length > 0 ? tableData : [['', '', '', '', '', '', 'Nenhum item cadastrado']],
        theme: 'grid',
        headStyles: { 
          fillColor: [241, 245, 249], 
          textColor: [0, 0, 0], 
          fontSize: 9, 
          valign: 'middle',
          fontStyle: 'bold'
        },
        bodyStyles: { 
          fontSize: 8, 
          cellPadding: 1.5 
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' }
        },
        styles: { 
          font: 'helvetica', 
          overflow: 'linebreak',
          cellWidth: 'wrap'
        }
      });

      // Totais
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont('helvetica', 'normal');
      doc.text(`Frete: R$ ${frete.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY);
      doc.setFont('helvetica', 'bold');
      doc.text(`Valor Total do Pedido: R$ ${valorTotalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 7);

      doc.save(`pedido-compra-${codigo}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao gerar PDF. Verifique o console.');
    }
  };

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
                        onClick={() => exportarPDFPedido(pedido)}
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