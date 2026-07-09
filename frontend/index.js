// Gestra - Client SPA Core Logic
// Handle state, API requests, view routing, rendering, Chart.js integration, and modals.

const API_BASE = '/api';

// --- ESTADO GLOBAL DO CLIENTE ---
const state = {
    user: null,          // { id, nome, email, perfil }
    token: localStorage.getItem('gestra_token') || null,
    currentView: 'dashboard',
    projects: [],
    tasks: [],
    users: [],          // Apenas para Admin/Gerente
    notifications: [],   // Histórico de e-mails
    selectedProject: null, // Detalhes de um projeto
    charts: {
        status: null
    }
};

// --- FETCH WRAPPER COM AUTH AUTOMÁTICA ---
async function apiFetch(endpoint, options = {}) {
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        credentials: 'include' // envia cookies
    };

    // Sempre enviar o token como Bearer header (fallback se cookie falhar)
    if (state.token) {
        config.headers['Authorization'] = `Bearer ${state.token}`;
    }

    // Se for FormData ou stream, não definir Content-Type
    if (options.body && typeof options.body !== 'string') {
        delete config.headers['Content-Type'];
    }

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    return res;
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupEventListeners();
    setupDateHeader();
});

// --- AUTENTICAÇÃO E SESSÃO ---
async function checkSession() {
    showLoading(true);

    // Segurança: timeout de 6 segundos para não ficar infinito
    const timeout = setTimeout(() => {
        console.warn('Timeout ao verificar sessão.');
        showLoading(false);
        showLogin();
    }, 6000);

    try {
        const res = await apiFetch('/auth/me');
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            state.user = data.user;
            showApp();
        } else {
            showLogin();
        }
    } catch (err) {
        clearTimeout(timeout);
        console.error('Erro na validação de sessão:', err);
        showLogin();
    } finally {
        showLoading(false);
    }
}

function showLogin() {
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    // Atualizar dados de perfil na barra lateral
    document.getElementById('profile-name').textContent = state.user.nome;
    
    const roleBadge = document.getElementById('profile-role');
    roleBadge.textContent = state.user.perfil.toUpperCase();
    roleBadge.className = 'user-role badge';
    if (state.user.perfil === 'administrador') roleBadge.classList.add('badge-danger');
    else if (state.user.perfil === 'gerente') roleBadge.classList.add('badge-primary');
    else roleBadge.classList.add('badge-success');

    // Controlar visibilidade de abas conforme Perfil
    if (state.user.perfil === 'administrador') {
        document.getElementById('nav-users').style.display = 'block';
    } else {
        document.getElementById('nav-users').style.display = 'none';
    }

    // Gerente e Admin podem ver os botões de criar
    const isManager = state.user.perfil === 'gerente' || state.user.perfil === 'administrador';
    document.getElementById('btn-new-project').style.display = isManager ? 'inline-flex' : 'none';
    document.getElementById('btn-new-task').style.display = isManager ? 'inline-flex' : 'none';

    // Carregar dados e navegar
    navigateTo(state.currentView);
}

function showLoading(show) {
    document.getElementById('loading-screen').style.display = show ? 'flex' : 'none';
}

// --- CONTROLE DE ROTAS / NAVEGAÇÃO ---
function navigateTo(viewId) {
    state.currentView = viewId;
    
    // Esconder todas as seções
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    
    // Desmarcar itens da sidebar
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    
    // Marcar ativo na sidebar
    const navItem = document.querySelector(`.sidebar-nav li[data-view="${viewId}"]`);
    if (navItem) navItem.classList.add('active');

    // Mostrar a seção atual
    const section = document.getElementById(`view-${viewId}`);
    if (section) section.style.display = 'block';

    // Atualizar título do cabeçalho
    const titles = {
        dashboard: 'Indicadores e Dashboard',
        projects: 'Gerenciamento de Projetos',
        tasks: 'Quadro Kanban de Tarefas',
        users: 'Controle de Usuários e Perfis',
        notifications: 'Logs de Alertas por E-mail'
    };
    document.getElementById('page-title').textContent = titles[viewId] || 'Gestra';

    // Se estiver detalhando um projeto, voltar para lista ao entrar na aba projetos
    if (viewId === 'projects') {
        document.getElementById('project-detail-panel').style.display = 'none';
        document.getElementById('projects-list-container').style.display = 'grid';
        document.querySelector('#view-projects .view-header-actions').style.display = 'flex';
    }

    // Fechar sidebar mobile ao navegar
    closeMobileSidebar();

    // Carregar dados correspondentes
    loadViewData(viewId);
}

