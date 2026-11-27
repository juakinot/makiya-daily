import { Component, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout, ClientLayout, MakiLayout, PublicLayout, ToastHost } from '@/components/layout';
import { Button, EmptyState } from '@/components/ui';
import Landing from '@/features/public/Landing';
import { Login, Register } from '@/features/public/Auth';
import ClientHome from '@/features/client/ClientHome';
import Catalog from '@/features/client/Catalog';
import NewRequest from '@/features/client/NewRequest';
import RequestDetail from '@/features/client/RequestDetail';
import { ClientProfile, History } from '@/features/client/HistoryProfile';
import { MakiHome, MakiIncome, MakiJob, MakiJobs, MakiProfilePage } from '@/features/maki/MakiPages';
import { AdminClients, AdminDashboard, AdminIncidents, AdminMakiDetail, AdminMakis, AdminRequestDetail, AdminRequests, AdminSettlements } from '@/features/admin/AdminOps';
import { AdminAnalytics, AdminServices, AdminSettings } from '@/features/admin/AdminConfig';
import { AppProvider } from '@/store/AppStore';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function NotFound() {
  return (
    <div className="container-app py-16">
      <EmptyState title="Página no encontrada" description="El enlace no existe o cambió." action={<Link to="/"><Button size="sm">Ir al inicio</Button></Link>} />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Algo salió mal"
          description="Ocurrió un error inesperado en la demostración. Puedes volver al inicio o restablecer los datos de prueba."
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => (window.location.href = '/')}>Ir al inicio</Button>
              <Button size="sm" onClick={() => { try { localStorage.removeItem('makiya.demo.db'); } catch { /* */ } window.location.href = '/'; }}>Restablecer datos</Button>
            </div>
          }
        />
      </div>
    );
  }
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="ingresar" element={<Login />} />
        <Route path="registro" element={<Register />} />
      </Route>
      <Route path="app" element={<ClientLayout />}>
        <Route index element={<ClientHome />} />
        <Route path="pedir" element={<NewRequest />} />
        <Route path="servicios" element={<Catalog />} />
        <Route path="solicitudes/:id" element={<RequestDetail />} />
        <Route path="historial" element={<History />} />
        <Route path="perfil" element={<ClientProfile />} />
      </Route>
      <Route path="maki" element={<MakiLayout />}>
        <Route index element={<MakiHome />} />
        <Route path="trabajos" element={<MakiJobs />} />
        <Route path="trabajos/:id" element={<MakiJob />} />
        <Route path="ingresos" element={<MakiIncome />} />
        <Route path="perfil" element={<MakiProfilePage />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="solicitudes" element={<AdminRequests />} />
        <Route path="solicitudes/:id" element={<AdminRequestDetail />} />
        <Route path="makis" element={<AdminMakis />} />
        <Route path="makis/:id" element={<AdminMakiDetail />} />
        <Route path="clientes" element={<AdminClients />} />
        <Route path="incidencias" element={<AdminIncidents />} />
        <Route path="liquidaciones" element={<AdminSettlements />} />
        <Route path="servicios" element={<AdminServices />} />
        <Route path="configuracion" element={<AdminSettings />} />
        <Route path="analitica" element={<AdminAnalytics />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <ToastHost />
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
