# Accreditation Assessment Tracker

## Overview

This project implements a full‑stack web application for collecting and managing accreditation metrics for university courses. Instructors can record basic course information, specify how many students belong to each major and report any number of custom performance metrics. They can also attach evidence documents such as assignments or exam samples. All data are stored in a SQLite database on the server, and uploaded files are saved to disk for later retrieval. A simple administrative table lists all submissions and provides download links for the attached files.

The latest version features a modern, responsive user interface and a flexible “Performance Metrics” section. Each metric row consists of a free‑form name and a numeric count so you can report whatever outcomes or rubrics your program uses (e.g., “Outcome A”, “Metric B”, “Passed Final Exam”). Click **Add Metric** to insert additional rows; click the red × to remove a row. Only rows with a name are stored.

## Directory Structure

The repository is flat for ease of deployment. Important files:

```
.
├── server.js        # Express API with SQLite persistence and file upload
├── app.js           # Client‑side logic for form handling and API calls
├── index.html       # Responsive front‑end interface
├── package.json     # Project metadata and dependencies
├── uploads/         # Evidence files (created at runtime)
├── database.sqlite  # SQLite database (created at runtime)
└── docs/            # Placeholder for your own documentation (design, requirements) – these files are not included here
```

## Getting Started

1. **Install Node.js** (version 14 or later). To check, run `node -v` in your terminal.

2. **Install dependencies.** From the project root, run:

   ```bash
   npm install
   ```

   This installs the only dependencies: `express` for the server, `multer` for handling file uploads and `sqlite3` for database access.

3. **Start the server.** From the project root, run:

   ```bash
   npm start
   ```

   The server will create `database.sqlite` and an `uploads` directory if they don’t exist. It listens on port 3000 by default.

4. **Open the app.** In your browser, navigate to `http://localhost:3000`. You’ll see the assessment form. Enter the course number, counts of students by major, one or more performance metrics, attach files if needed and click **Submit Assessment**. The submission appears in the table below. Clicking a file name downloads it.

## Usage Notes

- **Performance Metrics:** The “Performance Metrics” section is flexible. Each row has two fields: a *metric name* (e.g., “Excellent”, “Outcome A”, “Students scoring ≥85%”) and a *count* (the number of students who achieved that metric). Use the **Add Metric** button to add additional rows. Only rows with a non‑empty name are stored.
- **Data Persistence:** Submissions are stored in `database.sqlite` on the server and persist across restarts. Uploaded documents are stored in the `uploads` directory. You can back up or migrate these files to another machine to move the data.
 - **Shared Use:** By default the server listens only on `localhost`, meaning it is accessible only from the machine it runs on. To allow others on your network to use it, bind to all interfaces by changing `app.listen(PORT, '0.0.0.0')` in `server.js` and make sure port 3000 is open in your firewall.
 - **No bundled documentation:** This project repository focuses solely on the application code. Add your own concept, requirements or design documents in a `docs/` folder if you wish to supply additional context.

## Acknowledgements

This project was developed as a senior capstone exercise to demonstrate full‑stack web development skills. It uses only open‑source technologies and can be extended with authentication, reporting and richer analytics if desired.