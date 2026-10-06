import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ministros from './pages/Ministros';
import Equipes from './pages/Equipes';
import Missas from './pages/Missas';
import Escala from './pages/Escala';
import Impressao from './pages/Impressao';
import Funcoes from './pages/Funcoes';
import Configuracoes from './pages/Configuracoes';

function Protegida({ children }: { children: JSX.Element }) {
  const { autenticado } = useAuth();
  if (!autenticado) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protegida>
                <Layout />
              </Protegida>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/ministros" element={<Ministros />} />
            <Route path="/equipes" element={<Equipes />} />
            <Route path="/missas" element={<Missas />} />
            <Route path="/escala" element={<Escala />} />
            <Route path="/impressao" element={<Impressao />} />
            <Route path="/funcoes" element={<Funcoes />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
