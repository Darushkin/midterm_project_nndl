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

            // Check if required columns exist
            const columns = Object.keys(dataset[0]);
            if (!columns.includes(TARGET_COLUMN)) {
                alert(`Required column "${TARGET_COLUMN}" not found in dataset.`);
                return;
            }

            displayOverview();
            runEDABtn.disabled = false;
            exportBtn.disabled = false;
            
        } catch (error) {
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
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        return obj;
    });
}

// Display data overview
function displayOverview() {
    const overviewDiv = document.getElementById('overview');
    const shape = `${dataset.length} rows × ${Object.keys(dataset[0]).length} columns`;
    
    let previewHTML = `<p><strong>Dataset Shape:</strong> ${shape}</p>`;
    previewHTML += `<p><strong>Columns:</strong> ${Object.keys(dataset[0]).join(', ')}</p>`;
    previewHTML += '<h4>First 5 Rows:</h4><table><thead><tr>';
    
    // Table headers
    Object.keys(dataset[0]).forEach(col => {
        previewHTML += `<th>${col}</th>`;
    });
    previewHTML += '</tr></thead><tbody>';
    
    // Table rows
    dataset.slice(0, 5).forEach(row => {
        previewHTML += '<tr>';
        Object.values(row).forEach(val => {
            previewHTML += `<td>${val}</td>`;
        });
        previewHTML += '</tr>';
    });
    previewHTML += '</tbody></table>';
    
    overviewDiv.innerHTML = previewHTML;
}

// Run complete EDA analysis
function runEDA() {
    if (!dataset) {
        alert('Please load data first.');
        return;
    }

    // Clear previous charts
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};

    analyzeMissingValues();
    generateStatsSummary();
    createVisualizations();
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
    
    let missingHTML = '<table><thead><tr><th>Column</th><th>Missing %</th></tr></thead><tbody>';
    Object.entries(missingData).forEach(([col, percent]) => {
        missingHTML += `<tr><td>${col}</td><td>${percent}%</td></tr>`;
    });
    missingHTML += '</tbody></table>';
    missingDiv.innerHTML = missingHTML;
    
    // Create missing values chart
    createBarChart('missingChart', 'Missing Values by Column', 
                 Object.keys(missingData), Object.values(missingData), 
                 'Percentage Missing');
}

// Generate statistical summary
function generateStatsSummary() {
    const statsDiv = document.getElementById('statsSummary');
    let statsHTML = '<h4>Numeric Features Summary:</h4>';
    
    NUMERIC_FEATURES.forEach(feature => {
        const values = dataset.map(row => parseFloat(row[feature])).filter(v => !isNaN(v));
        if (values.length === 0) return;
        
        const mean = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
        const sorted = values.slice().sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length).toFixed(2);
        
        statsHTML += `<p><strong>${feature}:</strong> Mean=${mean}, Median=${median}, Std=${std}</p>`;
    });
    
    statsHTML += '<h4>Categorical Features Counts:</h4>';
    CATEGORICAL_FEATURES.forEach(feature => {
        const counts = {};
        dataset.forEach(row => {
            const val = row[feature];
            counts[val] = (counts[val] || 0) + 1;
        });
        
        statsHTML += `<p><strong>${feature}:</strong> ${Object.entries(counts).map(([k, v]) => `${k}(${v})`).join(', ')}</p>`;
    });
    
    // Group by target if available
    if (dataset.some(row => row[TARGET_COLUMN])) {
        statsHTML += `<h4>Grouped by ${TARGET_COLUMN}:</h4>`;
        const groups = {};
        dataset.forEach(row => {
            const group = row[TARGET_COLUMN];
            if (!groups[group]) groups[group] = [];
            groups[group].push(row);
        });
        
        Object.entries(groups).forEach(([group, data]) => {
            statsHTML += `<p><strong>${TARGET_COLUMN} = ${group}:</strong> ${data.length} records (${(data.length/dataset.length*100).toFixed(1)}%)</p>`;
        });
    }
    
    statsDiv.innerHTML = statsHTML;
}

