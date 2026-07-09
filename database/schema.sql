-- Script SQL de Criação das Tabelas
-- Banco de Dados: SQLite (Relacional)

-- Habilitar suporte a chaves estrangeiras
PRAGMA foreign_keys = ON;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    perfil TEXT NOT NULL CHECK(perfil IN ('administrador', 'gerente', 'usuario')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Projetos
CREATE TABLE IF NOT EXISTS projetos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Associação: Usuários nos Projetos (Muitos para Muitos)
CREATE TABLE IF NOT EXISTS projeto_usuarios (
    projeto_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    PRIMARY KEY (projeto_id, usuario_id),
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de Tarefas
CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projeto_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    responsavel_id INTEGER,
    status TEXT NOT NULL CHECK(status IN ('A Fazer', 'Em Andamento', 'Concluída')) DEFAULT 'A Fazer',
    prazo DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_projeto_usuarios_usuario ON projeto_usuarios(usuario_id);
