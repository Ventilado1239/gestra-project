// Conexão e Inicialização do Banco de Dados SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database/database.sqlite');

// Garantir que a pasta database existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso.');
    }
});

// Função para executar query síncrona/promissificada
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Inicializar e rodar o schema
async function initializeDatabase() {
    try {
        // Habilitar suporte a chaves estrangeiras
        await dbRun('PRAGMA foreign_keys = ON;');

        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // SQLite não aceita múltiplas queries separadas por ponto e vírgula em uma única chamada de db.run.
        // Precisamos dividir as queries e executar uma a uma.
        const queries = schema
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        for (const query of queries) {
            await dbRun(query);
        }
        console.log('Schema do banco de dados aplicado com sucesso.');

        // Seed de usuários padrão se a tabela estiver vazia
        const userCount = await dbGet('SELECT COUNT(*) as count FROM usuarios');
        if (userCount.count === 0) {
            console.log('Semeando usuários padrão...');
            const salt = await bcrypt.genSalt(10);
            
            const hashAdmin = await bcrypt.hash('adminpassword', salt);
            const hashGerente = await bcrypt.hash('gerentepassword', salt);
            const hashUsuario = await bcrypt.hash('usuariopassword', salt);
            const hashCarlos = await bcrypt.hash('carlospassword', salt);
            const hashAna = await bcrypt.hash('anapassword', salt);
            const hashMariana = await bcrypt.hash('marianapassword', salt);
            const hashFelipe = await bcrypt.hash('felipepassword', salt);

            await dbRun(
                'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
                ['Administrador', 'admin@sistema.com', hashAdmin, 'administrador']
            );
            await dbRun(
                'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
                ['Gerente de Projeto', 'gerente@sistema.com', hashGerente, 'gerente']
            );
            await dbRun(
                'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
                ['Usuário Comum', 'usuario@sistema.com', hashUsuario, 'usuario']
            );
            await dbRun(
                'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
                ['Carlos Souza', 'carlos@sistema.com', hashCarlos, 'gerente']
            );
            await dbRun(
                'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
                ['Ana Rocha', 'ana@sistema.com', hashAna, 'usuario']
            );
            await dbRun(
                'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
                ['Mariana Costa', 'mariana@sistema.com', hashMariana, 'usuario']
            );
            await dbRun(
                'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
                ['Felipe Lima', 'felipe@sistema.com', hashFelipe, 'usuario']
            );
            console.log('Todos os usuários semeados com sucesso!');
        }

        // Seed de projetos e tarefas se a tabela de projetos estiver vazia
        const projectCount = await dbGet('SELECT COUNT(*) as count FROM projetos');
        if (projectCount.count === 0) {
            console.log('Semeando projetos e tarefas de teste...');
            
            // Buscar IDs dos usuários cadastrados
            const admin = await dbGet("SELECT id FROM usuarios WHERE email = 'admin@sistema.com'");
            const gerente = await dbGet("SELECT id FROM usuarios WHERE email = 'gerente@sistema.com'");
            const usuario = await dbGet("SELECT id FROM usuarios WHERE email = 'usuario@sistema.com'");
            const carlos = await dbGet("SELECT id FROM usuarios WHERE email = 'carlos@sistema.com'");
            const ana = await dbGet("SELECT id FROM usuarios WHERE email = 'ana@sistema.com'");
            const mariana = await dbGet("SELECT id FROM usuarios WHERE email = 'mariana@sistema.com'");
            const felipe = await dbGet("SELECT id FROM usuarios WHERE email = 'felipe@sistema.com'");

            // Helper para gerar prazos relativos ao dia de hoje
            const getRelativeDate = (daysFromToday) => {
                const date = new Date();
                date.setDate(date.getDate() + daysFromToday);
                return date.toISOString().split('T')[0];
            };

            // Projeto 1
            const r1 = await dbRun(
                'INSERT INTO projetos (nome, descricao) VALUES (?, ?)',
                ['Desenvolvimento do App Gestra', 'Criação do aplicativo de gerenciamento de tarefas e projetos com controle por perfil, alertas por e-mail e relatórios em PDF.']
            );
            const p1Id = r1.lastID;

            // Projeto 2
            const r2 = await dbRun(
                'INSERT INTO projetos (nome, descricao) VALUES (?, ?)',
                ['Migração de Servidores Nuvem', 'Migração da infraestrutura local para a nuvem AWS com alta disponibilidade e balanceamento de carga.']
            );
            const p2Id = r2.lastID;

            // Projeto 3
            const r3 = await dbRun(
                'INSERT INTO projetos (nome, descricao) VALUES (?, ?)',
                ['Campanha de Marketing Q3', 'Lançamento da nova identidade visual e campanhas de anúncios em redes sociais.']
            );
            const p3Id = r3.lastID;

            // Associar membros aos projetos
            const memberships = [
                // Projeto 1
                { pId: p1Id, uId: admin.id },
                { pId: p1Id, uId: gerente.id },
                { pId: p1Id, uId: usuario.id },
                { pId: p1Id, uId: carlos.id },
                { pId: p1Id, uId: ana.id },
                { pId: p1Id, uId: mariana.id },
                { pId: p1Id, uId: felipe.id },
                // Projeto 2
                { pId: p2Id, uId: carlos.id },
                { pId: p2Id, uId: felipe.id },
                { pId: p2Id, uId: ana.id },
                // Projeto 3
                { pId: p3Id, uId: gerente.id },
                { pId: p3Id, uId: mariana.id }
            ];

            for (const m of memberships) {
                await dbRun('INSERT INTO projeto_usuarios (projeto_id, usuario_id) VALUES (?, ?)', [m.pId, m.uId]);
            }

            // Semeando tarefas para o Projeto 1
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p1Id, 'Definir Modelo de Dados Relacional', 'Estruturação do banco de dados relacional e criação do script SQL.', ana.id, 'Concluída', getRelativeDate(-5)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p1Id, 'Implementar API de Autenticação JWT', 'Configuração de rotas de login/registro e tokens de sessão cookies.', felipe.id, 'Concluída', getRelativeDate(-3)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p1Id, 'Desenvolver Interface do Quadro Kanban', 'Criar colunas e cards de tarefas dinâmicos e filtros de projeto.', mariana.id, 'Em Andamento', getRelativeDate(1)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p1Id, 'Configurar Servidor de Relatórios PDF', 'Implementação do backend com pdfkit para baixar sumários de progresso.', felipe.id, 'A Fazer', getRelativeDate(2)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p1Id, 'Escrever Testes de Integração', 'Scripts para testar controllers, autenticação e banco.', ana.id, 'A Fazer', getRelativeDate(5)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p1Id, 'Revisar Histórias de Usuário da Disciplina', 'Auditar requisitos obrigatórios antes do envio final.', gerente.id, 'A Fazer', getRelativeDate(-1)] // ATRASADA!
            );

            // Semeando tarefas para o Projeto 2
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p2Id, 'Mapear Infraestrutura Local Atual', 'Catalogar servidores, redes e portas ativas.', felipe.id, 'Concluída', getRelativeDate(-7)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p2Id, 'Configurar Contas IAM e Políticas de Segurança', 'Criar grupos, perfis e restrições na AWS.', carlos.id, 'Em Andamento', getRelativeDate(0)] // VENCE HOJE!
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p2Id, 'Migrar Banco de Dados Homologação', 'Dump e restore do banco relacional de staging para AWS RDS.', ana.id, 'A Fazer', getRelativeDate(3)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p2Id, 'Testar Latência e Redundância', 'Simulações de failover e benchmarks.', carlos.id, 'A Fazer', getRelativeDate(6)]
            );

            // Semeando tarefas para o Projeto 3
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p3Id, 'Aprovar Paleta de Cores e Tipografias', 'Definição de guia de estilos de design.', mariana.id, 'Concluída', getRelativeDate(-4)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p3Id, 'Produzir Peças Criativas (Design)', 'Imagens, banners e assets visuais.', mariana.id, 'Em Andamento', getRelativeDate(2)]
            );
            await dbRun(
                'INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) VALUES (?, ?, ?, ?, ?, ?)',
                [p3Id, 'Criar Landing Page de Captura', 'Frontend HTML/CSS responsivo para conversão de leads.', gerente.id, 'A Fazer', getRelativeDate(4)]
            );

            console.log('Projetos e tarefas de teste semeados com sucesso!');
        }

    } catch (err) {
        console.error('Erro ao inicializar o banco de dados:', err);
    }
}

module.exports = {
    db,
    dbRun,
    dbGet,
    dbAll,
    initializeDatabase
};
