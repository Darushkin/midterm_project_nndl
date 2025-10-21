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

// Display data overview - FIXED: Scrollable table
function displayOverview() {
    const overviewDiv = document.getElementById('overview');
    const shape = `${dataset.length} rows × ${Object.keys(dataset[0]).length} columns`;
    
    let previewHTML = `<p><strong>Dataset Shape:</strong> ${shape}</p>`;
    previewHTML += `<p><strong>Columns:</strong> ${Object.keys(dataset[0]).join(', ')}</p>`;
    previewHTML += '<h4>First 5 Rows:</h4>';
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
            previewHTML += `<td>${val}</td>`;
        });
        previewHTML += '</tr>';
    });
    previewHTML += '</tbody></table></div>';    
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

    // Clear previous visualizations
    document.getElementById('visualizations').innerHTML = '';

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
    
    let missingHTML = '<div class="scrollable-table"><table><thead><tr><th>Column</th><th>Missing %</th></tr></thead><tbody>';
    Object.entries(missingData).forEach(([col, percent]) => {
        missingHTML += `<tr><td>${col}</td><td>${percent}%</td></tr>`;
    });
    missingHTML += '</tbody></table></div>';
    missingDiv.innerHTML = missingHTML;
    
    // Create missing values chart
    createBarChart('missingChart', 'Missing Values by Column', 
                 Object.keys(missingData), Object.values(missingData), 
                 'Percentage Missing');
}

// Generate statistical summary - FIXED: Tables for stats
function generateStatsSummary() {
    const statsDiv = document.getElementById('statsSummary');
    let statsHTML = '<div class="stats-section">';
    
    // Numeric features in table
    statsHTML += '<div><h4>Numeric Features Summary:</h4>';
    statsHTML += '<table class="stats-table"><thead><tr><th>Feature</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th></tr></thead><tbody>';
    
    NUMERIC_FEATURES.forEach(feature => {
        const values = dataset.map(row => {
            const val = row[feature];
            return val ? parseFloat(val) : NaN;
        }).filter(v => !isNaN(v));
        
        if (values.length === 0) {
            statsHTML += `<tr><td>${feature}</td><td colspan="5">No data</td></tr>`;
            return;
        }
        
        const mean = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
        const sorted = values.slice().sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)].toFixed(2);
        const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length).toFixed(2);
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
    });
    statsHTML += '</tbody></table></div>';
    
    // Categorical features in table
    statsHTML += '<div><h4>Categorical Features Counts:</h4>';
    CATEGORICAL_FEATURES.forEach(feature => {
        const counts = {};
        dataset.forEach(row => {
            const val = row[feature];
            if (val) {
                counts[val] = (counts[val] || 0) + 1;
            }
        });
        
        if (Object.keys(counts).length > 0) {
            statsHTML += `<h5>${feature}:</h5>`;
            statsHTML += '<table class="stats-table"><thead><tr><th>Value</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
            Object.entries(counts).forEach(([value, count]) => {
                const percentage = ((count / dataset.length) * 100).toFixed(1);
                statsHTML += `<tr><td>${value}</td><td>${count}</td><td>${percentage}%</td></tr>`;
            });
            statsHTML += '</tbody></table>';
        }
    });
    statsHTML += '</div>';
    
    // Group by target if available
    const targetCol = Object.keys(dataset[0]).find(col => 
        col.toLowerCase().includes('mental') || col === TARGET_COLUMN
    );
    
    if (targetCol && dataset.some(row => row[targetCol])) {
        statsHTML += '<div><h4>Target Variable Analysis:</h4>';
        statsHTML += `<p><strong>Target Column:</strong> ${targetCol}</p>`;
        statsHTML += '<table class="stats-table"><thead><tr><th>Value</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
        
        const groups = {};
        dataset.forEach(row => {
            const group = row[targetCol];
            if (group) {
                if (!groups[group]) groups[group] = [];
                groups[group].push(row);
            }
        });
        
        Object.entries(groups).forEach(([group, data]) => {
            const percentage = ((data.length / dataset.length) * 100).toFixed(1);
            statsHTML += `<tr><td>${group}</td><td>${data.length}</td><td>${percentage}%</td></tr>`;
        });
        statsHTML += '</tbody></table></div>';
    }
    
    statsHTML += '</div>';
    statsDiv.innerHTML = statsHTML;
}

