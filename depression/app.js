// app.js
// Depression Dataset EDA - Client-side JavaScript
// Dataset Schema: 
// Features: Name, Age, Marital Status, Education Level, Number of Children, Smoking Status,
// Physical Activity Level, Employment Status, Income, Alcohol Consumption, Dietary Habits,
// Sleep Patterns, History of Mental Illness, History of Substance Abuse, 
// Family History of Depression, Chronic Medical Conditions

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
        const values = lines[i].split(',').map(val => val.trim());
        const row = {};
        
        for (let j = 0; j < columns.length; j++) {
            let value = values[j] || '';
            
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
        <p><strong>Key Features:</strong> Age, Marital Status, Education Level, Number of Children, Smoking Status, Physical Activity Level, Employment Status, Income, Alcohol Consumption, Dietary Habits, Sleep Patterns, History of Mental Illness, History of Substance Abuse, Family History of Depression, Chronic Medical Conditions</p>
        <p><strong>Demographic Variables:</strong> Age, Marital Status, Education Level, Employment Status, Income</p>
        <p><strong>Lifestyle Variables:</strong> Smoking Status, Physical Activity Level, Alcohol Consumption, Dietary Habits, Sleep Patterns</p>
        <p><strong>Medical History Variables:</strong> History of Mental Illness, History of Substance Abuse, Family History of Depression, Chronic Medical Conditions</p>
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
            row[col] === '' || row[col] === null || row[col] === undefined || row[col] === 'NaN'
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
    const numericCols = ['Age', 'Number of Children', 'Income'];
    const categoricalCols = ['Marital Status', 'Education Level', 'Smoking Status', 
                           'Physical Activity Level', 'Employment Status', 'Alcohol Consumption',
                           'Dietary Habits', 'Sleep Patterns', 'History of Mental Illness',
                           'History of Substance Abuse', 'Family History of Depression', 
                           'Chronic Medical Conditions'];
    
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
        const values = dataset.map(row => row[col]).filter(val => !isNaN(val) && val !== '');
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
    
    // Categorical counts in a grid layout
    const categoricalStats = document.createElement('div');
    categoricalStats.innerHTML = '<h4>Categorical Variables Distribution</h4>';
    categoricalStats.className = 'grid-2';
    statsContent.appendChild(categoricalStats);
    
    categoricalCols.forEach(col => {
        const counts = {};
        dataset.forEach(row => {
            const value = row[col];
            if (value !== '' && value !== undefined && value !== null) {
                counts[value] = (counts[value] || 0) + 1;
            }
        });
        
        const catDiv = document.createElement('div');
        catDiv.innerHTML = `<h5>${col}</h5>`;
        
        const catTable = document.createElement('table');
        
        Object.entries(counts).forEach(([value, count]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${value}</td>
                <td>${count} (${((count / dataset.length) * 100).toFixed(1)}%)</td>
            `;
            catTable.appendChild(row);
        });
        
        catDiv.appendChild(catTable);
        categoricalStats.appendChild(catDiv);
    });
}

// Create visualizations
function createVisualizations() {
    vizContent.innerHTML = '<h3>Data Visualizations</h3>';
    
    // Categorical variable bar charts
    createCategoricalCharts();
    
    // Numeric variable histograms
    createHistograms();
    
    // Cross-tabulation analysis
    createCrossTabulations();
}

// Create bar charts for categorical variables
function createCategoricalCharts() {
    const categoricalVars = ['Marital Status', 'Education Level', 'Smoking Status', 
                           'Physical Activity Level', 'Employment Status', 'Alcohol Consumption',
                           'Dietary Habits', 'Sleep Patterns', 'History of Mental Illness',
                           'History of Substance Abuse', 'Family History of Depression', 
                           'Chronic Medical Conditions'];
    
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
            if (value !== '' && value !== undefined && value !== null) {
                counts[value] = (counts[value] || 0) + 1;
            }
        });
        
        const colors = [
            'rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)',
            'rgba(255, 159, 64, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 205, 86, 0.7)',
            'rgba(201, 203, 207, 0.7)', 'rgba(255, 99, 71, 0.7)', 'rgba(50, 205, 50, 0.7)'
        ];
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    label: `Count of ${variable}`,
                    data: Object.values(counts),
                    backgroundColor: colors.slice(0, Object.keys(counts).length),
                    borderColor: colors.slice(0, Object.keys(counts).length).map(color => 
                        color.replace('0.7', '1')
                    ),
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
    const numericVars = ['Age', 'Number of Children', 'Income'];
    
    numericVars.forEach(variable => {
        const section = document.createElement('div');
        section.innerHTML = `<h4>${variable} Distribution</h4>`;
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        section.appendChild(chartContainer);
        
        vizContent.appendChild(section);
        
        const ctx = document.createElement('canvas');
        chartContainer.appendChild(ctx);
        
        const values = dataset.map(row => row[variable]).filter(val => !isNaN(val) && val !== '');
        
        // Create bins for histogram
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = Math.min(15, Math.floor(values.length / 10));
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

// Create cross-tabulation analysis for key relationships
function createCrossTabulations() {
    const section = document.createElement('div');
    section.innerHTML = '<h4>Key Relationships Analysis</h4>';
    vizContent.appendChild(section);
    
    // Example cross-tab: Physical Activity vs Sleep Patterns
    createCrossTabChart('Physical Activity Level', 'Sleep Patterns', 'Physical Activity vs Sleep Quality');
    
    // Example cross-tab: Employment Status vs Income distribution
    createEmploymentIncomeChart();
    
    // Example cross-tab: Education Level vs Income
    createEducationIncomeChart();
}

function createCrossTabChart(var1, var2, title) {
    const subsection = document.createElement('div');
    subsection.innerHTML = `<h5>${title}</h5>`;
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    subsection.appendChild(chartContainer);
    
    vizContent.appendChild(subsection);
    
    const ctx = document.createElement('canvas');
    chartContainer.appendChild(ctx);
    
    // Get unique values for both variables
    const var1Values = [...new Set(dataset.map(row => row[var1]).filter(val => val))];
    const var2Values = [...new Set(dataset.map(row => row[var2]).filter(val => val))];
    
    // Create cross-tab data
    const datasets = var2Values.map((var2Val, var2Index) => {
        const data = var1Values.map(var1Val => {
            return dataset.filter(row => 
                row[var1] === var1Val && row[var2] === var2Val
            ).length;
        });
        
        return {
            label: var2Val,
            data: data,
            backgroundColor: `rgba(${75 + var2Index * 50}, ${192 - var2Index * 30}, ${192 - var2Index * 40}, 0.7)`
        };
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: var1Values,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            }
        }
    });
}

function createEmploymentIncomeChart() {
    const subsection = document.createElement('div');
    subsection.innerHTML = '<h5>Income Distribution by Employment Status</h5>';
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    subsection.appendChild(chartContainer);
    
    vizContent.appendChild(subsection);
    
    const ctx = document.createElement('canvas');
    chartContainer.appendChild(ctx);
    
    const employmentStatuses = [...new Set(dataset.map(row => row['Employment Status']).filter(val => val))];
    const incomeData = {};
    
    employmentStatuses.forEach(status => {
        const incomes = dataset
            .filter(row => row['Employment Status'] === status && row['Income'] && !isNaN(row['Income']))
            .map(row => row['Income']);
        
        if (incomes.length > 0) {
            incomeData[status] = incomes;
        }
    });
    
    const datasets = Object.entries(incomeData).map(([status, incomes], index) => {
        // Create box plot-like data (simplified)
        const sorted = [...incomes].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const median = sorted[Math.floor(sorted.length * 0.5)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        
        return {
            label: status,
            data: [Math.min(...incomes), q1, median, q3, Math.max(...incomes)],
            backgroundColor: `rgba(${54 + index * 100}, ${162 - index * 50}, ${235 - index * 100}, 0.7)`,
            borderColor: `rgba(${54 + index * 100}, ${162 - index * 50}, ${235 - index * 100}, 1)`,
            borderWidth: 1
        };
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Min', 'Q1', 'Median', 'Q3', 'Max'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Income (USD)'
                    }
                }
            }
        }
    });
}

function createEducationIncomeChart() {
    const subsection = document.createElement('div');
    subsection.innerHTML = '<h5>Average Income by Education Level</h5>';
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    subsection.appendChild(chartContainer);
    
    vizContent.appendChild(subsection);
    
    const ctx = document.createElement('canvas');
    chartContainer.appendChild(ctx);
    
    const educationLevels = ['High School', 'Associate Degree', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD'];
    const avgIncomeData = [];
    
    educationLevels.forEach(level => {
        const incomes = dataset
            .filter(row => row['Education Level'] === level && row['Income'] && !isNaN(row['Income']))
            .map(row => row['Income']);
        
        if (incomes.length > 0) {
            const avgIncome = incomes.reduce((a, b) => a + b, 0) / incomes.length;
            avgIncomeData.push(avgIncome);
        } else {
            avgIncomeData.push(0);
        }
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: educationLevels,
            datasets: [{
                label: 'Average Income',
                data: avgIncomeData,
                backgroundColor: 'rgba(153, 102, 255, 0.7)',
                borderColor: 'rgba(153, 102, 255, 1)',
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
                        text: 'Average Income (USD)'
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
        analysis: {
            description: 'Depression Dataset Exploratory Data Analysis',
            variables: {
                demographic: ['Age', 'Marital Status', 'Education Level', 'Employment Status', 'Income'],
                lifestyle: ['Smoking Status', 'Physical Activity Level', 'Alcohol Consumption', 'Dietary Habits', 'Sleep Patterns'],
                medical: ['History of Mental Illness', 'History of Substance Abuse', 'Family History of Depression', 'Chronic Medical Conditions']
            }
        },
        message: 'Depression dataset EDA results exported successfully'
    };
    
    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'depression_dataset_eda_results.json';
    link.click();
    
    alert('Depression dataset EDA results exported successfully!');
}

// Note: This EDA tool is specifically designed for depression dataset analysis
// Features include demographic analysis, lifestyle factors, and medical history exploration
