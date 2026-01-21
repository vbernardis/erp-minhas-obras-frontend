// src/utils/permissions.ts

export const hasPermission = (permission: string): boolean => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return false;

  try {
    const userData = JSON.parse(userStr);
    const role = userData.role || 'user';

    // ✅ Acesso total para master, admin, gestor
    if (['master', 'admin', 'gestor'].includes(role)) {
      return true;
    }

    // ✅ Permissões automáticas por cargo
    const ROLE_PERMISSIONS: Record<string, string[]> = {
  financeiro: [
    'obras.visualizar', // ← ADICIONE ESTA LINHA
    'obras.listar',
    'orcamentos.listar',
    'financeiro.notas.lancar',
    'financeiro.notas.baixar',
    'financeiro.notas.editar',
    'financeiro.notas.excluir',
    'financeiro.contas-pagar',
    'financeiro.contas-pagas',
    'financeiro.exportar-excel',
    'financeiro.exportar-pdf',
    'suprimentos.fornecedores',
    'suprimentos.pedidos',
    'relatorios.acessar'
  ],
      engenheiro: [
        'obras.listar',
        'orcamentos.listar',
        'diario.listar',
        'diario.editar',
        'diario.exportar',
        'suprimentos.fornecedores',
        'suprimentos.pedidos',
        'financeiro.notas.lancar',
        'financeiro.notas.editar',
        'financeiro.notas.excluir',
        'financeiro.contas-pagar',
        'financeiro.contas-pagas',
        'relatorios.acessar',
        'relatorios.mapa-chuvas'
      ],
      user: [
        'obras.listar',
        'orcamentos.listar'
      ]
    };

    const rolePerms = ROLE_PERMISSIONS[role] || [];
    return rolePerms.includes(permission);
  } catch (err) {
    console.error('Erro ao verificar permissão:', err);
    return false;
  }
};

export const hasObraAccess = (obraId: number | string): boolean => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return false;

  try {
    const userData = JSON.parse(userStr);
    if (['master', 'admin', 'gestor'].includes(userData.role)) {
      return true;
    }
    const obrasAutorizadas = userData.obras || [];
    return obrasAutorizadas.map(String).includes(String(obraId));
  } catch (err) {
    return false;
  }
};