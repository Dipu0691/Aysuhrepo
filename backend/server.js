const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins for dev simplicity
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dataFilePath = path.join(__dirname, 'data.json');

const readData = () => {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { admissions: [], holidays: [], pages: {} };
    }
};

const writeData = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
};

const SECRET_TOKEN = "hope-admin-token-2026";

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader === `Bearer ${SECRET_TOKEN}`) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// Admin Login Route
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
        res.json({ success: true, token: SECRET_TOKEN });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// API Endpoint for Admissions
app.post('/api/apply', (req, res) => {
    const { studentName, grade, parentName, phone, email } = req.body;

    const db = readData();
    const newAdmission = {
        id: Date.now(),
        studentName,
        grade,
        parentName,
        phone,
        email,
        dateSubmitted: new Date().toISOString()
    };
    db.admissions.push(newAdmission);
    writeData(db);

    console.log('--- New Admission Application ---');
    console.log(`Student: ${studentName}`);
    console.log(`Grade: ${grade}`);
    console.log(`Parent: ${parentName}`);
    console.log(`Phone: ${phone}`);
    console.log(`Email: ${email}`);
    console.log('--------------------------------');

    setTimeout(() => {
        res.json({ success: true, message: 'Application submitted successfully! We will contact you soon.' });
    }, 1000);
});

// API Get Admissions
app.get('/api/admissions', (req, res) => {
    const db = readData();
    res.json(db.admissions);
});

// API Get Holidays
app.get('/api/holidays', (req, res) => {
    const db = readData();
    res.json(db.holidays);
});

// API Add Holiday
app.post('/api/holidays', authMiddleware, (req, res) => {
    const { month, date, title, description, duration } = req.body;
    const db = readData();
    const newHoliday = {
        id: Date.now(),
        month, date, title, description, duration
    };
    db.holidays.push(newHoliday);
    writeData(db);
    res.json({ success: true, holiday: newHoliday });
});

// API Delete Holiday
app.delete('/api/holidays/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    const db = readData();
    db.holidays = db.holidays.filter(h => h.id !== id);
    writeData(db);
    res.json({ success: true });
});

// Setup Multer for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        // Create unique filename
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage });

app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
});

// Get content for a specific page
app.get('/api/content/:page', (req, res) => {
    const db = readData();
    const pageData = db.pages[req.params.page] || {};
    res.json(pageData);
});

// Update content for a specific page
app.post('/api/content/:page', authMiddleware, (req, res) => {
    const db = readData();
    db.pages = db.pages || {};
    db.pages[req.params.page] = { ...db.pages[req.params.page], ...req.body };
    writeData(db);
    res.json({ success: true, pageData: db.pages[req.params.page] });
});

// Fallback to index.html for any other requests (optional, for SPA behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
