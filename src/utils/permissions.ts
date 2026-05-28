// src/utils/permissions.ts
// 🔐 Sistema REAL de verificação de permissões COM LOGS DE DEBUG

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  authorizedObras?: string[];
}

// 🔍 Função para obter dados do usuário logado
const getUserData = (): UserData | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Erro ao ler usuário:', error);
    return null;
  }
};

// ✅ Verifica se usuário tem permissão específica
export const hasPermission = (permission: string): boolean => {
  const user = getUserData();
  
  // DEBUG: Log para diagnóstico
  console.log(`🔐 hasPermission('${permission}') - User:`, {
    id: user?.id,
    role: user?.role,
    permissions: user?.permissions
  });
  
  // Se não tem usuário logado, nega acesso
  if (!user) {
    console.warn('⚠️ Nenhum usuário logado');
    return false;
  }
  
  // ✅ MASTER tem acesso a TUDO - esta é a verificação CRÍTICA
  if (user.role === 'master') {
    console.log('✅ Usuário MASTER liberado para:', permission);
    return true;
  }
  
  // Verifica se a permissão está na lista do usuário
  const userPermissions = user.permissions || [];
  const temPermissao = userPermissions.includes(permission);
  
  console.log(`📋 Permissão '${permission}':`, temPermissao ? '✅ Permitida' : '❌ Negada');
  return temPermissao;
};

// ✅ Verifica se usuário tem acesso à obra específica
export const hasObraAccess = (obraId: number | string): boolean => {
  const user = getUserData();
  
  if (!user) return false;
  
  // MASTER tem acesso a todas as obras
  if (user.role === 'master') return true;
  
  const authorizedObras = user.authorizedObras || [];
  return authorizedObras.includes(String(obraId));
};

// ✅ Função utilitária: verifica múltiplas permissões (OR logic)
export const hasAnyPermission = (permissions: string[]): boolean => {
  return permissions.some(perm => hasPermission(perm));
};

// ✅ Função utilitária: verifica se tem TODAS as permissões (AND logic)
export const hasAllPermissions = (permissions: string[]): boolean => {
  return permissions.every(perm => hasPermission(perm));
};

// ✅ Função para recarregar dados do usuário (após login ou atualização)
export const refreshUserPermissions = async (): Promise<void> => {
  const user = getUserData();
  if (!user?.id) return;
  
  try {
    const api = await import('../api/config');
    
    const [permRes, obraRes] = await Promise.all([
      api.default.get(`/users/${user.id}/permissoes`),
      api.default.get(`/users/${user.id}/obras`)
    ]);
    
    const updatedUser = {
      ...user,
      permissions: permRes.data.map((p: any) => p.tela),
      authorizedObras: obraRes.data.map((o: any) => String(o.obra_id))
    };
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Dispara evento para atualizar UI
    window.dispatchEvent(new CustomEvent('userPermissionsUpdated'));
    
    console.log('🔄 Permissões atualizadas para usuário:', user.id);
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
  }
};