# Checklist de Entrega - Atividade de Recuperação

Este arquivo mapeia os entregáveis exigidos no PDF da atividade para os arquivos e funcionalidades do projeto.

## Entregáveis

| Exigência | Onde está no projeto | Status |
| :--- | :--- | :--- |
| Código-fonte da aplicação | `backend/`, `frontend/`, `package.json` | Implementado |
| Vídeo demonstrando o funcionamento | Enviar na plataforma da disciplina ou inserir o link no README | Pendente de gravação |
| Documento com requisitos e histórias de usuário | `docs/requirements.md` | Implementado |
| Modelagem do banco de dados | `docs/database_model.md` | Implementado |
| Script SQL de criação das tabelas | `database/schema.sql` | Implementado |

## Funcionalidades Obrigatórias

| Requisito | Evidência |
| :--- | :--- |
| Cadastro de usuários | Tela inicial e `POST /api/auth/register` |
| Login e autenticação | JWT/cookie em `backend/controllers/authController.js` |
| Controle de acesso por perfil | Middleware `requireRole` e regras por controller |
| CRUD de projetos | Rotas `/api/projects` e tela Projetos |
| CRUD de tarefas | Rotas `/api/tasks` e quadro Kanban |
| Associação de usuários aos projetos | Tabela `projeto_usuarios` e modal de projetos |
| Responsável por tarefa | Campo `responsavel_id` em `tarefas` |
| Status A Fazer, Em Andamento e Concluída | Check constraint no SQL e validação no backend |
| Filtro por projeto e status | Filtros do Kanban e query params da API |
| Alertas por e-mail | Nodemailer com SMTP real ou Ethereal para demonstração |
| Relatórios em PDF | `backend/controllers/reportController.js` |
| Dashboard com indicadores | Tela Dashboard com contadores e gráfico |

## Observação Para a Entrega

Antes de enviar, grave o vídeo seguindo `docs/video_guide.md` e mostre o link de pré-visualização do e-mail quando usar `SMTP_MODE=ethereal`.