async function loadViewData(viewId) {
    showLoading(true);
    try {
        if (viewId === 'dashboard') {
            await Promise.all([fetchProjects(), fetchTasks(), fetchNotifications()]);
            renderDashboard();
        } else if (viewId === 'projects') {
            await fetchProjects();
            renderProjects();
        } else if (viewId === 'tasks') {
            await Promise.all([fetchProjects(), fetchTasks()]);
            populateTaskFilters();
            renderKanban();
        } else if (viewId === 'users') {
            await fetchUsers();
            renderUsers();
        } else if (viewId === 'notifications') {
            await fetchNotifications();
            renderNotifications();
        }
    } catch (err) {
        showToast('Erro ao carregar dados do servidor.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// --- MOBILE SIDEBAR ---
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

// --- FETCHES DE DADOS ---
async function fetchProjects() {
    const res = await apiFetch('/projects');
    if (res.ok) {
        state.projects = await res.json();
    } else {
        throw new Error('Erro ao buscar projetos');
    }
}

async function fetchTasks() {
    const res = await apiFetch('/tasks');
    if (res.ok) {
        state.tasks = await res.json();
    } else {
        throw new Error('Erro ao buscar tarefas');
    }
}

async function fetchUsers() {
    const res = await apiFetch('/users');
    if (res.ok) {
        state.users = await res.json();
    } else {
        throw new Error('Erro ao buscar usuários');
    }
}

async function fetchNotifications() {
    const res = await apiFetch('/notifications');
    if (res.ok) {
        state.notifications = await res.json();
    } else {
        throw new Error('Erro ao buscar notificações');
    }
}

// --- RENDERIZADORES ---

// 1. DASHBOARD
function renderDashboard() {
    // Stats counters
    document.getElementById('dash-projects-count').textContent = state.projects.length;
    document.getElementById('dash-tasks-count').textContent = state.tasks.length;
    
    const pendingTasks = state.tasks.filter(t => t.status !== 'Concluída');
    document.getElementById('dash-pending-count').textContent = pendingTasks.length;

    // Calcular atrasadas ou próximas
    const today = new Date();
    today.setHours(0,0,0,0);
    const criticalTasks = pendingTasks.filter(t => {
        const deadline = new Date(t.prazo);
        deadline.setHours(0,0,0,0);
        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return diffDays <= 2; // atrasadas ou a vencer em 2 dias
    });
    document.getElementById('dash-overdue-count').textContent = criticalTasks.length;

    // Renderizar gráfico status (Chart.js)
    renderStatusChart();

    // Renderizar tarefas críticas
    const urgentContainer = document.getElementById('dash-urgent-tasks');
    urgentContainer.innerHTML = '';
    
    if (criticalTasks.length === 0) {
        urgentContainer.innerHTML = '<p class="empty-state"><i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 24px;"></i><br>Nenhuma tarefa atrasada ou próxima do vencimento.</p>';
    } else {
        criticalTasks.forEach(task => {
            const deadline = new Date(task.prazo);
            deadline.setHours(0,0,0,0);
            const isOverdue = deadline < today;

            const div = document.createElement('div');
            div.className = `urgent-task-item ${isOverdue ? '' : 'warning'}`;
            div.innerHTML = `
                <div class="urgent-task-info">
                    <h4>${escapeHTML(task.titulo)}</h4>
                    <p>Projeto: ${escapeHTML(task.projeto_nome)} | Responsável: ${escapeHTML(task.responsavel_nome || 'Não atribuído')}</p>
                </div>
                <span class="badge ${isOverdue ? 'badge-danger' : 'badge-warning'}">
                    ${isOverdue ? 'Atrasada' : 'Próxima'} (${task.prazo})
                </span>
            `;
            urgentContainer.appendChild(div);
        });
    }
}

function renderStatusChart() {
    const todo = state.tasks.filter(t => t.status === 'A Fazer').length;
    const doing = state.tasks.filter(t => t.status === 'Em Andamento').length;
    const done = state.tasks.filter(t => t.status === 'Concluída').length;

    const ctx = document.getElementById('tasksStatusChart').getContext('2d');
    
    // Destruir gráfico anterior para evitar sobreposição
    if (state.charts.status) {
        state.charts.status.destroy();
    }

    const isDark = document.body.classList.contains('dark-mode');
    const labelColor = isDark ? '#cbd5e1' : '#475569';

    // Se não houver tarefas, exibe dados vazios
    if (state.tasks.length === 0) {
        state.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Nenhuma Tarefa'],
                datasets: [{
                    data: [1],
                    backgroundColor: [isDark ? '#1e293b' : '#e2e8f0']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: labelColor, font: { family: 'Inter' } } } } }
        });
        return;
    }

    state.charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['A Fazer', 'Em Andamento', 'Concluída'],
            datasets: [{
                data: [todo, doing, done],
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
                borderColor: 'transparent',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: labelColor,
                        font: { family: 'Inter', size: 13 },
                        padding: 16
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// 2. PROJETOS
function renderProjects() {
    const container = document.getElementById('projects-list-container');
    container.innerHTML = '';

    const query = document.getElementById('project-search').value.toLowerCase();
    const filtered = state.projects.filter(p => 
        p.nome.toLowerCase().includes(query) || 
        (p.descricao && p.descricao.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state"><i class="fa-regular fa-folder-open" style="font-size: 32px; margin-bottom: 12px; color: var(--text-muted);"></i><br>Nenhum projeto encontrado.</p>';
        return;
    }

    filtered.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.animationDelay = `${i * 0.05}s`;
        card.innerHTML = `
            <h3>${escapeHTML(p.nome)}</h3>
            <p>${escapeHTML(p.descricao || 'Sem descrição cadastrada.')}</p>
            <div class="project-card-footer">
                <span><i class="fa-solid fa-users"></i> ${p.total_membros || 0} membro(s)</span>
                <span><i class="fa-solid fa-list-check"></i> ${p.total_tarefas || 0} tarefa(s)</span>
            </div>
        `;
        card.addEventListener('click', () => showProjectDetails(p.id));
        container.appendChild(card);
    });
}

async function showProjectDetails(projectId) {
    showLoading(true);
    try {
        const res = await apiFetch(`/projects/${projectId}`);
        if (!res.ok) throw new Error('Não foi possível carregar o projeto.');

        const project = await res.json();
        state.selectedProject = project;

        // Buscar tarefas deste projeto específico
        const tasksRes = await apiFetch(`/tasks?projeto_id=${projectId}`);
        const pTasks = tasksRes.ok ? await tasksRes.json() : [];

        // Ocultar a grid e mostrar o painel de detalhes
        document.getElementById('projects-list-container').style.display = 'none';
        document.querySelector('#view-projects .view-header-actions').style.display = 'none';
        
        const panel = document.getElementById('project-detail-panel');
        panel.style.display = 'block';

        // Preencher informações do projeto
        document.getElementById('detail-project-name').textContent = project.nome;
        document.getElementById('detail-project-desc').textContent = project.descricao || 'Sem descrição.';
        document.getElementById('detail-members-count').textContent = project.membros.length;
        document.getElementById('detail-tasks-count').textContent = pTasks.length;

        // Renderizar membros
        const membersList = document.getElementById('detail-members-list');
        membersList.innerHTML = '';
        if (project.membros.length === 0) {
            membersList.innerHTML = '<p class="empty-state">Nenhum membro vinculado.</p>';
        } else {
            project.membros.forEach(m => {
                const div = document.createElement('div');
                div.className = 'member-item';
                div.innerHTML = `
                    <div class="member-avatar"><i class="fa-solid fa-user-tag"></i></div>
                    <div class="member-details">
                        <span class="member-name">${escapeHTML(m.nome)}</span>
                        <span class="member-email">${escapeHTML(m.email)}</span>
                    </div>
                    <span class="badge ${m.perfil === 'administrador' ? 'badge-danger' : m.perfil === 'gerente' ? 'badge-primary' : 'badge-success'}">${m.perfil}</span>
                `;
                membersList.appendChild(div);
            });
        }

        // Renderizar tarefas na tabela
        const tasksBody = document.getElementById('detail-tasks-body');
        tasksBody.innerHTML = '';
        if (pTasks.length === 0) {
            tasksBody.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhuma tarefa criada para este projeto.</td></tr>';
        } else {
            pTasks.forEach(t => {
                const tr = document.createElement('tr');
                let statusBadge = '';
                if (t.status === 'A Fazer') statusBadge = '<span class="badge badge-warning">A Fazer</span>';
                else if (t.status === 'Em Andamento') statusBadge = '<span class="badge badge-primary">Em Andamento</span>';
                else statusBadge = '<span class="badge badge-success">Concluída</span>';

                tr.innerHTML = `
                    <td style="font-weight: 600;">${escapeHTML(t.titulo)}</td>
                    <td>${escapeHTML(t.responsavel_nome || 'Não atribuído')}</td>
                    <td>${t.prazo}</td>
                    <td>${statusBadge}</td>
                `;
                tasksBody.appendChild(tr);
            });
        }

        // Permissões do painel de detalhes (Gerente/Admin)
        const isManager = state.user.perfil === 'gerente' || state.user.perfil === 'administrador';
        document.getElementById('btn-edit-project').style.display = isManager ? 'inline-flex' : 'none';
        document.getElementById('btn-delete-project').style.display = isManager ? 'inline-flex' : 'none';
        document.getElementById('btn-manage-members').style.display = isManager ? 'inline-block' : 'none';

    } catch (err) {
        showToast('Erro ao abrir detalhes do projeto.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// 3. TAREFAS / KANBAN
function populateTaskFilters() {
    const projSelect = document.getElementById('task-filter-project');
    const selectedVal = projSelect.value;
    
    projSelect.innerHTML = '<option value="">Todos os Projetos</option>';
    state.projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        if (p.id.toString() === selectedVal) opt.selected = true;
        projSelect.appendChild(opt);
    });
}

function renderKanban() {
    const todoContainer = document.getElementById('tasks-todo-container');
    const doingContainer = document.getElementById('tasks-doing-container');
    const doneContainer = document.getElementById('tasks-done-container');

    todoContainer.innerHTML = '';
    doingContainer.innerHTML = '';
    doneContainer.innerHTML = '';

    const filterProj = document.getElementById('task-filter-project').value;
    const filterStatus = document.getElementById('task-filter-status').value;

    let filtered = [...state.tasks];
    
    if (filterProj) {
        filtered = filtered.filter(t => t.projeto_id.toString() === filterProj);
    }
    if (filterStatus) {
        filtered = filtered.filter(t => t.status === filterStatus);
    }

    const isManager = state.user.perfil === 'gerente' || state.user.perfil === 'administrador';
    const today = new Date();
    today.setHours(0,0,0,0);

    let todoIdx = 0, doingIdx = 0, doneIdx = 0;

    filtered.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        
        // Calcular classe de prazo
        const deadline = new Date(task.prazo);
        deadline.setHours(0,0,0,0);
        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        let deadlineClass = '';
        if (task.status !== 'Concluída') {
            if (diffDays < 0) deadlineClass = 'danger';
            else if (diffDays <= 2) deadlineClass = 'warning';
        }

        // Criar opções do seletor de status para atualização rápida
        const selectOptions = `
            <select class="task-status-select" data-id="${task.id}">
                <option value="A Fazer" ${task.status === 'A Fazer' ? 'selected' : ''}>A Fazer</option>
                <option value="Em Andamento" ${task.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
                <option value="Concluída" ${task.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
            </select>
        `;

        card.innerHTML = `
            <h4>${escapeHTML(task.titulo)}</h4>
            <p>${escapeHTML(task.descricao || 'Sem descrição.')}</p>
            <div class="task-meta">
                <span class="task-assignee"><i class="fa-regular fa-user"></i> ${escapeHTML(task.responsavel_nome || 'Não atribuído')}</span>
                <span class="task-deadline ${deadlineClass}"><i class="fa-regular fa-calendar"></i> ${task.prazo}</span>
            </div>
            <div class="task-actions-row">
                ${selectOptions}
                ${isManager ? `
                    <div class="task-card-buttons">
                        <button class="btn btn-icon btn-small btn-secondary btn-edit-task-action" data-id="${task.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-icon btn-small btn-danger btn-delete-task-action" data-id="${task.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </div>
                ` : ''}
            </div>
        `;

        // Vincular listener de mudança de status no select
        card.querySelector('.task-status-select').addEventListener('change', async (e) => {
            const newStatus = e.target.value;
            await updateTaskStatus(task.id, newStatus);
        });

        // Vincular listeners para edição/exclusão se gerente
        if (isManager) {
            card.querySelector('.btn-edit-task-action').addEventListener('click', () => openEditTaskModal(task.id));
            card.querySelector('.btn-delete-task-action').addEventListener('click', () => deleteTask(task.id));
        }

        // Adicionar na coluna correta com delay de animação
        if (task.status === 'A Fazer') {
            card.style.animationDelay = `${todoIdx * 0.04}s`;
            todoContainer.appendChild(card);
            todoIdx++;
        } else if (task.status === 'Em Andamento') {
            card.style.animationDelay = `${doingIdx * 0.04}s`;
            doingContainer.appendChild(card);
            doingIdx++;
        } else if (task.status === 'Concluída') {
            card.style.animationDelay = `${doneIdx * 0.04}s`;
            doneContainer.appendChild(card);
            doneIdx++;
        }
    });

    // Atualizar contadores das colunas
    document.getElementById('count-todo').textContent = todoContainer.children.length;
    document.getElementById('count-doing').textContent = doingContainer.children.length;
    document.getElementById('count-done').textContent = doneContainer.children.length;

    // Mostrar empty state nas colunas sem itens
    if (todoContainer.children.length === 0) {
        todoContainer.innerHTML = '<p class="empty-state-col"><i class="fa-regular fa-clipboard"></i><br>Nenhuma tarefa</p>';
    }
    if (doingContainer.children.length === 0) {
        doingContainer.innerHTML = '<p class="empty-state-col"><i class="fa-solid fa-gears"></i><br>Nenhuma tarefa</p>';
    }
    if (doneContainer.children.length === 0) {
        doneContainer.innerHTML = '<p class="empty-state-col"><i class="fa-solid fa-trophy"></i><br>Nenhuma tarefa</p>';
    }
}

