import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AuthLayout } from './components/layouts/AuthLayout';
import { DashboardLayout, ProtectedRoute } from './components/layouts/DashboardLayout';
import { Login } from './pages/auth/Login';
import { Overview } from './pages/dashboard/Overview';
import { Institutions } from './pages/dashboard/Institutions';
import { UsersPage } from './pages/dashboard/Users';
import { TeamsPage } from './pages/dashboard/Teams';
import { CostCentersPage } from './pages/dashboard/CostCenters';
import { TicketsPage } from './pages/dashboard/Tickets';

const ConfigPlaceholder = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
    <p className="text-2xl font-bold text-slate-300">Configurações</p>
    <p className="text-slate-400 text-sm mt-2">Em breve...</p>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Rotas Privadas */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="chamados" element={<TicketsPage />} />
              <Route path="institucoes" element={<Institutions />} />
              <Route path="equipes" element={<TeamsPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="centros-custo" element={<CostCentersPage />} />
              <Route path="configuracoes" element={<ConfigPlaceholder />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
