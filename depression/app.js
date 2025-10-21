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

    console.log('Loading file:', file.name); // Debug log

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            console.log('CSV loaded, first 200 chars:', csvText.substring(0, 200)); // Debug log
            
            dataset = parseCSV(csvText);
            
            console.log('Parsed dataset:', dataset.slice(0, 3)); // Debug log
            
            if (dataset.length === 0) {
                alert('The CSV file appears to be empty.');
                return;
            }

            // Check if required columns exist
            const columns = Object.keys(dataset[0]);
            console.log('Columns found:', columns); // Debug log
            
            // Check for target column with flexible matching
            const targetColumnFound = columns.find(col => 
                col.toLowerCase().includes('mental') || col === TARGET_COLUMN
            );
            
            if (!targetColumnFound) {
                alert(`Required column "${TARGET_COLUMN}" not found in dataset. Found columns: ${columns.join(', ')}`);
                return;
            }

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

// Parse CSV text into array of objects - IMPROVED VERSION
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    console.log('Total lines:', lines.length); // Debug log
    
    // Handle different line endings and clean up
    const cleanedLines = lines.map(line => line.trim()).filter(line => line.length > 0);
    
    if (cleanedLines.length === 0) {
        return [];
    }

    // Parse headers - handle quoted fields and commas within quotes
    const headers = parseCSVLine(cleanedLines[0]);
    console.log('Headers:', headers); // Debug log
    
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
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};

    analyzeMissingValues();
    generateStatsSummary();
    createVisualizations();
    
    alert('EDA analysis completed!');
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
        const values = dataset.map(row => {
            const val = row[feature];
            return val ? parseFloat(val) : NaN;
        }).filter(v => !isNaN(v));
        
        if (values.length === 0) {
            statsHTML += `<p><strong>${feature}:</strong> No valid numeric data found</p>`;
            return;
        }
        
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
            if (val) {
                counts[val] = (counts[val] || 0) + 1;
            }
        });
        
        if (Object.keys(counts).length > 0) {
            statsHTML += `<p><strong>${feature}:</strong> ${Object.entries(counts).map(([k, v]) => `${k}(${v})`).join(', ')}</p>`;
        } else {
            statsHTML += `<p><strong>${feature}:</strong> No data found</p>`;
        }
    });
    
    // Group by target if available
    const targetCol = Object.keys(dataset[0]).find(col => 
        col.toLowerCase().includes('mental') || col === TARGET_COLUMN
    );
    
    if (targetCol && dataset.some(row => row[targetCol])) {
        statsHTML += `<h4>Grouped by ${targetCol}:</h4>`;
        const groups = {};
        dataset.forEach(row => {
            const group = row[targetCol];
            if (group) {
                if (!groups[group]) groups[group] = [];
                groups[group].push(row);
            }
        });
        
        Object.entries(groups).forEach(([group, data]) => {
            statsHTML += `<p><strong>${targetCol} = ${group}:</strong> ${data.length} records (${(data.length/dataset.length*100).toFixed(1)}%)</p>`;
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
        numericData[feature] = dataset.map(row => {
            const val = row[feature];
            return val ? parseFloat(val) : NaN;
        }).filter(v => !isNaN(v));
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
    if (n === 0) return 0;
    
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
        if (val) {
            counts[val] = (counts[val] || 0) + 1;
        }
    });
    
    if (Object.keys(counts).length === 0) return;
    
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
    const values = dataset.map(row => {
        const val = row[feature];
        return val ? parseFloat(val) : NaN;
    }).filter(v => !isNaN(v));
    
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

// Export results as JSON - FIXED VERSION
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
    
    // Missing values
    Object.keys(dataset[0]).forEach(col => {
        const missingCount = dataset.filter(row => !row[col] || row[col].trim() === '').length;
        results.missingValues[col] = {
            missingCount: missingCount,
            missingPercentage: (missingCount / dataset.length * 100).toFixed(2)
        };
    });
    
    // Numeric statistics
    NUMERIC_FEATURES.forEach(feature => {
        const values = dataset.map(row => {
            const val = row[feature];
            return val ? parseFloat(val) : NaN;
        }).filter(v => !isNaN(v));
        
        if (values.length > 0) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const sorted = values.slice().sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
            
            results.statistics.numeric[feature] = {
                mean: mean.toFixed(2),
                median: median.toFixed(2),
                std: std.toFixed(2),
                min: Math.min(...values).toFixed(2),
                max: Math.max(...values).toFixed(2)
            };
        }
    });
    
    // Categorical counts
    CATEGORICAL_FEATURES.forEach(feature => {
        const counts = {};
        dataset.forEach(row => {
            const val = row[feature];
            if (val) {
                counts[val] = (counts[val] || 0) + 1;
            }
        });
        results.statistics.categorical[feature] = counts;
    });
    
    // Target variable analysis
    const targetCol = Object.keys(dataset[0]).find(col => 
        col.toLowerCase().includes('mental') || col === TARGET_COLUMN
    );
    
    if (targetCol && dataset.some(row => row[targetCol])) {
        const groups = {};
        dataset.forEach(row => {
            const group = row[targetCol];
            if (group) {
                if (!groups[group]) groups[group] = [];
                groups[group].push(row);
            }
        });
        
        results.targetAnalysis = {
            targetColumn: targetCol,
            groups: Object.keys(groups),
            counts: Object.fromEntries(
                Object.entries(groups).map(([k, v]) => [k, v.length])
            ),
            percentages: Object.fromEntries(
                Object.entries(groups).map(([k, v]) => [
                    k, 
                    (v.length / dataset.length * 100).toFixed(1) + '%'
                ])
            )
        };
    }
    
    // Create and trigger download
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    // Create download link and trigger click
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eda_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Results exported successfully!');
}
