# Baco - Plataforma de Experiências

Baco é uma aplicação web progressiva (PWA) para descoberta e gerenciamento de eventos na realidade brasileira. A plataforma oferece recursos avançados como sistema de verificação de documentos, filtragem por categorias e localização, e gerenciamento completo do ciclo de vida de eventos.

## Tecnologias

- **Frontend**: React com TypeScript, TailwindCSS
- **Backend**: Node.js, Express
- **Banco de Dados**: PostgreSQL (Neon.tech)
- **ORM**: Drizzle
- **Design System**: shadcn/ui
- **Autenticação**: Sistema próprio + OAuth

## Funcionalidades Principais

- Descoberta de eventos por categoria, local e subcategoria
- Criação e gestão de eventos
- Verificação de documentos (RG/CPF)
- Sistema de notificações
- Chat entre participantes
- Compartilhamento de eventos

## Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Ambiente

É necessário configurar as seguintes variáveis de ambiente:

- `DATABASE_URL`: URL de conexão com o banco de dados PostgreSQL
- `VITE_GOOGLE_MAPS_API_KEY`: Chave de API do Google Maps
- `SESSION_SECRET`: Chave secreta para sessões

## Licença

Todos os direitos reservados a Kevin Matheus Barbosa.