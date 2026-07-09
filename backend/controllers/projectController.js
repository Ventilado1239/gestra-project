// Controller de Gerenciamento de Projetos
const { dbRun, dbGet, dbAll } = require('../database');

// Listar projetos (Admin/Gerente vê tudo, Usuário comum apenas os que participa)
async function list(req, res) {
    try {
        let projects;
        if (req.user.perfil === 'administrador' || req.user.perfil === 'gerente') {
            projects = await dbAll('SELECT * FROM projetos ORDER BY created_at DESC');
        } else {
            projects = await dbAll(
                `SELECT p.* FROM projetos p 
                 JOIN projeto_usuarios pu ON p.id = pu.projeto_id 
                 WHERE pu.usuario_id = ? 
                 ORDER BY p.created_at DESC`,
                [req.user.id]
            );
        }

        // Para cada projeto, carregar número de tarefas e membros associados
        for (let p of projects) {
            const tasksCount = await dbGet('SELECT COUNT(*) as count FROM tarefas WHERE projeto_id = ?', [p.id]);
            const membersCount = await dbGet('SELECT COUNT(*) as count FROM projeto_usuarios WHERE projeto_id = ?', [p.id]);
            p.total_tarefas = tasksCount.count;
            p.total_membros = membersCount.count;
        }

        return res.status(200).json(projects);
    } catch (err) {
        console.error('Erro ao listar projetos:', err);
        return res.status(500).json({ message: 'Erro ao listar projetos.' });
    }
}

// Detalhar um projeto
async function getById(req, res) {
    const { id } = req.params;

    try {
        const project = await dbGet('SELECT * FROM projetos WHERE id = ?', [id]);
        if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado.' });
        }

        // Verificar permissão
        if (req.user.perfil === 'usuario') {
            const check = await dbGet(
                'SELECT 1 FROM projeto_usuarios WHERE projeto_id = ? AND usuario_id = ?',
                [id, req.user.id]
            );
            if (!check) {
                return res.status(403).json({ message: 'Você não participa deste projeto.' });
            }
        }

        // Carregar membros do projeto
        const members = await dbAll(
            `SELECT u.id, u.nome, u.email, u.perfil FROM usuarios u 
             JOIN projeto_usuarios pu ON u.id = pu.usuario_id 
             WHERE pu.projeto_id = ?`,
            [id]
        );
        project.membros = members;

        return res.status(200).json(project);
    } catch (err) {
        console.error('Erro ao buscar projeto:', err);
        return res.status(500).json({ message: 'Erro ao buscar projeto.' });
    }
}

// Criar projeto (Apenas Gerente/Admin)
async function create(req, res) {
    const { nome, descricao, membros } = req.body;

    if (!nome) {
        return res.status(400).json({ message: 'O nome do projeto é obrigatório.' });
    }

    try {
        const result = await dbRun(
            'INSERT INTO projetos (nome, descricao) VALUES (?, ?)',
            [nome, descricao]
        );
        const projectId = result.lastID;

        // Associar membros se informados (membros é array de IDs de usuários)
        if (membros && Array.isArray(membros)) {
            for (const userId of membros) {
                await dbRun(
                    'INSERT OR IGNORE INTO projeto_usuarios (projeto_id, usuario_id) VALUES (?, ?)',
                    [projectId, userId]
                );
            }
        }

        return res.status(201).json({
            message: 'Projeto criado com sucesso!',
            projectId
        });
    } catch (err) {
        console.error('Erro ao criar projeto:', err);
        return res.status(500).json({ message: 'Erro ao criar projeto.' });
    }
}

// Atualizar projeto (Apenas Gerente/Admin)
async function update(req, res) {
    const { id } = req.params;
    const { nome, descricao, membros } = req.body;

    if (!nome) {
        return res.status(400).json({ message: 'O nome do projeto é obrigatório.' });
    }

    try {
        const project = await dbGet('SELECT id FROM projetos WHERE id = ?', [id]);
        if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado.' });
        }

        // Atualizar dados básicos
        await dbRun('UPDATE projetos SET nome = ?, descricao = ? WHERE id = ?', [nome, descricao, id]);

        // Sincronizar membros (remover todos e reinserir)
        if (membros && Array.isArray(membros)) {
            await dbRun('DELETE FROM projeto_usuarios WHERE projeto_id = ?', [id]);
            for (const userId of membros) {
                await dbRun(
                    'INSERT OR IGNORE INTO projeto_usuarios (projeto_id, usuario_id) VALUES (?, ?)',
                    [id, userId]
                );
            }
        }

        return res.status(200).json({ message: 'Projeto atualizado com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar projeto:', err);
        return res.status(500).json({ message: 'Erro ao atualizar projeto.' });
    }
}

// Excluir projeto (Apenas Gerente/Admin)
async function remove(req, res) {
    const { id } = req.params;

    try {
        const project = await dbGet('SELECT id FROM projetos WHERE id = ?', [id]);
        if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado.' });
        }

        // O SQLite com ON DELETE CASCADE configurado nas chaves estrangeiras apagará automaticamente
        // os registros em projeto_usuarios e tarefas associados.
        await dbRun('DELETE FROM projetos WHERE id = ?', [id]);

        return res.status(200).json({ message: 'Projeto excluído com sucesso!' });
    } catch (err) {
        console.error('Erro ao excluir projeto:', err);
        return res.status(500).json({ message: 'Erro ao excluir projeto.' });
    }
}

module.exports = {
    list,
    getById,
    create,
    update,
    remove
};
