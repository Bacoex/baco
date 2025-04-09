import { 
  logShareEventError, 
  generateFallbackShareData,
  logClientSideError,
  getErrorCategoryColor,
  cleanupErrorLogHistory
} from '../errorLogger';

describe('Error Logger Functions', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      key: jest.fn((index: number) => Object.keys(store)[index] || null),
      length: jest.fn(() => Object.keys(store).length),
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('logShareEventError', () => {
    it('should log share event errors correctly', () => {
      const error = new Error('API error');
      logShareEventError(1, 'test context', error);
      
      // Verificar que o erro foi registrado no localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const lastCall = (localStorageMock.setItem as jest.Mock).mock.calls[0];
      expect(lastCall[0]).toBe('errorLogs');
      
      // Verificar que os dados do erro estão corretos
      const errorLogData = JSON.parse(lastCall[1]);
      expect(errorLogData).toHaveLength(1);
      expect(errorLogData[0].category).toBe('share_event');
      expect(errorLogData[0].eventId).toBe(1);
      expect(errorLogData[0].context).toBe('test context');
      expect(errorLogData[0].message).toContain('API error');
    });
  });

  describe('generateFallbackShareData', () => {
    it('should generate valid fallback data when normal API fails', () => {
      const eventId = 123;
      const eventName = 'Teste de Evento';
      
      const fallbackData = generateFallbackShareData(eventId, eventName);
      
      // Verificar estrutura dos dados de fallback
      expect(fallbackData).toHaveProperty('link');
      expect(fallbackData).toHaveProperty('title');
      expect(fallbackData).toHaveProperty('description');
      
      // Verificar que o link contém o ID do evento
      expect(fallbackData.link).toContain(eventId.toString());
      
      // Verificar que o título contém o nome do evento
      expect(fallbackData.title).toContain(eventName);
    });
    
    it('should generate data with unique link for each event', () => {
      const data1 = generateFallbackShareData(1, 'Evento 1');
      const data2 = generateFallbackShareData(2, 'Evento 2');
      
      expect(data1.link).not.toBe(data2.link);
    });
  });

  describe('getErrorCategoryColor', () => {
    it('should return appropriate colors for different error categories', () => {
      expect(getErrorCategoryColor('api')).toBe('#ef4444'); // red
      expect(getErrorCategoryColor('auth')).toBe('#f59e0b'); // amber
      expect(getErrorCategoryColor('navigation')).toBe('#3b82f6'); // blue
      expect(getErrorCategoryColor('share_event')).toBe('#ec4899'); // pink
      expect(getErrorCategoryColor('unknown')).toBe('#6b7280'); // gray
    });
  });

  describe('cleanupErrorLogHistory', () => {
    it('should remove logs older than the specified timeframe', () => {
      // Mock para Date.now
      const nowMock = jest.spyOn(Date, 'now');
      const now = 1617235200000; // 2021-04-01
      nowMock.mockReturnValue(now);
      
      // Criar logs de várias datas
      const oldLogs = [
        { id: '1', timestamp: now - (15 * 24 * 60 * 60 * 1000), message: 'Old error' }, // 15 dias atrás
        { id: '2', timestamp: now - (10 * 24 * 60 * 60 * 1000), message: 'Semi-old error' }, // 10 dias atrás 
        { id: '3', timestamp: now - (5 * 24 * 60 * 60 * 1000), message: 'Recent error' }, // 5 dias atrás
        { id: '4', timestamp: now - (60 * 60 * 1000), message: 'Very recent error' } // 1 hora atrás
      ];
      
      localStorageMock.setItem('errorLogs', JSON.stringify(oldLogs));
      
      // Executar limpeza para remover logs com mais de 14 dias
      cleanupErrorLogHistory();
      
      // Verificar resultado
      const storedLogs = JSON.parse(localStorageMock.getItem('errorLogs') as string);
      expect(storedLogs).toHaveLength(3); // Deve manter apenas 3 logs
      expect(storedLogs.find((log: any) => log.id === '1')).toBeUndefined(); // O log mais antigo deve ser removido
      expect(storedLogs.some((log: any) => log.id === '2')).toBeTruthy();
      expect(storedLogs.some((log: any) => log.id === '3')).toBeTruthy();
      expect(storedLogs.some((log: any) => log.id === '4')).toBeTruthy();
      
      // Limpar mock
      nowMock.mockRestore();
    });
  });
});