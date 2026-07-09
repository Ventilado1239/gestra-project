// Controller de Gerenciamento de Tarefas e Alertas por E-mail
const { dbRun, dbGet, dbAll } = require('../database');
const fs = require('fs');
const path = require('path');

const emailsLogPath = path.join(__dirname, '../../database/emails_sent.json');

// Garantir arquivo de log de emails
function logEmailSent(emailData) {
    let emails = [];
    try {
        if (fs.existsSync(emailsLogPath)) {
            const data = fs.readFileSync(emailsLogPath, 'utf8');
            emails = JSON.parse(data || '[]');
        }
    } catch (err) {
        console.error('Erro ao ler log de emails:', err);
    }

    // Gerar ID sequencial e data de envio
    emailData.id = Date.now() + Math.random().toString(36).substr(2, 5);
    emailData.enviado_em = new Date().toISOString();

    // Adicionar no início para ordem decrescente
    emails.unshift(emailData);

    try {
        fs.writeFileSync(emailsLogPath, JSON.stringify(emails, null, 2), 'utf8');
    } catch (err) {
        console.error('Erro ao salvar log de emails:', err);
    }
}

// Listar tarefas com filtros opcionais de projeto e status
async function list(req, res) {
    const { projeto_id, status } = req.query;
    
    try {
        let sql = `
            SELECT t.*, p.nome as projeto_nome, u.nome as responsavel_nome, u.email as responsavel_email 
            FROM tarefas t
            JOIN projetos p ON t.projeto_id = p.id
            LEFT JOIN usuarios u ON t.responsavel_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // Filtro de permissão: Usuários normais só vêem tarefas de projetos que participam
        if (req.user.perfil === 'usuario') {
            sql += ` AND t.projeto_id IN (SELECT projeto_id FROM projeto_usuarios WHERE usuario_id = ?)`;
            params.push(req.user.id);
        }

        // Filtro por projeto
        if (projeto_id) {
            sql += ` AND t.projeto_id = ?`;
            params.push(projeto_id);
        }

        // Filtro por status
        if (status) {
            sql += ` AND t.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY t.prazo ASC, t.created_at DESC`;

        const tasks = await dbAll(sql, params);

        // Executar verificação de alertas em segundo plano silenciosamente sempre que listamos
        // para garantir que novos alertas apareçam na tela dinamicamente.
        triggerEmailAlertsSilently().catch(err => console.error('Erro ao disparar alertas:', err));

        return res.status(200).json(tasks);
    } catch (err) {
        console.error('Erro ao listar tarefas:', err);
        return res.status(500).json({ message: 'Erro ao listar tarefas.' });
    }
}

// Detalhar tarefa
async function getById(req, res) {
    const { id } = req.params;
    try {
        const task = await dbGet(
            `SELECT t.*, p.nome as projeto_nome, u.nome as responsavel_nome 
             FROM tarefas t
             JOIN projetos p ON t.projeto_id = p.id
             LEFT JOIN usuarios u ON t.responsavel_id = u.id
             WHERE t.id = ?`,
            [id]
        );

        if (!task) {
            return res.status(404).json({ message: 'Tarefa não encontrada.' });
        }

        // Verificar permissão
        if (req.user.perfil === 'usuario') {
            const check = await dbGet(
                'SELECT 1 FROM projeto_usuarios WHERE projeto_id = ? AND usuario_id = ?',
                [task.projeto_id, req.user.id]
            );
            if (!check) {
                return res.status(403).json({ message: 'Você não tem permissão para visualizar esta tarefa.' });
            }
        }

        return res.status(200).json(task);
    } catch (err) {
        console.error('Erro ao detalhar tarefa:', err);
        return res.status(500).json({ message: 'Erro ao buscar detalhes da tarefa.' });
    }
}

// Criar tarefa (Apenas Gerente/Admin)
async function create(req, res) {
    const { projeto_id, titulo, descricao, responsavel_id, status, prazo } = req.body;

    if (!projeto_id || !titulo || !prazo) {
        return res.status(400).json({ message: 'Projeto, título e prazo são obrigatórios.' });
    }

    try {
        // Verificar se projeto existe
        const project = await dbGet('SELECT id FROM projetos WHERE id = ?', [projeto_id]);
        if (!project) {
            return res.status(400).json({ message: 'Projeto associado não encontrado.' });
        }

        // Inserir tarefa
        const taskStatus = status || 'A Fazer';
        const result = await dbRun(
            `INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel_id, status, prazo) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [projeto_id, titulo, descricao, responsavel_id || null, taskStatus, prazo]
        );

        return res.status(201).json({
            message: 'Tarefa criada com sucesso!',
            taskId: result.lastID
        });
    } catch (err) {
        console.error('Erro ao criar tarefa:', err);
        return res.status(500).json({ message: 'Erro ao criar tarefa.' });
    }
}

