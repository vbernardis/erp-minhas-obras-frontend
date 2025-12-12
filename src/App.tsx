import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Obras from './pages/Obras';
import Orcamentos from './pages/Orcamentos';
import Diario from './pages/Diario';
import DiarioDetalhe from './pages/DiarioDetalhe';
import Financeiro from './pages/Financeiro';
import Usuarios from './pages/Usuarios';
import { ObrasProvider } from './utils/obrasContext';
import NovoPedidoCompra from './pages/NovoPedidoCompra';
import Suprimentos from './pages/Suprimentos';
import Fornecedores from './pages/Fornecedores';
import EditarPedidoCompra from './pages/EditarPedidoCompra';
import ChangePasswordForm from './components/ChangePasswordForm';
import ResetPassword from './components/ResetPassword';
import ForgotPassword from './components/ForgotPassword';
import ListaOrcamentos from './pages/ListaOrcamentos';
import EditarOrcamento from './pages/EditarOrcamento';
import ListaFornecedores from './pages/ListaFornecedores';
import EditarFornecedor from './pages/EditarFornecedor';
import NovaNotaFiscal from './pages/NovaNotaFiscal';
import ContasAPagar from './pages/ContasAPagar';
import ContasPagas from './pages/ContasPagas';
import EditarNotaFiscal from './pages/EditarNotaFiscal';
import BaixaNotaFiscal from './pages/BaixaNotaFiscal';
import axios from 'axios';
import Relatorios from './pages/Relatorios';


// Configura o axios para sempre ler o user do localStorage e enviar no header
axios.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // 👇 Envia o ID do usuário em todas as requisições
      config.headers['X-User-ID'] = user.id;
    } catch (e) {
      console.warn('Erro ao ler usuário do localStorage');
    }
  }
  return config;
  });

function App() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  return (
    <ObrasProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rotas protegidas */}
          <Route
            path="/dashboard"
            element={isLoggedIn ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          />
          <Route
            path="/obras"
            element={isLoggedIn ? (
              <Layout>
                <Obras />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          />
          <Route
            path="/orcamentos"
            element={isLoggedIn ? (
              <Layout>
                <Orcamentos />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          />
          <Route
            path="/diario"
            element={isLoggedIn ? (
              <Layout>
                <Diario />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          />
          <Route
            path="/diario/:id"
            element={isLoggedIn ? (
              <Layout>
                <DiarioDetalhe />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          />
          <Route
            path="/financeiro"
            element={isLoggedIn ? (
              <Layout>
                <Financeiro />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          />
          <Route
            path="/fornecedores"
            element={isLoggedIn ? (
              <Layout>
                <Fornecedores />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
            />
            <Route
              path="/relatorios"
              element={
                isLoggedIn ? (
                  <Layout>
                    <Relatorios />
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          <Route
            path="/usuarios"
            element={isLoggedIn ? (
              <Layout>
                <Usuarios />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          />
          <Route
            path="/suprimentos/novo-pedido"
            element={isLoggedIn ? <Layout><NovoPedidoCompra /></Layout> : <Navigate to="/login" />}
            />

          {/* Redirecionamento raiz */}
          <Route
            path="/"
            element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
          />
          <Route
          path="/suprimentos"
          element={
          isLoggedIn ? (
          <Layout>
            <Suprimentos />
          </Layout>
        ) : (
          <Navigate to="/login" />
    )
  }
/>

<Route
  path="/change-password" element={<ChangePasswordForm />} />

<Route
  path="/suprimentos/editar/:id"
  element={
    isLoggedIn ? (
      <Layout>
        <EditarPedidoCompra />
      </Layout>
    ) : (
      <Navigate to="/login" />
    )
  }
/>

<Route 
      path="/forgot-password" element={<ForgotPassword />} />
        
<Route 
      path="/reset-password" element={<ResetPassword />} />

<Route 
      path="/orcamentos/lista" element={<ListaOrcamentos />} 
      />

<Route path="/orcamentos/editar/:id" element={<EditarOrcamento />} />

<Route path="/fornecedores/lista" element={<ListaFornecedores />} />

<Route path="/fornecedores/editar/:id" element={<EditarFornecedor />} />

<Route path="/financeiro/nova-nota" element={<NovaNotaFiscal />} />

<Route path="/financeiro/contas-a-pagar" element={<ContasAPagar />} />

<Route path="/financeiro/contas-pagas" element={<ContasPagas />} />

<Route path="/financeiro/editar-nota/:id" element={<EditarNotaFiscal />} />

<Route path="/notas-fiscais/:id/baixa" element={<BaixaNotaFiscal />} />

      </Routes>
      
        

      </BrowserRouter>
    </ObrasProvider>
  );
}

export default App;