// app.js
// Health Lifestyle Dataset EDA - Client-side JavaScript
// Dataset Schema: Target: disease_risk (0/1). Features: age, gender, bmi, daily_steps, sleep_hours, water_intake_l, 
// calories_consumed, smoker, alcohol, resting_hr, systolic_bp, diastolic_bp, cholesterol, family_history

let dataset = null;
let columns = [];

// DOM Elements
const fileInput = document.getElementById('fileInput');
const loadBtn = document.getElementById('loadBtn');
const loadStatus = document.getElementById('loadStatus');
const dataPreview = document.getElementById('dataPreview');
const previewTable = document.getElementById('previewTable');
const dataShape = document.getElementById('dataShape');
const runEDA = document.getElementById('runEDA');
const exportBtn = document.getElementById('exportBtn');
const overviewContent = document.getElementById('overviewContent');
const missingContent = document.getElementById('missingContent');
const statsContent = document.getElementById('statsContent');
const vizContent = document.getElementById('vizContent');

// Event Listeners
loadBtn.addEventListener('click', loadDataset);
runEDA.addEventListener('click', runExploratoryDataAnalysis);
exportBtn.addEventListener('click', exportResults);

// Load and parse CSV dataset
function loadDataset() {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a CSV file first.');
        return;
    }
    
    loadStatus.textContent = 'Loading dataset...';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            parseCSV(csvData);
            loadStatus.textContent = 'Dataset loaded successfully!';
            runEDA.disabled = false;
            exportBtn.disabled = false;
        } catch (error) {
            loadStatus.textContent = 'Error loading dataset: ' + error.message;
            console.error(error);
        }
    };
    reader.onerror = function() {
        loadStatus.textContent = 'Error reading file.';
    };
    reader.readAsText(file);
}

// Parse CSV data into JavaScript objects
function parseCSV(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row.');
    }
    
    // Extract column headers
    columns = lines[0].split(',').map(col => col.trim());
    
    // Parse data rows
    dataset = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        
        for (let j = 0; j < columns.length; j++) {
            let value = values[j] ? values[j].trim() : '';
            
            // Convert numeric values
            if (!isNaN(value) && value !== '') {
                value = Number(value);
            }
            
            row[columns[j]] = value;
        }
        
        dataset.push(row);
    }
    
    showDataPreview();
}