// 4. USUÁRIOS
function renderUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    if (state.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum usuário cadastrado.</td></tr>';
        return;
    }

    state.users.forEach(u => {
        const tr = document.createElement('tr');
        
        let perfilBadge = '';
        if (u.perfil === 'administrador') perfilBadge = '<span class="badge badge-danger">Administrador</span>';
        else if (u.perfil === 'gerente') perfilBadge = '<span class="badge badge-primary">Gerente</span>';
        else perfilBadge = '<span class="badge badge-success">Usuário</span>';

        // Botões de ação. Não permitir que o próprio admin logado se exclua
        const isSelf = u.id === state.user.id;
        const deleteBtn = isSelf ? '' : `<button class="btn btn-small btn-danger btn-delete-user" data-id="${u.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>`;

        tr.innerHTML = `
            <td style="font-weight: 600;">${escapeHTML(u.nome)}</td>
            <td>${escapeHTML(u.email)}</td>
            <td>${perfilBadge}</td>
            <td>${new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
            <td>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-small btn-warning btn-edit-user" data-id="${u.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    ${deleteBtn}
                </div>
            </td>
        `;

        tr.querySelector('.btn-edit-user').addEventListener('click', () => openEditUserModal(u.id));
        if (!isSelf) {
            tr.querySelector('.btn-delete-user').addEventListener('click', () => deleteUser(u.id));
        }

        tbody.appendChild(tr);
    });
}

