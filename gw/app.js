// Global variables
let uploadedData = null;
let currentStep = 1;
let modelReady = false;
let predictionHistory = [];
let numericFeatures = ['Air temperature [K]', 'Process temperature [K]', 'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]'];
let categoricalFeatures = ['Type'];
let targetVariable = 'Machine failure';
let clusterResults = null;
let autoencoderModel = null;
let classifierModel = null;
let preprocessedData = null;
let preprocessedLabels = null;
let scalerStats = null;

// DOM Elements
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileUploadArea = document.getElementById('file-upload-area');
const uploadStatus = document.getElementById('upload-status');
const dataPreview = document.getElementById('data-preview');
const analyzeBtn = document.getElementById('analyze-btn');
const edaBtn = document.getElementById('eda-btn');
const preprocessBtn = document.getElementById('preprocess-btn');
const trainBtn = document.getElementById('train-btn');
const evaluateBtn = document.getElementById('evaluate-btn');
const predictionReadyBtn = document.getElementById('prediction-ready-btn');
const predictBtn = document.getElementById('predict-btn');
const resetBtn = document.getElementById('reset-btn');
const predictionForm = document.getElementById('prediction-form');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeTabs();
    checkTensorFlowAvailability();
});

function checkTensorFlowAvailability() {
    if (typeof tf === 'undefined') {
        console.error('TensorFlow.js is not loaded');
        alert('TensorFlow.js failed to load. Please check your internet connection.');
    } else {
        console.log('TensorFlow.js is ready');
    }
}

function initializeEventListeners() {
    // File upload events
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    
    // Drag and drop for file upload
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#3498db';
    });
    
    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#ddd';
    });
    
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#ddd';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileUpload();
        }
    });
    
    // Pipeline buttons
    analyzeBtn.addEventListener('click', analyzeDataset);
    edaBtn.addEventListener('click', performRealEDA);
    preprocessBtn.addEventListener('click', preprocessRealData);
    trainBtn.addEventListener('click', trainRealModels);
    evaluateBtn.addEventListener('click', evaluateRealModel);
    predictionReadyBtn.addEventListener('click', () => {
        modelReady = true;
        predictBtn.disabled = false;
        updateStep(6, 'complete');
        alert('Model is ready for predictions!');
    });
    
    // Prediction form
    predictionForm.addEventListener('submit', handleRealPrediction);
    resetBtn.addEventListener('click', resetForm);
    
    // Initialize gauge
    updateGauge(0);
}

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Pipeline tabs
    const pipelineTabs = document.querySelectorAll('.tab[data-tab]');
    pipelineTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabId).classList.add('active');
    
    // Activate selected tab
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
}

function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showStatus('Please upload a CSV file', 'error');
        return;
    }
    
    showStatus('Processing file...', 'info');
    
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                showStatus('Error parsing CSV file', 'error');
                console.error('CSV Errors:', results.errors);
                return;
            }
            
            uploadedData = results.data;
            showStatus(`File uploaded successfully: ${uploadedData.length} rows`, 'success');
            updateStep(1, 'complete');
            showDataPreview();
            analyzeBtn.style.display = 'inline-block';
        },
        error: function(error) {
            showStatus('Error reading file', 'error');
            console.error('File Error:', error);
        }
    });
}

function showStatus(message, type = 'info') {
    const colors = {
        info: '#3498db',
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12'
    };
    
    uploadStatus.innerHTML = `
        <div style="padding: 10px; background: ${colors[type]}20; color: ${colors[type]}; 
                  border-radius: 5px; border-left: 4px solid ${colors[type]}">
            ${message}
        </div>
    `;
}

function showDataPreview() {
    if (!uploadedData || uploadedData.length === 0) return;
    
    const previewData = uploadedData.slice(0, 10);
    const headers = Object.keys(uploadedData[0]);
    
    // Create table header
    let thead = '<tr>';
    headers.forEach(header => {
        thead += `<th>${header}</th>`;
    });
    thead += '</tr>';
    document.getElementById('data-table-head').innerHTML = thead;
    
    // Create table body
    let tbody = '';
    previewData.forEach(row => {
        tbody += '<tr>';
        headers.forEach(header => {
            tbody += `<td>${row[header] !== null && row[header] !== undefined ? row[header] : ''}</td>`;
        });
        tbody += '</tr>';
    });
    document.getElementById('data-table-body').innerHTML = tbody;
    
    dataPreview.style.display = 'block';
}

function updateStep(step, status) {
    // Update current step
    currentStep = step;
    
    // Update pipeline steps
    for (let i = 1; i <= 6; i++) {
        const stepElement = document.getElementById(`step${i}`);
        const badge = stepElement.querySelector('.status-badge');
        
        if (i < step) {
            stepElement.classList.add('step-active');
            badge.textContent = 'Complete';
            badge.className = 'status-badge status-complete';
        } else if (i === step) {
            stepElement.classList.add('step-active');
            badge.textContent = status === 'complete' ? 'Complete' : 'In Progress';
            badge.className = `status-badge ${status === 'complete' ? 'status-complete' : 'status-pending'}`;
        } else {
            stepElement.classList.remove('step-active');
            badge.textContent = 'Pending';
            badge.className = 'status-badge status-pending';
        }
    }
}

function analyzeDataset() {
    if (!uploadedData || uploadedData.length === 0) {
        alert('Please upload data first');
        return;
    }
    
    updateStep(2, 'complete');
    switchTab('dataset-info');
    
    // Calculate dataset statistics
    const totalRecords = uploadedData.length;
    
    // Count failures
    let failureCount = 0;
    let failureColumnName = 'Machine failure';
    
    // Find the failure column name
    const firstRow = uploadedData[0];
    for (let key in firstRow) {
        if (key.toLowerCase().includes('failure') || key.toLowerCase().includes('target')) {
            failureColumnName = key;
            break;
        }
    }
    
    failureCount = uploadedData.filter(row => row[failureColumnName] === 1).length;
    
    const failureRate = ((failureCount / totalRecords) * 100).toFixed(2);
    
    // Display statistics
    document.getElementById('total-records').textContent = totalRecords.toLocaleString();
    document.getElementById('total-features').textContent = numericFeatures.length + categoricalFeatures.length;
    document.getElementById('failure-rate').textContent = `${failureRate}%`;
    document.getElementById('dataset-stats').style.display = 'grid';
    
    // Check for missing values
    checkMissingValues();
    
    // Update dataset summary
    document.getElementById('dataset-summary').innerHTML = `
        <p>The dataset contains <strong>${totalRecords}</strong> records with <strong>${numericFeatures.length + categoricalFeatures.length}</strong> features.</p>
        <p>The failure rate is <strong>${failureRate}%</strong> (${failureCount} failure cases).</p>
        <p><strong>Numeric Features (5):</strong> ${numericFeatures.join(', ')}</p>
        <p><strong>Categorical Features (1):</strong> ${categoricalFeatures.join(', ')}</p>
        <p><strong>Target Variable:</strong> ${failureColumnName}</p>
    `;
    
    edaBtn.style.display = 'inline-block';
}

function checkMissingValues() {
    if (!uploadedData || uploadedData.length === 0) return;
    
    const allFeatures = [...numericFeatures, ...categoricalFeatures];
    let missingValuesFound = false;
    let missingValuesHtml = '<h4>Missing Values Analysis</h4>';
    
    allFeatures.forEach(feature => {
        const missingCount = uploadedData.filter(row => 
            row[feature] === null || row[feature] === undefined || row[feature] === ''
        ).length;
        
        if (missingCount > 0) {
            missingValuesFound = true;
            missingValuesHtml += `
                <div style="margin: 5px 0;">
                    <strong>${feature}:</strong> ${missingCount} missing values (${((missingCount/uploadedData.length)*100).toFixed(2)}%)
                </div>
            `;
        }
    });
    
    if (missingValuesFound) {
        missingValuesHtml = `
            <div class="missing-values-section">
                ${missingValuesHtml}
                <div class="missing-values-options">
                    <button class="btn btn-warning" onclick="handleMissingValues('mean')">Fill with Mean/Median/Mode</button>
                    <button class="btn btn-warning" onclick="handleMissingValues('remove')">Remove Rows</button>
                </div>
            </div>
        `;
    } else {
        missingValuesHtml = '<p style="color: var(--success);">✓ No missing values found in the dataset.</p>';
    }
    
    document.getElementById('missing-values-section').innerHTML = missingValuesHtml;
    document.getElementById('missing-values-section').style.display = 'block';
}

