import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Tipagem para Obra — campos financeiros são obrigatórios APÓS criação
export interface Obra {
  id: number;
  nome: string;
  endereco: string;
  art: string;
  cno: string;
  eng_responsavel: string;
  proprietario: string;
  created_at: string;
  valor_previsto: number;
  valor_realizado: number;
  evolucao_fisica: number;
}

// Tipagem para dados de entrada (sem id e created_at, e campos financeiros opcionais)
export type ObraInput = Omit<Obra, 'id' | 'created_at'> & {
  valor_previsto?: number;
  valor_realizado?: number;
  evolucao_fisica?: number;
};

// Contexto
const ObrasContext = createContext<{
  obras: Obra[];
  adicionarObra: (obra: ObraInput) => void;
  atualizarObra: (obra: Obra) => void;
  deletarObra: (id: number) => void;
}>({
  obras: [],
  adicionarObra: () => {},
  atualizarObra: () => {},
  deletarObra: () => {},
});

// Provider
export function ObrasProvider({ children }: { children: ReactNode }) {
  const [obras, setObras] = useState<Obra[]>(() => {
    const saved = localStorage.getItem('obras');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('obras', JSON.stringify(obras));
  }, [obras]);

  const adicionarObra = (obra: ObraInput) => {
    const novaObra: Obra = {
      ...obra,
      id: Date.now(),
      created_at: new Date().toISOString(),
      valor_previsto: obra.valor_previsto || 0,
      valor_realizado: obra.valor_realizado || 0,
      evolucao_fisica: obra.evolucao_fisica || 0
    };
    setObras(prev => [...prev, novaObra]);
  };

  const atualizarObra = (obraAtualizada: Obra) => {
    setObras(prev => prev.map(obra => obra.id === obraAtualizada.id ? obraAtualizada : obra));
  };

  const deletarObra = (id: number) => {
    setObras(prev => prev.filter(obra => obra.id !== id));
  };

  return (
    <ObrasContext.Provider value={{ obras, adicionarObra, atualizarObra, deletarObra }}>
      {children}
    </ObrasContext.Provider>
  );
}

// Hook para usar o contexto
export function useObras() {
  return useContext(ObrasContext);
}