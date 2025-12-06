// Accreditation Assessment Tracker backend
//
// This server exposes a small REST API for submitting and
// retrieving accreditation assessment data. It uses SQLite for
// persistence and Multer for handling file uploads. The API
// surface intentionally remains small to minimize dependencies
// and complexity.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Use JSON parser for non‑multipart requests (not used here but kept for completeness)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
db.serialize(() => {
  // Create submissions table
  db.run(
    `CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courseNumber TEXT NOT NULL,
      cs INTEGER DEFAULT 0,
      ce INTEGER DEFAULT 0,
      other INTEGER DEFAULT 0,
      metrics TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );
  // Create files table
  db.run(
    `CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submissionId INTEGER NOT NULL,
      originalName TEXT NOT NULL,
      filename TEXT NOT NULL,
      FOREIGN KEY (submissionId) REFERENCES submissions(id)
    )`
  );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Create a new submission. Expects multipart form data with:
// - courseNumber: string
// - cs, ce, other: integers (optional)
// - metrics: JSON string representing an array of { name, count }
// - evidence: one or more files (optional)
app.post('/api/submissions', upload.array('evidence'), (req, res) => {
  const { courseNumber, cs, ce, other, metrics } = req.body;
  let metricsString;
  try {
    metricsString = typeof metrics === 'string' ? metrics : JSON.stringify(metrics);
    // Validate that metrics can be parsed
    JSON.parse(metricsString);
  } catch (err) {
    return res.status(400).json({ error: 'metrics must be a valid JSON array' });
  }
  const csNum = cs ? parseInt(cs) : 0;
  const ceNum = ce ? parseInt(ce) : 0;
  const otherNum = other ? parseInt(other) : 0;
  db.run(
    'INSERT INTO submissions (courseNumber, cs, ce, other, metrics) VALUES (?, ?, ?, ?, ?)',
    [courseNumber, csNum, ceNum, otherNum, metricsString],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      const submissionId = this.lastID;
      const files = req.files || [];
      if (files.length === 0) {
        return res.status(201).json({ id: submissionId });
      }
      let remaining = files.length;
      files.forEach((file) => {
        db.run(
          'INSERT INTO files (submissionId, originalName, filename) VALUES (?, ?, ?)',
          [submissionId, file.originalname, file.filename],
          (fileErr) => {
            if (fileErr) {
              console.error(fileErr);
            }
            remaining -= 1;
            if (remaining === 0) {
              res.status(201).json({ id: submissionId });
            }
          }
        );
      });
    }
  );
});

// Retrieve all submissions with associated files
app.get('/api/submissions', (req, res) => {
  const sql = `SELECT s.id, s.courseNumber, s.cs, s.ce, s.other, s.metrics, s.createdAt,
                      f.originalName AS fileOriginalName, f.filename AS fileName
               FROM submissions s
               LEFT JOIN files f ON f.submissionId = s.id
               ORDER BY s.id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    const submissionsMap = new Map();
    rows.forEach((row) => {
      if (!submissionsMap.has(row.id)) {
        let parsedMetrics;
        try {
          parsedMetrics = JSON.parse(row.metrics);
        } catch {
          parsedMetrics = [];
        }
        submissionsMap.set(row.id, {
          id: row.id,
          courseNumber: row.courseNumber,
          cs: row.cs,
          ce: row.ce,
          other: row.other,
          metrics: parsedMetrics,
          createdAt: row.createdAt,
          files: [],
        });
      }
      if (row.fileName) {
        submissionsMap.get(row.id).files.push({ name: row.fileOriginalName, filename: row.fileName });
      }
    });
    res.json({ submissions: Array.from(submissionsMap.values()) });
  });
});

// Serve uploaded files
app.get('/api/files/:filename', (req, res) => {
  const fileName = req.params.filename;
  // Prevent path traversal attacks by taking only the basename
  const safeName = path.basename(fileName);
  const filePath = path.join(uploadDir, safeName);
  res.sendFile(filePath);
});

// Serve static assets (index.html, app.js, etc.) from the root
app.use(express.static(__dirname));

// Fallback route to support client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});