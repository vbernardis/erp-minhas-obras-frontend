export const hasPermission = (permission: string): boolean => {
  const user = localStorage.getItem('user');
  if (!user) {
    console.log('Nenhum usuário logado');
    return false;
  }

  try {
    const userData = JSON.parse(user);
    console.log('Permissões do usuário:', userData.permissions);
    console.log('Verificando permissão:', permission);

    // Se tiver permissão "*", tem acesso a tudo
    if (userData.permissions && userData.permissions.includes('*')) {
      console.log('Permissão * encontrada - acesso concedido');
      return true;
    }

    // Verifica se tem a permissão específica
    const has = userData.permissions?.includes(permission) || false;
    console.log('Resultado da verificação:', has);
    return has;
  } catch (err) {
    console.error('Erro ao verificar permissão:', err);
    return false;
  }
};