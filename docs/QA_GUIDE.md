# Guia de Testes de QA para o Baco Experiências

Este guia descreve os procedimentos de teste automatizado implementados para o projeto Baco Experiências. O foco inicial é garantir a robustez do sistema de compartilhamento de eventos.

## Testes Automatizados

### Execução de Todos os Testes

Para executar todos os testes automatizados:

```bash
npm test
```

### Execução de Testes Específicos

Para executar apenas os testes relacionados ao compartilhamento de eventos:

```bash
./client/src/test-share.sh
```

Ou diretamente:

```bash
npm test -- --testPathPattern=share
```

## Componentes Testados

### ShareEventDialog

O componente `ShareEventDialog` possui testes que verificam:

1. Estado de carregamento inicial
2. Exibição correta dos dados após o carregamento
3. Ativação do modo fallback quando a API falha
4. Funcionamento correto do botão de cópia para área de transferência
5. Integração com o sistema de log de erros
6. Redirecionamento para página de erro em caso de falha catastrófica

### Sistema de Logs de Erro

O módulo `errorLogger` possui testes que verificam:

1. Registro correto de erros relacionados ao compartilhamento
2. Geração de dados de fallback para links de compartilhamento
3. Geração de cores para categorias de erro
4. Limpeza automática de logs antigos (mais de 14 dias)

## Adicionando Novos Testes

Para adicionar novos testes:

1. Crie arquivos dentro dos diretórios `__tests__` correspondentes
2. Use a convenção de nomenclatura `nome-do-componente.test.tsx` para o arquivo
3. Use a estrutura padrão de testes Jest/React Testing Library

### Exemplo de Estrutura

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComponentToTest } from '../component-to-test';

describe('ComponentToTest', () => {
  test('should render correctly', () => {
    render(<ComponentToTest />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Testes de Integração

Os testes de integração verificam como os componentes interagem com outros sistemas:

1. Comunicação com APIs
2. Interações com o sistema de logs
3. Comportamento em caso de falhas de rede

## Relatórios de Erros

Os erros são registrados no localStorage e podem ser visualizados na interface através da página de logs de erro em `/error-logs`.

---

Documentação preparada para o projeto Baco Experiências.