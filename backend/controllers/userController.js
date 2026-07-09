// Controller para Gerenciamento de Usuários (Apenas Administrador)
const bcrypt = require('bcryptjs');
const { dbRun, dbGet, dbAll } = require('../database');

// Listar todos os usuários
async function list(req, res) {
    try {
        const users = await dbAll('SELECT id, nome, email, perfil, created_at FROM usuarios ORDER BY nome ASC');
        return res.status(200).json(users);
    } catch (err) {
        console.error('Erro ao listar usuários:', err);
        return res.status(500).json({ message: 'Erro ao listar usuários.' });
    }
}

// Detalhar um usuário específico
async function getById(req, res) {
    const { id } = req.params;
    try {
        const user = await dbGet('SELECT id, nome, email, perfil, created_at FROM usuarios WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        return res.status(200).json(user);
    } catch (err) {
        console.error('Erro ao buscar usuário:', err);
        return res.status(500).json({ message: 'Erro ao buscar usuário.' });
    }
}

// Criar novo usuário (Admin)
async function create(req, res) {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({ message: 'Todos os campos (nome, email, senha, perfil) são obrigatórios.' });
    }

    if (!['administrador', 'gerente', 'usuario'].includes(perfil)) {
        return res.status(400).json({ message: 'Perfil inválido. Escolha entre administrador, gerente ou usuario.' });
    }

    try {
        const existingUser = await dbGet('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ message: 'Este email já está cadastrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedSenha = await bcrypt.hash(senha, salt);

        const result = await dbRun(
            'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            [nome, email, hashedSenha, perfil]
        );

        return res.status(201).json({
            message: 'Usuário criado com sucesso!',
            user: { id: result.lastID, nome, email, perfil }
        });
    } catch (err) {
        console.error('Erro ao criar usuário:', err);
        return res.status(500).json({ message: 'Erro ao criar usuário.' });
    }
}

// Atualizar usuário (Admin)
async function update(req, res) {
    const { id } = req.params;
    const { nome, email, perfil, senha } = req.body;

    if (!nome || !email || !perfil) {
        return res.status(400).json({ message: 'Nome, email e perfil são obrigatórios.' });
    }

    if (!['administrador', 'gerente', 'usuario'].includes(perfil)) {
        return res.status(400).json({ message: 'Perfil inválido.' });
    }

    try {
        const user = await dbGet('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Verificar se novo email choca com outro usuário
        const emailCheck = await dbGet('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
        if (emailCheck) {
            return res.status(400).json({ message: 'Este email já está sendo utilizado por outro usuário.' });
        }

        if (senha && senha.trim() !== '') {
            // Atualizar com nova senha
            const salt = await bcrypt.genSalt(10);
            const hashedSenha = await bcrypt.hash(senha, salt);
            await dbRun(
                'UPDATE usuarios SET nome = ?, email = ?, perfil = ?, senha = ? WHERE id = ?',
                [nome, email, perfil, hashedSenha, id]
            );
        } else {
            // Atualizar sem alterar senha
            await dbRun(
                'UPDATE usuarios SET nome = ?, email = ?, perfil = ? WHERE id = ?',
                [nome, email, perfil, id]
            );
        }

        return res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar usuário:', err);
        return res.status(500).json({ message: 'Erro ao atualizar usuário.' });
    }
}

// Excluir usuário (Admin)
async function remove(req, res) {
    const { id } = req.params;

    // Evitar que o próprio admin logado se exclua
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ message: 'Você não pode excluir sua própria conta.' });
    }

    try {
        const user = await dbGet('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        await dbRun('DELETE FROM usuarios WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Usuário excluído com sucesso!' });
    } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        return res.status(500).json({ message: 'Erro ao excluir usuário.' });
    }
}

module.exports = {
    list,
    getById,
    create,
    update,
    remove
};