// 5. NOTIFICAÇÕES (EMAILS)
function renderNotifications() {
    document.getElementById('notifications-count').textContent = `${state.notifications.length} e-mail(s) no log`;
    const container = document.getElementById('notifications-list-container');
    container.innerHTML = '';

    if (state.notifications.length === 0) {
        container.innerHTML = '<p class="empty-state"><i class="fa-regular fa-bell-slash" style="font-size: 28px; margin-bottom: 8px; color: var(--text-muted);"></i><br>Nenhum alerta de e-mail disparado até o momento.<br><small>Clique no botão acima para verificar tarefas atrasadas.</small></p>';
        return;
    }

    state.notifications.forEach(log => {
        const dateStr = new Date(log.enviado_em).toLocaleString('pt-BR');
        const div = document.createElement('div');
        div.className = `email-item ${log.tipo}`;
        div.innerHTML = `
            <div class="email-item-header">
                <span class="email-subject"><i class="fa-solid ${log.tipo === 'atrasada' ? 'fa-circle-exclamation' : 'fa-clock'}"></i> ${escapeHTML(log.assunto)}</span>
                <span class="email-date">${dateStr}</span>
            </div>
            <div class="email-meta-details">
                <span><strong>Para:</strong> ${escapeHTML(log.responsavel)} &lt;${escapeHTML(log.email)}&gt;</span>
                <span><strong>Projeto:</strong> ${escapeHTML(log.projeto)}</span>
            </div>
            <div class="email-body">
                ${escapeHTML(log.mensagem)}
            </div>
        `;
        container.appendChild(div);
    });
}

