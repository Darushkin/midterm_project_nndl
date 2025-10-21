// app.js
class MentalHealthEDA {
    constructor() {
        this.data = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('loadBtn').addEventListener('click', () => this.loadData());
        document.getElementById('edaBtn').addEventListener('click', () => this.runEDA());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());
    }

    async loadData() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a CSV file first.');
            return;
        }

        try {
            const text = await this.readFile(file);
            this.data = this.parseCSV(text);
            this.enableButtons(true);
            this.showOverview();
        } catch (error) {
            alert('Error loading file: ' + error.message);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('File reading failed'));
            reader.readAsText(file);
        });
    }

    parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            return row;
        });
    }

    enableButtons(enabled) {
        document.getElementById('edaBtn').disabled = !enabled;
        document.getElementById('exportBtn').disabled = !enabled;
    }

    showOverview() {
        const content = document.getElementById('overviewContent');
        if (!this.data || this.data.length === 0) {
            content.innerHTML = '<p>No data loaded.</p>';
            return;
        }

        const shape = `${this.data.length} rows × ${Object.keys(this.data[0]).length} columns`;
        
        let tableHtml = '<h3>Data Preview (First 5 rows)</h3>';
        tableHtml += '<table><tr>';
        
        // Headers
        Object.keys(this.data[0]).forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr>';
        
        // First 5 rows
        this.data.slice(0, 5).forEach(row => {
            tableHtml += '<tr>';
            Object.values(row).forEach(value => {
                tableHtml += `<td>${value}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</table>';
        
        content.innerHTML = `<p><strong>Dataset Shape:</strong> ${shape}</p>${tableHtml}`;
    }

    runEDA() {
        if (!this.data) {
            alert('Please load data first.');
            return;
        }

        this.analyzeMissingValues();
        this.generateStatsSummary();
        this.createVisualizations();
    }

    analyzeMissingValues() {
        const content = document.getElementById('missingContent');
        const headers = Object.keys(this.data[0]);
        
        const missingCounts = headers.map(header => {
            const missing = this.data.filter(row => !row[header] || row[header] === '').length;
            const percentage = (missing / this.data.length * 100).toFixed(2);
            return { header, missing, percentage };
        });

        // Create bar chart
        const canvas = document.createElement('canvas');
        canvas.id = 'missingChart';
        content.innerHTML = '<h3>Missing Values Percentage by Column</h3>';
        content.appendChild(canvas);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: missingCounts.map(item => item.header),
                datasets: [{
                    label: 'Missing Values (%)',
                    data: missingCounts.map(item => parseFloat(item.percentage)),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Percentage (%)' }
                    },
                    x: {
                        ticks: { maxRotation: 45 }
                    }
                }
            }
        });
    }

    generateStatsSummary() {
        const content = document.getElementById('statsContent');
        if (!this.data) return;

        // Define schema - UPDATE THESE FOR OTHER DATASETS
        const numericColumns = ['Age', 'Number of Children', 'Income'];
        const categoricalColumns = [
            'Marital Status', 'Education Level', 'Smoking Status', 
            'Physical Activity Level', 'Employment Status', 'Alcohol Consumption',
            'Dietary Habits', 'Sleep Patterns', 'History of Substance Abuse',
            'Family History of Depression', 'Chronic Medical Conditions', 'History of Mental Illness'
        ];

        let statsHtml = '<h3>Numeric Statistics</h3>';
        statsHtml += this.generateNumericStats(numericColumns);
        
        statsHtml += '<h3>Categorical Counts</h3>';
        statsHtml += this.generateCategoricalStats(categoricalColumns);
        
        statsHtml += '<h3>Statistics by Mental Illness History</h3>';
        statsHtml += this.generateGroupedStats();

        content.innerHTML = statsHtml;
    }

    generateNumericStats(columns) {
        let html = '<table><tr><th>Column</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th></tr>';
        
        columns.forEach(col => {
            const values = this.data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
            if (values.length === 0) return;
            
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const sorted = [...values].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            html += `<tr>
                <td>${col}</td>
                <td>${mean.toFixed(2)}</td>
                <td>${median.toFixed(2)}</td>
                <td>${std.toFixed(2)}</td>
                <td>${min}</td>
                <td>${max}</td>
            </tr>`;
        });
        
        html += '</table>';
        return html;
    }

    generateCategoricalStats(columns) {
        let html = '';
        
        columns.forEach(col => {
            const counts = {};
            this.data.forEach(row => {
                const value = row[col];
                counts[value] = (counts[value] || 0) + 1;
            });
            
            html += `<h4>${col}</h4><table><tr><th>Value</th><th>Count</th><th>Percentage</th></tr>`;
            Object.entries(counts).forEach(([value, count]) => {
                const percentage = ((count / this.data.length) * 100).toFixed(2);
                html += `<tr><td>${value}</td><td>${count}</td><td>${percentage}%</td></tr>`;
            });
            html += '</table>';
        });
        
        return html;
    }

    generateGroupedStats() {
        if (!this.data.some(row => row['History of Mental Illness'])) {
            return '<p>No mental illness history data available for grouping.</p>';
        }

        const groups = {};
        this.data.forEach(row => {
            const group = row['History of Mental Illness'] || 'Unknown';
            if (!groups[group]) groups[group] = [];
            groups[group].push(row);
        });

        let html = '';
        Object.entries(groups).forEach(([group, data]) => {
            html += `<h4>${group} (n=${data.length})</h4>`;
            
            // Average age and income by group
            const avgAge = data.reduce((sum, row) => sum + parseFloat(row.Age || 0), 0) / data.length;
            const avgIncome = data.reduce((sum, row) => sum + parseFloat(row.Income || 0), 0) / data.length;
            
            html += `<p>Average Age: ${avgAge.toFixed(2)}, Average Income: $${avgIncome.toFixed(2)}</p>`;
            
            // Key categorical distributions
            const keyColumns = ['Employment Status', 'Physical Activity Level', 'Family History of Depression'];
            keyColumns.forEach(col => {
                const counts = {};
                data.forEach(row => {
                    const value = row[col];
                    counts[value] = (counts[value] || 0) + 1;
                });
                
                html += `<p><strong>${col}:</strong> ${Object.entries(counts)
                    .map(([k, v]) => `${k} (${v})`)
                    .join(', ')}</p>`;
            });
        });
        
        return html;
    }

    createVisualizations() {
        const content = document.getElementById('vizContent');
        content.innerHTML = '<h3>Distribution Charts</h3>';
        
        // Categorical variable charts
        const categoricalVars = [
            'Marital Status', 'Education Level', 'Smoking Status', 
            'Physical Activity Level', 'Employment Status', 'Alcohol Consumption',
            'Dietary Habits', 'Sleep Patterns', 'History of Substance Abuse',
            'Family History of Depression', 'Chronic Medical Conditions'
        ];
        
        categoricalVars.forEach(variable => {
            this.createBarChart(variable, content);
        });
        
        // Numeric variable histograms
        const numericVars = ['Age', 'Number of Children', 'Income'];
        numericVars.forEach(variable => {
            this.createHistogram(variable, content);
        });
        
        // Correlation matrix
        this.createCorrelationMatrix(content);
    }

    createBarChart(variable, container) {
        const counts = {};
        this.data.forEach(row => {
            const value = row[variable];
            counts[value] = (counts[value] || 0) + 1;
        });
        
        const canvas = document.createElement('canvas');
        canvas.className = 'chart-container';
        container.appendChild(document.createElement('h4')).textContent = variable;
        container.appendChild(canvas);
        
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    label: `Count of ${variable}`,
                    data: Object.values(counts),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: variable }
                }
            }
        });
    }

    createHistogram(variable, container) {
        const values = this.data.map(row => parseFloat(row[variable])).filter(v => !isNaN(v));
        if (values.length === 0) return;
        
        const canvas = document.createElement('canvas');
        canvas.className = 'chart-container';
        container.appendChild(document.createElement('h4')).textContent = `${variable} Distribution`;
        container.appendChild(canvas);
        
        // Simple histogram using bar chart
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const binCount = Math.min(10, Math.sqrt(values.length));
        const binSize = range / binCount;
        
        const bins = Array(binCount).fill(0);
        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
            bins[binIndex]++;
        });
        
        const labels = Array(binCount).fill(0).map((_, i) => 
            `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`
        );
        
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Frequency of ${variable}`,
                    data: bins,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: `${variable} Histogram` }
                }
            }
        });
    }

    createCorrelationMatrix(container) {
        const numericColumns = ['Age', 'Number of Children', 'Income'];
        const matrix = this.calculateCorrelationMatrix(numericColumns);
        
        const canvas = document.createElement('canvas');
        canvas.className = 'chart-container';
        container.appendChild(document.createElement('h4')).textContent = 'Correlation Matrix';
        container.appendChild(canvas);
        
        new Chart(canvas, {
            type: 'bar', // Using bar chart as simple alternative to heatmap
            data: {
                labels: numericColumns,
                datasets: numericColumns.map((col, i) => ({
                    label: col,
                    data: matrix[i],
                    backgroundColor: `rgba(${100 + i * 50}, 162, 235, 0.6)`
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Correlation Matrix (Bar Chart Representation)' }
                }
            }
        });
    }

    calculateCorrelationMatrix(columns) {
        const matrix = [];
        
        for (let i = 0; i < columns.length; i++) {
            matrix[i] = [];
            for (let j = 0; j < columns.length; j++) {
                if (i === j) {
                    matrix[i][j] = 1;
                } else {
                    const corr = this.calculateCorrelation(columns[i], columns[j]);
                    matrix[i][j] = corr;
                }
            }
        }
        
        return matrix;
    }

    calculateCorrelation(col1, col2) {
        const values1 = this.data.map(row => parseFloat(row[col1])).filter(v => !isNaN(v));
        const values2 = this.data.map(row => parseFloat(row[col2])).filter(v => !isNaN(v));
        
        if (values1.length !== values2.length || values1.length === 0) return 0;
        
        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
        
        let numerator = 0;
        let denom1 = 0;
        let denom2 = 0;
        
        for (let i = 0; i < values1.length; i++) {
            numerator += (values1[i] - mean1) * (values2[i] - mean2);
            denom1 += Math.pow(values1[i] - mean1, 2);
            denom2 += Math.pow(values2[i] - mean2, 2);
        }
        
        return numerator / Math.sqrt(denom1 * denom2);
    }

    exportResults() {
        if (!this.data) {
            alert('No data to export.');
            return;
        }

        // Create a simple report
        let report = 'Mental Health EDA Report\n\n';
        report += `Generated on: ${new Date().toLocaleString()}\n`;
        report += `Dataset size: ${this.data.length} rows\n\n`;
        
        // Add basic statistics to report
        report += 'SUMMARY STATISTICS:\n';
        const numericCols = ['Age', 'Number of Children', 'Income'];
        numericCols.forEach(col => {
            const values = this.data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
            if (values.length > 0) {
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                report += `${col}: Mean = ${mean.toFixed(2)}\n`;
            }
        });
        
        // Create downloadable file
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mental_health_eda_report.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MentalHealthEDA();
});
