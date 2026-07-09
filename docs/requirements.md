# Documento de Requisitos e Histórias de Usuário (HU)

Este documento contém os requisitos funcionais (RF), requisitos não funcionais (RNF) e as histórias de usuário (HU) que fundamentam o desenvolvimento do **Sistema de Gerenciamento de Projetos e Tarefas**.

---

## 1. Requisitos Funcionais (RF)

| Código | Descrição | Status no Sistema |
| :--- | :--- | :--- |
| **RF01** | O sistema deve permitir o cadastro de usuários. | Implementado (Cadastro aberto e via painel do Administrador) |
| **RF02** | O sistema deve permitir login e autenticação. | Implementado (Sessão segura via JWT em Cookies HTTP-Only) |
| **RF03** | O sistema deve possuir controle de acesso por perfil. | Implementado (Perfis: Administrador, Gerente de Projeto e Usuário Comum) |
| **RF04** | O sistema deve permitir o gerenciamento (CRUD) de projetos. | Implementado (Permissão de escrita para Gerente/Admin, leitura de projetos associados para Usuário) |
| **RF05** | O sistema deve permitir o gerenciamento (CRUD) de tarefas. | Implementado (Permissão de escrita para Gerente/Admin, leitura para Usuário) |
| **RF06** | O sistema deve permitir atribuir responsáveis às tarefas. | Implementado (Atribuição a um usuário cadastrado no sistema) |
| **RF07** | O sistema deve permitir atualizar o status das tarefas. | Implementado (Opções: *A Fazer*, *Em Andamento* e *Concluída*) |
| **RF08** | O sistema deve enviar alertas por e-mail. | Implementado (envio via SMTP para tarefas vencidas ou próximas do prazo, com log de auditoria) |
| **RF09** | O sistema deve gerar relatórios em PDF. | Implementado (Download de PDF dinâmico com estatísticas de progresso, tarefas e equipe) |
| **RF10** | O sistema deve apresentar um dashboard com indicadores. | Implementado (Indicadores visuais de status com gráficos Chart.js e alertas de urgência) |

---

## 2. Requisitos Não Funcionais (RNF)

| Código | Descrição | Abordagem Técnica |
| :--- | :--- | :--- |
| **RNF01** | O sistema deve utilizar banco de dados relacional. | Utilizado SQLite (Banco de dados relacional incorporado robusto) |
| **RNF02** | As senhas devem ser armazenadas de forma segura. | Hashing criptográfico unidirecional com salt utilizando a biblioteca `bcryptjs` |
| **RNF03** | O sistema deve possuir interface amigável e responsiva. | Layout responsivo (Vanilla CSS Grid/Flexbox), variáveis HSL, suporte a Modo Escuro |
| **RNF04** | O sistema deve validar os campos obrigatórios. | Validação estrita no backend (REST API) e validação HTML5 nativa no front |
| **RNF05** | O sistema deve restringir o acesso conforme o perfil do usuário. | Controle de acesso baseado em papéis (RBAC) com middleware JWT |

---

## 3. Histórias de Usuário (HU)

### **HU01: Cadastro de Usuário**
* **Como** usuário visitante do sistema,
* **quero** realizar o meu cadastro informando nome completo, e-mail e senha,
* **para** poder ter acesso às funcionalidades e acompanhar as minhas demandas.
* *Critérios de Aceitação:* O e-mail precisa ser único. A senha precisa ser devidamente armazenada de forma criptografada. O perfil padrão ao se cadastrar autonomamente é "Usuário Comum" (usuario).

### **HU02: Autenticação**
* **Como** usuário cadastrado,
* **quero** realizar login com meu e-mail e senha,
* **para** acessar com segurança meus projetos e tarefas e manter minha sessão ativa de forma segura.
* *Critérios de Aceitação:* Credenciais incorretas devem retornar erro amigável sem expor detalhes internos. A sessão do usuário é identificada via cookie JWT seguro.

### **HU03: Gerenciamento de Usuários (Administrador)**
* **Como** Administrador do sistema,
* **quero** acessar um painel dedicado de usuários para listar, cadastrar, editar e excluir contas de acesso,
* **para** acompanhar o uso do sistema e designar os perfis (Administrador, Gerente, Usuário Comum) adequadamente.
* *Critérios de Aceitação:* Apenas usuários logados com perfil "administrador" podem visualizar a aba de usuários e efetuar mutações (criar, editar perfil ou excluir). O administrador não pode excluir a si mesmo.

### **HU04: Criação de Projetos (Gerente)**
* **Como** Gerente de Projeto ou Administrador,
* **quero** criar novos projetos definindo nome, descrição e associando múltiplos usuários como membros,
* **para** organizar e estruturar os ambientes de trabalho da equipe.
* *Critérios de Aceitação:* Usuários com perfil "usuario" (comum) não podem criar ou alterar projetos, mas conseguem visualizar os projetos em que foram explicitamente vinculados.

### **HU05: Criação de Tarefas e Responsáveis**
* **Como** Gerente de Projeto ou Administrador,
* **quero** cadastrar tarefas definindo título, descrição detalhada, prazo (data de vencimento) e associar um membro participante do projeto como responsável,
* **para** distribuir a carga de trabalho.
* *Critérios de Aceitação:* Uma tarefa obrigatoriamente deve fazer parte de um projeto existente e possuir uma data de vencimento.

### **HU06: Atualização de Status da Tarefa**
* **Como** usuário comum (responsável ou membro do projeto),
* **quero** visualizar as tarefas atribuídas a mim ou ao meu projeto no quadro Kanban e alterar o status (A Fazer, Em Andamento, Concluída) de forma ágil,
* **para** sinalizar à equipe o andamento das minhas entregas.
* *Critérios de Aceitação:* Usuários comuns podem apenas editar o campo "Status" da tarefa no quadro, sendo bloqueados de alterar outros campos (título, descrição, prazo, responsável) que são exclusivos de Gerentes e Administradores.

### **HU07: Alertas de Tarefas por E-mail**
* **Como** usuário responsável por tarefas,
* **quero** receber alertas por e-mail quando minhas tarefas estiverem atrasadas ou próximas de vencer (2 dias ou menos),
* **para** eu não perder prazos e agir rapidamente.
* *Critérios de Aceitação:* O sistema gera alertas automaticamente ao consultar demandas e guarda um log estruturado contendo dados do destinatário, assunto, corpo do e-mail e data. O sistema previne envios duplicados de alertas para o mesmo estado da tarefa no mesmo dia.

### **HU08: Relatório de Acompanhamento**
* **Como** Gerente de Projeto ou Administrador,
* **quero** gerar um relatório em formato PDF para um projeto específico,
* **para** imprimir, compartilhar ou arquivar informações consolidadas sobre o progresso das tarefas e participação da equipe.
* *Critérios de Aceitação:* O PDF deve ser gerado no backend de forma dinâmica, contendo nome do projeto, barra de progresso em porcentagem, contadores de tarefas (totais e por status), lista de membros da equipe e lista detalhada de tarefas com seus prazos e responsáveis.
