# Gestra - Sistema de Gerenciamento de Projetos e Tarefas

Este projeto consiste em um **Sistema de Gerenciamento de Projetos e Tarefas** desenvolvido como **Atividade de Recuperação para a disciplina de Residência Tecnológica V**. 

O sistema é uma aplicação web completa (SPA no frontend com API REST no backend) que possibilita o gerenciamento de demandas de equipes através de projetos e quadros Kanban, respeitando controles de permissões por perfil (RBAC) e auxiliando no acompanhamento de prazos com notificações e relatórios.

---

## 🚀 Funcionalidades Principais

* **Cadastro de Usuários e Login Seguro:** Criação de contas e sessões protegidas por JSON Web Tokens (JWT) armazenados em cookies seguros e localStorage.
* **Controle de Acesso por Perfil (RBAC):**
  - **Administrador:** Responsável por gerenciar usuários (CRUD) e acompanhar o sistema globalmente.
  - **Gerente de Projeto:** Responsável por criar e gerenciar (CRUD) projetos, tarefas, associar membros e gerar relatórios.
  - **Usuário Comum:** Pode participar de múltiplos projetos, visualizar o Kanban de suas tarefas, acompanhar prazos e atualizar status.
* **CRUD de Projetos:** Criação de ambientes colaborativos vinculando múltiplos membros da equipe.
* **CRUD de Tarefas:** Criação de atividades com títulos, descrições detalhadas, datas de vencimento (prazo) e responsáveis designados.
* **Quadro Kanban Interativo:** Visualização de tarefas divididas em colunas (*A Fazer*, *Em Andamento* e *Concluída*) com atualização rápida de status diretamente nos cards.
* **Dashboard Analítico:** Painel com cartões indicadores (projetos, tarefas, atrasadas) e gráfico doughnut dinâmico utilizando Chart.js.
* **Alertas Automatizados por E-mail (Simulado):** Rastreia tarefas próximas do vencimento (2 dias ou menos) ou atrasadas, gerando e-mails de alerta e guardando logs detalhados para auditoria na interface.
* **Relatório Consolidado em PDF:** Geração e download em tempo real de relatórios formatados contendo dados do progresso, equipe participante e lista de atividades do projeto.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:**
  - HTML5 (Estrutura semântica SPA)
  - Vanilla CSS3 (Design responsivo, variáveis HSL, Modo Escuro, micro-animações)
  - Vanilla JavaScript (Manipulação de DOM, roteamento e requisições HTTP)
  - **Chart.js** via CDN (Gráficos interativos)
  - **FontAwesome** via CDN (Biblioteca de ícones)
* **Backend:**
  - **Node.js** com **Express.js** (Servidor HTTP e API REST)
  - **JWT (jsonwebtoken)** para controle de sessões e autenticação
  - **Bcrypt.js** para criptografia unidirecional segura de senhas
  - **PDFKit** para geração dinâmica de PDFs
  - **Cookie-Parser & Cors** para gerenciamento de cookies e requisições cruzadas
* **Banco de Dados:**
  - **SQLite** (Banco de dados relacional baseado em arquivo, totalmente portátil)

---

## 📂 Estrutura do Repositório

```
project_management_system/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Registro, login e perfil
│   │   ├── projectController.js    # CRUD de projetos e membros
│   │   ├── taskController.js       # CRUD de tarefas e envio de alertas
│   │   ├── userController.js       # CRUD de usuários (Admin)
│   │   └── reportController.js     # Geração de PDF via pdfkit
│   ├── middleware/
│   │   └── authMiddleware.js       # Validação JWT e papéis de acesso
│   ├── database.js                 # Inicializador e queries promissificadas
│   └── server.js                   # Rotas Express e boot do servidor
├── database/
│   ├── schema.sql                  # Script SQL DDL de criação das tabelas
│   └── database.sqlite             # Arquivo do BD (gerado no primeiro boot)
├── docs/
│   ├── database_model.md           # Modelagem de dados e diagramas ERD
│   ├── requirements.md             # Requisitos e Histórias de Usuário
│   └── video_guide.md              # Roteiro passo a passo para gravação do vídeo
├── frontend/
│   ├── index.html                  # Interface única (SPA)
│   ├── index.css                   # Estilização premium responsiva e temas
│   └── index.js                    # Roteador SPA, formulários e Chart.js
├── verify.js                       # Script de testes automatizados do backend
├── package.json                    # Dependências e scripts npm
└── README.md                       # Documentação principal do projeto
```

---

## ⚙️ Instruções de Instalação e Execução

Siga os passos abaixo para rodar o projeto localmente em qualquer sistema operacional (Windows, macOS ou Linux):

### Pré-requisitos
Certifique-se de ter o **Node.js** instalado em sua máquina (recomendado versão 18 ou superior). Você pode verificar executando no terminal:
```bash
node -v
npm -v
```

### Passo 1: Clonar ou Baixar o Repositório
Faça o download do código fonte ou clone o repositório pelo terminal:
```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd project_management_system
```

### Passo 2: Instalar as Dependências do Node.js
Dentro da pasta raiz do projeto, instale todos os pacotes especificados no `package.json`:
```bash
npm install
```

### Passo 3: Executar a Validação Automatizada (Opcional)
Para certificar que o banco de dados relacional e a criptografia estão funcionando corretamente na máquina atual, você pode rodar o teste de validação:
```bash
npm test
```
*Isso executará o script `verify.js` que cria o banco temporariamente, insere registros, valida o schema e as senhas e exibe os resultados de aprovação.*

### Passo 4: Iniciar o Servidor
Execute o comando de inicialização da aplicação:
```bash
npm start
```
*Ao fazer isso, o console exibirá as mensagens confirmando a conexão com o banco, aplicação do schema SQL e a inicialização do servidor HTTP.*

### Passo 5: Acessar no Navegador
Abra o navegador de sua preferência e navegue até:
**`http://localhost:3000`**

---

## 🔑 Credenciais Padrão para Testes (Seeding)

Para facilitar a gravação da apresentação e testes iniciais, o banco de dados inicia pré-semeado com contas para cada perfil de acesso:

| Perfil | E-mail | Senha | Ações Permitidas |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@sistema.com` | `adminpassword` | CRUD total de Usuários, visualização global do sistema. |
| **Gerente de Projeto** | `gerente@sistema.com` | `gerentepassword` | CRUD de Projetos, CRUD de Tarefas, Gerar Relatórios PDF. |
| **Usuário Comum** | `usuario@sistema.com` | `usuariopassword` | Visualizar tarefas, mudar status no Kanban, ver prazos. |

*Nota:* Você também pode cadastrar novos usuários diretamente pela tela inicial clicando em "Cadastre-se". O perfil padrão ao se cadastrar autonomamente é **Usuário Comum**.

---

## 📊 Modelagem Relacional do Banco de Dados

O banco de dados relacional SQLite é composto por 4 tabelas conectadas de forma estrita com chaves estrangeiras:
1. **`usuarios`**: Armazena credenciais (com senhas criptografadas em bcrypt) e perfis.
2. **`projetos`**: Armazena as frentes de trabalho.
3. **`projeto_usuarios`**: Tabela associativa (relação Muitos-para-Muitos) que conecta membros aos projetos.
4. **`tarefas`**: Guarda as atividades, relacionando-as a um projeto (`projeto_id` - Relação 1:N) e a um responsável (`responsavel_id` - Relação 1:1).

Todos os relacionamentos utilizam `ON DELETE CASCADE` ou `ON DELETE SET NULL` para garantir a integridade referencial dos dados (violação e consistência relacional).