// --- LOGICA DE FORMULÁRIOS & MODAIS ---

// 1. PROJETO
async function openNewProjectModal() {
    document.getElementById('modal-project-title').textContent = 'Criar Novo Projeto';
    document.getElementById('project-id-field').value = '';
    document.getElementById('project-name-field').value = '';
    document.getElementById('project-desc-field').value = '';
    
    await fetchUsers(); // Garantir que temos a lista de usuários para checkboxes
    renderMembersCheckboxes([]);
    
    openModal('modal-project');
}

function openEditProjectModal() {
    const project = state.selectedProject;
    if (!project) return;

    document.getElementById('modal-project-title').textContent = 'Editar Projeto';
    document.getElementById('project-id-field').value = project.id;
    document.getElementById('project-name-field').value = project.nome;
    document.getElementById('project-desc-field').value = project.descricao || '';
    
    // Obter IDs dos membros atuais
    const currentMemberIds = project.membros.map(m => m.id);
    renderMembersCheckboxes(currentMemberIds);
    
    openModal('modal-project');
}

function renderMembersCheckboxes(checkedIds) {
    const container = document.getElementById('project-members-checkboxes');
    container.innerHTML = '';

    if (state.users.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding: 0;">Nenhum usuário cadastrado.</p>';
        return;
    }

    state.users.forEach(u => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        
        const isChecked = checkedIds.includes(u.id) ? 'checked' : '';
        
        label.innerHTML = `
            <input type="checkbox" name="project-members" value="${u.id}" ${isChecked}>
            <span>${escapeHTML(u.nome)} (${u.perfil})</span>
        `;
        container.appendChild(label);
    });
}

