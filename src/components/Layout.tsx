import { useState, useEffect } from 'react';
import { HousePlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
// 🔑 Adicionado FiShoppingBag
import { FiHome, FiFile, FiDollarSign, FiClipboard, FiUsers, FiLogOut } from 'react-icons/fi';
import { hasPermission } from '../utils/permissions';
import { FaDraftingCompass } from 'react-icons/fa';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
  { name: 'Dashboard', icon: FiHome, path: '/dashboard', permission: 'obras:read' },
  { name: 'Obras', icon: FiFile, path: '/obras', permission: 'obras:read' },
  { name: 'Orçamentos', icon: FiDollarSign, path: '/orcamentos', permission: 'orcamentos:read' },
  { name: 'Diário de Obra', icon: FiClipboard, path: '/diario', permission: 'obras:read' },
  { name: 'Financeiro', icon: FiDollarSign, path: '/financeiro', permission: 'financeiro:read' },
  // ✅ Novo item: Suprimentos
  { name: 'Suprimentos', icon: FiFile, path: '/suprimentos', permission: 'obras:read' },
  // ✅ Novo item: Relatórios
  { name: 'Relatórios', icon: FiFile, path: '/relatorios', permission: 'obras:read' },
  { name: 'Usuários', icon: FiUsers, path: '/usuarios', permission: 'usuarios:write' },
];

  // ... resto do código permanece EXATAMENTE IGUAL
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar Fixa */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          width: '18rem',
          backgroundColor: '#1e293b',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #334155',
          }}
        >
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center' }}>
  <HousePlus size={28} style={{ marginRight: '0.5rem', color: '#f97316' }} />
          ERP Minhas Obras
        </h1>
        </div>

        <nav style={{ marginTop: '2rem', padding: '0 1.5rem' }}>
          {menuItems.map((item) => {
            if (!hasPermission(item.permission)) return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  textAlign: 'left',
                  color: isActive ? '#3b82f6' : '#e2e8f0',
                  background: isActive ? '#334155' : 'transparent',
                  borderRadius: '0.75rem',
                  marginBottom: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: isActive ? '700' : '500',
                  boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#334155';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon style={{ marginRight: '1rem', color: isActive ? '#3b82f6' : '#94a3b8' }} className="w-5 h-5" />
                <span style={{ fontSize: '1.1rem' }}>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            width: '100%',
            padding: '0 1.5rem',
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '0.875rem 1.25rem',
              textAlign: 'left',
              color: '#fca5a5',
              background: 'transparent',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#471a1a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FiLogOut className="w-5 h-5" style={{ marginRight: '1rem', color: '#fca5a5' }} />
            <span style={{ fontSize: '1.1rem' }}>Sair do Sistema</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '18rem' }}>
        {/* Header */}
        <header
          style={{
            backgroundColor: 'white',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            height: '4rem',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            Bem-vindo, {JSON.parse(localStorage.getItem('user') || '{}').name || 'Usuário'}
          </div>
        </header>

        {/* Page Content */}
        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}