// Atualizar tarefa
async function update(req, res) {
    const { id } = req.params;
    const { titulo, descricao, responsavel_id, status, prazo } = req.body;

    try {
        const task = await dbGet('SELECT * FROM tarefas WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ message: 'Tarefa não encontrada.' });
        }

        // Controle de Acesso por Perfil
        if (req.user.perfil === 'usuario') {
            // Usuário comum pode apenas atualizar o status das tarefas do seu projeto
            if (status === undefined) {
                return res.status(403).json({ message: 'Usuários comuns só podem atualizar o status da tarefa.' });
            }

            // Verificar se o usuário participa do projeto da tarefa
            const checkParticipant = await dbGet(
                'SELECT 1 FROM projeto_usuarios WHERE projeto_id = ? AND usuario_id = ?',
                [task.projeto_id, req.user.id]
            );
            if (!checkParticipant) {
                return res.status(403).json({ message: 'Você não tem permissão neste projeto.' });
            }

            // Atualizar APENAS o status
            if (!['A Fazer', 'Em Andamento', 'Concluída'].includes(status)) {
                return res.status(400).json({ message: 'Status inválido.' });
            }

            await dbRun('UPDATE tarefas SET status = ? WHERE id = ?', [status, id]);
            return res.status(200).json({ message: 'Status da tarefa atualizado com sucesso!' });
        } else {
            // Gerente e Administrador podem atualizar todos os campos
            if (!titulo || !prazo) {
                return res.status(400).json({ message: 'Título e prazo são campos obrigatórios.' });
            }

            const taskStatus = status || task.status;
            if (!['A Fazer', 'Em Andamento', 'Concluída'].includes(taskStatus)) {
                return res.status(400).json({ message: 'Status inválido.' });
            }

            await dbRun(
                `UPDATE tarefas SET titulo = ?, descricao = ?, responsavel_id = ?, status = ?, prazo = ? 
                 WHERE id = ?`,
                [titulo, descricao, responsavel_id || null, taskStatus, prazo, id]
            );

            return res.status(200).json({ message: 'Tarefa atualizada com sucesso!' });
        }
    } catch (err) {
        console.error('Erro ao atualizar tarefa:', err);
        return res.status(500).json({ message: 'Erro ao atualizar tarefa.' });
    }
}

// Excluir tarefa (Apenas Gerente/Admin)
async function remove(req, res) {
    const { id } = req.params;

    try {
        const task = await dbGet('SELECT id FROM tarefas WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ message: 'Tarefa não encontrada.' });
        }

        await dbRun('DELETE FROM tarefas WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Tarefa excluída com sucesso!' });
    } catch (err) {
        console.error('Erro ao excluir tarefa:', err);
        return res.status(500).json({ message: 'Erro ao excluir tarefa.' });
    }
}

// Obter logs de e-mails enviados
function getEmailLogs(req, res) {
    try {
        if (fs.existsSync(emailsLogPath)) {
            const data = fs.readFileSync(emailsLogPath, 'utf8');
            return res.status(200).json(JSON.parse(data || '[]'));
        }
        return res.status(200).json([]);
    } catch (err) {
        console.error('Erro ao ler logs de e-mail:', err);
        return res.status(500).json({ message: 'Erro ao ler logs de e-mail.' });
    }
}

