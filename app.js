// Front‑end logic for the Accreditation Assessment Tracker (database version)
//
// This script communicates with the server‑side API to submit assessment
// data and retrieve existing submissions. It supports dynamic
// performance metrics, multiple file uploads and displays submissions
// in a table.

const API_BASE = '/api';

// -------------------------------
// Submission table handling
// -------------------------------
async function fetchSubmissions() {
  const res = await fetch(`${API_BASE}/submissions`);
  if (!res.ok) {
    throw new Error('Failed to fetch submissions');
  }
  const data = await res.json();
  return data.submissions;
}

function createRow(sub) {
  const tr = document.createElement('tr');
  // Build metrics display: join each metric as "name: count"
  const metricsDisplay = (sub.metrics || [])
    .map((m) => `${m.name}: ${m.count}`)
    .join(', ');
  // Build file links
  const filesLinks = (sub.files || [])
    .map((file) => {
      const href = `${API_BASE}/files/${encodeURIComponent(file.filename)}`;
      return `<a href="${href}" target="_blank">${file.name}</a>`;
    })
    .join(', ');
  tr.innerHTML = `
    <td>${sub.id}</td>
    <td>${sub.courseNumber}</td>
    <td>${sub.cs}</td>
    <td>${sub.ce}</td>
    <td>${sub.other}</td>
    <td>${metricsDisplay}</td>
    <td>${filesLinks}</td>
  `;
  return tr;
}

async function loadSubmissions() {
  const tbody = document.querySelector('#submissionsTable tbody');
  tbody.innerHTML = '';
  try {
    const submissions = await fetchSubmissions();
    if (submissions.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7">No submissions yet</td>';
      tbody.appendChild(tr);
    } else {
      submissions.forEach((sub) => {
        tbody.appendChild(createRow(sub));
      });
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7">Error loading submissions</td></tr>';
  }
}

// -------------------------------
// Dynamic metrics handling
// -------------------------------
function addMetricRow(name = '', count = '') {
  const container = document.getElementById('metricsContainer');
  const row = document.createElement('div');
  row.className = 'metric-row';
  row.innerHTML = `
    <input type="text" class="metric-name" placeholder="Metric name" value="${name}" required />
    <input type="number" class="metric-count" placeholder="Count" min="0" value="${count}" required />
    <button type="button" class="remove-metric" title="Remove metric">×</button>
  `;
  // Remove button to delete the row
  row.querySelector('.remove-metric').addEventListener('click', () => {
    container.removeChild(row);
  });
  container.appendChild(row);
}

// Collect metrics from the DOM into an array of { name, count }
function collectMetrics() {
  const rows = document.querySelectorAll('#metricsContainer .metric-row');
  const metrics = [];
  rows.forEach((row) => {
    const nameInput = row.querySelector('.metric-name');
    const countInput = row.querySelector('.metric-count');
    const name = nameInput.value.trim();
    const count = parseInt(countInput.value) || 0;
    if (name) {
      metrics.push({ name, count });
    }
  });
  return metrics;
}

// Initialize metrics section with one row
function initMetrics() {
  const container = document.getElementById('metricsContainer');
  container.innerHTML = '';
  addMetricRow();
}

// -------------------------------
// Form submission handling
// -------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Initialize metrics and load submissions on page load
  initMetrics();
  loadSubmissions();

  // Add metric button handler
  document.getElementById('addMetricBtn').addEventListener('click', () => {
    addMetricRow();
  });

  // Form submission handler
  const form = document.getElementById('submissionForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('courseNumber', form.courseNumber.value.trim());
    formData.append('cs', form.cs.value || '0');
    formData.append('ce', form.ce.value || '0');
    formData.append('other', form.other.value || '0');
    const metrics = collectMetrics();
    formData.append('metrics', JSON.stringify(metrics));
    // Append files
    const filesInput = form.evidence;
    if (filesInput && filesInput.files) {
      Array.from(filesInput.files).forEach((file) => {
        formData.append('evidence', file);
      });
    }
    try {
      const res = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        form.reset();
        initMetrics();
        await loadSubmissions();
      } else {
        const error = await res.json().catch(() => ({}));
        alert('Failed to submit: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting form');
    }
  });
});