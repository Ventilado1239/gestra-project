// Servidor Principal Express
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const { initializeDatabase } = require('./database');
const { authenticateToken, requireRole } = require('./middleware/authMiddleware');

const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const projectController = require('./controllers/projectController');
const taskController = require('./controllers/taskController');
const reportController = require('./controllers/reportController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Servir arquivos estáticos do Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// --- ROTAS DA API ---

// 1. Autenticação (Pública)
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', authController.logout);
app.get('/api/auth/me', authenticateToken, authController.getProfile);

// 2. Gerenciamento de Usuários
// Listar usuários é aberto para Admin e Gerente (para permitir adicionar membros e responsáveis)
app.get('/api/users', authenticateToken, requireRole(['administrador', 'gerente']), userController.list);
app.get('/api/users/:id', authenticateToken, requireRole(['administrador']), userController.getById);
app.post('/api/users', authenticateToken, requireRole(['administrador']), userController.create);
app.put('/api/users/:id', authenticateToken, requireRole(['administrador']), userController.update);
app.delete('/api/users/:id', authenticateToken, requireRole(['administrador']), userController.remove);

// 3. Gerenciamento de Projetos
app.get('/api/projects', authenticateToken, projectController.list);
app.get('/api/projects/:id', authenticateToken, projectController.getById);
app.post('/api/projects', authenticateToken, requireRole(['administrador', 'gerente']), projectController.create);
app.put('/api/projects/:id', authenticateToken, requireRole(['administrador', 'gerente']), projectController.update);
app.delete('/api/projects/:id', authenticateToken, requireRole(['administrador', 'gerente']), projectController.remove);

// 4. Gerenciamento de Tarefas
app.get('/api/tasks', authenticateToken, taskController.list);
app.get('/api/tasks/:id', authenticateToken, taskController.getById);
app.post('/api/tasks', authenticateToken, requireRole(['administrador', 'gerente']), taskController.create);
app.put('/api/tasks/:id', authenticateToken, taskController.update); // Internamente valida o perfil do usuário
app.delete('/api/tasks/:id', authenticateToken, requireRole(['administrador', 'gerente']), taskController.remove);

// 5. Alertas de E-mail
app.get('/api/notifications', authenticateToken, taskController.getEmailLogs);
app.post('/api/notifications/check', authenticateToken, taskController.checkAlertsManual);

// 6. Relatórios em PDF
app.get('/api/reports/project/:id', authenticateToken, reportController.generateProjectReport);

// Qualquer outra rota serve o frontend (SPA Fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Inicializar banco de dados e iniciar o servidor
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

startServer();
