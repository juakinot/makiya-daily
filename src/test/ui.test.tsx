import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';
import { MemoryRepository } from '@/persistence/localStorageRepo';
import { AppProvider } from '@/store/AppStore';

function renderAt(path: string) {
  return render(
    <AppProvider repository={new MemoryRepository()}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  );
}

describe('Interfaz', () => {
  it('landing muestra slogan, Cero Sorpresas y solo categorías del MVP como contratables', () => {
    renderAt('/');
    expect(screen.getAllByText(/Una mano/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Maki Probado')).toBeInTheDocument();
    expect(screen.getAllByText('Armado de muebles').length).toBeGreaterThan(0);
    expect(screen.getByText('Gasfitería')).toBeInTheDocument(); // como «Próximamente»
  });
  it('rutas protegidas redirigen al ingreso sin sesión', () => {
    sessionStorage.clear();
    renderAt('/admin');
    expect(screen.getByText('Ingresa a tu cuenta')).toBeInTheDocument();
  });
  it('un cliente no puede abrir el panel de administración', () => {
    sessionStorage.setItem('makiya.session', 'u_valeria');
    renderAt('/admin');
    expect(screen.getByText(/Hola, Valeria/)).toBeInTheDocument();
    sessionStorage.clear();
  });
  it('el Maki habilitado ve su oferta con ingreso neto', () => {
    sessionStorage.setItem('makiya.session', 'u_rosa');
    renderAt('/maki');
    expect(screen.getByText('Solicitudes para ti')).toBeInTheDocument();
    expect(screen.getAllByText('Ingreso del Maki').length).toBeGreaterThan(0);
    sessionStorage.clear();
  });
  it('el postulante ve su evaluación pendiente y no recibe ofertas', () => {
    sessionStorage.setItem('makiya.session', 'u_martin');
    renderAt('/maki');
    expect(screen.getByText('Postulación recibida')).toBeInTheDocument();
    expect(screen.queryByText('Solicitudes para ti')).not.toBeInTheDocument();
    sessionStorage.clear();
  });
});
