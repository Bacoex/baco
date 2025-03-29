
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsMenu } from '@/components/ui/notifications-menu';

jest.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: '1',
        title: 'Test Notification',
        message: 'Test Message',
        date: new Date().toISOString(),
        read: false
      }
    ],
    markAsRead: jest.fn(),
    clearAll: jest.fn()
  })
}));

describe('NotificationsMenu Component', () => {
  it('renders notification items', () => {
    render(<NotificationsMenu />);
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });

  it('opens menu on click', () => {
    render(<NotificationsMenu />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
