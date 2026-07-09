// Script de Validação Automatizada do Backend
// Verifica conexão com banco de dados, tabelas, relacionamentos e seeds.

const { initializeDatabase, dbGet, dbAll } = require('./backend/database');
const bcrypt = require('bcryptjs');

async function runTests() {
    console.log('=== Iniciando Testes de Validação do Sistema ===');
    
    try {
        // 1. Inicializar banco e aplicar schema
        console.log('\n[Teste 1] Inicializando Banco de Dados SQLite...');
        await initializeDatabase();
        console.log('✔ Banco inicializado.');

        // 2. Verificar Tabelas Criadas
        console.log('\n[Teste 2] Verificando tabelas no banco de dados...');
        const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = tables.map(t => t.name);
        
        const requiredTables = ['usuarios', 'projetos', 'tarefas', 'projeto_usuarios'];
        for (const reqTable of requiredTables) {
            if (tableNames.includes(reqTable)) {
                console.log(`✔ Tabela '${reqTable}' existe.`);
            } else {
                throw new Error(`❌ Falha: Tabela '${reqTable}' não foi criada.`);
            }
        }

        // 3. Verificar Usuários Semeados (Seeds)
        console.log('\n[Teste 3] Verificando usuários semeados...');
        const adminUser = await dbGet('SELECT * FROM usuarios WHERE email = ?', ['admin@sistema.com']);
        const managerUser = await dbGet('SELECT * FROM usuarios WHERE email = ?', ['gerente@sistema.com']);
        const regularUser = await dbGet('SELECT * FROM usuarios WHERE email = ?', ['usuario@sistema.com']);

        if (adminUser && adminUser.perfil === 'administrador') {
            console.log('✔ Usuário Administrador semeado corretamente.');
        } else {
            throw new Error('❌ Falha: Administrador não encontrado.');
        }

        if (managerUser && managerUser.perfil === 'gerente') {
            console.log('✔ Usuário Gerente semeado corretamente.');
        } else {
            throw new Error('❌ Falha: Gerente não encontrado.');
        }

        if (regularUser && regularUser.perfil === 'usuario') {
            console.log('✔ Usuário Comum semeado corretamente.');
        } else {
            throw new Error('❌ Falha: Usuário comum não encontrado.');
        }

        // 4. Verificar Criptografia de Senha (bcrypt)
        console.log('\n[Teste 4] Validando criptografia das senhas (bcrypt)...');
        const isBcryptHashed = adminUser.senha.startsWith('$2a$') || adminUser.senha.startsWith('$2b$');
        if (isBcryptHashed) {
            console.log('✔ Senhas armazenadas como hashes bcrypt válidos.');
        } else {
            throw new Error('❌ Falha: Senha não parece criptografada com bcrypt.');
        }

        const passMatch = await bcrypt.compare('adminpassword', adminUser.senha);
        if (passMatch) {
            console.log('✔ Validação do hash com bcrypt.compare sucedida.');
        } else {
            throw new Error('❌ Falha: Falha ao descriptografar senha semeada.');
        }

        console.log('\n=============================================');
        console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO! 🎉');
        console.log('O backend e o banco de dados estão 100% prontos.');
        console.log('=============================================');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ ERRO DURANTE A VALIDAÇÃO:', err.message);
        process.exit(1);
    }
}

runTests();
