import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../services/api';
import UserSessions from './UserSessions';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const currentPageSessions = {
  content: [
    { id: 101, username: 'alice', status: 'ACTIVE' },
    { id: 102, username: 'bob', status: 'ACTIVE' },
  ],
  totalElements: 2,
  totalPages: 1,
};

beforeEach(() => {
  api.get.mockResolvedValue({ data: currentPageSessions });
  api.patch.mockResolvedValue({});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('revokes all active sessions selected on the current page', async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(<UserSessions />);

  await screen.findByText('alice');
  fireEvent.click(screen.getByRole('checkbox', {
    name: 'Select all active sessions on this page',
  }));
  fireEvent.click(screen.getByRole('button', { name: 'Revoke selected (2)' }));

  await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
  expect(api.patch).toHaveBeenCalledWith('/v1/admin/user-sessions/101/revoke');
  expect(api.patch).toHaveBeenCalledWith('/v1/admin/user-sessions/102/revoke');
  expect(await screen.findByText('2 session(s) revoked.')).toBeInTheDocument();
});

test('Last navigates to the final session page', async () => {
  api.get.mockResolvedValue({
    data: { ...currentPageSessions, totalPages: 3 },
  });
  render(<UserSessions />);

  await screen.findByText('alice');
  fireEvent.click(screen.getByRole('button', { name: 'Last page' }));

  await waitFor(() => {
    expect(api.get).toHaveBeenLastCalledWith('/v1/admin/user-sessions', {
      params: { status: 'ACTIVE', page: 2, size: 20 },
    });
  });
});
