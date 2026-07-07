import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminDataSources from './AdminDataSources';

const authMock = vi.fn();
const subMock = vi.fn();
const roleMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authMock() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => subMock() }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => roleMock() }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
    storage: { from: () => ({}) },
  },
}));

const fakeUser = {
  id: 'u1',
  email: 'jane@example.com',
  user_metadata: { full_name: 'Jane Doe' },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/data-sources']}>
      <AdminDataSources />
    </MemoryRouter>
  );
}

describe('AdminDataSources access control', () => {
  beforeEach(() => {
    authMock.mockReset();
    subMock.mockReset();
    roleMock.mockReset();
    navigateMock.mockReset();
    subMock.mockReturnValue({ subscription: { plan: 'gratuito' } });
  });

  it('redirects logged-out users to /auth and does not render admin content', async () => {
    authMock.mockReturnValue({ user: null, loading: false, signOut: vi.fn() });
    roleMock.mockReturnValue({ isAdmin: false, loading: false });

    renderPage();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/auth'));
    expect(screen.queryByText(/Fontes cadastradas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fontes Personalizadas/i)).not.toBeInTheDocument();
  });

  it('shows access denied and blocks admin surfaces for non-admin users', () => {
    authMock.mockReturnValue({ user: fakeUser, loading: false, signOut: vi.fn() });
    roleMock.mockReturnValue({ isAdmin: false, loading: false });

    renderPage();

    expect(screen.getByRole('heading', { name: /Acesso negado/i })).toBeInTheDocument();
    expect(
      screen.getByText(/exclusiva para administradores/i)
    ).toBeInTheDocument();

    // Admin-only surfaces must be hidden.
    expect(screen.queryByText(/Fontes cadastradas/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nome da fonte/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nome técnico da camada/i)).not.toBeInTheDocument();
  });

  it('navigates back to the dashboard when the non-admin clicks the return button', async () => {
    authMock.mockReturnValue({ user: fakeUser, loading: false, signOut: vi.fn() });
    roleMock.mockReturnValue({ isAdmin: false, loading: false });

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Voltar ao Dashboard/i }));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the admin panel for admin users', async () => {
    authMock.mockReturnValue({ user: fakeUser, loading: false, signOut: vi.fn() });
    roleMock.mockReturnValue({ isAdmin: true, loading: false });

    renderPage();

    expect(await screen.findByText(/Fontes Personalizadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Fontes cadastradas/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Acesso negado/i })).not.toBeInTheDocument();
  });
});