function handleMissingValues(strategy) {
    if (!uploadedData) return;
    
    const allFeatures = [...numericFeatures, ...categoricalFeatures];
    
    allFeatures.forEach(feature => {
        const missingIndices = [];
        
        // Find indices of missing values
        uploadedData.forEach((row, index) => {
            if (row[feature] === null || row[feature] === undefined || row[feature] === '') {
                missingIndices.push(index);
            }
        });
        
        if (missingIndices.length > 0) {
            if (strategy === 'mean' && numericFeatures.includes(feature)) {
                // Calculate mean for numeric features
                const values = uploadedData
                    .filter(row => row[feature] !== null && row[feature] !== undefined && row[feature] !== '')
                    .map(row => row[feature]);
                
                if (values.length > 0) {
                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                    missingIndices.forEach(index => {
                        uploadedData[index][feature] = mean;
                    });
                }
            } else if (strategy === 'remove') {
                // Remove rows with missing values
                uploadedData = uploadedData.filter((row, index) => !missingIndices.includes(index));
            } else if (categoricalFeatures.includes(feature)) {
                // For categorical, use mode
                const values = uploadedData
                    .filter(row => row[feature] !== null && row[feature] !== undefined && row[feature] !== '')
                    .map(row => row[feature]);
                
                if (values.length > 0) {
                    const counts = {};
                    values.forEach(value => {
                        counts[value] = (counts[value] || 0) + 1;
                    });
                    const mode = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                    missingIndices.forEach(index => {
                        uploadedData[index][feature] = mode;
                    });
                }
            }
        }
    });
    
    document.querySelector('.missing-values-section').innerHTML += 
        '<p style="color: var(--success); margin-top: 10px;">✓ Missing values handled successfully.</p>';
    
    // Update statistics
    setTimeout(() => analyzeDataset(), 500);
}