// Create all visualizations - FIXED: Proper chart creation
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
                const corr = calculateCorrelation(
                    numericData[features[i]], 
                    numericData[features[j]]
                );
                correlations[i][j] = isNaN(corr) ? 0 : parseFloat(corr.toFixed(2));
            }
        }
    }
    
    // Create heatmap data
    const heatmapData = {
        labels: features,
        datasets: []
    };
    
    for (let i = 0; i < features.length; i++) {
        heatmapData.datasets.push({
            label: features[i],
            data: correlations[i],
            backgroundColor: correlations[i].map(value => {
                // Color scale from red (negative) to green (positive)
                const colorValue = Math.max(0, Math.min(1, (value + 1) / 2));
                return `rgba(${255 * (1 - colorValue)}, ${255 * colorValue}, 0, 0.6)`;
            })
        });
    }
    
    const ctx = document.getElementById('correlationHeatmap').getContext('2d');
    charts.correlationHeatmap = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: features,
            datasets: [{
                label: 'Average Correlation',
                data: correlations.map(row => row.reduce((a, b) => a + b, 0) / row.length),
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Numeric Features Average Correlation'
                },
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Correlation'
                    }
                }
            }
        }
    });
}

// Calculate correlation between two arrays
function calculateCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n === 0) return NaN;
    
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    
    const sumX = xSlice.reduce((a, b) => a + b, 0);
    const sumY = ySlice.reduce((a, b) => a + b, 0);
    const sumXY = xSlice.reduce((sum, val, i) => sum + val * ySlice[i], 0);
    const sumX2 = xSlice.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = ySlice.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? NaN : numerator / denominator;
}

// Create chart for categorical feature - FIXED: Proper chart creation
function createCategoricalChart(feature) {
    const counts = {};
    dataset.forEach(row => {
        const val = row[feature];
        if (val && val.trim() !== '') {
            counts[val] = (counts[val] || 0) + 1;
        }
    });
    
    if (Object.keys(counts).length === 0) {
        console.log(`No data for feature: ${feature}`);
        return;
    }
    
    const chartId = `chart-${feature.replace(/\s+/g, '-').toLowerCase()}`;
    const vizDiv = document.getElementById('visualizations');
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.innerHTML = `<canvas id="${chartId}"></canvas>`;
    vizDiv.appendChild(chartContainer);
    
    const ctx = document.getElementById(chartId).getContext('2d');
    
    // Generate random colors for each category
    const backgroundColors = Object.keys(counts).map(() => 
        `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
    );
    
    charts[chartId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                label: `Count by ${feature}`,
                data: Object.values(counts),
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
                borderWidth: 1
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
                        size: 14
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
                    }
                }
            }
        }
    });
}

// Create histogram for numeric feature - FIXED: Proper histogram creation
function createHistogram(feature) {
    const values = dataset.map(row => {
        const val = row[feature];
        return val ? parseFloat(val) : NaN;
    }).filter(v => !isNaN(v));
    
    if (values.length === 0) {
        console.log(`No numeric data for feature: ${feature}`);
        return;
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const binCount = Math.min(15, Math.ceil(Math.sqrt(values.length)));
    const binSize = range / binCount;
    
    const bins = Array(binCount).fill(0);
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
        bins[binIndex]++;
    });
    
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
    
    const ctx = document.getElementById(chartId).getContext('2d');
    charts[chartId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Frequency of ${feature}`,
                data: bins,
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
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
                        size: 14
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
                        text: feature
                    }
                }
            }
        }
    });
}

// Create generic bar chart
function createBarChart(canvasId, title, labels, data, yLabel) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Generate colors based on values
    const backgroundColors = data.map(value => {
        const intensity = Math.min(1, value / 100);
        return `rgba(153, 102, 255, ${0.3 + intensity * 0.7})`;
    });
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: yLabel,
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: yLabel
                    }
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
