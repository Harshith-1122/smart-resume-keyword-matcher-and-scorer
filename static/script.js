/**
 * Smart Resume Screener & Matcher - Frontend Controller
 * Production-ready handling for file staging, drag-and-drop,
 * form submission, JSON parsing, dynamic UI rendering, and filtering.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- State ---
  let stagedFiles = [];
  let analysisData = null;
  let activeFilter = 'all'; // 'all' | 'eligible' | 'ineligible'
  let activeSort = 'score-desc'; // 'score-desc' | 'score-asc' | 'name-asc'
  let searchQuery = '';

  // --- Sample Job Descriptions Presets ---
  const JD_PRESETS = {
    fullstack: `Role: Senior Full-Stack Software Engineer
Requirements & Responsibilities:
- 4+ years of professional software engineering experience.
- Strong proficiency in Python, Flask, Django, or FastAPI for backend microservices.
- Solid experience with JavaScript, TypeScript, React, HTML5, CSS3, and modern frontend tools.
- Hands-on experience with PostgreSQL, MySQL, Redis, MongoDB, and database query optimization.
- Familiarity with Docker, Kubernetes, CI/CD pipelines, Git, GitHub Actions, and AWS or GCP.
- Deep understanding of RESTful APIs, unit testing, agile methodologies, and clean code architecture.
- Bachelor's or Master's degree in Computer Science, Software Engineering, or related technical field.`,

    'data-scientist': `Role: Data Scientist & AI / NLP Specialist
Requirements & Responsibilities:
- Strong foundations in Python, NumPy, Pandas, Scikit-learn, PyTorch, or TensorFlow.
- Practical experience in Natural Language Processing (NLP), NLTK, spaCy, Transformers, tokenization, and lemmatization.
- Experience building predictive models, feature extraction pipelines, and statistical data analysis.
- Experience with SQL, data wrangling, data visualization, and cloud environments (AWS/Azure).
- Degree required: Bachelor's, Master's, or Ph.D. in Computer Science, Statistics, Mathematics, or Data Science.
- Excellent communication skills and ability to present quantitative insights to stakeholders.`,

    devops: `Role: Senior DevOps & Cloud Infrastructure Engineer
Requirements & Responsibilities:
- 3+ years managing production infrastructure on AWS, Azure, or Google Cloud Platform.
- Mastery of Linux systems administration, bash scripting, and Python automation.
- Extensive experience with Docker containerization, Kubernetes orchestration, and Helm charts.
- Infrastructure as Code (IaC) using Terraform, CloudFormation, or Ansible.
- Strong background with CI/CD tools (Jenkins, GitLab CI, GitHub Actions) and monitoring (Prometheus, Grafana).
- Bachelor of Engineering (B.E.), B.Tech, or Master's in Computer Science or Information Technology.`,

    frontend: `Role: Senior Frontend Engineer (React & Modern Web)
Requirements & Responsibilities:
- 4+ years building high-performance, accessible, and responsive user interfaces.
- Expert knowledge of JavaScript (ES6+), TypeScript, HTML5, CSS3, Flexbox, and CSS Grid.
- Production experience with React, Next.js, Vue, state management, and component libraries.
- Strong grasp of RESTful APIs, GraphQL, browser rendering performance, and client-side caching.
- Familiarity with automated testing using Jest, Cypress, or Playwright.
- Bachelor's degree (B.S., B.Tech, B.C.A) in Computer Science or related degree.`
  };

  // --- DOM Elements ---
  const matcherForm = document.getElementById('matcher-form');
  const jdTextarea = document.getElementById('job-description');
  const jdPresets = document.getElementById('jd-presets');
  const jdCharCount = document.getElementById('jd-char-count');
  const jdWordCount = document.getElementById('jd-word-count');
  const btnClearJd = document.getElementById('btn-clear-jd');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('resumes-input');
  const filesPreviewSection = document.getElementById('files-preview-section');
  const fileList = document.getElementById('file-list');
  const fileCountDisplay = document.getElementById('file-count-display');
  const stagedCount = document.getElementById('staged-count');
  const btnClearFiles = document.getElementById('btn-clear-files');
  const btnLoadDemo = document.getElementById('btn-load-demo');

  const btnSubmit = document.getElementById('btn-submit');
  const btnContent = btnSubmit.querySelector('.btn-content');
  const btnLoading = btnSubmit.querySelector('.btn-loading');

  const errorBanner = document.getElementById('error-banner');
  const errorMessage = document.getElementById('error-message');
  const btnCloseError = document.getElementById('btn-close-error');

  const processingIndicator = document.getElementById('processing-indicator');
  const processingStep = document.getElementById('processing-step');

  const resultsSection = document.getElementById('results-section');
  const metaAnalysisDate = document.getElementById('meta-analysis-date');
  const metaProcessingTime = document.getElementById('meta-processing-time');
  const kpiTotal = document.getElementById('kpi-total');
  const kpiEligible = document.getElementById('kpi-eligible');
  const kpiIneligible = document.getElementById('kpi-ineligible');
  const kpiAvgScore = document.getElementById('kpi-avg-score');

  const filterTabs = document.querySelectorAll('.filter-tab');
  const filterCountAll = document.getElementById('filter-count-all');
  const filterCountEligible = document.getElementById('filter-count-eligible');
  const filterCountIneligible = document.getElementById('filter-count-ineligible');
  const candidateSearch = document.getElementById('candidate-search');
  const candidateSort = document.getElementById('candidate-sort');
  const candidatesContainer = document.getElementById('candidates-container');

  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnResetAll = document.getElementById('btn-reset-all');
  const toastContainer = document.getElementById('toast-container');

  // --- Helpers ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.classList.remove('hidden');
    errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorBanner.classList.add('hidden');
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function updateJdCounters() {
    const text = jdTextarea.value.trim();
    const chars = jdTextarea.value.length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    jdCharCount.textContent = chars.toLocaleString();
    jdWordCount.textContent = words.toLocaleString();
  }

  // --- Job Description Handlers ---
  jdTextarea.addEventListener('input', updateJdCounters);

  btnClearJd.addEventListener('click', () => {
    jdTextarea.value = '';
    jdPresets.value = '';
    updateJdCounters();
    jdTextarea.focus();
  });

  jdPresets.addEventListener('change', (e) => {
    const role = e.target.value;
    if (role && JD_PRESETS[role]) {
      jdTextarea.value = JD_PRESETS[role];
      updateJdCounters();
      showToast(`Loaded sample "${e.target.options[e.target.selectedIndex].text}" JD`, 'success');
      hideError();
    }
  });

  // --- File Staging & Drag-and-Drop ---
  const VALID_EXTENSIONS = ['.pdf', '.docx', '.txt'];
  const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

  function isValidExtension(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return VALID_EXTENSIONS.includes(ext);
  }

  function addFiles(files) {
    let addedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;

    Array.from(files).forEach((file) => {
      if (!isValidExtension(file.name)) {
        rejectedCount++;
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast(`"${file.name}" exceeds the 16MB limit.`, 'error');
        return;
      }
      // Deduplicate by name and size
      const isDuplicate = stagedFiles.some(
        (f) => f.name === file.name && f.size === file.size
      );
      if (isDuplicate) {
        duplicateCount++;
        return;
      }

      stagedFiles.push(file);
      addedCount++;
    });

    if (rejectedCount > 0) {
      showToast(`${rejectedCount} unsupported file(s) ignored. Only .pdf, .docx, and .txt allowed.`, 'error');
    }
    if (duplicateCount > 0) {
      showToast(`${duplicateCount} duplicate file(s) skipped.`, 'info');
    }
    if (addedCount > 0) {
      hideError();
    }

    renderStagedFiles();
  }

  function removeFile(index) {
    stagedFiles.splice(index, 1);
    renderStagedFiles();
  }

  function clearAllFiles() {
    stagedFiles = [];
    fileInput.value = '';
    renderStagedFiles();
  }

  function renderStagedFiles() {
    fileList.innerHTML = '';
    const count = stagedFiles.length;
    stagedCount.textContent = count;
    fileCountDisplay.textContent = `${count} file${count === 1 ? '' : 's'} selected`;

    if (count > 0) {
      filesPreviewSection.classList.add('has-files');
    } else {
      filesPreviewSection.classList.remove('has-files');
    }

    stagedFiles.forEach((file, index) => {
      const ext = file.name.split('.').pop().toUpperCase();
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `
        <div class="file-item-left">
          <span class="file-ext-tag">${ext}</span>
          <span class="file-name" title="${file.name}">${file.name}</span>
          <span class="file-size">${formatBytes(file.size)}</span>
        </div>
        <button type="button" class="btn-remove-file" title="Remove file" data-index="${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;

      li.querySelector('.btn-remove-file').addEventListener('click', () => {
        removeFile(index);
      });

      fileList.appendChild(li);
    });
  }

  btnClearFiles.addEventListener('click', clearAllFiles);

  const DEMO_RESUMES = [
    {
      name: 'John_Doe_Senior_Developer.txt',
      content: `John Doe
Email: john.doe@example.com | Phone: +1-555-0199 | San Francisco, CA
EDUCATION: Bachelor of Science (B.Tech) in Computer Science - University of California
SUMMARY: Senior Software Engineer with 6+ years designing scalable microservices.
SKILLS: Python, Flask, Django, FastAPI, JavaScript, TypeScript, React, HTML5, CSS3, SQL, PostgreSQL, MySQL, Redis, MongoDB, Docker, Kubernetes, AWS, CI/CD, Git, GitHub Actions, Linux, RESTful APIs, Microservices, Agile, Unit Testing, Lemmatization, Software Engineering.
EXPERIENCE: Lead Backend Developer at TechFlow Solutions. Architected REST APIs using Python and Flask handling 5M daily requests. Containerized microservices using Docker and Kubernetes.`
    },
    {
      name: 'Jane_Smith_Data_Scientist.txt',
      content: `Jane Smith
Email: jane.smith@example.com | New York, NY
EDUCATION: Master of Science (MS) in Data Science & Machine Learning - Columbia University
Bachelor of Science (BS) in Mathematics
SUMMARY: Data Scientist with 4+ years of expertise in NLP, statistical modeling, and deep learning.
SKILLS: Python, SQL, R, NLTK, spaCy, Transformers, Scikit-learn, PyTorch, Tokenization, Lemmatization, Feature Extraction, AWS, Docker, Git, Pandas, NumPy, Jupyter, Predictive Modeling, Statistical Data Analysis.`
    },
    {
      name: 'Alex_Taylor_Marketing_Specialist.txt',
      content: `Alex Taylor
Email: alex.taylor@example.com | Austin, TX
EDUCATION: Master of Business Administration (MBA) in Marketing
SUMMARY: Growth Marketing Manager with 5+ years of experience leading cross-channel acquisition campaigns.
SKILLS: Digital Marketing, SEO, SEM, Content Strategy, Brand Management, Google Analytics, HubSpot, Salesforce, Copywriting.`
    }
  ];

  if (btnLoadDemo) {
    btnLoadDemo.addEventListener('click', () => {
      const demoFiles = DEMO_RESUMES.map(
        (r) => new File([r.content], r.name, { type: 'text/plain' })
      );
      addFiles(demoFiles);
      if (!jdTextarea.value.trim()) {
        jdPresets.value = 'fullstack';
        jdTextarea.value = JD_PRESETS.fullstack;
        updateJdCounters();
      }
      showToast('Loaded 3 demo candidate resumes!', 'success');
    });
  }

  // Dropzone click & drag handlers
  dropzone.addEventListener('click', (e) => {
    // If click is directly on dropzone, trigger input
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'dragend'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  });

  // Prevent default window drag & drop
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  // --- Close Error Banner ---
  btnCloseError.addEventListener('click', hideError);

  // --- Dynamic Progress Messages ---
  let progressInterval = null;
  function startProgressCycle() {
    const steps = [
      'Extracting text & tokenizing keywords with NLTK...',
      'Filtering stop words and applying lemmatization...',
      'Analyzing intersecting skills and calculating match scores...',
      'Evaluating candidate degrees and eligibility rankings...',
      'Finalizing analysis results...'
    ];
    let stepIndex = 0;
    processingStep.textContent = steps[0];
    progressInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      processingStep.textContent = steps[stepIndex];
    }, 1800);
  }

  function stopProgressCycle() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  // --- Form Submission & API Request ---
  matcherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const jdText = jdTextarea.value.trim();

    // Validation
    if (!jdText) {
      showError('Please enter a job description or choose a sample role preset.');
      jdTextarea.focus();
      return;
    }

    if (stagedFiles.length === 0) {
      showError('Please upload at least one resume file (.pdf, .docx, or .txt) to evaluate.');
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Assemble FormData
    const formData = new FormData();
    formData.append('job_description', jdText);

    // Backend expects files in fields starting with 'resumes' (e.g. 'resumes' or 'resumes[]')
    stagedFiles.forEach((file) => {
      formData.append('resumes', file, file.name);
    });

    // UI State: Loading
    btnSubmit.disabled = true;
    btnContent.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    processingIndicator.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    processingIndicator.scrollIntoView({ behavior: 'smooth', block: 'center' });
    startProgressCycle();

    try {
      const response = await fetch('/match', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetail = data.error || data.message || `Server returned error (${response.status})`;
        throw new Error(errorDetail);
      }

      if (data.status === 'error') {
        throw new Error(data.error || 'Failed to process resumes.');
      }

      // Success
      analysisData = data;
      renderResults(data);
      showToast(`Successfully analyzed ${data.total_resumes} resume(s)!`, 'success');
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('Match Request Error:', err);
      showError(err.message || 'An unexpected error occurred while communicating with the backend.');
    } finally {
      stopProgressCycle();
      btnSubmit.disabled = false;
      btnContent.classList.remove('hidden');
      btnLoading.classList.add('hidden');
      processingIndicator.classList.add('hidden');
    }
  });

  // --- Results Rendering ---
  function renderResults(data) {
    if (!data || !data.results) return;

    // Metadata & KPIs
    metaAnalysisDate.textContent = data.analysis_date || new Date().toLocaleString();
    const procTime = data.metadata && data.metadata.processing_time_seconds 
      ? `${Number(data.metadata.processing_time_seconds).toFixed(2)}s` 
      : '0.15s';
    metaProcessingTime.textContent = procTime;

    kpiTotal.textContent = data.total_resumes || data.results.length;
    kpiEligible.textContent = data.eligible_count;
    kpiIneligible.textContent = data.ineligible_count;
    kpiAvgScore.textContent = `${Math.round(data.average_score || 0)}%`;

    // Filter counts
    filterCountAll.textContent = data.results.length;
    filterCountEligible.textContent = data.eligible_count;
    filterCountIneligible.textContent = data.ineligible_count;

    resultsSection.classList.remove('hidden');
    applyFiltersAndRender();
  }

  function applyFiltersAndRender() {
    if (!analysisData || !analysisData.results) return;

    let filtered = [...analysisData.results];

    // Filter by Eligibility
    if (activeFilter === 'eligible') {
      filtered = filtered.filter((r) => r.is_eligible);
    } else if (activeFilter === 'ineligible') {
      filtered = filtered.filter((r) => !r.is_eligible);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const matchName = r.name && r.name.toLowerCase().includes(q);
        const matchFile = r.filename && r.filename.toLowerCase().includes(q);
        const matchDegree = r.degrees && r.degrees.some((d) => d.toLowerCase().includes(q));
        const matchKeyword = r.matched_keywords && r.matched_keywords.some((k) => k.toLowerCase().includes(q));
        return matchName || matchFile || matchDegree || matchKeyword;
      });
    }

    // Sorting
    if (activeSort === 'score-desc') {
      filtered.sort((a, b) => b.score - a.score);
    } else if (activeSort === 'score-asc') {
      filtered.sort((a, b) => a.score - b.score);
    } else if (activeSort === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    renderCandidateCards(filtered);
  }

  function renderCandidateCards(candidates) {
    candidatesContainer.innerHTML = '';

    if (candidates.length === 0) {
      candidatesContainer.innerHTML = `
        <div class="card empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <h4>No Candidates Match Your Filters</h4>
          <p>Try clearing the search query or changing the filter tab.</p>
        </div>
      `;
      return;
    }

    candidates.forEach((c, index) => {
      const card = document.createElement('div');
      card.className = 'card candidate-card';

      // Rank Badge
      let rankClass = 'rank-other';
      if (index === 0 && activeSort === 'score-desc') rankClass = 'rank-top-1';
      else if (index === 1 && activeSort === 'score-desc') rankClass = 'rank-top-2';
      else if (index === 2 && activeSort === 'score-desc') rankClass = 'rank-top-3';

      const rankText = activeSort === 'score-desc' 
        ? `#${index + 1} Rank` 
        : `Candidate #${index + 1}`;

      // Score Radial Calculation
      const radius = 26;
      const circumference = 2 * Math.PI * radius;
      const score = Math.max(0, Math.min(100, c.score || 0));
      const strokeDashoffset = circumference - (score / 100) * circumference;
      const radialFillClass = c.is_eligible ? 'radial-fill-green' : 'radial-fill-red';

      // Status Badge
      const statusBadge = c.is_eligible
        ? `<span class="status-badge status-badge-eligible"><span class="status-dot-green"></span> Eligible</span>`
        : `<span class="status-badge status-badge-ineligible">Not Eligible</span>`;

      // Degrees
      const degreesList = Array.isArray(c.degrees) && c.degrees.length > 0 
        ? c.degrees.map((d) => `<span class="degree-badge">${d}</span>`).join(' ') 
        : '<span class="degree-badge">Not Specified</span>';

      // Keywords lists
      const matchedChips = (c.matched_keywords || []).slice(0, 10).map((k) =>
        `<span class="chip chip-matched">${k}</span>`
      ).join('');

      const missingChips = (c.missing_keywords || []).slice(0, 10).map((k) =>
        `<span class="chip chip-missing">${k}</span>`
      ).join('');

      const allMatchedPills = (c.matched_keywords || []).map((k) =>
        `<span class="chip chip-matched">${k}</span>`
      ).join('') || '<span class="no-keywords">None detected</span>';

      const allMissingPills = (c.missing_keywords || []).map((k) =>
        `<span class="chip chip-missing">${k}</span>`
      ).join('') || '<span class="no-keywords">No missing keywords</span>';

      card.innerHTML = `
        <div class="rank-badge ${rankClass}">${rankText}</div>
        
        <div class="candidate-header-row">
          <div class="candidate-info">
            <h3 class="candidate-name">${c.name || 'Candidate'}</h3>
            <span class="candidate-filename">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              ${c.filename}
            </span>
          </div>

          <div class="candidate-score-block">
            <div class="score-radial" title="Match Score: ${c.score}%">
              <svg viewBox="0 0 68 68">
                <circle class="radial-bg" cx="34" cy="34" r="${radius}"></circle>
                <circle 
                  class="radial-fill ${radialFillClass}" 
                  cx="34" 
                  cy="34" 
                  r="${radius}" 
                  stroke-dasharray="${circumference}" 
                  stroke-dashoffset="${strokeDashoffset}"
                ></circle>
              </svg>
              <span class="radial-label">${c.score}%</span>
            </div>
            ${statusBadge}
          </div>
        </div>

        <div class="candidate-meta-row">
          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            <span>Degree: ${degreesList}</span>
          </div>

          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>Resume Words: <strong>${c.resume_word_count || 0}</strong></span>
          </div>

          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <span>JD Words: <strong>${c.jd_word_count || 0}</strong></span>
          </div>
        </div>

        <div class="keywords-breakdown-grid">
          <div class="keyword-box">
            <div class="keyword-box-header">
              <span class="keyword-box-title matched-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Matched Skills
              </span>
              <span class="keyword-count-pill count-matched">${(c.matched_keywords || []).length} keywords</span>
            </div>
            <div class="keyword-chips-wrap">
              ${matchedChips || '<span class="no-keywords">No keyword matches found</span>'}
            </div>
          </div>

          <div class="keyword-box">
            <div class="keyword-box-header">
              <span class="keyword-box-title missing-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Missing Keywords
              </span>
              <span class="keyword-count-pill count-missing">${(c.missing_keywords || []).length} keywords</span>
            </div>
            <div class="keyword-chips-wrap">
              ${missingChips || '<span class="no-keywords">No missing keywords!</span>'}
            </div>
          </div>
        </div>

        <div class="candidate-card-footer">
          <button type="button" class="btn-toggle-details" aria-expanded="false">
            <span>View All Keywords (${(c.matched_keywords || []).length + (c.missing_keywords || []).length})</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        <div class="details-drawer">
          <h4 class="drawer-section-title">All Matched Keywords (${(c.matched_keywords || []).length}):</h4>
          <div class="full-keywords-list">${allMatchedPills}</div>

          <h4 class="drawer-section-title">All Missing Keywords (${(c.missing_keywords || []).length}):</h4>
          <div class="full-keywords-list">${allMissingPills}</div>
        </div>
      `;

      // Accordion toggle
      const toggleBtn = card.querySelector('.btn-toggle-details');
      const drawer = card.querySelector('.details-drawer');
      toggleBtn.addEventListener('click', () => {
        const isOpen = drawer.classList.contains('open');
        if (isOpen) {
          drawer.classList.remove('open');
          toggleBtn.classList.remove('expanded');
          toggleBtn.setAttribute('aria-expanded', 'false');
        } else {
          drawer.classList.add('open');
          toggleBtn.classList.add('expanded');
          toggleBtn.setAttribute('aria-expanded', 'true');
        }
      });

      candidatesContainer.appendChild(card);
    });
  }

  // --- Filter and Sort Handlers ---
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeFilter = tab.getAttribute('data-filter');
      applyFiltersAndRender();
    });
  });

  candidateSearch.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFiltersAndRender();
  });

  candidateSort.addEventListener('change', (e) => {
    activeSort = e.target.value;
    applyFiltersAndRender();
  });

  // --- Export Actions ---
  btnExportCsv.addEventListener('click', () => {
    if (!analysisData || !analysisData.results || analysisData.results.length === 0) {
      showToast('No results to export.', 'error');
      return;
    }

    const headers = ['Rank', 'Candidate Name', 'Filename', 'Score (%)', 'Status', 'Degrees', 'Matched Keywords Count', 'Missing Keywords Count', 'Resume Word Count'];
    const rows = analysisData.results.map((c, index) => [
      index + 1,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.filename || '').replace(/"/g, '""')}"`,
      c.score,
      c.status,
      `"${(c.degrees || []).join('; ').replace(/"/g, '""')}"`,
      (c.matched_keywords || []).length,
      (c.missing_keywords || []).length,
      c.resume_word_count || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resume_screener_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Exported CSV report!', 'success');
  });

  btnExportJson.addEventListener('click', () => {
    if (!analysisData) {
      showToast('No results to export.', 'error');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysisData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `resume_screener_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Exported JSON report!', 'success');
  });

  // --- Reset All Action ---
  btnResetAll.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all inputs and results?')) {
      stagedFiles = [];
      analysisData = null;
      searchQuery = '';
      activeFilter = 'all';
      activeSort = 'score-desc';

      fileInput.value = '';
      jdTextarea.value = '';
      jdPresets.value = '';
      candidateSearch.value = '';
      candidateSort.value = 'score-desc';

      updateJdCounters();
      renderStagedFiles();
      hideError();
      resultsSection.classList.add('hidden');
      processingIndicator.classList.add('hidden');

      filterTabs.forEach((t) => {
        t.classList.remove('active');
        if (t.getAttribute('data-filter') === 'all') {
          t.classList.add('active');
        }
      });

      showToast('Application reset.', 'info');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Initial state check
  updateJdCounters();
  renderStagedFiles();
});
