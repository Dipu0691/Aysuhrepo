const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Seed default Super Admin in MongoDB if none exists
async function seedMongoAdmin() {
    try {
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'Super Admin' }
        });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    password: hashedPassword,
                    role: 'Super Admin',
                    name: 'Default Admin'
                }
            });
            console.log('Default MongoDB Super Admin seeded: admin / admin123');
        }
    } catch (error) {
        console.error("Error seeding admin:", error);
    }
}
seedMongoAdmin();

// Helper to add Notification
async function addNotification(message, type = 'info') {
    try {
        await prisma.notification.create({
            data: { message, type }
        });
    } catch (err) {
        console.error("Failed to add notification:", err);
    }
}

// JWT Token functions
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role, email: user.username, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
};

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const user = verifyToken(token);
        if (user) {
            req.user = user;
            return next();
        }
    }
    res.status(401).json({ success: false, message: 'Unauthorized' });
};

// Role check middleware
const requireRole = (roles) => (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
    }
};

// --- Authentication API ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        // Parent login placeholder (from frontend context, email acts as username)
        const user = await prisma.user.findUnique({
            where: { username: email }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = generateToken(user);

        await addNotification(`User ${user.name} logged in.`, 'info');

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// USERS API
app.get('/api/users', authMiddleware, requireRole(['Super Admin']), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, name: true, role: true }
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/users', authMiddleware, requireRole(['Super Admin']), async (req, res) => {
    try {
        const { username, password, role, name } = req.body;

        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const newUser = await prisma.user.create({
            data: { username, password: hashedPassword, role, name }
        });

        res.json({ success: true, user: { id: newUser.id, username: newUser.username, role: newUser.role, name: newUser.name } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/users/:id', authMiddleware, requireRole(['Super Admin']), async (req, res) => {
    try {
        const { id } = req.params;

        const superAdmins = await prisma.user.findMany({ where: { role: 'Super Admin' } });
        const targetIsSuper = superAdmins.some(u => u.id === id);

        if (targetIsSuper && superAdmins.length === 1) {
            return res.status(400).json({ success: false, message: 'Cannot delete the last Super Admin' });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/users/:id', authMiddleware, requireRole(['Super Admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role, name } = req.body;

        if (username) {
            const existing = await prisma.user.findFirst({
                where: { username, NOT: { id } }
            });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Username already exists' });
            }
        }

        let updates = {};
        if (username) updates.username = username;
        if (role) updates.role = role;
        if (name) updates.name = name;
        if (password) updates.password = bcrypt.hashSync(password, 10);

        await prisma.user.update({
            where: { id },
            data: updates
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// NOTIFICATIONS API
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            orderBy: { date: 'desc' },
            take: 50
        });
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/notifications/mark-read', authMiddleware, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ANALYTICS API (Mock tracking - in DB now)
app.post('/api/track', async (req, res) => {
    // For simplicity, we could log these to an analytics table in Supabase.
    // For now, we'll return success to keep the frontend happy until schema is defined.
    res.json({ success: true });
});

app.get('/api/analytics', authMiddleware, async (req, res) => {
    // You will need an analytics table/view in Supabase to calculate true totals.
    // Returning dummy data for now to not break the frontend dashboard
    res.json({ visitors: 100, pageViews: {}, sources: {}, devices: {} });
});


// API Endpoint for Admissions
app.post('/api/apply', async (req, res) => {
    try {
        const { studentName, grade, parentName, phone, email } = req.body;

        const newAdmission = await prisma.admission.create({
            data: {
                studentName,
                grade,
                parentName,
                phone,
                email,
                status: 'pending'
            }
        });

        await addNotification(`New application received for ${studentName} (${grade})`, 'success');

        res.json({ success: true, message: 'Application submitted successfully! We will contact you soon.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Get Admissions
app.get('/api/admissions', authMiddleware, async (req, res) => {
    try {
        const admissions = await prisma.admission.findMany({
            orderBy: { dateSubmitted: 'desc' }
        });
        res.json(admissions);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Update Admission (Edit or Status change)
app.put('/api/admissions/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const existing = await prisma.admission.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

        const admission = await prisma.admission.update({
            where: { id },
            data: updates
        });

        if (updates.status) {
            await addNotification(`Application for ${existing.studentName} was ${updates.status}`, updates.status === 'approved' ? 'success' : 'warning');
        }

        res.json({ success: true, admission });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Delete Admission
app.delete('/api/admissions/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        await prisma.admission.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Get Holidays
app.get('/api/holidays', async (req, res) => {
    try {
        const holidays = await prisma.holiday.findMany({
            orderBy: { date: 'asc' }
        });
        res.json(holidays);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Add Holiday
app.post('/api/holidays', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const { month, date, title, description, duration, type } = req.body;

        const holiday = await prisma.holiday.create({
            data: { month, date, title, description, duration, type: type || 'Holiday' }
        });

        res.json({ success: true, holiday });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Update Holiday
app.put('/api/holidays/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const updates = req.body;
        const holiday = await prisma.holiday.update({
            where: { id: req.params.id },
            data: updates
        });
        res.json({ success: true, holiday });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Delete Holiday
app.delete('/api/holidays/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        await prisma.holiday.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Setup Multer for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage });

app.post('/api/upload', authMiddleware, requireRole(['Super Admin', 'Admin']), upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
});

app.get('/api/content/:page', async (req, res) => {
    try {
        const page = await prisma.page.findUnique({
            where: { page_name: req.params.page }
        });
        res.json(page?.content || {});
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/content/:page', authMiddleware, requireRole(['Super Admin']), async (req, res) => {
    try {
        const updated = await prisma.page.upsert({
            where: { page_name: req.params.page },
            update: { content: req.body },
            create: { page_name: req.params.page, content: req.body }
        });
        res.json({ success: true, pageData: updated.content });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/content/:page', authMiddleware, requireRole(['Super Admin']), async (req, res) => {
    try {
        await prisma.page.delete({ where: { page_name: req.params.page } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Gallery APIs ---
app.get('/api/gallery', async (req, res) => {
    try {
        const gallery = await prisma.gallery.findMany({
            orderBy: { dateAdded: 'desc' }
        });
        res.json(gallery);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/gallery', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const { url, alt } = req.body;
        if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

        const image = await prisma.gallery.create({
            data: { url, alt: alt || 'Gallery Image' }
        });

        res.json({ success: true, image });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/gallery/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        await prisma.gallery.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Contact Form APIs ---
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        await prisma.contact.create({
            data: { name, email, subject, message, isRead: false }
        });

        await addNotification(`New message from ${name}`, 'info');

        res.json({ success: true, message: 'Message sent successfully! We will get back to you soon.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/contacts', authMiddleware, async (req, res) => {
    try {
        const contacts = await prisma.contact.findMany({
            orderBy: { dateSubmitted: 'desc' }
        });
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/contacts/:id', authMiddleware, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
    try {
        const updates = req.body;
        await prisma.contact.update({
            where: { id: req.params.id },
            data: updates
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/contacts/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        await prisma.contact.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
// PARENT REGISTRATION
// =============================================
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, phone, studentName, studentGrade } = req.body;

        if (!name || !email || !password || !studentName || !studentGrade) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Check if email exists
        const existingUser = await prisma.user.findUnique({
            where: { username: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                username: email.toLowerCase(),
                password: hashedPassword,
                // phone not in schema, skipping here or add to schema if really needed
                role: 'Parent',
                studentName,
                studentGrade
            }
        });

        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                studentName: user.studentName,
                studentGrade: user.studentGrade
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, message: err.message || 'Registration failed' });
    }
});

// =============================================
// STUDENT/PARENT LISTING (Admin)
// =============================================
app.get('/api/students', authMiddleware, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
    try {
        const students = await prisma.user.findMany({
            where: { role: 'Parent' },
            select: { id: true, username: true, name: true, studentName: true, studentGrade: true }
        });
        // Format to match old output if needed
        const mapped = students.map(s => ({ ...s, email: s.username }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/students/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        await prisma.fee.deleteMany({ where: { studentId: req.params.id } });
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
// FEE MANAGEMENT (Admin)
// =============================================
app.get('/api/fees', authMiddleware, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
    try {
        const fees = await prisma.fee.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                student: {
                    select: { name: true, username: true, studentName: true, studentGrade: true }
                },
                creator: {
                    select: { name: true }
                }
            }
        });

        const mapped = fees.map(f => ({
            ...f,
            studentId: f.student ? { ...f.student, email: f.student.username } : null,
            createdBy: f.creator
        }));

        res.json(mapped);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/fees', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const { studentId, description, amount, dueDate } = req.body;

        if (!studentId || !description || !amount || !dueDate) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const fee = await prisma.fee.create({
            data: {
                studentId,
                description,
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                createdById: req.user.id
            },
            include: {
                student: {
                    select: { name: true, username: true, studentName: true, studentGrade: true }
                }
            }
        });

        const mapped = {
            ...fee,
            studentId: fee.student ? { ...fee.student, email: fee.student.username } : null
        };

        res.json({ success: true, fee: mapped });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/fees/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const updates = req.body;
        if (updates.amount) updates.amount = parseFloat(updates.amount);
        if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

        const fee = await prisma.fee.update({
            where: { id: req.params.id },
            data: updates,
            include: {
                student: {
                    select: { name: true, username: true, studentName: true, studentGrade: true }
                }
            }
        });

        const mapped = {
            ...fee,
            studentId: fee.student ? { ...fee.student, email: fee.student.username } : null
        };

        res.json({ success: true, fee: mapped });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/fees/:id', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        await prisma.fee.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
// PARENT PORTAL APIs
// =============================================
app.get('/api/my/profile', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, username: true, role: true, studentName: true, studentGrade: true }
        });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ ...user, email: user.username });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/my/profile', authMiddleware, async (req, res) => {
    try {
        const { name, phone, studentName, studentGrade } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (studentName) updates.studentName = studentName;
        if (studentGrade) updates.studentGrade = studentGrade;
        // phone not in schema natively but ignored if not needed

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: updates
        });

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/my/fees', authMiddleware, async (req, res) => {
    try {
        const fees = await prisma.fee.findMany({
            where: { studentId: req.user.id },
            orderBy: { dueDate: 'desc' }
        });
        res.json(fees);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
// ANNOUNCEMENTS
// =============================================
app.get('/api/announcements', authMiddleware, async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, announcements });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/announcements', authMiddleware, requireRole(['Super Admin', 'Admin', 'Teacher']), async (req, res) => {
    try {
        const { title, content, target_role } = req.body;

        await prisma.announcement.create({
            data: {
                title,
                content,
                target_role: target_role || 'All',
                createdBy: req.user.name || 'System'
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/announcements/:id', authMiddleware, requireRole(['Super Admin', 'Admin', 'Teacher']), async (req, res) => {
    try {
        await prisma.announcement.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
// ATTENDANCE
// =============================================
app.get('/api/attendance', authMiddleware, async (req, res) => {
    try {
        let attendance;
        if (req.user.role === 'Parent') {
            attendance = await prisma.attendance.findMany({
                where: { studentName: req.user.studentName },
                orderBy: { date: 'desc' }
            });
        } else {
            attendance = await prisma.attendance.findMany({
                orderBy: { date: 'desc' }
            });
        }
        res.json({ success: true, attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/attendance', authMiddleware, requireRole(['Super Admin', 'Admin', 'Teacher']), async (req, res) => {
    try {
        const { studentName, grade, date, status, remarks } = req.body;

        await prisma.attendance.create({
            data: { studentName, grade, date: new Date(date), status, remarks, recordedBy: req.user.name || 'System' }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
// RESULTS
// =============================================
app.get('/api/results', authMiddleware, async (req, res) => {
    try {
        let results;
        if (req.user.role === 'Parent') {
            results = await prisma.result.findMany({
                where: { studentName: req.user.studentName },
                orderBy: { datePublished: 'desc' }
            });
        } else {
            results = await prisma.result.findMany({
                orderBy: { datePublished: 'desc' }
            });
        }
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/results', authMiddleware, requireRole(['Super Admin', 'Admin', 'Teacher']), async (req, res) => {
    try {
        const { studentName, grade, subject, exam_term, score, total_marks, remarks } = req.body;

        await prisma.result.create({
            data: {
                studentName,
                grade,
                subject,
                examTerm: exam_term,
                score: parseFloat(score),
                totalMarks: parseFloat(total_marks),
                remarks,
                recordedBy: req.user.name || 'System'
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
// HOMEWORK
// =============================================
app.get('/api/homework', authMiddleware, async (req, res) => {
    try {
        let homework;
        if (req.user.role === 'Parent') {
            homework = await prisma.homework.findMany({
                where: { grade: req.user.studentGrade },
                orderBy: { dueDate: 'asc' }
            });
        } else {
            homework = await prisma.homework.findMany({
                orderBy: { dueDate: 'asc' }
            });
        }
        res.json({ success: true, homework });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/homework', authMiddleware, requireRole(['Super Admin', 'Admin', 'Teacher']), async (req, res) => {
    try {
        const { grade, subject, title, description, due_date } = req.body;

        await prisma.homework.create({
            data: {
                grade,
                subject,
                title,
                description,
                dueDate: new Date(due_date),
                assignedBy: req.user.name || 'System'
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/homework/:id', authMiddleware, requireRole(['Super Admin', 'Admin', 'Teacher']), async (req, res) => {
    try {
        await prisma.homework.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
// COMPLAINTS
// =============================================
app.get('/api/complaints', authMiddleware, async (req, res) => {
    try {
        let complaints;
        if (req.user.role === 'Parent') {
            complaints = await prisma.complaint.findMany({
                where: { reporterName: req.user.name },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            complaints = await prisma.complaint.findMany({
                orderBy: { createdAt: 'desc' }
            });
        }
        res.json({ success: true, complaints });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/complaints', authMiddleware, async (req, res) => {
    try {
        const { subject, message, reporter_name } = req.body;

        await prisma.complaint.create({
            data: {
                subject,
                message,
                reporterName: req.user ? req.user.name : (reporter_name || 'Anonymous'),
                status: 'Open'
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/complaints/:id/reply', authMiddleware, requireRole(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const { reply, status } = req.body;

        await prisma.complaint.update({
            where: { id: req.params.id },
            data: {
                reply,
                status: status || 'Resolved'
            }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

