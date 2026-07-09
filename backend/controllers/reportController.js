// Controller de Geração de Relatórios em PDF
const PDFDocument = require('pdfkit');
const { dbGet, dbAll } = require('../database');

async function generateProjectReport(req, res) {
    const { id } = req.params;

    try {
        // Obter projeto
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

        // Obter tarefas
        const tasks = await dbAll(
            `SELECT t.*, u.nome as responsavel_nome 
             FROM tarefas t 
             LEFT JOIN usuarios u ON t.responsavel_id = u.id 
             WHERE t.projeto_id = ? 
             ORDER BY t.prazo ASC`,
            [id]
        );

        // Obter membros
        const members = await dbAll(
            `SELECT u.nome, u.email, u.perfil 
             FROM usuarios u 
             JOIN projeto_usuarios pu ON u.id = pu.usuario_id 
             WHERE pu.projeto_id = ?`,
            [id]
        );

        // Calcular estatísticas
        const totalTasks = tasks.length;
        const todoTasks = tasks.filter(t => t.status === 'A Fazer').length;
        const doingTasks = tasks.filter(t => t.status === 'Em Andamento').length;
        const doneTasks = tasks.filter(t => t.status === 'Concluída').length;
        const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        // Criar documento PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Configurar headers para download do PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_projeto_${id}.pdf`);
        doc.pipe(res);

        // --- DESIGN DO PDF ---
        // Cabeçalho / Banner Superior
        doc.rect(0, 0, 595.28, 120).fill('#2A4365'); // Cor azul escuro premium
        doc.fillColor('#FFFFFF')
           .fontSize(22)
           .font('Helvetica-Bold')
           .text('RELATÓRIO DE ACOMPANHAMENTO', 50, 40);
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Projeto: ${project.nome}`, 50, 70)
           .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} por ${req.user.nome}`, 50, 90);

        // Descrição do Projeto
        doc.y = 150;
        doc.fillColor('#333333')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Descrição do Projeto', 50, doc.y);
        doc.font('Helvetica')
           .fontSize(11)
           .text(project.descricao || 'Sem descrição cadastrada.', 50, doc.y + 10, { width: 495, align: 'justify' });

        // Divisor
        doc.moveDown(1.5);
        const dashY = doc.y;
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, dashY).lineTo(545, dashY).stroke();

        // Painel de Indicadores (Dashboard no PDF)
        doc.y = dashY + 15;
        doc.fillColor('#333333').font('Helvetica-Bold').fontSize(14).text('Estatísticas do Projeto', 50, doc.y);
        
        const statsY = doc.y + 15;
        // Desenhar blocos de estatísticas
        const drawStatBox = (x, title, val, color) => {
            doc.rect(x, statsY, 110, 60).fill('#F7FAFC');
            doc.rect(x, statsY, 110, 4).fill(color);
            doc.fillColor('#718096').fontSize(9).font('Helvetica-Bold').text(title.toUpperCase(), x + 8, statsY + 12);
            doc.fillColor('#2D3748').fontSize(20).font('Helvetica-Bold').text(val.toString(), x + 8, statsY + 28);
        };

        drawStatBox(50, 'Tarefas', totalTasks, '#4A5568');
        drawStatBox(175, 'A Fazer', todoTasks, '#ED8936');
        drawStatBox(300, 'Em Execução', doingTasks, '#4299E1');
        drawStatBox(425, 'Concluídas', doneTasks, '#48BB78');

        // Progresso Geral
        doc.y = statsY + 80;
        doc.fillColor('#333333').fontSize(11).font('Helvetica-Bold').text(`Progresso Geral: ${progressPercent}%`, 50, doc.y);
        // Barra de progresso
        doc.rect(50, doc.y + 8, 495, 10).fill('#EDF2F7');
        if (progressPercent > 0) {
            doc.rect(50, doc.y + 8, (progressPercent / 100) * 495, 10).fill('#48BB78');
        }

        // Tabela de Membros
        doc.y = doc.y + 35;
        doc.fillColor('#333333').fontSize(14).font('Helvetica-Bold').text('Equipe Participante', 50, doc.y);
        
        let memberY = doc.y + 15;
        // Cabeçalho tabela membros
        doc.rect(50, memberY, 495, 20).fill('#EDF2F7');
        doc.fillColor('#4A5568').fontSize(10).font('Helvetica-Bold')
           .text('Nome', 60, memberY + 5)
           .text('E-mail', 240, memberY + 5)
           .text('Perfil', 430, memberY + 5);

        memberY += 20;
        doc.font('Helvetica').fillColor('#2D3748').fontSize(10);
        if (members.length === 0) {
            doc.text('Nenhum membro associado ao projeto.', 60, memberY + 5);
            memberY += 20;
        } else {
            for (let m of members) {
                // Verificar que não ultrapassa a página
                if (memberY > 730) {
                    doc.addPage();
                    memberY = 50;
                }
                doc.text(m.nome, 60, memberY + 5)
                   .text(m.email, 240, memberY + 5)
                   .text(m.perfil.charAt(0).toUpperCase() + m.perfil.slice(1), 430, memberY + 5);
                memberY += 20;
            }
        }

        // Tabela de Tarefas
        doc.y = memberY + 15;
        // Verificar limite da página
        if (doc.y > 700) {
            doc.addPage();
            doc.y = 50;
        }
        
        doc.fillColor('#333333').fontSize(14).font('Helvetica-Bold').text('Lista de Tarefas', 50, doc.y);
        
        let taskY = doc.y + 15;
        // Cabeçalho tabela tarefas
        doc.rect(50, taskY, 495, 20).fill('#EDF2F7');
        doc.fillColor('#4A5568').fontSize(10).font('Helvetica-Bold')
           .text('Título', 60, taskY + 5)
           .text('Responsável', 230, taskY + 5)
           .text('Prazo', 380, taskY + 5)
           .text('Status', 465, taskY + 5);

        taskY += 20;
        doc.font('Helvetica').fillColor('#2D3748').fontSize(9);
        if (tasks.length === 0) {
            doc.text('Nenhuma tarefa cadastrada neste projeto.', 60, taskY + 5);
        } else {
            for (let t of tasks) {
                if (taskY > 730) {
                    doc.addPage();
                    taskY = 50;
                    // Repetir cabeçalho
                    doc.rect(50, taskY, 495, 20).fill('#EDF2F7');
                    doc.fillColor('#4A5568').fontSize(10).font('Helvetica-Bold')
                       .text('Título', 60, taskY + 5)
                       .text('Responsável', 230, taskY + 5)
                       .text('Prazo', 380, taskY + 5)
                       .text('Status', 465, taskY + 5);
                    taskY += 20;
                    doc.font('Helvetica').fillColor('#2D3748').fontSize(9);
                }

                // Ajustar status para colorir
                let statusColor = '#A0AEC0'; // A Fazer
                if (t.status === 'Em Andamento') statusColor = '#3182CE';
                else if (t.status === 'Concluída') statusColor = '#38A169';

                // Truncar título longo se necessário
                const titleDisp = t.titulo.length > 30 ? t.titulo.substring(0, 27) + '...' : t.titulo;

                doc.text(titleDisp, 60, taskY + 5)
                   .text(t.responsavel_nome || 'Não atribuído', 230, taskY + 5)
                   .text(t.prazo, 380, taskY + 5);

                doc.save()
                   .fillColor(statusColor)
                   .rect(460, taskY + 3, 75, 14)
                   .fill();
                
                doc.fillColor('#FFFFFF')
                   .font('Helvetica-Bold')
                   .fontSize(8)
                   .text(t.status, 460, taskY + 6, { width: 75, align: 'center' });

                doc.restore();
                doc.font('Helvetica').fillColor('#2D3748').fontSize(9);
                
                taskY += 20;
            }
        }

        // Encerrar e fechar stream
        doc.end();

    } catch (err) {
        console.error('Erro ao gerar relatório em PDF:', err);
        return res.status(500).json({ message: 'Erro ao gerar relatório em PDF.' });
    }
}

module.exports = {
    generateProjectReport
};