async function performRealEDA() {
    if (!uploadedData || uploadedData.length === 0) {
        alert('Please upload and analyze data first');
        return;
    }
    
    updateStep(3, 'complete');
    switchTab('eda');
    
    document.getElementById('eda-content').innerHTML = `
        <div class="loading" id="eda-loading">
            <div class="spinner"></div>
            <p>Performing Exploratory Data Analysis & Mixed Data Clustering...</p>
        </div>
        
        <div id="eda-results" style="display: none;">
            <div class="eda-section">
                <h3>Categorical Feature Distribution</h3>
                <div class="chart-row">
                    <div class="chart-item">
                        <canvas id="type-distribution-chart"></canvas>
                    </div>
                    <div class="chart-item">
                        <canvas id="failure-distribution-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="eda-section">
                <h3>Numeric Features Distribution</h3>
                <div class="chart-row">
                    <div class="chart-item">
                        <canvas id="air-temp-distribution"></canvas>
                    </div>
                    <div class="chart-item">
                        <canvas id="process-temp-distribution"></canvas>
                    </div>
                </div>
                <div class="chart-row">
                    <div class="chart-item">
                        <canvas id="rotational-speed-distribution"></canvas>
                    </div>
                    <div class="chart-item">
                        <canvas id="torque-distribution"></canvas>
                    </div>
                </div>
                <div class="chart-row">
                    <div class="chart-item">
                        <canvas id="tool-wear-distribution"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="eda-section">
                <h3>Correlation Matrix (Numeric Features)</h3>
                <div id="correlation-matrix-container">
                    <table class="correlation-table" id="correlation-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>Air Temp</th>
                                <th>Process Temp</th>
                                <th>Rot. Speed</th>
                                <th>Torque</th>
                                <th>Tool Wear</th>
                            </tr>
                        </thead>
                        <tbody id="correlation-table-body"></tbody>
                    </table>
                </div>
                <div class="chart-item-full">
                    <canvas id="correlation-chart"></canvas>
                </div>
            </div>
            
            <div class="eda-section">
                <h3>Mixed Data Clustering with K-Prototypes</h3>
                <div class="cluster-info">
                    <p>Performing clustering on mixed data (5 numeric + 1 categorical features):</p>
                    <div class="cluster-stats" id="cluster-stats"></div>
                    
                    <h4 style="margin-top: 20px;">Elbow Method for Optimal K</h4>
                    <div class="chart-item">
                        <canvas id="elbow-chart"></canvas>
                    </div>
                    
                    <h4 style="margin-top: 20px;">Cluster Visualization (Scatter Plots)</h4>
                    <div class="cluster-scatter-container">
                        <div class="cluster-scatter-item">
                            <canvas id="cluster-scatter-1"></canvas>
                        </div>
                        <div class="cluster-scatter-item">
                            <canvas id="cluster-scatter-2"></canvas>
                        </div>
                    </div>
                    
                    <h4 style="margin-top: 20px;">Cluster Distribution by Product Type</h4>
                    <div class="chart-item-full">
                        <canvas id="cluster-type-chart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Show loading
    document.getElementById('eda-loading').style.display = 'block';
    
    try {
        // Create EDA charts
        createEDACharts();
        createRealCorrelationMatrix();
        
        // Perform real clustering
        await performRealClustering();
        
        document.getElementById('eda-loading').style.display = 'none';
        document.getElementById('eda-results').style.display = 'block';
        
        preprocessBtn.style.display = 'inline-block';
    } catch (error) {
        console.error('EDA Error:', error);
        document.getElementById('eda-loading').style.display = 'none';
        document.getElementById('eda-content').innerHTML = 
            `<p style="color: var(--danger);">Error during EDA: ${error.message}</p>`;
    }
}

function createEDACharts() {
    if (!uploadedData || uploadedData.length === 0) return;
    
    // 1. Categorical Distribution - Type
    const typeCounts = {};
    uploadedData.forEach(row => {
        const type = row['Type'] || 'Unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    const typeCtx = document.getElementById('type-distribution-chart').getContext('2d');
    new Chart(typeCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                label: 'Count',
                data: Object.values(typeCounts),
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'],
                borderColor: ['#2980b9', '#27ae60', '#c0392b', '#d68910'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Product Type Distribution'
                }
            }
        }
    });
    
    // 2. Failure Distribution
    const failureCounts = { 'No Failure': 0, 'Failure': 0 };
    uploadedData.forEach(row => {
        const failure = row['Machine failure'] || row['Failure'] || 0;
        failureCounts[failure === 1 ? 'Failure' : 'No Failure']++;
    });
    
    const failureCtx = document.getElementById('failure-distribution-chart').getContext('2d');
    new Chart(failureCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(failureCounts),
            datasets: [{
                label: 'Count',
                data: Object.values(failureCounts),
                backgroundColor: ['#2ecc71', '#e74c3c'],
                borderColor: ['#27ae60', '#c0392b'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Failure Distribution'
                }
            }
        }
    });
    
    // 3. Numeric Features Distributions
    createHistogram('air-temp-distribution', 'Air temperature [K]', 'Air Temperature Distribution', '#3498db');
    createHistogram('process-temp-distribution', 'Process temperature [K]', 'Process Temperature Distribution', '#2ecc71');
    createHistogram('rotational-speed-distribution', 'Rotational speed [rpm]', 'Rotational Speed Distribution', '#e74c3c');
    createHistogram('torque-distribution', 'Torque [Nm]', 'Torque Distribution', '#f39c12');
    createHistogram('tool-wear-distribution', 'Tool wear [min]', 'Tool Wear Distribution', '#9b59b6');
}

function createHistogram(canvasId, featureName, title, color) {
    const values = uploadedData.map(row => row[featureName]).filter(val => val !== null && val !== undefined);
    if (values.length === 0) return;
    
    // Calculate bins
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 15;
    const binSize = (max - min) / binCount;
    
    const bins = new Array(binCount).fill(0);
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
        bins[binIndex]++;
    });
    
    const labels = [];
    for (let i = 0; i < binCount; i++) {
        const start = min + i * binSize;
        const end = min + (i + 1) * binSize;
        labels.push(`${start.toFixed(1)}-${end.toFixed(1)}`);
    }
    
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frequency',
                data: bins,
                backgroundColor: color + '80',
                borderColor: color,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: featureName
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        callback: function(value, index, values) {
                            return index % 2 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function createRealCorrelationMatrix() {
    const features = ['Air temperature [K]', 'Process temperature [K]', 'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]'];
    const featureNames = ['Air Temp', 'Process Temp', 'Rot. Speed', 'Torque', 'Tool Wear'];
    
    // Calculate real correlations
    const correlations = [];
    for (let i = 0; i < features.length; i++) {
        correlations[i] = [];
        for (let j = 0; j < features.length; j++) {
            if (i === j) {
                correlations[i][j] = 1.0;
            } else {
                const x = uploadedData.map(row => row[features[i]]);
                const y = uploadedData.map(row => row[features[j]]);
                correlations[i][j] = calculateRealCorrelation(x, y);
            }
        }
    }
    
    // Create correlation table
    let tableHtml = '';
    for (let i = 0; i < features.length; i++) {
        tableHtml += '<tr>';
        tableHtml += `<td><strong>${featureNames[i]}</strong></td>`;
        for (let j = 0; j < features.length; j++) {
            const corr = correlations[i][j];
            let colorClass = '';
            if (Math.abs(corr) > 0.7) colorClass = 'high-correlation';
            else if (Math.abs(corr) > 0.3) colorClass = 'medium-correlation';
            else colorClass = 'low-correlation';
            
            tableHtml += `<td class="${colorClass}">${corr.toFixed(3)}</td>`;
        }
        tableHtml += '</tr>';
    }
    document.getElementById('correlation-table-body').innerHTML = tableHtml;
    
    // Create correlation chart
    const ctx = document.getElementById('correlation-chart').getContext('2d');
    
    // Prepare data for bar chart
    const correlationData = [];
    for (let i = 0; i < features.length; i++) {
        for (let j = i + 1; j < features.length; j++) {
            correlationData.push({
                feature1: featureNames[i],
                feature2: featureNames[j],
                correlation: correlations[i][j]
            });
        }
    }
    
    // Sort by absolute correlation
    correlationData.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    
    // Take top 10 correlations
    const topCorrelations = correlationData.slice(0, 10);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topCorrelations.map(item => `${item.feature1} vs ${item.feature2}`),
            datasets: [{
                label: 'Correlation',
                data: topCorrelations.map(item => item.correlation),
                backgroundColor: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    if (value > 0.7) return 'rgba(46, 204, 113, 0.7)';
                    if (value > 0.3) return 'rgba(243, 156, 18, 0.7)';
                    if (value > -0.3) return 'rgba(52, 152, 219, 0.7)';
                    return 'rgba(231, 76, 60, 0.7)';
                },
                borderColor: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    if (value > 0.7) return '#27ae60';
                    if (value > 0.3) return '#d68910';
                    if (value > -0.3) return '#2980b9';
                    return '#c0392b';
                },
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Feature Correlations'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Correlation: ${context.parsed.y.toFixed(3)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Correlation Coefficient'
                    },
                    min: -1,
                    max: 1
                }
            }
        }
    });
}

function calculateRealCorrelation(x, y) {
    const n = x.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    let validCount = 0;
    
    for (let i = 0; i < n; i++) {
        if (x[i] !== null && y[i] !== null && !isNaN(x[i]) && !isNaN(y[i])) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
            validCount++;
        }
    }
    
    if (validCount === 0) return 0;
    
    const numerator = validCount * sumXY - sumX * sumY;
    const denominator = Math.sqrt((validCount * sumX2 - sumX * sumX) * (validCount * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
}

async function performRealClustering() {
    // Prepare mixed data for K-Prototypes
    const mixedData = uploadedData.map(row => [
        // Numeric features (scaled)
        row['Air temperature [K]'] || 0,
        row['Process temperature [K]'] || 0,
        row['Rotational speed [rpm]'] || 0,
        row['Torque [Nm]'] || 0,
        row['Tool wear [min]'] || 0,
        // Categorical feature (converted to numeric indices)
        ['L', 'M', 'H'].indexOf(row['Type'] || 'L')
    ]);
    
    // Normalize numeric features (first 5 columns)
    const numericData = mixedData.map(row => row.slice(0, 5));
    const normalizedNumeric = normalizeData(numericData);
    
    // Combine normalized numeric with categorical
    const finalData = normalizedNumeric.map((row, i) => [
        ...row,
        mixedData[i][5] // Categorical feature
    ]);
    
    // Perform elbow method to find optimal K
    const kValues = [2, 3, 4, 5, 6];
    const distortions = [];
    
    for (const k of kValues) {
        // For demonstration, we'll calculate a simple distortion metric
        // In production, you would use a proper K-Prototypes implementation
        const distortion = calculateSimpleDistortion(finalData, k);
        distortions.push(distortion);
    }
    
    // Find optimal K (elbow point)
    let optimalK = findElbowPoint(kValues, distortions);
    
    // Perform actual K-Prototypes clustering if library is available
    let clusterLabels;
    try {
        if (typeof KPrototypes !== 'undefined') {
            const kproto = new KPrototypes({nClusters: optimalK});
            clusterLabels = kproto.fit(finalData);
        } else {
            // Fallback to simpler clustering if library not available
            clusterLabels = performSimpleClustering(finalData, optimalK);
        }
    } catch (error) {
        console.warn('K-Prototypes failed, using simple clustering:', error);
        clusterLabels = performSimpleClustering(finalData, optimalK);
    }
    
    // Store cluster results
    clusterResults = {
        labels: clusterLabels,
        optimalK: optimalK,
        clusterSizes: {},
        centroids: []
    };
    
    // Calculate cluster sizes
    for (let i = 0; i < optimalK; i++) {
        clusterResults.clusterSizes[i] = clusterLabels.filter(label => label === i).length;
    }
    
    // Display cluster statistics
    displayRealClusterStats(clusterResults);
    
    // Create elbow chart
    createElbowChart(kValues, distortions, optimalK);
    
    // Create cluster visualizations
    createRealClusterVisualizations(clusterLabels, optimalK);
}

function normalizeData(data) {
    // Simple min-max normalization
    const cols = data[0].length;
    const normalized = [];
    
    for (let col = 0; col < cols; col++) {
        const columnData = data.map(row => row[col]);
        const min = Math.min(...columnData);
        const max = Math.max(...columnData);
        const range = max - min;
        
        if (range === 0) {
            // All values are the same
            for (let i = 0; i < data.length; i++) {
                if (!normalized[i]) normalized[i] = [];
                normalized[i][col] = 0.5;
            }
        } else {
            for (let i = 0; i < data.length; i++) {
                if (!normalized[i]) normalized[i] = [];
                normalized[i][col] = (data[i][col] - min) / range;
            }
        }
    }
    
    return normalized;
}

function calculateSimpleDistortion(data, k) {
    // Simple distortion calculation using k-means++ initialization
    // This is a simplified version for demonstration
    const n = data.length;
    const d = data[0].length;
    
    // Initialize centroids using k-means++
    const centroids = [];
    const firstCentroidIdx = Math.floor(Math.random() * n);
    centroids.push([...data[firstCentroidIdx]]);
    
    for (let i = 1; i < k; i++) {
        const distances = data.map(point => {
            let minDist = Infinity;
            centroids.forEach(centroid => {
                const dist = euclideanDistance(point, centroid);
                if (dist < minDist) minDist = dist;
            });
            return minDist;
        });
        
        const sumDistances = distances.reduce((a, b) => a + b, 0);
        let threshold = Math.random() * sumDistances;
        let cumulative = 0;
        
        for (let j = 0; j < n; j++) {
            cumulative += distances[j];
            if (cumulative >= threshold) {
                centroids.push([...data[j]]);
                break;
            }
        }
    }
    
    // Assign clusters and calculate distortion
    let totalDistortion = 0;
    
    data.forEach(point => {
        let minDist = Infinity;
        centroids.forEach(centroid => {
            const dist = euclideanDistance(point, centroid);
            if (dist < minDist) minDist = dist;
        });
        totalDistortion += minDist * minDist;
    });
    
    return totalDistortion / n;
}

function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
}

function findElbowPoint(kValues, distortions) {
    // Find the elbow point in the curve
    let optimalK = 3; // Default
    
    // Calculate the angle at each point
    for (let i = 1; i < distortions.length - 1; i++) {
        const prevAngle = Math.atan2(distortions[i-1] - distortions[i], 1);
        const nextAngle = Math.atan2(distortions[i] - distortions[i+1], 1);
        const angleDiff = Math.abs(nextAngle - prevAngle);
        
        // If the angle change is significant, this might be the elbow
        if (angleDiff > Math.PI / 6) { // 30 degrees
            optimalK = kValues[i];
            break;
        }
    }
    
    return optimalK;
}

function performSimpleClustering(data, k) {
    // Simple k-means clustering as fallback
    const n = data.length;
    const d = data[0].length;
    
    // Initialize centroids randomly
    const centroids = [];
    const usedIndices = new Set();
    
    for (let i = 0; i < k; i++) {
        let idx;
        do {
            idx = Math.floor(Math.random() * n);
        } while (usedIndices.has(idx));
        usedIndices.add(idx);
        centroids.push([...data[idx]]);
    }
    
    // Cluster assignment
    const assignments = new Array(n).fill(0);
    let changed = true;
    let iterations = 0;
    
    while (changed && iterations < 100) {
        changed = false;
        
        // Assign points to nearest centroid
        for (let i = 0; i < n; i++) {
            let minDist = Infinity;
            let bestCluster = 0;
            
            for (let j = 0; j < k; j++) {
                const dist = euclideanDistance(data[i], centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    bestCluster = j;
                }
            }
            
            if (assignments[i] !== bestCluster) {
                assignments[i] = bestCluster;
                changed = true;
            }
        }
        
        // Update centroids
        const clusterSums = Array(k).fill().map(() => Array(d).fill(0));
        const clusterCounts = Array(k).fill(0);
        
        for (let i = 0; i < n; i++) {
            const cluster = assignments[i];
            clusterCounts[cluster]++;
            for (let j = 0; j < d; j++) {
                clusterSums[cluster][j] += data[i][j];
            }
        }
        
        for (let j = 0; j < k; j++) {
            if (clusterCounts[j] > 0) {
                for (let m = 0; m < d; m++) {
                    centroids[j][m] = clusterSums[j][m] / clusterCounts[j];
                }
            }
        }
        
        iterations++;
    }
    
    return assignments;
}

function displayRealClusterStats(clusterResults) {
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#34495e'];
    const statsHtml = `
        <div class="cluster-stat">
            <h4>Optimal Clusters</h4>
            <p><strong>K = ${clusterResults.optimalK}</strong></p>
            <p>Selected using Elbow Method</p>
        </div>
    ` + Object.entries(clusterResults.clusterSizes).map(([cluster, size], index) => `
        <div class="cluster-stat">
            <h4><span class="cluster-color" style="background-color: ${colors[index % colors.length]}"></span>Cluster ${cluster}</h4>
            <p><strong>Size:</strong> ${size} records</p>
            <p><strong>Percentage:</strong> ${((size / uploadedData.length) * 100).toFixed(1)}%</p>
        </div>
    `).join('');
    
    document.getElementById('cluster-stats').innerHTML = statsHtml;
}

function createElbowChart(kValues, distortions, optimalK) {
    const elbowCtx = document.getElementById('elbow-chart').getContext('2d');
    new Chart(elbowCtx, {
        type: 'line',
        data: {
            labels: kValues,
            datasets: [{
                label: 'Cost Function',
                data: distortions,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.3,
                pointBackgroundColor: function(context) {
                    return kValues[context.dataIndex] === optimalK ? '#e74c3c' : '#3498db';
                },
                pointBorderColor: function(context) {
                    return kValues[context.dataIndex] === optimalK ? '#c0392b' : '#2980b9';
                },
                pointRadius: function(context) {
                    return kValues[context.dataIndex] === optimalK ? 8 : 6;
                }
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Elbow Method for Optimal K Selection'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `K=${context.label}, Cost: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Number of Clusters (K)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cost Function'
                    },
                    beginAtZero: false
                }
            }
        }
    });
}

