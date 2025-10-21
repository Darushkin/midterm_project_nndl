// Depression Data EDA Application
// Target: History of Mental Illness (Yes/No)
// Features: Age, Marital Status, Education Level, Number of Children, Smoking Status, 
// Physical Activity Level, Employment Status, Income, Alcohol Consumption, Dietary Habits, 
// Sleep Patterns, History of Substance Abuse, Family History of Depression, Chronic Medical Conditions

// To reuse with other datasets: Update the schema variables below
const TARGET_COLUMN = 'History of Mental Illness';
const NUMERIC_FEATURES = ['Age', 'Number of Children', 'Income'];
const CATEGORICAL_FEATURES = [
    'Marital Status', 'Education Level', 'Smoking Status', 'Physical Activity Level',
    'Employment Status', 'Alcohol Consumption', 'Dietary Habits', 'Sleep Patterns',
    'History of Substance Abuse', 'Family History of Depression', 'Chronic Medical Conditions'
];

let dataset = null;
let charts = {}; // Store chart instances for cleanup

// DOM Elements
const fileInput = document.getElementById('fileInput');
const loadBtn = document.getElementById('loadBtn');
const runEDABtn = document.getElementById('runEDA');
const exportBtn = document.getElementById('exportBtn');

// Event Listeners
loadBtn.addEventListener('click', loadData);
runEDABtn.addEventListener('click', runEDA);
exportBtn.addEventListener('click', exportResults);

// Load and parse CSV data
function loadData() {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a CSV file first.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            dataset = parseCSV(csvText);
            
            if (dataset.length === 0) {
                alert('The CSV file appears to be empty.');
                return;
            }

            console.log('Dataset loaded successfully:', dataset.length, 'rows');
            console.log('Columns:', Object.keys(dataset[0]));
            
            displayOverview();
            runEDABtn.disabled = false;
            exportBtn.disabled = false;
            
            alert(`Data loaded successfully! ${dataset.length} records found.`);
            
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error parsing CSV file: ' + error.message);
        }
    };
    reader.onerror = function() {
        alert('Error reading file.');
    };
    reader.readAsText(file);
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    // Handle different line endings and clean up
    const cleanedLines = lines.map(line => line.trim()).filter(line => line.length > 0);
    
    if (cleanedLines.length === 0) {
        return [];
    }

    // Parse headers
    const headers = parseCSVLine(cleanedLines[0]);
    const data = [];
    
    for (let i = 1; i < cleanedLines.length; i++) {
        const values = parseCSVLine(cleanedLines[i]);
        const obj = {};
        
        headers.forEach((header, index) => {
            // Clean header names by removing extra spaces
            const cleanHeader = header.trim();
            obj[cleanHeader] = values[index] ? values[index].trim() : '';
        });
        
        data.push(obj);
    }
    
    return data;
}

// Improved CSV line parsing to handle quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Push the last field
    result.push(current);
    
    return result;
}

// Display data overview
function displayOverview() {
    const overviewDiv = document.getElementById('overview');
    const shape = `${dataset.length} rows × ${Object.keys(dataset[0]).length} columns`;
    
    let previewHTML = `<p><strong>Dataset Shape:</strong> ${shape}</p>`;
    previewHTML += `<p><strong>Columns:</strong> ${Object.keys(dataset[0]).join(', ')}</p>`;
    previewHTML += '<h4>First 5 Rows:</h4>';
    previewHTML += '<div class="table-wrapper">';
    previewHTML += '<div class="scrollable-table">';
    previewHTML += '<table><thead><tr>';
    
    // Table headers
    Object.keys(dataset[0]).forEach(col => {
        previewHTML += `<th>${col}</th>`;
    });
    previewHTML += '</tr></thead><tbody>';    
    // Table rows
    dataset.slice(0, 5).forEach(row => {
        previewHTML += '<tr>';
        Object.values(row).forEach(val => {
            // Truncate long values for better display
            const displayVal = val && val.length > 50 ? val.substring(0, 47) + '...' : val;
            previewHTML += `<td title="${val}">${displayVal}</td>`;
        });
        previewHTML += '</tr>';
    });
    previewHTML += '</tbody></table></div></div>';    
    overviewDiv.innerHTML = previewHTML;
}

// Run complete EDA analysis
function runEDA() {
    if (!dataset) {
        alert('Please load data first.');
        return;
    }

    console.log('Starting EDA analysis...');

    // Clear previous charts
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};

    // Clear previous visualizations but keep missing values chart container
    const vizDiv = document.getElementById('visualizations');
    vizDiv.innerHTML = '';

    analyzeMissingValues();
    generateStatsSummary();
    createVisualizations();
    
    alert('EDA analysis completed! Check all sections.');
}

