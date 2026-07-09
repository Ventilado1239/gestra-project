# Guia para Gravação do Vídeo de Demonstração

Este documento serve como um roteiro prático para que você grave o vídeo de demonstração do **Sistema de Gerenciamento de Projetos e Tarefas**, conforme solicitado nos entregáveis da Atividade de Recuperação.

---

## 📽️ Recomendações Gerais para o Vídeo
* **Duração:** Entre 3 e 5 minutos são suficientes para cobrir todos os fluxos.
* **Ferramentas Gratuitas de Gravação:**
  - **OBS Studio** (Altamente recomendado, gratuito e sem marca d'água).
  - **Loom** (Gravação direta pelo navegador, muito prático).
  - **Gravação de Tela do Windows** (`Win + Alt + R` ou pelo menu `Xbox Game Bar`).
* **Áudio:** Se possível, utilize voz para narrar os passos que está realizando. Se preferir não narrar, use caixas de texto ou digite em um bloco de notas ao longo do vídeo para demonstrar o que está acontecendo.

---

## 📑 Roteiro Sugerido de Demonstração (Passo a Passo)

### **Parte 1: Inicialização do Sistema (30 segundos)**
1. Mostre brevemente o terminal onde o servidor Node.js está rodando (comando `npm start` ou `npm run dev`).
2. Abra o navegador em `http://localhost:3000`.
3. Mostre a tela de login inicial do sistema **Gestra**.

### **Parte 2: Fluxo do Administrador - Gerenciamento de Usuários (1 minuto)**
1. Faça login com o perfil **Administrador**:
   - E-mail: `admin@sistema.com`
   - Senha: `adminpassword`
2. Mostre o Dashboard com os gráficos vazios ou com dados padrão.
3. Navegue até a aba **Usuários** (menu lateral).
4. Demonstre a criação de um novo usuário (ex: crie um usuário comum chamado "Roberto Alves", email "roberto@teste.com").
5. Mostre que o usuário foi adicionado com sucesso na tabela de listagem.
6. Faça logout da conta de Administrador.

### **Parte 3: Fluxo do Gerente - Projetos, Tarefas e PDF (1.5 minutos)**
1. Faça login com o perfil **Gerente de Projeto**:
   - E-mail: `gerente@sistema.com`
   - Senha: `gerentepassword`
2. Navegue até a aba **Projetos** e crie um novo projeto:
   - Nome: "Projeto de Integração de API"
   - Descrição: "Desenvolvimento de APIs RESTful e documentação."
   - Selecione os participantes (marque o usuário criado "Roberto Alves" e outros).
3. Salve o projeto. Clique sobre ele na listagem para ver seus detalhes.
4. Navegue até a aba **Quadro de Tarefas** e crie uma nova tarefa:
   - Vincule ao projeto: "Projeto de Integração de API"
   - Título: "Modelar o Banco de Dados Relacional"
   - Responsável: Selecione "Roberto Alves"
   - Defina uma data de vencimento (ex: coloque uma data no passado para simular atraso e testar o alerta de e-mail).
   - Salve a tarefa.
5. Volte na aba **Projetos**, clique no projeto e clique no botão **Gerar PDF**. Mostre o arquivo PDF baixado contendo todos os dados e tabelas formatados.
6. Faça logout da conta de Gerente.

### **Parte 4: Fluxo do Usuário Comum - Kanban e Atualização (1 minuto)**
1. Faça login com o perfil **Usuário Comum**:
   - E-mail: `roberto@teste.com` (ou `usuario@sistema.com`)
   - Senha: a senha que cadastrou (ou `usuariopassword`)
2. Mostre que a aba "Usuários" (exclusiva de admin) sumiu da barra lateral.
3. Navegue até o **Quadro de Tarefas**. Mostre as tarefas designadas.
4. Mude o status da tarefa "Modelar o Banco de Dados Relacional" de *A Fazer* para *Em Andamento* ou *Concluída* através do seletor. Mostre o card atualizando de coluna.
5. Mostre que o usuário comum só consegue atualizar o status, não possuindo permissões de alterar títulos ou excluir tarefas.
6. Faça logout.

### **Parte 5: Alertas de E-mail (30 segundos)**
1. Faça login com qualquer perfil e vá na aba **Alertas de E-mail**.
2. Clique no botão **Verificar e Disparar Alertas**.
3. Mostre o log de notificações gerado com o alerta de tarefa atrasada ou próxima do vencimento, incluindo o status de envio por SMTP.

---

Seguindo esse fluxo lógico, você demonstrará 100% dos requisitos funcionais obrigatórios e não funcionais exigidos pela banca avaliadora de forma direta e profissional!