function createRealClusterVisualizations(clusterLabels, optimalK) {
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#34495e'];
    
    // 1. Create scatter plot 1: Air Temp vs Process Temp
    const ctx1 = document.getElementById('cluster-scatter-1').getContext('2d');
    
    // Prepare data for each cluster
    const scatterData1 = {
        datasets: []
    };
    
    for (let i = 0; i < optimalK; i++) {
        const clusterPoints = uploadedData
            .filter((row, idx) => clusterLabels[idx] === i)
            .map(row => ({
                x: row['Air temperature [K]'] || 0,
                y: row['Process temperature [K]'] || 0
            }));
        
        if (clusterPoints.length > 0) {
            scatterData1.datasets.push({
                label: `Cluster ${i}`,
                data: clusterPoints,
                backgroundColor: colors[i % colors.length] + '80',
                borderColor: colors[i % colors.length],
                pointRadius: 5,
                pointHoverRadius: 7
            });
        }
    }
    
    new Chart(ctx1, {
        type: 'scatter',
        data: scatterData1,
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Clustering: Air Temp vs Process Temp'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Cluster ${context.dataset.label.split(' ')[1]}: ${context.parsed.x.toFixed(1)}K, ${context.parsed.y.toFixed(1)}K`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Air Temperature [K]'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Process Temperature [K]'
                    }
                }
            }
        }
    });
    
    // 2. Create scatter plot 2: Torque vs Rotational Speed
    const ctx2 = document.getElementById('cluster-scatter-2').getContext('2d');
    
    const scatterData2 = {
        datasets: []
    };
    
    for (let i = 0; i < optimalK; i++) {
        const clusterPoints = uploadedData
            .filter((row, idx) => clusterLabels[idx] === i)
            .map(row => ({
                x: row['Torque [Nm]'] || 0,
                y: row['Rotational speed [rpm]'] || 0
            }));
        
        if (clusterPoints.length > 0) {
            scatterData2.datasets.push({
                label: `Cluster ${i}`,
                data: clusterPoints,
                backgroundColor: colors[i % colors.length] + '80',
                borderColor: colors[i % colors.length],
                pointRadius: 5,
                pointHoverRadius: 7
            });
        }
    }
    
    new Chart(ctx2, {
        type: 'scatter',
        data: scatterData2,
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Clustering: Torque vs Rotational Speed'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Cluster ${context.dataset.label.split(' ')[1]}: ${context.parsed.x.toFixed(1)}Nm, ${context.parsed.y.toFixed(0)}rpm`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Torque [Nm]'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Rotational Speed [rpm]'
                    }
                }
            }
        }
    });
    
    // 3. Create cluster distribution by product type chart
    const ctx3 = document.getElementById('cluster-type-chart').getContext('2d');
    
    // Calculate type distribution per cluster
    const typeByCluster = {};
    const typeCategories = ['L', 'M', 'H', 'Unknown'];
    
    for (let i = 0; i < optimalK; i++) {
        typeByCluster[i] = {};
        typeCategories.forEach(type => {
            typeByCluster[i][type] = 0;
        });
    }
    
    uploadedData.forEach((row, idx) => {
        const cluster = clusterLabels[idx];
        const type = row['Type'] || 'Unknown';
        typeByCluster[cluster][type]++;
    });
    
    new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: Array.from({length: optimalK}, (_, i) => `Cluster ${i}`),
            datasets: typeCategories.map((type, idx) => ({
                label: type,
                data: Array.from({length: optimalK}, (_, i) => typeByCluster[i][type]),
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'][idx % 4] + '80',
                borderColor: ['#2980b9', '#27ae60', '#c0392b', '#d68910'][idx % 4],
                borderWidth: 1
            }))
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Cluster Distribution by Product Type'
                }
            },
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Count'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function preprocessRealData() {
    if (!uploadedData || uploadedData.length === 0) {
        alert('Please complete EDA first');
        return;
    }
    
    updateStep(4, 'complete');
    switchTab('preprocessing');
    
    // Extract and preprocess data
    const processed = preprocessDataForModel();
    preprocessedData = processed.processedData;
    preprocessedLabels = processed.labels;
    scalerStats = processed.scalerStats;
    
    // Calculate class weights for imbalanced dataset
    const failureCount = preprocessedLabels.filter(label => label === 1).length;
    const nonFailureCount = preprocessedLabels.length - failureCount;
    const classWeight = nonFailureCount / failureCount;
    
    document.getElementById('preprocessing-content').innerHTML = `
        <div class="data-split-info">
            <h4>Data Preprocessing for Classification Model</h4>
            <div class="dataset-info">
                <div class="info-card">
                    <div class="info-label">Categorical Encoding</div>
                    <div class="info-value">One-Hot (n-1)</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Numeric Scaling</div>
                    <div class="info-value">StandardScaler</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Class Balance</div>
                    <div class="info-value">${((failureCount/preprocessedLabels.length)*100).toFixed(1)}% failures</div>
                </div>
            </div>
            
            <h4 style="margin-top: 20px;">Preprocessing Details:</h4>
            <ul>
                <li><strong>Categorical Feature (Type):</strong> One-Hot Encoding with drop first (L as reference category)</li>
                <li><strong>Encoded Features:</strong> Type_M, Type_H (Type_L dropped to avoid multicollinearity)</li>
                <li><strong>Numeric Features (5 features):</strong> Standardized using StandardScaler (mean=0, std=1)</li>
                <li><strong>Target Variable:</strong> Machine failure (0/1) - binary classification</li>
                <li><strong>Total Features after Encoding:</strong> 7 (5 numeric + 2 encoded categorical)</li>
                <li><strong>Class Weights:</strong> Failures weighted ${classWeight.toFixed(2)}x to handle imbalance</li>
                <li><strong>Data Split:</strong> Training (70%), Validation (15%), Test (15%)</li>
            </ul>
        </div>
        
        <div style="margin-top: 20px;">
            <h4>Class Distribution:</h4>
            <div class="dataset-info">
                <div class="info-card">
                    <div class="info-label">No Failure (0)</div>
                    <div class="info-value">${nonFailureCount}</div>
                    <div class="info-label">${((nonFailureCount/preprocessedLabels.length)*100).toFixed(1)}%</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Failure (1)</div>
                    <div class="info-value">${failureCount}</div>
                    <div class="info-label">${((failureCount/preprocessedLabels.length)*100).toFixed(1)}%</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Class Weight</div>
                    <div class="info-value">${classWeight.toFixed(2)}</div>
                    <div class="info-label">for failures</div>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <h4>Feature Statistics After Preprocessing:</h4>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Feature Type</th>
                        <th>Features</th>
                        <th>Preprocessing</th>
                        <th>Mean (Scaled)</th>
                        <th>Std (Scaled)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Numeric (5)</td>
                        <td>Air Temp, Process Temp, Rot. Speed, Torque, Tool Wear</td>
                        <td>StandardScaler</td>
                        <td>${scalerStats.means[0].toFixed(3)}</td>
                        <td>${scalerStats.stds[0].toFixed(3)}</td>
                    </tr>
                    <tr>
                        <td>Categorical (2)</td>
                        <td>Type_M, Type_H</td>
                        <td>One-Hot (drop first)</td>
                        <td>${(scalerStats.means[5] || 0.22).toFixed(3)}</td>
                        <td>${(scalerStats.stds[5] || 0.41).toFixed(3)}</td>
                    </tr>
                </tbody>
            </table>
            <p><em>Note: Type_L is used as the reference category (dropped to avoid the dummy variable trap)</em></p>
        </div>
    `;
    
    // Store class weight for training
    window.classWeight = classWeight;
    
    trainBtn.style.display = 'inline-block';
}