// Analyze and display missing values
function analyzeMissingValues() {
    const missingDiv = document.getElementById('missingValues');
    const columns = Object.keys(dataset[0]);
    const missingData = {};    
    columns.forEach(col => {
        const missingCount = dataset.filter(row => !row[col] || row[col].trim() === '').length;
        missingData[col] = (missingCount / dataset.length * 100).toFixed(2);
    });
    
    let missingHTML = '<div class="scrollable-table"><table><thead><tr><th>Column</th><th>Missing %</th></tr></thead><tbody>';
    Object.entries(missingData).forEach(([col, percent]) => {
        missingHTML += `<tr><td>${col}</td><td>${percent}%</td></tr>`;
    });
    missingHTML += '</tbody></table></div>';
    missingDiv.innerHTML = missingHTML;
    
    // Create missing values chart
    createBarChart('missingChart', 'Missing Values by Column', 
                 Object.keys(missingData), 
                 Object.values(missingData).map(val => parseFloat(val)), 
                 'Percentage Missing');
}

// Generate statistical summary - COMPLETELY REWRITTEN
function generateStatsSummary() {
    const statsDiv = document.getElementById('statsSummary');
    let statsHTML = '<div class="stats-section">';
    
    // Numeric features in table
    statsHTML += '<div><h4>Numeric Features Summary:</h4>';
    statsHTML += '<table class="stats-table"><thead><tr><th>Feature</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th></tr></thead><tbody>';
    
    // Process numeric features
    for (let i = 0; i < NUMERIC_FEATURES.length; i++) {
        const feature = NUMERIC_FEATURES[i];
        const values = [];
        
        // Collect numeric values
        for (let j = 0; j < dataset.length; j++) {
            const val = dataset[j][feature];
            if (val && val.trim() !== '') {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    values.push(num);
                }
            }
        }
        
        if (values.length === 0) {
            statsHTML += `<tr><td>${feature}</td><td colspan="5">No numeric data found</td></tr>`;
            continue;
        }
        
        // Calculate statistics
        const mean = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)].toFixed(2);
        const meanNum = parseFloat(mean);
        const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - meanNum, 2), 0) / values.length).toFixed(2);
        const min = Math.min(...values).toFixed(2);
        const max = Math.max(...values).toFixed(2);
        
        statsHTML += `<tr>
            <td>${feature}</td>
            <td>${mean}</td>
            <td>${median}</td>
            <td>${std}</td>
            <td>${min}</td>
            <td>${max}</td>
        </tr>`;
    }
    statsHTML += '</tbody></table></div>';
    
    // Categorical features in table
    statsHTML += '<div><h4>Categorical Features Counts:</h4>';
    
    // Process categorical features
    for (let i = 0; i < CATEGORICAL_FEATURES.length; i++) {
        const feature = CATEGORICAL_FEATURES[i];
        const counts = {};
        
        // Count categorical values
        for (let j = 0; j < dataset.length; j++) {
            const val = dataset[j][feature];
            if (val && val.trim() !== '') {
                counts[val] = (counts[val] || 0) + 1;
            }
        }
        
        if (Object.keys(counts).length > 0) {
            statsHTML += `<h5>${feature}:</h5>`;
            statsHTML += '<table class="stats-table"><thead><tr><th>Value</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
            
            const countEntries = Object.entries(counts);
            for (let k = 0; k < countEntries.length; k++) {
                const [value, count] = countEntries[k];
                const percentage = ((count / dataset.length) * 100).toFixed(1);
                statsHTML += `<tr><td>${value}</td><td>${count}</td><td>${percentage}%</td></tr>`;
            }
            statsHTML += '</tbody></table>';
        } else {
            statsHTML += `<h5>${feature}:</h5><p>No data found</p>`;
        }
    }
    statsHTML += '</div>';
    
    // Target variable analysis
    const targetCol = TARGET_COLUMN;
    
    if (dataset[0] && dataset[0].hasOwnProperty(targetCol)) {
        statsHTML += '<div><h4>Target Variable Analysis:</h4>';
        statsHTML += `<p><strong>Target Column:</strong> ${targetCol}</p>`;
        statsHTML += '<table class="stats-table"><thead><tr><th>Value</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
        
        const groups = {};
        for (let i = 0; i < dataset.length; i++) {
            const group = dataset[i][targetCol];
            if (group && group.trim() !== '') {
                if (!groups[group]) groups[group] = [];
                groups[group].push(dataset[i]);
            }
        }
        
        const groupEntries = Object.entries(groups);
        if (groupEntries.length > 0) {
            for (let i = 0; i < groupEntries.length; i++) {
                const [group, data] = groupEntries[i];
                const percentage = ((data.length / dataset.length) * 100).toFixed(1);
                statsHTML += `<tr><td>${group}</td><td>${data.length}</td><td>${percentage}%</td></tr>`;
            }
        } else {
            statsHTML += '<tr><td colspan="3">No target data found</td></tr>';
        }
        statsHTML += '</tbody></table></div>';
    } else {
        statsHTML += '<div><h4>Target Variable Analysis:</h4>';
        statsHTML += `<p>Target column "${targetCol}" not found in dataset</p></div>`;
    }
    
    statsHTML += '</div>';
    statsDiv.innerHTML = statsHTML;
}