// 2. TAREFA
async function openNewTaskModal() {
    document.getElementById('modal-task-title').textContent = 'Criar Nova Tarefa';
    document.getElementById('task-id-field').value = '';
    document.getElementById('task-title-field').value = '';
    document.getElementById('task-desc-field').value = '';
    document.getElementById('task-deadline-field').value = '';
    document.getElementById('task-status-field').value = 'A Fazer';

    // Popular seleção de projetos no modal
    await fetchProjects();
    const projSelect = document.getElementById('task-project-field');
    projSelect.innerHTML = '<option value="">Selecione o projeto...</option>';
    state.projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        
        // Se estiver visualizando detalhes de um projeto específico, pré-seleciona ele
        if (state.selectedProject && state.selectedProject.id === p.id) {
            opt.selected = true;
        }
        projSelect.appendChild(opt);
    });

    // Popular lista de usuários para atribuição de responsável
    await fetchUsers();
    const userSelect = document.getElementById('task-assignee-field');
    userSelect.innerHTML = '<option value="">Não atribuído</option>';
    state.users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.nome} (${u.perfil})`;
        userSelect.appendChild(opt);
    });

    openModal('modal-task');
}

async function openEditTaskModal(taskId) {
    showLoading(true);
    try {
        const res = await apiFetch(`/tasks/${taskId}`);
        if (!res.ok) throw new Error('Não foi possível carregar a tarefa.');
        const task = await res.json();

        document.getElementById('modal-task-title').textContent = 'Editar Tarefa';
        document.getElementById('task-id-field').value = task.id;
        document.getElementById('task-title-field').value = task.titulo;
        document.getElementById('task-desc-field').value = task.descricao || '';
        document.getElementById('task-deadline-field').value = task.prazo;
        document.getElementById('task-status-field').value = task.status;

        // Popular projetos
        await fetchProjects();
        const projSelect = document.getElementById('task-project-field');
        projSelect.innerHTML = '<option value="">Selecione o projeto...</option>';
        state.projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nome;
            if (p.id === task.projeto_id) opt.selected = true;
            projSelect.appendChild(opt);
        });

        // Popular usuários
        await fetchUsers();
        const userSelect = document.getElementById('task-assignee-field');
        userSelect.innerHTML = '<option value="">Não atribuído</option>';
        state.users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.nome} (${u.perfil})`;
            if (u.id === task.responsavel_id) opt.selected = true;
            userSelect.appendChild(opt);
        });

        openModal('modal-task');
    } catch (err) {
        showToast('Erro ao abrir edição da tarefa.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// 3. USUÁRIOS (ADMIN)
function openNewUserModal() {
    document.getElementById('modal-user-title').textContent = 'Adicionar Novo Usuário';
    document.getElementById('user-id-field').value = '';
    document.getElementById('user-name-field').value = '';
    document.getElementById('user-email-field').value = '';
    
    const pwField = document.getElementById('user-password-field');
    pwField.value = '';
    pwField.required = true;
    
    document.getElementById('user-pw-help').style.display = 'none';
    document.getElementById('user-role-field').value = 'usuario';

    openModal('modal-user');
}

async function openEditUserModal(userId) {
    showLoading(true);
    try {
        const res = await apiFetch(`/users/${userId}`);
        if (!res.ok) throw new Error('Não foi possível carregar usuário.');
        const user = await res.json();

        document.getElementById('modal-user-title').textContent = 'Editar Usuário';
        document.getElementById('user-id-field').value = user.id;
        document.getElementById('user-name-field').value = user.nome;
        document.getElementById('user-email-field').value = user.email;
        
        const pwField = document.getElementById('user-password-field');
        pwField.value = '';
        pwField.required = false; // Em edição a senha é opcional
        
        document.getElementById('user-pw-help').style.display = 'block';
        document.getElementById('user-role-field').value = user.perfil;

        openModal('modal-user');
    } catch (err) {
        showToast('Erro ao obter detalhes do usuário.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// --- SUBMIT DE FORMULÁRIOS & EDITS (CHAMADAS API) ---

// 1. PROJETO
async function handleProjectSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('project-id-field').value;
    const nome = document.getElementById('project-name-field').value;
    const descricao = document.getElementById('project-desc-field').value;
    
    // Obter IDs marcados nos checkboxes de membros
    const checkboxes = document.querySelectorAll('input[name="project-members"]:checked');
    const membros = Array.from(checkboxes).map(cb => parseInt(cb.value));

    const payload = { nome, descricao, membros };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/projects/${id}` : `/projects`;

    showLoading(true);
    try {
        const res = await apiFetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(id ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!', 'success');
            closeModal('modal-project');
            
            if (id) {
                showProjectDetails(id);
            } else {
                navigateTo('projects');
            }
        } else {
            const data = await res.json();
            showToast(data.message || 'Erro ao salvar projeto.', 'error');
        }
    } catch (err) {
        showToast('Erro na conexão com o servidor.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

async function deleteProject() {
    const project = state.selectedProject;
    if (!project) return;

    if (!confirm(`Deseja realmente excluir o projeto "${project.nome}"? Todas as suas tarefas serão excluídas permanentemente.`)) {
        return;
    }

    showLoading(true);
    try {
        const res = await apiFetch(`/projects/${project.id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Projeto excluído com sucesso!', 'success');
            navigateTo('projects');
        } else {
            const data = await res.json();
            showToast(data.message || 'Erro ao excluir projeto.', 'error');
        }
    } catch (err) {
        showToast('Erro de conexão.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// 2. TAREFA
async function handleTaskSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('task-id-field').value;
    const projeto_id = parseInt(document.getElementById('task-project-field').value);
    const titulo = document.getElementById('task-title-field').value;
    const descricao = document.getElementById('task-desc-field').value;
    const responsavel_id = document.getElementById('task-assignee-field').value;
    const prazo = document.getElementById('task-deadline-field').value;
    const statusVal = document.getElementById('task-status-field').value;

    const payload = {
        projeto_id,
        titulo,
        descricao,
        responsavel_id: responsavel_id ? parseInt(responsavel_id) : null,
        prazo,
        status: statusVal
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/tasks/${id}` : `/tasks`;

    showLoading(true);
    try {
        const res = await apiFetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(id ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!', 'success');
            closeModal('modal-task');
            
            if (state.currentView === 'tasks') {
                loadViewData('tasks');
            } else if (state.currentView === 'projects' && state.selectedProject) {
                showProjectDetails(state.selectedProject.id);
            }
        } else {
            const data = await res.json();
            showToast(data.message || 'Erro ao salvar tarefa.', 'error');
        }
    } catch (err) {
        showToast('Erro de conexão.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

async function updateTaskStatus(taskId, newStatus) {
    showLoading(true);
    try {
        const resTask = await apiFetch(`/tasks/${taskId}`);
        if (!resTask.ok) throw new Error();
        const task = await resTask.json();

        let payload = {};
        if (state.user.perfil === 'usuario') {
            payload = { status: newStatus };
        } else {
            payload = {
                projeto_id: task.projeto_id,
                titulo: task.titulo,
                descricao: task.descricao,
                responsavel_id: task.responsavel_id,
                prazo: task.prazo,
                status: newStatus
            };
        }

        const res = await apiFetch(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('Status da tarefa atualizado com sucesso!', 'success');
            
            // Atualizar localmente no state
            const localTask = state.tasks.find(t => t.id === taskId);
            if (localTask) localTask.status = newStatus;
            
            if (state.currentView === 'tasks') {
                renderKanban();
            } else if (state.currentView === 'projects' && state.selectedProject) {
                showProjectDetails(state.selectedProject.id);
            }
        } else {
            const data = await res.json();
            showToast(data.message || 'Erro ao atualizar status.', 'error');
            renderKanban();
        }
    } catch (err) {
        showToast('Erro ao atualizar status da tarefa.', 'error');
        console.error(err);
        renderKanban();
    } finally {
        showLoading(false);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Deseja realmente excluir esta tarefa permanentemente?')) return;

    showLoading(true);
    try {
        const res = await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Tarefa excluída com sucesso!', 'success');
            
            if (state.currentView === 'tasks') {
                loadViewData('tasks');
            } else if (state.currentView === 'projects' && state.selectedProject) {
                showProjectDetails(state.selectedProject.id);
            }
        } else {
            const data = await res.json();
            showToast(data.message || 'Erro ao excluir tarefa.', 'error');
        }
    } catch (err) {
        showToast('Erro de conexão.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// 3. USUÁRIO (ADMIN)
async function handleUserSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('user-id-field').value;
    const nome = document.getElementById('user-name-field').value;
    const email = document.getElementById('user-email-field').value;
    const senha = document.getElementById('user-password-field').value;
    const perfil = document.getElementById('user-role-field').value;

    const payload = { nome, email, perfil };
    if (senha && senha.trim() !== '') {
        payload.senha = senha;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/users/${id}` : `/users`;

    showLoading(true);
    try {
        const res = await apiFetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(id ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!', 'success');
            closeModal('modal-user');
            loadViewData('users');
        } else {
            const data = await res.json();
            showToast(data.message || 'Erro ao salvar usuário.', 'error');
        }
    } catch (err) {
        showToast('Erro na rede.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

async function deleteUser(userId) {
    if (!confirm('Deseja realmente excluir este usuário? Todas as suas atribuições serão perdidas.')) return;

    showLoading(true);
    try {
        const res = await apiFetch(`/users/${userId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Usuário excluído com sucesso!', 'success');
            loadViewData('users');
        } else {
            const data = await res.json();
            showToast(data.message || 'Erro ao excluir usuário.', 'error');
        }
    } catch (err) {
        showToast('Erro de conexão.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// --- RELATÓRIOS PDF (com autenticação correta via fetch + blob) ---
async function handlePdfDownload() {
    const project = state.selectedProject;
    if (!project) return;
    
    showToast('Gerando relatório em PDF...', 'success');
    showLoading(true);

    try {
        const res = await apiFetch(`/reports/project/${project.id}`);
        
        if (!res.ok) {
            throw new Error('Erro ao gerar relatório.');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_projeto_${project.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showToast('PDF baixado com sucesso!', 'success');
    } catch (err) {
        showToast('Erro ao baixar o relatório em PDF.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// --- DISPARO MANUAL DE ALERTAS ---
async function handleTriggerAlerts() {
    showLoading(true);
    try {
        const res = await apiFetch('/notifications/check', { method: 'POST' });
        if (res.ok) {
            showToast('Alertas verificados com sucesso!', 'success');
            await fetchNotifications();
            renderNotifications();
        } else {
            const data = await res.json();
            showToast(data.message || 'Erro ao verificar alertas.', 'error');
        }
    } catch (err) {
        showToast('Erro na conexão.', 'error');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// --- HELPERS E CONFIGURAÇÃO ---
function setupEventListeners() {
    // 1. Alternador de abas/visualizações
    document.querySelectorAll('.sidebar-nav li').forEach(li => {
        li.addEventListener('click', () => {
            const viewId = li.getAttribute('data-view');
            navigateTo(viewId);
        });
    });

    // 2. Autenticação (Login / Registro)
    const authForm = document.getElementById('auth-form');
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isRegistering = document.getElementById('group-nome').style.display === 'block';
        const email = document.getElementById('auth-email').value;
        const senha = document.getElementById('auth-senha').value;

        showLoading(true);
        try {
            if (isRegistering) {
                const nome = document.getElementById('auth-nome').value;
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, senha })
                });

                if (res.ok) {
                    showToast('Cadastro realizado com sucesso! Faça login para continuar.', 'success');
                    toggleAuthMode(false); // Volta para tela de login
                } else {
                    const data = await res.json();
                    showToast(data.message || 'Erro no cadastro.', 'error');
                }
            } else {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, senha })
                });

                if (res.ok) {
                    const data = await res.json();
                    state.user = data.user;
                    // Salvar token em localStorage para garantir que o Bearer header funcione
                    state.token = data.token;
                    localStorage.setItem('gestra_token', data.token);

                    showToast(`Bem-vindo(a), ${data.user.nome}!`, 'success');
                    showApp();
                } else {
                    const data = await res.json();
                    showToast(data.message || 'E-mail ou senha incorretos.', 'error');
                }
            }
        } catch (err) {
            showToast('Erro na conexão com o servidor.', 'error');
            console.error(err);
        } finally {
            showLoading(false);
        }
    });

    // Toggle para alternar entre Login/Cadastro
    const toggleLink = document.getElementById('auth-toggle-link');
    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        const isCurrentlyLogin = document.getElementById('group-nome').style.display === 'none';
        toggleAuthMode(isCurrentlyLogin);
    });

    // Revelar/Ocultar Senha
    const togglePasswordBtn = document.getElementById('toggle-password');
    togglePasswordBtn.addEventListener('click', () => {
        const input = document.getElementById('auth-senha');
        const icon = togglePasswordBtn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-regular fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fa-regular fa-eye';
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        showLoading(true);
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
            state.user = null;
            state.token = null;
            localStorage.removeItem('gestra_token');
            showLogin();
            showToast('Sessão encerrada com sucesso.', 'success');
        } catch (e) {
            showToast('Erro ao deslogar.', 'error');
        } finally {
            showLoading(false);
        }
    });

    // 3. Projetos - Pesquisa e Ações
    document.getElementById('project-search').addEventListener('input', renderProjects);
    document.getElementById('btn-new-project').addEventListener('click', openNewProjectModal);
    document.getElementById('btn-back-projects').addEventListener('click', () => navigateTo('projects'));
    document.getElementById('btn-edit-project').addEventListener('click', openEditProjectModal);
    document.getElementById('btn-delete-project').addEventListener('click', deleteProject);
    document.getElementById('btn-pdf-report').addEventListener('click', handlePdfDownload);
    document.getElementById('btn-manage-members').addEventListener('click', openEditProjectModal);

    // Submits do Modal Projeto
    document.getElementById('project-form').addEventListener('submit', handleProjectSubmit);
    document.getElementById('btn-cancel-project').addEventListener('click', () => closeModal('modal-project'));
    document.getElementById('close-modal-project').addEventListener('click', () => closeModal('modal-project'));

    // 4. Tarefas - Filtros e Ações
    document.getElementById('task-filter-project').addEventListener('change', renderKanban);
    document.getElementById('task-filter-status').addEventListener('change', renderKanban);
    document.getElementById('btn-new-task').addEventListener('click', openNewTaskModal);

    // Submits do Modal Tarefa
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
    document.getElementById('btn-cancel-task').addEventListener('click', () => closeModal('modal-task'));
    document.getElementById('close-modal-task').addEventListener('click', () => closeModal('modal-task'));

    // 5. Usuários - Ações Admin
    document.getElementById('btn-new-user').addEventListener('click', openNewUserModal);
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
    document.getElementById('btn-cancel-user').addEventListener('click', () => closeModal('modal-user'));
    document.getElementById('close-modal-user').addEventListener('click', () => closeModal('modal-user'));

    // 6. Alertas - Ações
    document.getElementById('btn-trigger-alerts').addEventListener('click', handleTriggerAlerts);

    // 7. Dark Mode Toggle
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        const body = document.body;
        const icon = themeBtn.querySelector('i');
        const text = themeBtn.querySelector('span');

        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            icon.className = 'fa-solid fa-sun';
            text.textContent = 'Modo Claro';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            icon.className = 'fa-solid fa-moon';
            text.textContent = 'Modo Escuro';
            localStorage.setItem('theme', 'light');
        }
        
        // Re-renderiza gráfico se estiver na dashboard
        if (state.currentView === 'dashboard') {
            renderStatusChart();
        }
    });

    // Carregar tema salvo
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        const body = document.body;
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        themeBtn.querySelector('i').className = 'fa-solid fa-sun';
        themeBtn.querySelector('span').textContent = 'Modo Claro';
    }

    // 8. Mobile Sidebar Hamburger
    document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);

    // Fechar modal ao clicar no overlay (fora do conteúdo)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

function toggleAuthMode(toRegister) {
    const groupNome = document.getElementById('group-nome');
    const groupPerfil = document.getElementById('group-perfil');
    const authTitle = document.getElementById('auth-title');
    const authSubmit = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');

    if (toRegister) {
        groupNome.style.display = 'block';
        groupPerfil.style.display = 'none';
        authTitle.textContent = 'Crie sua conta';
        authSubmit.textContent = 'Cadastrar Usuário';
        toggleText.innerHTML = 'Já possui uma conta? <a href="#" id="auth-toggle-link">Entre aqui</a>';
    } else {
        groupNome.style.display = 'none';
        groupPerfil.style.display = 'none';
        authTitle.textContent = 'Entre na sua conta';
        authSubmit.textContent = 'Acessar Sistema';
        toggleText.innerHTML = 'Não tem uma conta? <a href="#" id="auth-toggle-link">Cadastre-se</a>';
    }

    // Limpar campos
    document.getElementById('auth-nome').value = '';
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-senha').value = '';
    
    // Re-vincular listener de toggle
    document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode(!toRegister);
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-check" style="color: var(--success); flex-shrink: 0;"></i>';
    if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-xmark" style="color: var(--danger); flex-shrink: 0;"></i>';
    } else if (type === 'warning') {
        icon = '<i class="fa-solid fa-circle-exclamation" style="color: var(--warning); flex-shrink: 0;"></i>';
    }

    toast.innerHTML = `
        ${icon}
        <span>${escapeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    
    // Remover após 4 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function setupDateHeader() {
    const dateElement = document.getElementById('header-date');
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = new Date().toLocaleDateString('pt-BR', options);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
