// =========================================
// Local Upload Server
// Simple Express server for file uploads
// =========================================

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS - allow requests from frontend
app.use(cors({
    origin: '*', // In production, restrict to your domain
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Type ${file.mimetype} not allowed`));
        }
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
        success: true,
        file: {
            name: req.file.originalname,
            filename: req.file.filename,
            path: fileUrl,
            size: req.file.size,
            mimetype: req.file.mimetype
        }
    });
});

// Upload multiple files
app.post('/upload-multiple', upload.array('files', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map(file => ({
        name: file.originalname,
        filename: file.filename,
        path: `/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype
    }));

    res.json({ success: true, files });
});

// List uploads
app.get('/uploads-list', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to list files' });
        }

        const fileList = files.map(filename => ({
            filename,
            path: `/uploads/${filename}`,
            url: `${PUBLIC_URL}/uploads/${filename}`
        }));

        res.json({ files: fileList });
    });
});

// Delete file
app.delete('/uploads/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({ success: true, message: 'File deleted' });
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Upload error:', err.message);
    res.status(400).json({ error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`📁 Upload server running on http://0.0.0.0:${PORT}`);
    console.log(`   Uploads directory: ${uploadsDir}`);
});