// Create all visualizations
function createVisualizations() {
    console.log('Creating visualizations...');
    
    // Create categorical feature charts
    for (let i = 0; i < CATEGORICAL_FEATURES.length; i++) {
        const feature = CATEGORICAL_FEATURES[i];
        createCategoricalChart(feature);
    }
    
    // Create numeric feature histograms
    for (let i = 0; i < NUMERIC_FEATURES.length; i++) {
        const feature = NUMERIC_FEATURES[i];
        createHistogram(feature);
    }
    
    console.log('All visualizations created');
}

// Create chart for categorical feature
function createCategoricalChart(feature) {
    const counts = {};
    for (let i = 0; i < dataset.length; i++) {
        const val = dataset[i][feature];
        if (val && val.trim() !== '') {
            counts[val] = (counts[val] || 0) + 1;
        }
    }
    
    const categories = Object.keys(counts);
    if (categories.length === 0) {
        return;
    }
    
    const chartId = `chart-${feature.replace(/\s+/g, '-').toLowerCase()}`;
    const vizDiv = document.getElementById('visualizations');
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `<canvas id="${chartId}"></canvas>`;
    vizDiv.appendChild(chartContainer);
    
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        return;
    }
    
    const context = ctx.getContext('2d');
    
    try {
        // Destroy existing chart if it exists
        if (charts[chartId]) {
            charts[chartId].destroy();
        }
        
        charts[chartId] = new Chart(context, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: `Count by ${feature}`,
                    data: Object.values(counts),
                    backgroundColor: categories.map(() => `hsl(${Math.random() * 360}, 70%, 60%)`),
                    borderColor: categories.map(() => `hsl(${Math.random() * 360}, 70%, 40%)`),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Distribution: ${feature}`,
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: feature
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error creating chart for ${feature}:`, error);
    }
}

// Create histogram for numeric feature
function createHistogram(feature) {
    const values = [];
    for (let i = 0; i < dataset.length; i++) {
        const val = dataset[i][feature];
        if (val && val.trim() !== '') {
            const num = parseFloat(val);
            if (!isNaN(num)) {
                values.push(num);
            }
        }
    }
    
    if (values.length === 0) {
        return;
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const binCount = Math.min(15, Math.ceil(Math.sqrt(values.length)));
    const binSize = range / binCount;
    
    const bins = Array(binCount).fill(0);
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
        bins[binIndex]++;
    }
    
    const labels = Array.from({length: binCount}, (_, i) => {
        const start = (min + i * binSize).toFixed(1);
        const end = (min + (i + 1) * binSize).toFixed(1);
        return `${start}-${end}`;
    });
    
    const chartId = `hist-${feature.replace(/\s+/g, '-').toLowerCase()}`;
    const vizDiv = document.getElementById('visualizations');
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `<canvas id="${chartId}"></canvas>`;
    vizDiv.appendChild(chartContainer);
    
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        return;
    }
    
    const context = ctx.getContext('2d');
    
    try {
        // Destroy existing chart if it exists
        if (charts[chartId]) {
            charts[chartId].destroy();
        }
        
        charts[chartId] = new Chart(context, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Frequency of ${feature}`,
                    data: bins,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Histogram: ${feature}`,
                        font: {
                            size: 16
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: `${feature} Ranges`
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error creating histogram for ${feature}:`, error);
    }
}

// Create generic bar chart
function createBarChart(canvasId, title, labels, data, yLabel) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        return;
    }
    
    const context = ctx.getContext('2d');
    
    try {
        // Destroy existing chart if it exists
        if (charts[canvasId]) {
            charts[canvasId].destroy();
        }
        
        charts[canvasId] = new Chart(context, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: yLabel,
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        font: {
                            size: 16
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: yLabel
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error creating bar chart ${canvasId}:`, error);
    }
}

// Export results as JSON
function exportResults() {
    if (!dataset) {
        alert('No data to export.');
        return;
    }
    
    // Calculate comprehensive statistics for export
    const results = {
        overview: {
            rows: dataset.length,
            columns: Object.keys(dataset[0]).length,
            columnNames: Object.keys(dataset[0]),
            timestamp: new Date().toISOString()
        },
        missingValues: {},
        statistics: {
            numeric: {},
            categorical: {}
        },
        targetAnalysis: {}
    };
    
    // Create and trigger download
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    // Create download link and trigger click
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eda_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Results exported successfully!');
}
