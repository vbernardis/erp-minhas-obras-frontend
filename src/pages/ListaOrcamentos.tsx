// src/pages/ListaOrcamentos.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { hasPermission } from '../utils/permissions';

type Orcamento = {
  id: number;
  obras: { nome: string };
  data_base: string;
  valor_total: number;
  status: string;
  created_at: string;
};

export default function ListaOrcamentos() {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]); // ✅ Nome original restaurado

  const handleCopiarOrcamento = async (orcamentoId: number) => {
  try {
    // 1. Buscar lista de obras para seleção
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

    // 2. Carregar o orçamento original COMPLETO (usando sua rota que já funciona)
    const resOrcamento = await api.get(`/orcamentos/${orcamentoId}`);
    const orcamentoOriginal = resOrcamento.data;

    // 3. Extrair os itens no formato que sua rota de criação espera
    const itensFormatados = orcamentoOriginal.itens.map((item: any) => ({
      nivel: item.nivel,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valor_unitario_material: item.valor_unitario_material,
      valor_unitario_mao_obra: item.valor_unitario_mao_obra
    }));

    // 4. Enviar para sua rota de CRIAÇÃO existente (que já funciona!)
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
      setOrcamentos(res.data); // ✅ Usa o nome correto
    } catch (err) {
      alert('Erro ao carregar orçamentos.');
    }
  };

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="relative">
      {/* Botão "Voltar" posicionado no canto superior direito, com margem */}
      <button
        onClick={() => navigate('/')} // ou '/dashboard', conforme sua rota
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

                    <a
                      href={`http://localhost:3001/orcamentos/${orc.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 ml-2"
                    >
                      PDF
                    </a>

                    <a
                      href={`http://localhost:3001/orcamentos/${orc.id}/excel`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 ml-2"
                    >
                      Excel
                    </a>

                    {/* ✅ Botão Copiar — posicionado corretamente */}
                    <button
                      onClick={() => handleCopiarOrcamento(orc.id)} // ✅ usa "orc.id", não "orcamento.id"
                      className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 ml-2"
                      title="Copiar para outra obra"
                    >
                      📋 Copiar
                    </button>
                  </>

                  {/* ✅ Botão Excluir — APENAS se tiver permissão */}
                  {hasPermission('orcamentos:write') && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('⚠️ ATENÇÃO!\n\nVocê tem certeza que deseja EXCLUIR este orçamento?\n\nEssa ação é IRREVERSÍVEL e só é permitida se não houver pedidos ou notas vinculados.')) {
                          return;
                        }
                        try {
                          const response = await fetch(`http://localhost:3001/orcamentos/${orc.id}`, {
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