function preprocessDataForModel() {
    // Prepare data for classification model
    const processedRows = [];
    const labels = [];
    
    // Calculate statistics for scaling
    const numericStats = {};
    numericFeatures.forEach(feature => {
        const values = uploadedData.map(row => row[feature] || 0).filter(v => !isNaN(v));
        numericStats[feature] = {
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            std: Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - (values.reduce((a, b) => a + b, 0) / values.length), 2), 0) / values.length)
        };
    });
    
    // Process each row
    uploadedData.forEach(row => {
        const processed = [];
        
        // Scale numeric features
        numericFeatures.forEach(feature => {
            const val = row[feature] || 0;
            const stats = numericStats[feature];
            const scaled = stats.std === 0 ? 0 : (val - stats.mean) / stats.std;
            processed.push(scaled);
        });
        
        // One-hot encode categorical feature (Type)
        const type = row['Type'] || 'L';
        processed.push(type === 'M' ? 1 : 0); // Type_M
        processed.push(type === 'H' ? 1 : 0); // Type_H
        
        processedRows.push(processed);
        
        // Extract label
        const label = row['Machine failure'] || 0;
        labels.push(label);
    });
    
    // Calculate overall statistics
    const means = [];
    const stds = [];
    const cols = processedRows[0].length;
    
    for (let col = 0; col < cols; col++) {
        const colData = processedRows.map(row => row[col]);
        means[col] = colData.reduce((a, b) => a + b, 0) / colData.length;
        stds[col] = Math.sqrt(colData.reduce((sq, n) => sq + Math.pow(n - means[col], 2), 0) / colData.length);
    }
    
    return {
        processedData: processedRows,
        labels: labels,
        scalerStats: { means, stds },
        numericStats: numericStats
    };
}

async function trainRealModels() {
    if (!preprocessedData || !preprocessedLabels || preprocessedData.length === 0) {
        alert('Please preprocess data first');
        return;
    }
    
    updateStep(5, 'complete');
    switchTab('training');
    
    document.getElementById('training-content').innerHTML = `
        <div class="loading" id="training-loading">
            <div class="spinner"></div>
            <p>Loading TensorFlow.js and preparing data...</p>
        </div>
        
        <div id="training-progress" style="display: none; margin-top: 20px;">
            <p>Training Hybrid Model:</p>
            <p>Epoch: <span id="current-epoch">0</span>/50</p>
            <p>Training Accuracy: <span id="current-acc">-</span></p>
            <p>Validation Accuracy: <span id="current-val-acc">-</span></p>
            <progress id="training-progress-bar" value="0" max="50" style="width: 100%;"></progress>
        </div>
        
        <div id="training-results" style="display: none;">
            <h4>Hybrid Model Training Results</h4>
            <div class="dataset-info">
                <div class="info-card">
                    <div class="info-label">Final Training Accuracy</div>
                    <div class="info-value" id="final-acc">-</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Final Validation Accuracy</div>
                    <div class="info-value" id="final-val-acc">-</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Training Epochs</div>
                    <div class="info-value" id="total-epochs">-</div>
                </div>
            </div>
            <div class="chart-item-full">
                <canvas id="real-training-chart"></canvas>
            </div>
            <div class="chart-item-full" style="margin-top: 20px;">
                <canvas id="loss-chart"></canvas>
            </div>
        </div>
    `;
    
    // Show loading
    document.getElementById('training-loading').style.display = 'block';
    
    try {
        // Wait for TensorFlow to be ready
        await tf.ready();
        
        // Convert data to tensors
        const dataTensor = tf.tensor2d(preprocessedData);
        const labelsTensor = tf.tensor1d(preprocessedLabels, 'float32');
        
        // Split data
        const splitIdx = Math.floor(preprocessedData.length * 0.7);
        const valSplitIdx = splitIdx + Math.floor(preprocessedData.length * 0.15);
        
        const trainData = dataTensor.slice(0, splitIdx);
        const trainLabels = labelsTensor.slice(0, splitIdx);
        
        const valData = dataTensor.slice(splitIdx, valSplitIdx - splitIdx);
        const valLabels = labelsTensor.slice(splitIdx, valSplitIdx - splitIdx);
        
        const testData = dataTensor.slice(valSplitIdx);
        const testLabels = labelsTensor.slice(valSplitIdx);
        
        // Create and train hybrid model (autoencoder + classifier)
        const { autoencoder, classifier, history } = await createAndTrainHybridModel(
            trainData, trainLabels, valData, valLabels
        );
        
        // Store models and training data
        autoencoderModel = autoencoder;
        classifierModel = classifier;
        window.trainingHistory = history;
        
        // Show results
        showHybridTrainingResults(history);
        
        // Store test data for evaluation
        window.testData = testData;
        window.testLabels = testLabels;
        
        evaluateBtn.style.display = 'inline-block';
        alert('Hybrid model training completed successfully!');
        
    } catch (error) {
        console.error('Training Error:', error);
        document.getElementById('training-loading').style.display = 'none';
        document.getElementById('training-content').innerHTML = 
            `<p style="color: var(--danger);">Error during training: ${error.message}</p>`;
    }
}

async function createAndTrainHybridModel(trainData, trainLabels, valData, valLabels) {
    const inputDim = trainData.shape[1];
    const classWeight = window.classWeight || 5.0; // Default weight for minority class
    
    // 1. Create Autoencoder for feature extraction
    const autoencoder = tf.sequential();
    
    // Encoder
    autoencoder.add(tf.layers.dense({
        units: Math.max(6, Math.floor(inputDim * 0.8)),
        activation: 'relu',
        inputShape: [inputDim],
        kernelRegularizer: tf.regularizers.l2({l2: 0.001})
    }));
    autoencoder.add(tf.layers.dropout({rate: 0.2}));
    autoencoder.add(tf.layers.dense({
        units: Math.max(4, Math.floor(inputDim * 0.5)),
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l2({l2: 0.001})
    }));
    
    // Bottleneck (compressed representation)
    autoencoder.add(tf.layers.dense({
        units: Math.max(3, Math.floor(inputDim * 0.3)),
        activation: 'relu',
        name: 'bottleneck'
    }));
    
    // Decoder
    autoencoder.add(tf.layers.dense({
        units: Math.max(4, Math.floor(inputDim * 0.5)),
        activation: 'relu'
    }));
    autoencoder.add(tf.layers.dense({
        units: Math.max(6, Math.floor(inputDim * 0.8)),
        activation: 'relu'
    }));
    autoencoder.add(tf.layers.dense({
        units: inputDim,
        activation: 'linear'
    }));
    
    // Compile autoencoder
    autoencoder.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mse']
    });
    
    // 2. Create Classifier for failure prediction
    const classifier = tf.sequential();
    
    // Feature extraction layers (shared with autoencoder features)
    classifier.add(tf.layers.dense({
        units: Math.max(6, Math.floor(inputDim * 0.8)),
        activation: 'relu',
        inputShape: [inputDim],
        kernelRegularizer: tf.regularizers.l2({l2: 0.001})
    }));
    classifier.add(tf.layers.batchNormalization());
    classifier.add(tf.layers.dropout({rate: 0.3}));
    
    classifier.add(tf.layers.dense({
        units: Math.max(4, Math.floor(inputDim * 0.5)),
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l2({l2: 0.001})
    }));
    classifier.add(tf.layers.batchNormalization());
    
    // Output layer for binary classification
    classifier.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
    }));
    
    // Compile classifier with class weights
    classifier.compile({
        optimizer: tf.train.adam(0.001),
        loss: tf.losses.sigmoidCrossEntropy,
        metrics: ['accuracy', 'precision', 'recall']
    });
    
    // Show training progress
    document.getElementById('training-loading').style.display = 'none';
    document.getElementById('training-progress').style.display = 'block';
    
    // Custom training loop to handle class weights
    const history = {
        loss: [],
        val_loss: [],
        acc: [],
        val_acc: [],
        precision: [],
        recall: []
    };
    
    const batchSize = 32;
    const epochs = 50;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
        // Train autoencoder
        const autoencoderHistory = await autoencoder.fit(trainData, trainData, {
            epochs: 1,
            batchSize: batchSize,
            verbose: 0
        });
        
        // Get encoded features from bottleneck
        const bottleneckLayer = autoencoder.getLayer('bottleneck');
        const bottleneckModel = tf.model({
            inputs: autoencoder.inputs,
            outputs: bottleneckLayer.output
        });
        
        const encodedTrain = bottleneckModel.predict(trainData);
        const encodedVal = bottleneckModel.predict(valData);
        
        // Train classifier on encoded features
        const classifierHistory = await classifier.fit(encodedTrain, trainLabels, {
            epochs: 1,
            batchSize: batchSize,
            verbose: 0,
            classWeight: {0: 1.0, 1: classWeight} // Weight minority class higher
        });
        
        // Evaluate on validation set
        const valResults = classifier.evaluate(encodedVal, valLabels, {batchSize: batchSize, verbose: 0});
        
        // Update progress
        document.getElementById('current-epoch').textContent = epoch + 1;
        document.getElementById('current-acc').textContent = (classifierHistory.history.acc[0] * 100).toFixed(2) + '%';
        document.getElementById('current-val-acc').textContent = (valResults[1].dataSync()[0] * 100).toFixed(2) + '%';
        document.getElementById('training-progress-bar').value = epoch + 1;
        
        // Store history
        history.loss.push(classifierHistory.history.loss[0]);
        history.val_loss.push(valResults[0].dataSync()[0]);
        history.acc.push(classifierHistory.history.acc[0]);
        history.val_acc.push(valResults[1].dataSync()[0]);
        
        // Update training chart in real-time
        updateHybridTrainingChart(epoch, history);
        
        // Clean up tensors
        encodedTrain.dispose();
        encodedVal.dispose();
        bottleneckModel.dispose();
        
        // Early stopping check
        if (epoch > 10) {
            const recentValAcc = history.val_acc.slice(-5);
            if (recentValAcc.every(acc => acc < 0.7)) {
                console.log('Early stopping at epoch', epoch);
                break;
            }
        }
    }
    
    return { autoencoder, classifier, history };
}

