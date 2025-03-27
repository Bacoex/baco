-- Script de criação do banco de dados para Baco
-- Compatível com MySQL

-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS baco_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE baco_app;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(20) NOT NULL UNIQUE COMMENT 'CPF usado como username',
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  rg VARCHAR(20) NOT NULL,
  titulo_eleitor VARCHAR(20) DEFAULT NULL COMMENT 'Título de eleitor',
  zodiac_sign VARCHAR(50) NOT NULL,
  profile_image VARCHAR(255) DEFAULT NULL,
  biography TEXT DEFAULT NULL,
  instagram_username VARCHAR(255) DEFAULT NULL,
  threads_username VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(50) DEFAULT NULL,
  interests TEXT DEFAULT NULL COMMENT 'Armazenado como JSON',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  document_verified BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret VARCHAR(255) DEFAULT NULL,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_policy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  data_processing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at DATETIME DEFAULT NULL,
  last_login_ip VARCHAR(50) DEFAULT NULL,
  last_user_agent TEXT DEFAULT NULL,
  device_ids TEXT DEFAULT NULL COMMENT 'Armazenado como JSON',
  google_id VARCHAR(255) DEFAULT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de categorias de eventos
CREATE TABLE IF NOT EXISTS event_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(50) NOT NULL,
  age_restriction INT DEFAULT NULL COMMENT 'Restrição de idade para a categoria'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time_start VARCHAR(10) NOT NULL,
  time_end VARCHAR(10) DEFAULT NULL,
  location VARCHAR(255) NOT NULL,
  coordinates VARCHAR(100) DEFAULT NULL COMMENT 'Para armazenar coordenadas do mapa',
  cover_image VARCHAR(255) DEFAULT NULL,
  category_id INT NOT NULL,
  creator_id INT NOT NULL,
  event_type VARCHAR(20) NOT NULL DEFAULT 'public' COMMENT 'public, private_ticket, private_application',
  important_info TEXT DEFAULT NULL,
  ticket_price DOUBLE DEFAULT 0,
  additional_tickets TEXT DEFAULT NULL COMMENT 'JSON com diferentes tipos de ingressos',
  payment_methods TEXT DEFAULT NULL COMMENT 'JSON com métodos de pagamento',
  capacity INT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES event_categories(id),
  FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de participantes de eventos
CREATE TABLE IF NOT EXISTS event_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, approved, rejected',
  application_reason TEXT DEFAULT NULL,
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de convites para co-organizadores
CREATE TABLE IF NOT EXISTS event_co_organizer_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  inviter_id INT NOT NULL COMMENT 'ID do usuário que enviou o convite',
  email VARCHAR(255) NOT NULL COMMENT 'Email do convidado',
  invite_token VARCHAR(255) NOT NULL COMMENT 'Token único para aceitar o convite',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, accepted, rejected',
  invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME DEFAULT NULL,
  invitee_id INT DEFAULT NULL COMMENT 'ID do usuário convidado (se existir)',
  message TEXT DEFAULT NULL COMMENT 'Mensagem personalizada para o convite',
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (inviter_id) REFERENCES users(id),
  FOREIGN KEY (invitee_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de co-organizadores de eventos (relação N:M)
CREATE TABLE IF NOT EXISTS event_co_organizers (
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de mensagens de chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  attachment_url VARCHAR(255) DEFAULT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_by TEXT DEFAULT NULL COMMENT 'Array de IDs como JSON',
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices importantes para melhorar a performance
CREATE INDEX idx_events_creator ON events(creator_id);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_participants_event ON event_participants(event_id);
CREATE INDEX idx_participants_user ON event_participants(user_id);
CREATE INDEX idx_messages_event ON chat_messages(event_id);

-- Inserir categorias padrão
INSERT INTO event_categories (name, slug, color) VALUES 
('Aniversário', 'birthday', '#a78bfa'),
('Casamento', 'wedding', '#ec4899'),
('Religioso', 'religious', '#8b5cf6'),
('Reunião', 'meeting', '#3b82f6'),
('Churrasco', 'barbecue', '#f59e0b'),
('Festa', 'party', '#ec4899'),
('Show', 'concert', '#10b981'),
('LGBT+', 'lgbt', 'pride');

-- Categoria com restrição de idade
INSERT INTO event_categories (name, slug, color, age_restriction) VALUES 
('Eventos 18+', 'adult', '#ef4444', 18);

-- Tabela para sessões (necessária para autenticação)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) NOT NULL PRIMARY KEY,
  expires DATETIME NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;