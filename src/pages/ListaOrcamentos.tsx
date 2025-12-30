// src/pages/ListaOrcamentos.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { hasPermission } from '../utils/permissions';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type Orcamento = {
  id: number;
  obras: { nome: string };
  data_base: string;
  valor_total: number;
  status: string;
  created_at: string;
};

// Função para formatar moeda
const formatarMoeda = (valor: number): string => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function ListaOrcamentos() {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);

  // ✅ Função para exportar PDF de um orçamento salvo
 const exportarPDFOrcamento = async (orcamentoId: number, nomeObra: string) => {
  try {
    const res = await axios.get(`https://erp-minhas-obras-backend.onrender.com/orcamentos/${orcamentoId}`);
    const orcamento = res.data;
    const { itens, taxa_administracao, valor_total } = orcamento;
    const subtotal = valor_total / (1 + (taxa_administracao / 100));

    // Gerar códigos hierárquicos
    const codigos: Record<number, string> = {};
    let contadorLocal = 0;
    const contadorEtapa: Record<number, number> = {};
    const contadorSubetapa: Record<string, Record<string, number>> = {};

    itens.forEach((item: any, idx: number) => {
      if (item.nivel === 'local') {
        contadorLocal++;
        codigos[idx] = String(contadorLocal).padStart(2, '0');
        contadorEtapa[contadorLocal] = 0;
        contadorSubetapa[contadorLocal] = {};
      } else if (item.nivel === 'etapa') {
        contadorEtapa[contadorLocal]++;
        const etapaSeq = contadorEtapa[contadorLocal];
        codigos[idx] = `${String(contadorLocal).padStart(2, '0')}.${String(etapaSeq).padStart(2, '0')}`;
        contadorSubetapa[contadorLocal][etapaSeq] = 0;
      } else if (item.nivel === 'subetapa') {
        const localId = contadorLocal;
        const etapaId = contadorEtapa[localId] || 1;
        if (!contadorSubetapa[localId]) contadorSubetapa[localId] = {};
        if (contadorSubetapa[localId][etapaId] === undefined) {
          contadorSubetapa[localId][etapaId] = 0;
        }
        contadorSubetapa[localId][etapaId]++;
        const subSeq = contadorSubetapa[localId][etapaId];
        codigos[idx] = `${String(localId).padStart(2, '0')}.${String(etapaId).padStart(2, '0')}.${String(subSeq).padStart(2, '0')}`;
      } else if (item.nivel === 'servico') {
        let parentIdx = -1;
        for (let i = idx - 1; i >= 0; i--) {
          if (itens[i].nivel === 'subetapa' || itens[i].nivel === 'etapa') {
            parentIdx = i;
            break;
          }
        }
        const parentCodigo = parentIdx >= 0 ? codigos[parentIdx] : '00.00.00';
        const servicosAnt = itens
          .slice(0, idx)
          .filter((i: any, iIdx: number) => i.nivel === 'servico' && codigos[iIdx]?.startsWith(parentCodigo)).length;
        codigos[idx] = `${parentCodigo}.${String(servicosAnt + 1).padStart(2, '0')}`;
      }
    });

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const margin = 10; // 5mm esquerda + 5mm direita
    const contentWidth = 297 - margin; // A4 landscape = 297mm

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Orçamento - ${nomeObra}`, 297 / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 297 / 2, 22, { align: 'center' });

    const headers = [
      'Cód.', 'Descrição', 'Und', 'Qtd', 'R$ Unit. Mat.',
      'R$ Unit. Mão Obra', 'R$ Total Mat.', 'R$ Total Mão Obra', 'R$ Total'
    ];

    const tableData = itens.map((item: any, idx: number) => {
      const isServico = item.nivel === 'servico';
      const qtd = item.quantidade != null ? item.quantidade : 0;
      const matUnit = item.valor_unitario_material != null ? item.valor_unitario_material : 0;
      const maoUnit = item.valor_unitario_mao_obra != null ? item.valor_unitario_mao_obra : 0;
      const totalMat = qtd * matUnit;
      const totalMao = qtd * maoUnit;
      const total = totalMat + totalMao;

      return [
        codigos[idx] || '',
        item.descricao || '',
        isServico ? (item.unidade || '—') : '',
        isServico ? (item.quantidade != null ? item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—') : '',
        isServico ? formatarMoeda(matUnit) : '',
        isServico ? formatarMoeda(maoUnit) : '',
        isServico ? formatarMoeda(totalMat) : '',
        isServico ? formatarMoeda(totalMao) : '',
        isServico ? formatarMoeda(total) : ''
      ];
    });

    const getRowStyle = (rowIndex: number) => {
      const item = itens[rowIndex];
      if (!item || item.nivel === 'servico') return {};
      return { fontStyle: 'bold' };
    };

    // ✅ Larguras que cabem em 287mm
    const colWidths = [16, 70, 18, 20, 26, 30, 26, 26, 26]; // total = 278mm
    const columnStyles: Record<number, any> = {};
    colWidths.forEach((w, i) => {
      columnStyles[i] = { 
        cellWidth: w, 
        halign: i === 0 ? 'center' : (i >= 1 && i <= 2 ? 'left' : 'right') 
      };
    });

    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      columnStyles,
      tableWidth: contentWidth,
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body') {
          const style = getRowStyle(hookData.row.index);
          if (style.fontStyle) {
            hookData.cell.styles.fontStyle = style.fontStyle;
          }
        }
      }
    });

    // ✅ POSICIONAR TOTAIS LOGO ABAIXO DA TABELA
    const tableInstance = (doc as any).lastAutoTable;
    const finalY = tableInstance?.finalY ? tableInstance.finalY + 8 : 280; // 8mm de espaço

    // ✅ ALINHAR À DIREITA DA ÚLTIMA COLUNA
    const totalX = 5 + colWidths.reduce((sum, w) => sum + w, 0); // 5mm margem esquerda + soma colunas

    doc.setFontSize(10);
    doc.text(`Subtotal: ${formatarMoeda(subtotal)}`, totalX, finalY, { align: 'right' });
    const bdi = subtotal * (taxa_administracao / 100);
    doc.text(`BDI (${taxa_administracao}%): ${formatarMoeda(bdi)}`, totalX, finalY + 6, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${formatarMoeda(valor_total)}`, totalX, finalY + 12, { align: 'right' });

    doc.save(`orcamento-${nomeObra.replace(/\s+/g, '-')}.pdf`);
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    alert('Erro ao gerar PDF. Verifique o console.');
  }
};

  const handleCopiarOrcamento = async (orcamentoId: number) => {
    try {
      const resObras = await api.get('/obras');
      const obras = resObras.data;

      const selecionada = prompt(
        'Digite o ID da obra de destino:\n' + 
        obras.map((o: any) => `${o.id} - ${o.nome}`).join('\n')
      );

      if (!selecionada || !obras.some((o: any) => o.id === Number(selecionada))) {
        alert('Obra inválida.');
        return;
      }

      const obraIdDestino = Number(selecionada);
      const resOrcamento = await api.get(`/orcamentos/${orcamentoId}`);
      const orcamentoOriginal = resOrcamento.data;

      const itensFormatados = orcamentoOriginal.itens.map((item: any) => ({
        nivel: item.nivel,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor_unitario_material: item.valor_unitario_material,
        valor_unitario_mao_obra: item.valor_unitario_mao_obra
      }));

      const resposta = await api.post('/orcamentos', {
        obra_id: obraIdDestino,
        data_base: orcamentoOriginal.data_base,
        taxa_administracao: orcamentoOriginal.taxa_administracao,
        status: 'Em desenvolvimento',
        itens: itensFormatados
      });

      alert('Orçamento copiado com sucesso!');
      navigate(`/orcamentos/editar/${resposta.data.id}`);
    } catch (err) {
      console.error('Erro ao copiar orçamento:', err);
      alert('Erro ao copiar orçamento. Verifique se o orçamento original está acessível.');
    }
  };

  useEffect(() => {
    if (!hasPermission('orcamentos:read')) {
      navigate('/dashboard');
      return;
    }
    carregarOrcamentos();
  }, [navigate]);

  const carregarOrcamentos = async () => {
    try {
      const res = await api.get('/orcamentos');
      setOrcamentos(res.data);
    } catch (err) {
      alert('Erro ao carregar orçamentos.');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 right-4 px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 shadow"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orçamentos Salvos</h1>
      <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Obra</th>
              <th className="p-2 text-left">Data Base</th>
              <th className="p-2 text-right">Valor Total</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orcamentos.map(orc => (
              <tr key={orc.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{orc.obras?.nome || '—'}</td>
                <td className="p-2">{new Date(orc.data_base).toLocaleDateString('pt-BR')}</td>
                <td className="p-2 text-right font-medium">{formatarMoeda(orc.valor_total)}</td>
                <td className="p-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    orc.status === 'Em uso' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {orc.status === 'Em desenvolvimento' ? 'Em desenvolvimento' : 'Em uso'}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <>
                    {orc.status !== 'Aprovado' && hasPermission('orcamentos:write') ? (
                      <button
                        onClick={() => navigate(`/orcamentos/editar/${orc.id}`)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Visualizar / Editar
                      </button>
                    ) : (
                      <span className="text-gray-500 text-xs">Aprovado</span>
                    )}

                    {/* ✅ BOTÃO DE PDF ATUALIZADO */}
                    <button
                      onClick={() => exportarPDFOrcamento(orc.id, orc.obras?.nome || 'Obra')}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 ml-2"
                    >
                      PDF
                    </button>

                    {/* Excel ainda opera via backend */}
                    <a
                      href={`https://erp-minhas-obras-backend.onrender.com/orcamentos/${orc.id}/excel`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 ml-2"
                    >
                      Excel
                    </a>

                    <button
                      onClick={() => handleCopiarOrcamento(orc.id)}
                      className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 ml-2"
                      title="Copiar para outra obra"
                    >
                      📋 Copiar
                    </button>
                  </>

                  {hasPermission('orcamentos:write') && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('⚠️ ATENÇÃO!\n\nVocê tem certeza que deseja EXCLUIR este orçamento?\n\nEssa ação é IRREVERSÍVEL e só é permitida se não houver pedidos ou notas vinculados.')) {
                          return;
                        }
                        try {
                          const response = await fetch(`https://erp-minhas-obras-backend.onrender.com/orcamentos/${orc.id}`, {
                            method: 'DELETE',
                          });
                          if (response.ok) {
                            alert('Orçamento excluído com sucesso!');
                            carregarOrcamentos();
                          } else {
                            const data = await response.json();
                            alert('❌ ' + (data.error || 'Não foi possível excluir o orçamento.'));
                          }
                        } catch (err) {
                          alert('Erro ao tentar excluir o orçamento.');
                        }
                      }}
                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 ml-2"
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr> 
            ))}
          </tbody>
        </table>
        {orcamentos.length === 0 && (
          <p className="text-gray-500 text-center py-4">Nenhum orçamento encontrado.</p>
        )}
      </div>
    </div>
  );
}