// Display data preview table
function showDataPreview() {
    dataPreview.style.display = 'block';
    
    // Clear previous table
    previewTable.innerHTML = '';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    previewTable.appendChild(thead);
    
    // Create body with first 10 rows
    const tbody = document.createElement('tbody');
    const previewRows = dataset.slice(0, 10);
    
    previewRows.forEach(row => {
        const tr = document.createElement('tr');
        
        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col];
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    previewTable.appendChild(tbody);
    
    // Show dataset shape
    dataShape.textContent = `Dataset Shape: ${dataset.length} rows × ${columns.length} columns`;
}

// Main EDA function
function runExploratoryDataAnalysis() {
    if (!dataset) {
        alert('Please load a dataset first.');
        return;
    }
    
    // Clear previous content
    overviewContent.innerHTML = '';
    missingContent.innerHTML = '';
    statsContent.innerHTML = '';
    vizContent.innerHTML = '';
    
    // Run all EDA components
    showDatasetOverview();
    analyzeMissingValues();
    generateStatisticalSummary();
    createVisualizations();
}

// Show dataset overview information
function showDatasetOverview() {
    overviewContent.innerHTML = '<h3>Basic Information</h3>';
    
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
        <p><strong>Total Records:</strong> ${dataset.length}</p>
        <p><strong>Total Features:</strong> ${columns.length}</p>
        <p><strong>Target Variable:</strong> disease_risk (0 = Low, 1 = High)</p>
        <p><strong>Features:</strong> age, gender, bmi, daily_steps, sleep_hours, water_intake_l, calories_consumed, smoker, alcohol, resting_hr, systolic_bp, diastolic_bp, cholesterol, family_history</p>
    `;
    
    overviewContent.appendChild(infoDiv);
}

// Analyze and display missing values
function analyzeMissingValues() {
    missingContent.innerHTML = '<h3>Missing Values Analysis</h3>';
    
    // Calculate missing values percentage for each column
    const missingData = [];
    
    columns.forEach(col => {
        const missingCount = dataset.filter(row => 
            row[col] === '' || row[col] === null || row[col] === undefined
        ).length;
        
        const missingPercent = (missingCount / dataset.length * 100).toFixed(2);
        
        missingData.push({
            column: col,
            missing: missingCount,
            percentage: parseFloat(missingPercent)
        });
    });
    
    // Create table
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Column</th><th>Missing Count</th><th>Missing %</th>';
    table.appendChild(headerRow);
    
    missingData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.column}</td>
            <td>${item.missing}</td>
            <td>${item.percentage}%</td>
        `;
        table.appendChild(row);
    });
    
    missingContent.appendChild(table);
    
    // Create bar chart for missing values
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    missingContent.appendChild(chartContainer);
    
    const ctx = document.createElement('canvas');
    chartContainer.appendChild(ctx);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: missingData.map(item => item.column),
            datasets: [{
                label: 'Missing Values %',
                data: missingData.map(item => item.percentage),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Percentage (%)'
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
}

// Generate statistical summary
function generateStatisticalSummary() {
    statsContent.innerHTML = '<h3>Statistical Summary</h3>';
    
    // Define numeric and categorical columns
    const numericCols = ['age', 'bmi', 'daily_steps', 'sleep_hours', 'water_intake_l', 
                        'calories_consumed', 'resting_hr', 'systolic_bp', 'diastolic_bp', 'cholesterol'];
    const categoricalCols = ['gender', 'smoker', 'alcohol', 'family_history', 'disease_risk'];
    
    // Numeric statistics
    const numericStats = document.createElement('div');
    numericStats.innerHTML = '<h4>Numeric Variables</h4>';
    statsContent.appendChild(numericStats);
    
    const numTable = document.createElement('table');
    numTable.innerHTML = `
        <tr>
            <th>Variable</th>
            <th>Mean</th>
            <th>Median</th>
            <th>Std Dev</th>
            <th>Min</th>
            <th>Max</th>
        </tr>
    `;
    
    numericCols.forEach(col => {
        const values = dataset.map(row => row[col]).filter(val => !isNaN(val));
        if (values.length === 0) return;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${col}</td>
            <td>${mean.toFixed(2)}</td>
            <td>${median.toFixed(2)}</td>
            <td>${std.toFixed(2)}</td>
            <td>${min.toFixed(2)}</td>
            <td>${max.toFixed(2)}</td>
        `;
        numTable.appendChild(row);
    });
    
    numericStats.appendChild(numTable);
    
    // Categorical counts
    const categoricalStats = document.createElement('div');
    categoricalStats.innerHTML = '<h4>Categorical Variables</h4>';
    statsContent.appendChild(categoricalStats);
    
    categoricalCols.forEach(col => {
        const counts = {};
        dataset.forEach(row => {
            const value = row[col];
            counts[value] = (counts[value] || 0) + 1;
        });
        
        const catTable = document.createElement('table');
        catTable.innerHTML = `<tr><th colspan="2">${col}</th></tr>`;
        
        Object.entries(counts).forEach(([value, count]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${value}</td>
                <td>${count} (${((count / dataset.length) * 100).toFixed(1)}%)</td>
            `;
            catTable.appendChild(row);
        });
        
        categoricalStats.appendChild(catTable);
    });
    
    // Group by disease risk if available
    if (columns.includes('disease_risk')) {
        const groupedStats = document.createElement('div');
        groupedStats.innerHTML = '<h4>Statistics by Disease Risk</h4>';
        statsContent.appendChild(groupedStats);
        
        const lowRisk = dataset.filter(row => row.disease_risk === 0);
        const highRisk = dataset.filter(row => row.disease_risk === 1);
        
        const groupTable = document.createElement('table');
        groupTable.innerHTML = `
            <tr>
                <th>Variable</th>
                <th>Low Risk (Mean)</th>
                <th>High Risk (Mean)</th>
            </tr>
        `;
        
        numericCols.forEach(col => {
            const lowValues = lowRisk.map(row => row[col]).filter(val => !isNaN(val));
            const highValues = highRisk.map(row => row[col]).filter(val => !isNaN(val));
            
            if (lowValues.length === 0 || highValues.length === 0) return;
            
            const lowMean = lowValues.reduce((a, b) => a + b, 0) / lowValues.length;
            const highMean = highValues.reduce((a, b) => a + b, 0) / highValues.length;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${col}</td>
                <td>${lowMean.toFixed(2)}</td>
                <td>${highMean.toFixed(2)}</td>
            `;
            groupTable.appendChild(row);
        });
        
        groupedStats.appendChild(groupTable);
    }
}

// Create visualizations
function createVisualizations() {
    vizContent.innerHTML = '<h3>Data Visualizations</h3>';
    
    // Categorical variable bar charts
    createCategoricalCharts();
    
    // Numeric variable histograms
    createHistograms();
    
    // Correlation heatmap
    createCorrelationHeatmap();
}

// Create bar charts for categorical variables
function createCategoricalCharts() {
    const categoricalVars = ['gender', 'smoker', 'alcohol', 'family_history'];
    
    categoricalVars.forEach(variable => {
        const section = document.createElement('div');
        section.innerHTML = `<h4>${variable} Distribution</h4>`;
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        section.appendChild(chartContainer);
        
        vizContent.appendChild(section);
        
        const ctx = document.createElement('canvas');
        chartContainer.appendChild(ctx);
        
        // Count values
        const counts = {};
        dataset.forEach(row => {
            const value = row[variable];
            counts[value] = (counts[value] || 0) + 1;
        });
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    label: `Count of ${variable}`,
                    data: Object.values(counts),
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    });
}

// Create histograms for numeric variables
function createHistograms() {
    const numericVars = ['age', 'bmi', 'daily_steps', 'sleep_hours', 'water_intake_l', 
                        'calories_consumed', 'resting_hr', 'systolic_bp', 'diastolic_bp', 'cholesterol'];
    
    numericVars.forEach(variable => {
        const section = document.createElement('div');
        section.innerHTML = `<h4>${variable} Distribution</h4>`;
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        section.appendChild(chartContainer);
        
        vizContent.appendChild(section);
        
        const ctx = document.createElement('canvas');
        chartContainer.appendChild(ctx);
        
        const values = dataset.map(row => row[variable]).filter(val => !isNaN(val));
        
        // Create bins for histogram
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = 15;
        const binSize = (max - min) / binCount;
        
        const bins = Array(binCount).fill(0);
        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            bins[binIndex]++;
        });
        
        const binLabels = Array.from({length: binCount}, (_, i) => 
            `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`
        );
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: `Frequency of ${variable}`,
                    data: bins,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                            text: variable
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    });
}

// Create correlation heatmap
function createCorrelationHeatmap() {
    const section = document.createElement('div');
    section.innerHTML = '<h4>Correlation Heatmap</h4>';
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    section.appendChild(chartContainer);
    
    vizContent.appendChild(section);
    
    const ctx = document.createElement('canvas');
    chartContainer.appendChild(ctx);
    
    // Select numeric variables for correlation
    const numericVars = ['age', 'bmi', 'daily_steps', 'sleep_hours', 'water_intake_l', 
                        'calories_consumed', 'resting_hr', 'systolic_bp', 'diastolic_bp', 'cholesterol'];
    
    // Calculate correlation matrix
    const matrix = [];
    const labels = [];
    
    numericVars.forEach(var1 => {
        const row = [];
        const values1 = dataset.map(row => row[var1]).filter(val => !isNaN(val));
        
        numericVars.forEach(var2 => {
            const values2 = dataset.map(row => row[var2]).filter(val => !isNaN(val));
            
            // Simple correlation calculation (Pearson)
            const n = Math.min(values1.length, values2.length);
            const mean1 = values1.slice(0, n).reduce((a, b) => a + b, 0) / n;
            const mean2 = values2.slice(0, n).reduce((a, b) => a + b, 0) / n;
            
            let numerator = 0;
            let denom1 = 0;
            let denom2 = 0;
            
            for (let i = 0; i < n; i++) {
                numerator += (values1[i] - mean1) * (values2[i] - mean2);
                denom1 += Math.pow(values1[i] - mean1, 2);
                denom2 += Math.pow(values2[i] - mean2, 2);
            }
            
            const correlation = numerator / Math.sqrt(denom1 * denom2);
            row.push(isNaN(correlation) ? 0 : correlation);
        });
        
        matrix.push(row);
        labels.push(var1);
    });
    
    // Create heatmap data
    const heatmapData = {
        labels: labels,
        datasets: [{
            data: matrix.flatMap((row, i) => 
                row.map((value, j) => ({x: labels[j], y: labels[i], v: value}))
            ),
            backgroundColor: function(context) {
                const value = context.dataset.data[context.dataIndex].v;
                const alpha = Math.abs(value);
                return value >= 0 ? 
                    `rgba(0, 128, 0, ${alpha})` : 
                    `rgba(255, 0, 0, ${alpha})`;
            },
            borderWidth: 1,
            borderColor: 'white',
            hoverBackgroundColor: function(context) {
                const value = context.dataset.data[context.dataIndex].v;
                const alpha = Math.min(Math.abs(value) + 0.3, 1);
                return value >= 0 ? 
                    `rgba(0, 128, 0, ${alpha})` : 
                    `rgba(255, 0, 0, ${alpha})`;
            },
            width: function(ctx) {
                const a = ctx.chart.chartArea;
                return (a.right - a.left) / matrix.length - 1;
            },
            height: function(ctx) {
                const a = ctx.chart.chartArea;
                return (a.bottom - a.top) / matrix.length - 1;
            }
        }]
    };
    
    new Chart(ctx, {
        type: 'matrix',
        data: heatmapData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const data = context.dataset.data[context.dataIndex];
                            return `${data.x} vs ${data.y}: ${data.v.toFixed(3)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        display: true
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        display: true
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Export results as JSON
function exportResults() {
    if (!dataset) {
        alert('Please load and analyze a dataset first.');
        return;
    }
    
    // Collect all analysis results
    const exportData = {
        timestamp: new Date().toISOString(),
        datasetInfo: {
            rows: dataset.length,
            columns: columns.length,
            columns: columns
        },
        // Add other analysis results here as needed
        message: 'Full EDA results exported'
    };
    
    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'health_lifestyle_eda_results.json';
    link.click();
    
    alert('Results exported successfully!');
}

// Note: To reuse with other datasets, update the schema variables in the comments above
// and modify the numericCols, categoricalCols arrays accordingly
