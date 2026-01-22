// src/utils/permissions.ts
// 🔓 Acesso total para todos os usuários

export const hasPermission = (permission: string): boolean => {
  return true; // ✅ Sempre permite
};

export const hasObraAccess = (obraId: number | string): boolean => {
  return true; // ✅ Acesso total a todas as obras
};