// Create all visualizations
function createVisualizations() {
    createCorrelationHeatmap();
    
    // Create categorical feature charts
    CATEGORICAL_FEATURES.forEach(feature => {
        createCategoricalChart(feature);
    });
    
    // Create numeric feature histograms
    NUMERIC_FEATURES.forEach(feature => {
        createHistogram(feature);
    });
}

// Create correlation heatmap
function createCorrelationHeatmap() {
    const numericData = {};
    NUMERIC_FEATURES.forEach(feature => {
        numericData[feature] = dataset.map(row => parseFloat(row[feature])).filter(v => !isNaN(v));
    });
    
    const features = Object.keys(numericData);
    const correlations = [];
    
    for (let i = 0; i < features.length; i++) {
        correlations[i] = [];
        for (let j = 0; j < features.length; j++) {
            if (i === j) {
                correlations[i][j] = 1;
            } else {
                correlations[i][j] = calculateCorrelation(
                    numericData[features[i]], 
                    numericData[features[j]]
                ).toFixed(2);
            }
        }
    }
    
    const ctx = document.getElementById('correlationHeatmap').getContext('2d');
    charts.correlationHeatmap = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: features,
            datasets: [{
                label: 'Feature Correlation',
                data: correlations.flat(),
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Numeric Features Correlation'
                }
            }
        }
    });
}

// Calculate correlation between two arrays
function calculateCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    
    const sumX = xSlice.reduce((a, b) => a + b, 0);
    const sumY = ySlice.reduce((a, b) => a + b, 0);
    const sumXY = xSlice.reduce((sum, val, i) => sum + val * ySlice[i], 0);
    const sumX2 = xSlice.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = ySlice.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
}

// Create chart for categorical feature
function createCategoricalChart(feature) {
    const counts = {};
    dataset.forEach(row => {
        const val = row[feature];
        counts[val] = (counts[val] || 0) + 1;
    });
    
    const chartId = `chart-${feature.replace(/\s+/g, '-')}`;
    const vizDiv = document.getElementById('visualizations');
    vizDiv.innerHTML += `<div class="chart-container"><canvas id="${chartId}"></canvas></div>`;
    
    const ctx = document.getElementById(chartId).getContext('2d');
    charts[chartId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                label: `Count by ${feature}`,
                data: Object.values(counts),
                backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Distribution: ${feature}`
                }
            }
        }
    });
}

// Create histogram for numeric feature
function createHistogram(feature) {
    const values = dataset.map(row => parseFloat(row[feature])).filter(v => !isNaN(v));
    if (values.length === 0) return;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
    const binSize = range / binCount;
    
    const bins = Array(binCount).fill(0);
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
        bins[binIndex]++;
    });
    
    const labels = Array.from({length: binCount}, (_, i) => {
        const start = min + i * binSize;
        const end = min + (i + 1) * binSize;
        return `${start.toFixed(1)}-${end.toFixed(1)}`;
    });
    
    const chartId = `hist-${feature.replace(/\s+/g, '-')}`;
    const vizDiv = document.getElementById('visualizations');
    vizDiv.innerHTML += `<div class="chart-container"><canvas id="${chartId}"></canvas></div>`;
    
    const ctx = document.getElementById(chartId).getContext('2d');
    charts[chartId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Frequency of ${feature}`,
                data: bins,
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Histogram: ${feature}`
                }
            }
        }
    });
}

// Create generic bar chart
function createBarChart(canvasId, title, labels, data, yLabel) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: yLabel,
                data: data,
                backgroundColor: 'rgba(153, 102, 255, 0.6)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            }
        }
    });
}

// Export results as JSON
function exportResults() {
    if (!dataset) {
        alert('No data to export.');
        return;
    }
    
    const results = {
        overview: {
            rows: dataset.length,
            columns: Object.keys(dataset[0]).length,
            columnNames: Object.keys(dataset[0])
        },
        generated: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eda_results.json';
    link.click();
    
    URL.revokeObjectURL(url);
}
