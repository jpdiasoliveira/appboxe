import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// --- Auth Routes ---

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    // Validação de entrada
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    if (username.length < 3 || password.length < 6) {
        return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                student: true,
                professor: true
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        // Return user info (excluding password)
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// Register Student
app.post('/api/auth/register/student', async (req, res) => {
    const { username, password, ...studentData } = req.body;

    // Validação de entrada
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    if (!studentData.name || !studentData.email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    role: 'student'
                }
            });

            const student = await prisma.student.create({
                data: {
                    ...studentData,
                    joinDate: studentData.joinDate || new Date().toISOString().split('T')[0],
                    userId: user.id
                }
            });

            return { user, student };
        });

        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({
            error: 'Erro ao registrar aluno',
            details: error.message
        });
    }
});

// Register Professor
app.post('/api/auth/register/professor', async (req, res) => {
    const { username, password, name, email } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    role: 'professor'
                }
            });

            const professor = await prisma.professor.create({
                data: {
                    name,
                    email,
                    userId: user.id
                }
            });

            return { user, professor };
        });

        res.json(result);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao registrar professor' });
    }
});

// --- Professor Routes ---

// Get All Professors
app.get('/api/professors', async (req, res) => {
    try {
        const professors = await prisma.professor.findMany();
        res.json(professors);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar professores' });
    }
});

// Update Professor
app.put('/api/professors/:id', async (req, res) => {
    const { id } = req.params;
    const { whatsapp, instagram, facebook, bio, portfolioUrl } = req.body;

    try {
        const professor = await prisma.professor.update({
            where: { id },
            data: {
                whatsapp,
                instagram,
                facebook,
                bio,
                portfolioUrl
            }
        });
        res.json(professor);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao atualizar professor' });
    }
});

// --- Data Routes ---

// Get Students
app.get('/api/students', async (req, res) => {
    const students = await prisma.student.findMany();
    res.json(students);
});

// Update Student
app.put('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const student = await prisma.student.update({
            where: { id },
            data: req.body
        });
        res.json(student);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao atualizar aluno' });
    }
});

// Delete Student
app.delete('/api/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.student.delete({
            where: { id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Erro ao deletar aluno' });
    }
});

// Get Upcoming Trainings
app.get('/api/trainings', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const trainings = await prisma.trainingSession.findMany({
        where: {
            date: {
                gte: today
            }
        },
        orderBy: {
            date: 'asc'
        }
    });
    res.json(trainings);
});

// Create Training
app.post('/api/trainings', async (req, res) => {
    try {
        const training = await prisma.trainingSession.create({
            data: req.body
        });
        res.json(training);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao criar treino' });
    }
});

// Update Training
app.put('/api/trainings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const training = await prisma.trainingSession.update({
            where: { id },
            data: req.body
        });
        res.json(training);
    } catch (error) {
        res.status(400).json({ error: 'Erro ao atualizar treino' });
    }
});

// Delete Training
app.delete('/api/trainings/:id', async (req, res) => {
    try {
        await prisma.trainingSession.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Erro ao deletar treino' });
    }
});

// Get Attendance
app.get('/api/attendance', async (req, res) => {
    const attendance = await prisma.attendance.findMany();
    res.json(attendance);
});

// Mark Attendance
app.post('/api/attendance', async (req, res) => {
    const { studentId, trainingSessionId, present, date } = req.body;

    try {
        // Check if exists to update, or create new
        // For simplicity, we'll just create or update based on a find
        // Ideally we'd use upsert but we need a unique constraint on studentId + trainingSessionId

        // Let's find existing first
        const existing = await prisma.attendance.findFirst({
            where: {
                studentId,
                trainingSessionId
            }
        });

        if (existing) {
            const updated = await prisma.attendance.update({
                where: { id: existing.id },
                data: { present }
            });
            res.json(updated);
        } else {
            const created = await prisma.attendance.create({
                data: {
                    studentId,
                    trainingSessionId,
                    present,
                    date
                }
            });
            res.json(created);
        }
    } catch (error) {
        res.status(400).json({ error: 'Erro ao marcar presença' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