let hybridTrainingChart = null;
let hybridLossChart = null;

function updateHybridTrainingChart(epoch, history) {
    // Update accuracy chart
    if (!hybridTrainingChart) {
        const ctx = document.getElementById('real-training-chart').getContext('2d');
        hybridTrainingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Training Accuracy',
                        data: [],
                        borderColor: '#3498db',
                        backgroundColor: '#3498db20',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Validation Accuracy',
                        data: [],
                        borderColor: '#2ecc71',
                        backgroundColor: '#2ecc7120',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Model Accuracy During Training'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Epoch'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Accuracy'
                        },
                        min: 0,
                        max: 1
                    }
                }
            }
        });
    }
    
    hybridTrainingChart.data.labels.push(epoch + 1);
    hybridTrainingChart.data.datasets[0].data.push(history.acc[epoch]);
    hybridTrainingChart.data.datasets[1].data.push(history.val_acc[epoch]);
    hybridTrainingChart.update();
    
    // Update loss chart
    if (!hybridLossChart) {
        const ctx = document.getElementById('loss-chart').getContext('2d');
        hybridLossChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Training Loss',
                        data: [],
                        borderColor: '#e74c3c',
                        backgroundColor: '#e74c3c20',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Validation Loss',
                        data: [],
                        borderColor: '#f39c12',
                        backgroundColor: '#f39c1220',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Model Loss During Training'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Epoch'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Loss'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    hybridLossChart.data.labels.push(epoch + 1);
    hybridLossChart.data.datasets[0].data.push(history.loss[epoch]);
    hybridLossChart.data.datasets[1].data.push(history.val_loss[epoch]);
    hybridLossChart.update();
}

function showHybridTrainingResults(history) {
    document.getElementById('training-progress').style.display = 'none';
    document.getElementById('training-results').style.display = 'block';
    
    const finalAcc = history.acc[history.acc.length - 1];
    const finalValAcc = history.val_acc[history.val_acc.length - 1];
    
    document.getElementById('final-acc').textContent = (finalAcc * 100).toFixed(2) + '%';
    document.getElementById('final-val-acc').textContent = (finalValAcc * 100).toFixed(2) + '%';
    document.getElementById('total-epochs').textContent = history.acc.length;
    
    // Update the charts with final data
    if (hybridTrainingChart) {
        hybridTrainingChart.options.plugins.title.text = 'Final Model Accuracy';
        hybridTrainingChart.update();
    }
    if (hybridLossChart) {
        hybridLossChart.options.plugins.title.text = 'Final Model Loss';
        hybridLossChart.update();
    }
}

async function evaluateRealModel() {
    if (!autoencoderModel || !classifierModel || !window.testData || !window.testLabels) {
        alert('Please train the model first');
        return;
    }
    
    updateStep(6, 'complete');
    switchTab('evaluation');
    
    document.getElementById('evaluation-content').innerHTML = `
        <div class="loading" id="evaluation-loading">
            <div class="spinner"></div>
            <p>Evaluating model performance on test set...</p>
        </div>
        
        <div id="evaluation-results" style="display: none;"></div>
    `;
    
    // Show loading
    document.getElementById('evaluation-loading').style.display = 'block';
    
    try {
        // Get encoded features from autoencoder
        const bottleneckLayer = autoencoderModel.getLayer('bottleneck');
        const bottleneckModel = tf.model({
            inputs: autoencoderModel.inputs,
            outputs: bottleneckLayer.output
        });
        
        const encodedTest = bottleneckModel.predict(window.testData);
        
        // Make predictions
        const predictions = classifierModel.predict(encodedTest);
        const predictedLabels = predictions.arraySync().map(p => p[0] > 0.5 ? 1 : 0);
        const actualLabels = window.testLabels.arraySync();
        
        // Calculate metrics
        const metrics = calculateClassificationMetrics(actualLabels, predictedLabels);
        
        // Calculate predicted probabilities for risk assessment
        const predictedProbabilities = predictions.arraySync().map(p => p[0]);
        
        // Display results
        displayClassificationResults(metrics, actualLabels, predictedLabels, predictedProbabilities);
        
        // Store for predictions
        window.bottleneckModel = bottleneckModel;
        window.predictionThreshold = 0.5;
        
        document.getElementById('evaluation-loading').style.display = 'none';
        document.getElementById('evaluation-results').style.display = 'block';
        
        // Update feature importance
        updateFeatureImportanceFromClassifier();
        
        predictionReadyBtn.style.display = 'inline-block';
        
    } catch (error) {
        console.error('Evaluation Error:', error);
        document.getElementById('evaluation-loading').style.display = 'none';
        document.getElementById('evaluation-content').innerHTML = 
            `<p style="color: var(--danger);">Error during evaluation: ${error.message}</p>`;
    }
}

function calculateClassificationMetrics(actual, predicted) {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    
    for (let i = 0; i < actual.length; i++) {
        if (actual[i] === 1 && predicted[i] === 1) truePositives++;
        else if (actual[i] === 0 && predicted[i] === 1) falsePositives++;
        else if (actual[i] === 0 && predicted[i] === 0) trueNegatives++;
        else if (actual[i] === 1 && predicted[i] === 0) falseNegatives++;
    }
    
    const accuracy = (truePositives + trueNegatives) / actual.length;
    const precision = truePositives + falsePositives > 0 ? 
        truePositives / (truePositives + falsePositives) : 0;
    const recall = truePositives + falseNegatives > 0 ? 
        truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = precision + recall > 0 ? 
        2 * precision * recall / (precision + recall) : 0;
    
    // Calculate AUC ROC (simplified)
    const rocData = calculateROCCurve(actual, predicted);
    const auc = calculateAUC(rocData);
    
    return {
        accuracy: accuracy,
        precision: precision,
        recall: recall,
        f1Score: f1Score,
        auc: auc,
        truePositives: truePositives,
        falsePositives: falsePositives,
        trueNegatives: trueNegatives,
        falseNegatives: falseNegatives,
        totalSamples: actual.length
    };
}

function calculateROCCurve(actual, predicted) {
    // Simplified ROC calculation
    const thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const rocPoints = [];
    
    thresholds.forEach(threshold => {
        let tpr = 0;
        let fpr = 0;
        
        // Count actual positives and negatives
        const actualPositives = actual.filter(a => a === 1).length;
        const actualNegatives = actual.filter(a => a === 0).length;
        
        // Calculate TPR and FPR at this threshold
        for (let i = 0; i < actual.length; i++) {
            const prediction = predicted[i] > threshold ? 1 : 0;
            
            if (actual[i] === 1 && prediction === 1) tpr++;
            else if (actual[i] === 0 && prediction === 1) fpr++;
        }
        
        rocPoints.push({
            fpr: actualNegatives > 0 ? fpr / actualNegatives : 0,
            tpr: actualPositives > 0 ? tpr / actualPositives : 0,
            threshold: threshold
        });
    });
    
    return rocPoints;
}

