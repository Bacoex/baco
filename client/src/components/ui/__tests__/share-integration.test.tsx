import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShareEventDialog } from '../share-event-dialog';
import { ToastProvider } from '@/hooks/use-toast';
import * as errorLogger from '@/lib/errorLogger';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configuração do QueryClient para testes
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock fetch
global.fetch = jest.fn();

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined)
    }
  },
  writable: true
});

// Mock location para testes de redirecionamento
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    protocol: 'http:',
    host: 'localhost:3000'
  },
  writable: true
});

// Mock functions
const mockToast = jest.fn();
const mockClose = jest.fn();

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

// Setup component wrapper for integration testing
function setup(props: { eventId: number, isOpen: boolean, onClose: () => void }) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ShareEventDialog {...props} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('ShareEventDialog Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    window.location.href = '';
  });

  test('integrates with error logging system on API failure', async () => {
    // Mock event details fetch
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Teste Evento' })
        })
      )
      // Mock API error for share data
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      );

    setup({ eventId: 1, isOpen: true, onClose: mockClose });
    
    // Verify error logging was called with correct parameters
    await waitFor(() => {
      expect(errorLogger.logShareEventError).toHaveBeenCalledWith(
        1, // eventId
        expect.stringContaining('gerar link de compartilhamento'), 
        expect.any(Error)
      );
    });
  });

  test('redirects to error page on catastrophic failure', async () => {
    // Mock error in fallback data generation
    (errorLogger.generateFallbackShareData as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Catastrophic failure in fallback');
    });

    // Mock event details fetch success but share data fetch failure
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Teste Evento' })
        })
      )
      // Mock for share data
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

    setup({ eventId: 1, isOpen: true, onClose: mockClose });
    
    // Check that it redirects to error page
    await waitFor(() => {
      expect(window.location.href).toContain('/share-error');
      expect(window.location.href).toContain('eventId=1');
      expect(window.location.href).toContain('type=fallback_failed');
    });
    
    // Verify close was called
    expect(mockClose).toHaveBeenCalled();
  });

  test('shows toast with fallback warning when using fallback data', async () => {
    // Reset mock to normal behavior
    (errorLogger.generateFallbackShareData as jest.Mock).mockReturnValue({
      link: 'https://test-fallback-link.com/event/1',
      title: 'Teste Evento - Baco Experiências',
      description: 'Participe deste evento no Baco Experiências!'
    });

    // Mock fetch responses
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Teste Evento' })
        })
      )
      // Mock failure for share link 
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

    setup({ eventId: 1, isOpen: true, onClose: mockClose });
    
    // Verify toast warning was shown
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Erro ao gerar link de compartilhamento',
        description: expect.stringContaining('Usando dados básicos'),
        variant: 'destructive'
      }));
    });

    // Verify fallback warning is displayed
    expect(await screen.findByText(/Modo de Fallback Ativado/)).toBeInTheDocument();
  });
});