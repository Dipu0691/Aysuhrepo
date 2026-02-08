const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API Endpoint for Admissions
app.post('/api/apply', (req, res) => {
    const { studentName, grade, parentName, phone, email } = req.body;

    // Log the received data (In a real app, save to DB)
    console.log('--- New Admission Application ---');
    console.log(`Student: ${studentName}`);
    console.log(`Grade: ${grade}`);
    console.log(`Parent: ${parentName}`);
    console.log(`Phone: ${phone}`);
    console.log(`Email: ${email}`);
    console.log('--------------------------------');

    // Simulate processing delay
    setTimeout(() => {
        res.json({ success: true, message: 'Application submitted successfully! We will contact you soon.' });
    }, 1000);
});

// Fallback to index.html for any other requests (optional, for SPA behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
