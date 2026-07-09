// Controller de Autenticação (Login e Cadastro)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet } = require('../database');
const { JWT_SECRET } = require('../middleware/authMiddleware');

async function register(req, res) {
    const { nome, email, senha } = req.body;

    // Validação de campos obrigatórios
    if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }

    // Cadastro publico sempre cria usuario comum.
    const userPerfil = 'usuario';

    try {
        // Verificar se usuário já existe
        const existingUser = await dbGet('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ message: 'Este email já está cadastrado.' });
        }

        // Criptografar senha
        const salt = await bcrypt.genSalt(10);
        const hashedSenha = await bcrypt.hash(senha, salt);

        // Inserir usuário
        const result = await dbRun(
            'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            [nome, email, hashedSenha, userPerfil]
        );

        return res.status(201).json({
            message: 'Usuário cadastrado com sucesso!',
            userId: result.lastID
        });

    } catch (err) {
        console.error('Erro no cadastro de usuário:', err);
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
}

async function login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        // Buscar usuário
        const user = await dbGet('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (!user) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // Verificar senha
        const isMatch = await bcrypt.compare(senha, user.senha);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Configurar cookie HTTP-only
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 1 dia
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });

        // Retornar usuário (sem a senha)
        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                perfil: user.perfil
            },
            token
        });

    } catch (err) {
        console.error('Erro no login:', err);
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
}

function logout(req, res) {
    res.clearCookie('token');
    return res.status(200).json({ message: 'Logout realizado com sucesso!' });
}

function getProfile(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Não autorizado.' });
    }
    return res.status(200).json({ user: req.user });
}

module.exports = {
    register,
    login,
    logout,
    getProfile
};
