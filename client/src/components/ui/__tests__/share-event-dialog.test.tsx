import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShareEventDialog } from '../share-event-dialog';
import { ToastProvider } from '@/hooks/use-toast';
import * as errorLogger from '@/lib/errorLogger';

// Mock fetch
global.fetch = jest.fn();

// Mock functions
const mockToast = jest.fn();
const mockClose = jest.fn();
const mockGenerateFallbackShareData = jest.fn();
const mockLogShareEventError = jest.fn();

// Mock modules
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@/lib/errorLogger', () => ({
  logShareEventError: jest.fn(),
  generateFallbackShareData: jest.fn().mockReturnValue({
    link: 'https://test-fallback-link.com/event/1',
    title: 'Test Event - Baco Experiências',
    description: 'Participe deste evento no Baco Experiências!'
  }),
}));

// Mock navigator API
Object.defineProperty(window, 'navigator', {
  value: {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined)
    },
    userAgent: 'test-agent'
  },
  writable: true
});

// Setup component wrapper for testing
function setup(props: { eventId: number, isOpen: boolean, onClose: () => void }) {
  return render(
    <ToastProvider>
      <ShareEventDialog {...props} />
    </ToastProvider>
  );
}

describe('ShareEventDialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  test('renders loading state initially', async () => {
    // Mock successful fetch response for event details
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Teste Evento' })
        })
      )
      // Mock for share data
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            link: 'https://test-link.com/event/1',
            title: 'Test Event',
            description: 'Test Description',
            image: null,
            event: {
              id: 1,
              name: 'Test Event',
              date: '2025-04-15',
              time: '19:00',
              location: 'Test Location',
              category: 'Test Category',
              creator: 'Test Creator'
            }
          })
        })
      );

    setup({ eventId: 1, isOpen: true, onClose: mockClose });
    
    // Check initial loading state
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('displays share data after loading', async () => {
    // Mock successful fetch response for event details
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Teste Evento' })
        })
      )
      // Mock for share data
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            link: 'https://test-link.com/event/1',
            title: 'Test Event',
            description: 'Test Description',
            image: null,
            event: {
              id: 1,
              name: 'Test Event',
              date: '2025-04-15',
              time: '19:00',
              location: 'Test Location',
              category: 'Test Category',
              creator: 'Test Creator'
            }
          })
        })
      );

    setup({ eventId: 1, isOpen: true, onClose: mockClose });
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://test-link.com/event/1')).toBeInTheDocument();
    });
    
    // Check that share data is displayed
    expect(screen.getByText(/Test Event/)).toBeInTheDocument();
    expect(screen.getByText(/2025-04-15/)).toBeInTheDocument();
    expect(screen.getByText(/Test Location/)).toBeInTheDocument();
  });

  test('activates fallback when API fails', async () => {
    // Mock event details fetch
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Teste Evento' })
        })
      )
      // Mock failed fetch for share data
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      );

    setup({ eventId: 1, isOpen: true, onClose: mockClose });
    
    // Wait for fallback to activate
    await waitFor(() => {
      expect(errorLogger.logShareEventError).toHaveBeenCalled();
      expect(errorLogger.generateFallbackShareData).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Erro ao gerar link de compartilhamento',
        variant: 'destructive'
      }));
    });
    
    // Check for fallback warning
    expect(screen.getByText(/Modo de Fallback Ativado/)).toBeInTheDocument();
  });

  test('copy button works correctly', async () => {
    // Mock successful fetch
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Teste Evento' })
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            link: 'https://test-link.com/event/1',
            title: 'Test Event',
            description: 'Test Description',
            image: null,
            event: {
              id: 1,
              name: 'Test Event',
              date: '2025-04-15',
              time: '19:00',
              location: 'Test Location',
              category: 'Test Category',
              creator: 'Test Creator'
            }
          })
        })
      );

    setup({ eventId: 1, isOpen: true, onClose: mockClose });
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://test-link.com/event/1')).toBeInTheDocument();
    });
    
    // Click copy button
    fireEvent.click(screen.getByText('Copiar'));
    
    // Verify clipboard was called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://test-link.com/event/1');
    
    // Verify toast was shown
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Link copiado!'
      }));
    });
  });
});