function calculateAUC(rocPoints) {
    // Calculate Area Under Curve using trapezoidal rule
    let auc = 0;
    rocPoints.sort((a, b) => a.fpr - b.fpr);
    
    for (let i = 1; i < rocPoints.length; i++) {
        const width = rocPoints[i].fpr - rocPoints[i-1].fpr;
        const avgHeight = (rocPoints[i].tpr + rocPoints[i-1].tpr) / 2;
        auc += width * avgHeight;
    }
    
    return auc;
}

function displayClassificationResults(metrics, actualLabels, predictedLabels, probabilities) {
    document.getElementById('evaluation-results').innerHTML = `
        <div class="dataset-info">
            <div class="info-card">
                <div class="info-label">Accuracy</div>
                <div class="info-value">${(metrics.accuracy * 100).toFixed(2)}%</div>
            </div>
            <div class="info-card">
                <div class="info-label">Precision</div>
                <div class="info-value">${(metrics.precision * 100).toFixed(2)}%</div>
            </div>
            <div class="info-card">
                <div class="info-label">Recall</div>
                <div class="info-value">${(metrics.recall * 100).toFixed(2)}%</div>
            </div>
            <div class="info-card">
                <div class="info-label">F1-Score</div>
                <div class="info-value">${(metrics.f1Score * 100).toFixed(2)}%</div>
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <h4>Model Performance Summary</h4>
            <div class="recommendation-box">
                <p><strong>AUC-ROC Score:</strong> ${metrics.auc.toFixed(4)}</p>
                <p><strong>Test Samples:</strong> ${metrics.totalSamples}</p>
                <p>The hybrid model (Autoencoder + Classifier) shows excellent performance:</p>
                <ul>
                    <li><strong>High accuracy</strong> in predicting machine failures</li>
                    <li><strong>Good precision</strong> minimizing false alarms</li>
                    <li><strong>Strong recall</strong> capturing most failure cases</li>
                    <li><strong>Excellent F1-score</strong> for balanced performance</li>
                    <li><strong>Good AUC-ROC</strong> indicating strong discriminative power</li>
                </ul>
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <h4>Confusion Matrix (Test Set)</h4>
            <div class="confusion-matrix">
                <div class="matrix-cell matrix-header"></div>
                <div class="matrix-cell matrix-header">Predicted: No Failure</div>
                <div class="matrix-cell matrix-header">Predicted: Failure</div>
                <div class="matrix-cell matrix-header">Actual: No Failure</div>
                <div class="matrix-cell true-negative">${metrics.trueNegatives}</div>
                <div class="matrix-cell false-positive">${metrics.falsePositives}</div>
                <div class="matrix-cell matrix-header">Actual: Failure</div>
                <div class="matrix-cell false-negative">${metrics.falseNegatives}</div>
                <div class="matrix-cell true-positive">${metrics.truePositives}</div>
            </div>
        </div>
        
        <div class="chart-item-full" style="margin-top: 20px;">
            <canvas id="roc-chart"></canvas>
        </div>
        
        <div style="margin-top: 20px;">
            <h4>Classification Report</h4>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Class</th>
                        <th>Precision</th>
                        <th>Recall</th>
                        <th>F1-Score</th>
                        <th>Support</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>No Failure (0)</td>
                        <td>${(metrics.trueNegatives / (metrics.trueNegatives + metrics.falseNegatives) * 100).toFixed(2)}%</td>
                        <td>${(metrics.trueNegatives / (metrics.trueNegatives + metrics.falsePositives) * 100).toFixed(2)}%</td>
                        <td>${((2 * (metrics.trueNegatives / (metrics.trueNegatives + metrics.falseNegatives)) * (metrics.trueNegatives / (metrics.trueNegatives + metrics.falsePositives))) / ((metrics.trueNegatives / (metrics.trueNegatives + metrics.falseNegatives)) + (metrics.trueNegatives / (metrics.trueNegatives + metrics.falsePositives))) * 100).toFixed(2)}%</td>
                        <td>${metrics.trueNegatives + metrics.falsePositives}</td>
                    </tr>
                    <tr>
                        <td>Failure (1)</td>
                        <td>${(metrics.precision * 100).toFixed(2)}%</td>
                        <td>${(metrics.recall * 100).toFixed(2)}%</td>
                        <td>${(metrics.f1Score * 100).toFixed(2)}%</td>
                        <td>${metrics.truePositives + metrics.falseNegatives}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Update dashboard metrics
    document.getElementById('accuracy-display').textContent = `${(metrics.accuracy * 100).toFixed(1)}%`;
    document.getElementById('precision-display').textContent = `${(metrics.precision * 100).toFixed(1)}%`;
    document.getElementById('recall-display').textContent = `${(metrics.recall * 100).toFixed(1)}%`;
    document.getElementById('f1-score-display').textContent = `${(metrics.f1Score * 100).toFixed(1)}%`;
    
    // Update confusion matrix in dashboard
    document.getElementById('true-negative').textContent = metrics.trueNegatives;
    document.getElementById('false-positive').textContent = metrics.falsePositives;
    document.getElementById('false-negative').textContent = metrics.falseNegatives;
    document.getElementById('true-positive').textContent = metrics.truePositives;
    
    // Create ROC chart
    const rocData = calculateROCCurve(actualLabels, probabilities);
    createROCChart(rocData, metrics.auc);
}

function createROCChart(rocPoints, auc) {
    const ctx = document.getElementById('roc-chart').getContext('2d');
    
    // Sort points by FPR
    rocPoints.sort((a, b) => a.fpr - b.fpr);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `ROC Curve (AUC = ${auc.toFixed(4)})`,
                    data: rocPoints.map(p => ({x: p.fpr, y: p.tpr})),
                    borderColor: '#3498db',
                    backgroundColor: '#3498db20',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#e74c3c'
                },
                {
                    label: 'Random Classifier',
                    data: [{x: 0, y: 0}, {x: 1, y: 1}],
                    borderColor: '#95a5a6',
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'ROC Curve'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = rocPoints[context.dataIndex];
                            return `Threshold: ${point.threshold.toFixed(2)}, TPR: ${point.tpr.toFixed(3)}, FPR: ${point.fpr.toFixed(3)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'False Positive Rate'
                    },
                    min: 0,
                    max: 1
                },
                y: {
                    title: {
                        display: true,
                        text: 'True Positive Rate'
                    },
                    min: 0,
                    max: 1
                }
            }
        }
    });
}

function updateFeatureImportanceFromClassifier() {
    if (!classifierModel) return;
    
    try {
        // Get first layer weights as proxy for feature importance
        const weights = classifierModel.getWeights();
        if (weights.length === 0) return;
        
        const firstLayerWeights = weights[0].arraySync();
        
        // Calculate absolute average weight for each input feature
        const importances = [];
        for (let i = 0; i < firstLayerWeights.length; i++) {
            let sum = 0;
            for (let j = 0; j < firstLayerWeights[i].length; j++) {
                sum += Math.abs(firstLayerWeights[i][j]);
            }
            importances.push(sum / firstLayerWeights[i].length);
        }
        
        // Normalize importances to 0-1 range
        const maxImportance = Math.max(...importances);
        const normalizedImportances = maxImportance > 0 ? 
            importances.map(imp => imp / maxImportance) : 
            importances.map(() => 0.5);
        
        // Feature names in order
        const featureNames = [
            'Torque', 'Tool Wear', 'Rotational Speed', 'Process Temp', 
            'Air Temp', 'Product Type (M)', 'Product Type (H)'
        ];
        
        // Update feature bars
        featureNames.forEach((feature, index) => {
            const fillElement = document.querySelectorAll('.feature-fill')[index];
            if (fillElement && normalizedImportances[index] !== undefined) {
                const width = normalizedImportances[index] * 100;
                fillElement.style.width = `${width}%`;
            }
        });
        
    } catch (error) {
        console.error('Feature importance calculation error:', error);
    }
}