// Função auxiliar para verificar tarefas atrasadas/próximas e enviar "e-mails"
async function triggerEmailAlertsSilently() {
    // Carregar todas as tarefas não concluídas com seus respectivos responsáveis
    const tasks = await dbAll(`
        SELECT t.id, t.titulo, t.prazo, t.status, p.nome as projeto_nome, u.nome as responsavel_nome, u.email as responsavel_email
        FROM tarefas t
        JOIN projetos p ON t.projeto_id = p.id
        JOIN usuarios u ON t.responsavel_id = u.id
        WHERE t.status != 'Concluída'
    `);

    const today = new Date();
    today.setHours(0,0,0,0);

    // Carregar histórico para evitar enviar o mesmo alerta repetidamente no mesmo dia
    let sentHistory = [];
    const historyPath = path.join(__dirname, '../../database/alerts_history.json');
    try {
        if (fs.existsSync(historyPath)) {
            sentHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8') || '[]');
        }
    } catch (e) {}

    const todayStr = today.toISOString().split('T')[0];
    const newHistory = [...sentHistory].filter(item => item.data === todayStr); // manter apenas os de hoje

    for (const task of tasks) {
        const deadline = new Date(task.prazo);
        deadline.setHours(0,0,0,0);

        // Diferença em dias
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let warningType = null;
        let subject = '';
        let message = '';

        if (diffDays < 0) {
            warningType = 'atrasada';
            subject = `[ALERTA] Tarefa Atrasada: "${task.titulo}"`;
            message = `Olá, ${task.responsavel_nome}. A tarefa "${task.titulo}" no projeto "${task.projeto_nome}" está ATRASADA desde ${task.prazo}. Por favor, atualize o status assim que possível.`;
        } else if (diffDays <= 2) {
            warningType = 'proxima';
            subject = `[AVISO] Tarefa Próxima do Vencimento: "${task.titulo}"`;
            message = `Olá, ${task.responsavel_nome}. A tarefa "${task.titulo}" no projeto "${task.projeto_nome}" vence em breve (${task.prazo}). Fique atento ao prazo!`;
        }

        if (warningType) {
            // Verificar se já enviamos esse tipo de alerta para essa tarefa hoje
            const alreadySent = newHistory.some(h => h.taskId === task.id && h.type === warningType && h.data === todayStr);
            if (!alreadySent) {
                // Logar o email (simula o envio de e-mail)
                logEmailSent({
                    tarefa_id: task.id,
                    titulo: task.titulo,
                    projeto: task.projeto_nome,
                    responsavel: task.responsavel_nome,
                    email: task.responsavel_email,
                    assunto: subject,
                    mensagem: message,
                    tipo: warningType
                });

                // Registrar no histórico de envios do dia
                newHistory.push({
                    taskId: task.id,
                    type: warningType,
                    data: todayStr
                });
            }
        }
    }

    try {
        const databaseDir = path.dirname(historyPath);
        if (!fs.existsSync(databaseDir)) {
            fs.mkdirSync(databaseDir, { recursive: true });
        }
        fs.writeFileSync(historyPath, JSON.stringify(newHistory, null, 2), 'utf8');
    } catch (e) {
        console.error('Erro ao gravar histórico de alertas:', e);
    }
}

// Endpoint explícito para forçar disparo de alertas na UI
async function checkAlertsManual(req, res) {
    try {
        await triggerEmailAlertsSilently();
        return res.status(200).json({ message: 'Verificação de alertas concluída com sucesso!' });
    } catch (err) {
        console.error('Erro ao verificar alertas manualmente:', err);
        return res.status(500).json({ message: 'Erro ao verificar alertas.' });
    }
}

module.exports = {
    list,
    getById,
    create,
    update,
    remove,
    getEmailLogs,
    checkAlertsManual
};
