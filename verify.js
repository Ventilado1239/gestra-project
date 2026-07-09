// Script de Validação Automatizada do Backend
// Verifica conexão com banco de dados, tabelas, relacionamentos e seeds.

const { initializeDatabase, dbGet, dbAll } = require('./backend/database');
const bcrypt = require('bcryptjs');
const authController = require('./backend/controllers/authController');
const taskController = require('./backend/controllers/taskController');

function mockResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

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

        // 5. Verificar regras de segurança de cadastro e tarefas
        console.log('\n[Teste 5] Validando regras de perfil e tarefas...');

        const registerRes = mockResponse();
        const uniqueEmail = `teste_publico_${Date.now()}@sistema.com`;
        await authController.register({
            body: {
                nome: 'Teste Publico',
                email: uniqueEmail,
                senha: 'senhateste',
                perfil: 'administrador'
            }
        }, registerRes);

        const publicUser = await dbGet('SELECT perfil FROM usuarios WHERE email = ?', [uniqueEmail]);
        if (registerRes.statusCode === 201 && publicUser && publicUser.perfil === 'usuario') {
            console.log('✔ Cadastro público sempre cria perfil usuario.');
        } else {
            throw new Error('❌ Falha: cadastro público aceitou perfil privilegiado.');
        }

        const projectOnlyManager = await dbGet("SELECT id FROM projetos WHERE nome = 'Campanha de Marketing Q3'");
        const createTaskRes = mockResponse();
        await taskController.create({
            body: {
                projeto_id: projectOnlyManager.id,
                titulo: 'Teste de Responsável Inválido',
                descricao: 'Não deve criar tarefa para usuário fora do projeto.',
                responsavel_id: regularUser.id,
                status: 'A Fazer',
                prazo: new Date().toISOString().split('T')[0]
            }
        }, createTaskRes);

        if (createTaskRes.statusCode === 400) {
            console.log('✔ Tarefa rejeita responsável que não participa do projeto.');
        } else {
            throw new Error('❌ Falha: tarefa aceitou responsável fora do projeto.');
        }

        const someoneElsesTask = await dbGet(
            "SELECT id FROM tarefas WHERE responsavel_id != ? AND projeto_id IN (SELECT projeto_id FROM projeto_usuarios WHERE usuario_id = ?) LIMIT 1",
            [regularUser.id, regularUser.id]
        );
        const updateTaskRes = mockResponse();
        await taskController.update({
            params: { id: someoneElsesTask.id },
            body: { status: 'Concluída' },
            user: regularUser
        }, updateTaskRes);

        if (updateTaskRes.statusCode === 403) {
            console.log('✔ Usuário comum só atualiza tarefas atribuídas a ele.');
        } else {
            throw new Error('❌ Falha: usuário comum alterou tarefa de outro responsável.');
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
