import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UserMenu } from './UserMenu';

const authMock = vi.fn();
const subMock = vi.fn();
const roleMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authMock(),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => subMock(),
}));
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => roleMock(),
}));

const fakeUser = {
  id: 'u1',
  email: 'jane@example.com',
  user_metadata: { full_name: 'Jane Doe' },
};

function renderMenu() {
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>
  );
}

describe('UserMenu', () => {
  beforeEach(() => {
    authMock.mockReset();
    subMock.mockReset();
    roleMock.mockReset();
    subMock.mockReturnValue({ subscription: { plan: 'gratuito' } });
  });

  it('renders nothing when the user is logged out', () => {
    authMock.mockReturnValue({ user: null, signOut: vi.fn() });
    roleMock.mockReturnValue({ isAdmin: false, loading: false });

    const { container } = renderMenu();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows Painel ADM for admin users', async () => {
    authMock.mockReturnValue({ user: fakeUser, signOut: vi.fn() });
    roleMock.mockReturnValue({ isAdmin: true, loading: false });

    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /Jane Doe/i }));

    expect(await screen.findByText('Painel ADM')).toBeInTheDocument();
  });

  it('hides Painel ADM for non-admin users', async () => {
    authMock.mockReturnValue({ user: fakeUser, signOut: vi.fn() });
    roleMock.mockReturnValue({ isAdmin: false, loading: false });

    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /Jane Doe/i }));

    expect(await screen.findByText('Meu perfil')).toBeInTheDocument();
    expect(screen.queryByText('Painel ADM')).not.toBeInTheDocument();
  });
});