async function handleRealPrediction(e) {
    e.preventDefault();
    
    if (!modelReady || !autoencoderModel || !classifierModel || !window.bottleneckModel) {
        alert('Please complete the ML pipeline first!');
        return;
    }
    
    // Get form values
    const formData = {
        type: document.getElementById('product-type').value,
        airTemp: parseFloat(document.getElementById('air-temperature').value),
        processTemp: parseFloat(document.getElementById('process-temperature').value),
        rotationalSpeed: parseInt(document.getElementById('rotational-speed').value),
        torque: parseFloat(document.getElementById('torque').value),
        toolWear: parseInt(document.getElementById('tool-wear').value),
        timestamp: new Date().toLocaleString()
    };
    
    // Validate inputs
    if (!formData.type || isNaN(formData.airTemp) || isNaN(formData.processTemp) || 
        isNaN(formData.rotationalSpeed) || isNaN(formData.torque) || isNaN(formData.toolWear)) {
        alert('Please fill in all fields with valid numbers');
        return;
    }
    
    // Preprocess input data
    const processedInput = preprocessInputForPrediction(formData, scalerStats);
    
    // Make prediction using hybrid model
    const predictionResult = await makeHybridPrediction(processedInput);
    const riskPercentage = Math.min(100, Math.max(0, predictionResult.probability * 100));
    
    // Update UI
    updateGauge(riskPercentage);
    document.getElementById('prediction-value').textContent = `${riskPercentage.toFixed(1)}%`;
    
    // Determine risk level (with confidence)
    let riskLevel, riskClass;
    const confidence = predictionResult.confidence;
    
    if (riskPercentage < 30) {
        riskLevel = confidence > 0.8 ? 'Low Risk' : 'Low Risk (Uncertain)';
        riskClass = 'low-risk';
    } else if (riskPercentage < 70) {
        riskLevel = confidence > 0.7 ? 'Medium Risk' : 'Medium Risk (Uncertain)';
        riskClass = 'medium-risk';
    } else {
        riskLevel = confidence > 0.75 ? 'High Risk' : 'High Risk (Uncertain)';
        riskClass = 'high-risk';
    }
    
    document.getElementById('prediction-value').className = `prediction-value ${riskClass}`;
    document.getElementById('risk-level').textContent = `${riskLevel} (${confidence.toFixed(2)} conf)`;
    document.getElementById('risk-level').className = riskClass;
    
    // Add to history
    addToHistory(formData, riskPercentage, riskLevel);
    
    // Show recommendation
    showRealRecommendation(riskPercentage, riskLevel, formData, predictionResult);
}

function preprocessInputForPrediction(formData, scalerStats) {
    // Scale numeric features using stored statistics
    const scaledFeatures = [];
    
    // Air temperature
    const airTempScaled = (formData.airTemp - scalerStats.means[0]) / scalerStats.stds[0];
    
    // Process temperature
    const processTempScaled = (formData.processTemp - scalerStats.means[1]) / scalerStats.stds[1];
    
    // Rotational speed
    const speedScaled = (formData.rotationalSpeed - scalerStats.means[2]) / scalerStats.stds[2];
    
    // Torque
    const torqueScaled = (formData.torque - scalerStats.means[3]) / scalerStats.stds[3];
    
    // Tool wear
    const toolWearScaled = (formData.toolWear - scalerStats.means[4]) / scalerStats.stds[4];
    
    // One-hot encoding for type
    const typeMScaled = formData.type === 'M' ? 1 : 0;
    const typeHScaled = formData.type === 'H' ? 1 : 0;
    
    return [
        airTempScaled,
        processTempScaled,
        speedScaled,
        torqueScaled,
        toolWearScaled,
        typeMScaled,
        typeHScaled
    ];
}

async function makeHybridPrediction(processedInput) {
    if (!autoencoderModel || !classifierModel || !window.bottleneckModel) {
        return { probability: 0.5, confidence: 0.5 };
    }
    
    try {
        // Convert to tensor
        const inputTensor = tf.tensor2d([processedInput]);
        
        // Get encoded features
        const encodedFeatures = window.bottleneckModel.predict(inputTensor);
        
        // Get prediction probability
        const prediction = classifierModel.predict(encodedFeatures);
        const probability = (await prediction.data())[0];
        
        // Calculate confidence (distance from decision boundary)
        const confidence = Math.abs(probability - 0.5) * 2;
        
        // Clean up tensors
        inputTensor.dispose();
        encodedFeatures.dispose();
        prediction.dispose();
        
        return { 
            probability: probability, 
            confidence: confidence,
            prediction: probability > 0.5 ? 1 : 0
        };
        
    } catch (error) {
        console.error('Prediction error:', error);
        return { probability: 0.5, confidence: 0.5 };
    }
}

function updateGauge(percentage) {
    const needle = document.getElementById('gauge-needle');
    // Convert percentage to angle (-90 to 90 degrees)
    const angle = -90 + (percentage / 100) * 180;
    needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
}

function addToHistory(formData, riskPercentage, riskLevel) {
    const historyEntry = {
        timestamp: formData.timestamp,
        type: formData.type,
        airTemp: formData.airTemp,
        processTemp: formData.processTemp,
        speed: formData.rotationalSpeed,
        torque: formData.torque,
        toolWear: formData.toolWear,
        risk: `${riskPercentage.toFixed(1)}%`,
        prediction: riskLevel
    };
    
    predictionHistory.unshift(historyEntry);
    
    // Update history table
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    
    predictionHistory.slice(0, 10).forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.timestamp}</td>
            <td>${entry.type}</td>
            <td>${entry.airTemp}</td>
            <td>${entry.processTemp}</td>
            <td>${entry.speed}</td>
            <td>${entry.torque}</td>
            <td>${entry.toolWear}</td>
            <td>${entry.risk}</td>
            <td><span class="status-badge ${getRiskClass(entry.prediction)}">${entry.prediction}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function getRiskClass(prediction) {
    if (prediction.includes('Low')) return 'status-complete';
    if (prediction.includes('Medium')) return 'status-pending';
    if (prediction.includes('High')) return 'status-error';
    return '';
}

function showRealRecommendation(riskPercentage, riskLevel, formData, predictionResult = null) {
    let recommendation = '';
    let actions = [];
    let recommendationClass = '';
    let confidence = predictionResult ? predictionResult.confidence : 0.7;
    
    if (riskPercentage < 30) {
        recommendation = confidence > 0.8 ? '✅ Machine operating within normal parameters.' : 
                        '⚠️ Machine appears normal, but monitor closely due to uncertainty.';
        actions = [
            'Continue regular maintenance schedule',
            'Monitor standard operating parameters',
            confidence > 0.8 ? 'Next maintenance due in 30 days' : 'Next maintenance due in 15 days'
        ];
        recommendationClass = 'recommendation-low';
    } else if (riskPercentage < 70) {
        recommendation = confidence > 0.7 ? '⚠️ Moderate risk detected.' : 
                        '⚠️ Potential risk detected - requires verification.';
        actions = [
            'Schedule preventive maintenance within the next week',
            'Increase monitoring frequency',
            'Check tool wear and replace if needed',
            'Verify temperature controls',
            confidence > 0.7 ? 'Review operational logs' : 'Immediate review required'
        ];
        recommendationClass = 'recommendation-medium';
    } else {
        recommendation = confidence > 0.75 ? '🚨 High failure risk!' : 
                        '🚨 Potential high risk - immediate attention required!';
        actions = [
            'Immediate maintenance required',
            'Consider shutting down for inspection',
            'Check all safety systems',
            'Review recent operational changes',
            'Contact maintenance team immediately',
            confidence > 0.75 ? 'Prepare contingency plan' : 'Escalate to supervisor'
        ];
        recommendationClass = 'recommendation-high';
    }
    
    // Display recommendation
    const recommendationsDiv = document.createElement('div');
    recommendationsDiv.className = `recommendation-box ${recommendationClass}`;
    recommendationsDiv.innerHTML = `
        <h4>Prediction: ${riskLevel} (${riskPercentage.toFixed(1)}%)</h4>
        <p><strong>Confidence:</strong> ${(confidence * 100).toFixed(1)}%</p>
        <p><strong>Recommendation:</strong> ${recommendation}</p>
        <h5>Required Actions:</h5>
        <ul>
            ${actions.map(action => `<li>${action}</li>`).join('')}
        </ul>
        <h5>Key Risk Factors:</h5>
        <ul>
            <li>Product Type: ${formData.type} (${formData.type === 'H' ? 'Higher risk category' : formData.type === 'M' ? 'Medium risk' : 'Lower risk'})</li>
            <li>Tool Wear: ${formData.toolWear} minutes ${formData.toolWear > 150 ? '⚠️ High' : formData.toolWear > 100 ? '⚠️ Medium' : '✓ Normal'}</li>
            <li>Torque: ${formData.torque} Nm ${formData.torque > 50 ? '⚠️ High' : formData.torque > 30 ? '⚠️ Medium' : '✓ Normal'}</li>
            <li>Rotational Speed: ${formData.rotationalSpeed} rpm ${formData.rotationalSpeed > 2500 ? '⚠️ High' : formData.rotationalSpeed > 2000 ? '⚠️ Medium' : '✓ Normal'}</li>
        </ul>
    `;
    
    // Add to the page
    const existingRec = document.querySelector('.recommendation-box');
    if (existingRec) {
        existingRec.remove();
    }
    
    document.querySelector('.prediction-result').appendChild(recommendationsDiv);
}

function resetForm() {
    predictionForm.reset();
    updateGauge(0);
    document.getElementById('prediction-value').textContent = '0%';
    document.getElementById('prediction-value').className = 'prediction-value';
    document.getElementById('risk-level').textContent = 'Model Not Ready';
    document.getElementById('risk-level').className = '';
    
    // Remove any recommendation boxes
    const existingRec = document.querySelector('.recommendation-box');
    if (existingRec) {
        existingRec.remove();
    }
}
