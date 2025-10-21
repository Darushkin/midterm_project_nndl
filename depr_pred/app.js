// Global variables to store data and model
let rawData = [];
let processedData = {};
let model = null;
let trainingHistory = { loss: [], accuracy: [] };
let testData = null;
let testLabels = null;
let predictions = null;
let rocData = null;

// DOM elements
const csvFileInput = document.getElementById('csvFile');
const fileLoading = document.getElementById('fileLoading');
const dataPreview = document.getElementById('dataPreview');
const datasetInfo = document.getElementById('datasetInfo');
const preprocessBtn = document.getElementById('preprocessBtn');
const preprocessingInfo = document.getElementById('preprocessingInfo');
const trainBtn = document.getElementById('trainBtn');
const trainingLoading = document.getElementById('trainingLoading');
const predictBtn = document.getElementById('predictBtn');
const predictionResult = document.getElementById('predictionResult');
const predictionInputs = document.getElementById('predictionInputs');
const exportModelBtn = document.getElementById('exportModel');
const exportDataBtn = document.getElementById('exportData');
const thresholdSlider = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const testSplitSlider = document.getElementById('testSplit');
const testSplitValue = document.getElementById('testSplitValue');

// Chart instances
let targetDistributionChart = null;
let ageDistributionChart = null;
let featureImportanceChart = null;
let trainingProgressChart = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Set up event listeners
    csvFileInput.addEventListener('change', handleFileUpload);
    preprocessBtn.addEventListener('click', preprocessData);
    trainBtn.addEventListener('click', trainModel);
    predictBtn.addEventListener('click', makePrediction);
    exportModelBtn.addEventListener('click', exportModel);
    exportDataBtn.addEventListener('click', exportPreprocessedData);
    thresholdSlider.addEventListener('input', updateThreshold);
    testSplitSlider.addEventListener('input', updateTestSplit);
    
    // Load default dataset if available
    loadDefaultDataset();
}

function loadDefaultDataset() {
    // In a real application, you might load a default dataset here
    // For now, we'll rely on user upload
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    fileLoading.classList.add('active');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            parseCSV(csvText);
        } catch (error) {
            console.error('Error parsing CSV:', error);
            alert('Error parsing CSV file. Please check the format.');
        } finally {
            fileLoading.classList.remove('active');
        }
    };
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    rawData = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        
        rawData.push(row);
    }
    
    displayDataPreview();
    displayDatasetInfo();
    generatePredictionInputs();
}

function displayDataPreview() {
    if (rawData.length === 0) {
        dataPreview.innerHTML = '<p class="text-gray-500">No data loaded</p>';
        return;
    }
    
    const headers = Object.keys(rawData[0]);
    const previewRows = rawData.slice(0, 10);
    
    let html = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    ${headers.map(header => `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    previewRows.forEach(row => {
        html += `<tr>`;
        headers.forEach(header => {
            html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row[header]}</td>`;
        });
        html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    dataPreview.innerHTML = html;
}

function displayDatasetInfo() {
    if (rawData.length === 0) {
        datasetInfo.innerHTML = '<p class="text-gray-500">No data loaded</p>';
        return;
    }
    
    const numRows = rawData.length;
    const numCols = Object.keys(rawData[0]).length;
    
    datasetInfo.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <p><strong>Dataset Shape:</strong> ${numRows} rows × ${numCols} columns</p>
            <p><strong>Target Variable:</strong> History of Mental Illness</p>
        </div>
    `;
}

function preprocessData() {
    if (rawData.length === 0) {
        alert('Please load a dataset first.');
        return;
    }
    
    preprocessingInfo.innerHTML = '<p class="text-blue-500">Preprocessing data...</p>';
    
    // Simulate processing delay
    setTimeout(() => {
        try {
            // Extract features and target
            const features = [];
            const labels = [];
            const featureNames = [];
            
            // Define categorical and numerical columns
            const categoricalColumns = [
                'Marital Status', 'Education Level', 'Smoking Status', 
                'Physical Activity Level', 'Employment Status', 'Alcohol Consumption',
                'Dietary Habits', 'Sleep Patterns', 'History of Substance Abuse',
                'Family History of Depression', 'Chronic Medical Conditions'
            ];
            
            const numericalColumns = ['Age', 'Number of Children', 'Income'];
            const targetColumn = 'History of Mental Illness';
            
            // Collect all unique values for categorical encoding
            const categoricalValues = {};
            categoricalColumns.forEach(col => {
                categoricalValues[col] = [...new Set(rawData.map(row => row[col]))];
            });
            
            // Process each row
            rawData.forEach(row => {
                const featureVector = [];
                
                // Add numerical features (normalize later)
                numericalColumns.forEach(col => {
                    featureVector.push(parseFloat(row[col]) || 0);
                });
                
                // Add categorical features (one-hot encoding)
                categoricalColumns.forEach(col => {
                    const values = categoricalValues[col];
                    const valueIndex = values.indexOf(row[col]);
                    
                    // One-hot encoding
                    for (let i = 0; i < values.length; i++) {
                        featureVector.push(i === valueIndex ? 1 : 0);
                    }
                });
                
                features.push(featureVector);
                labels.push(row[targetColumn] === 'Yes' ? 1 : 0);
            });
            
            // Build feature names for reference
            numericalColumns.forEach(col => featureNames.push(col));
            categoricalColumns.forEach(col => {
                const values = categoricalValues[col];
                values.forEach(val => featureNames.push(`${col}_${val}`));
            });
            
            // Normalize numerical features
            const normalizedFeatures = normalizeFeatures(features, numericalColumns.length);
            
            // Split data
            const testSplit = parseFloat(testSplitSlider.value);
            const splitIndex = Math.floor(normalizedFeatures.length * (1 - testSplit));
            
            const trainFeatures = normalizedFeatures.slice(0, splitIndex);
            const trainLabels = labels.slice(0, splitIndex);
            testData = normalizedFeatures.slice(splitIndex);
            testLabels = labels.slice(splitIndex);
            
            processedData = {
                features: trainFeatures,
                labels: trainLabels,
                testFeatures: testData,
                testLabels: testLabels,
                featureNames: featureNames,
                categoricalValues: categoricalValues,
                numericalColumns: numericalColumns,
                categoricalColumns: categoricalColumns
            };
            
            preprocessingInfo.innerHTML = `
                <div class="bg-green-50 p-4 rounded-lg">
                    <p><strong>Preprocessing Complete</strong></p>
                    <p>Training samples: ${trainFeatures.length}</p>
                    <p>Test samples: ${testData.length}</p>
                    <p>Features: ${featureNames.length}</p>
                </div>
            `;
            
            // Update EDA charts
            updateEDAVisualizations();
            
        } catch (error) {
            console.error('Error preprocessing data:', error);
            preprocessingInfo.innerHTML = `<p class="text-red-500">Error preprocessing data: ${error.message}</p>`;
        }
    }, 500);
}

function normalizeFeatures(features, numNumerical) {
    // Simple min-max normalization for numerical features
    const normalized = [];
    const numFeatures = features[0].length;
    
    // Calculate min and max for each numerical feature
    const mins = new Array(numNumerical).fill(Infinity);
    const maxs = new Array(numNumerical).fill(-Infinity);
    
    features.forEach(featureVector => {
        for (let i = 0; i < numNumerical; i++) {
            mins[i] = Math.min(mins[i], featureVector[i]);
            maxs[i] = Math.max(maxs[i], featureVector[i]);
        }
    });
    
    // Apply normalization
    features.forEach(featureVector => {
        const normalizedVector = [];
        for (let i = 0; i < numNumerical; i++) {
            const range = maxs[i] - mins[i];
            if (range === 0) {
                normalizedVector.push(0);
            } else {
                normalizedVector.push((featureVector[i] - mins[i]) / range);
            }
        }
        // Add categorical features as-is (already 0/1)
        for (let i = numNumerical; i < numFeatures; i++) {
            normalizedVector.push(featureVector[i]);
        }
        normalized.push(normalizedVector);
    });
    
    return normalized;
}

function updateEDAVisualizations() {
    if (rawData.length === 0) return;
    
    // Target distribution
    updateTargetDistribution();
    
    // Age distribution
    updateAgeDistribution();
    
    // Feature importance (simulated)
    updateFeatureImportance();
    
    // Correlation matrix
    updateCorrelationMatrix();
}

function updateTargetDistribution() {
    const targetCounts = {
        'Yes': rawData.filter(row => row['History of Mental Illness'] === 'Yes').length,
        'No': rawData.filter(row => row['History of Mental Illness'] === 'No').length
    };
    
    const ctx = document.getElementById('targetDistribution').getContext('2d');
    
    if (targetDistributionChart) {
        targetDistributionChart.destroy();
    }
    
    targetDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Yes', 'No'],
            datasets: [{
                data: [targetCounts.Yes, targetCounts.No],
                backgroundColor: ['#ff6384', '#36a2eb']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateAgeDistribution() {
    const ages = rawData.map(row => parseInt(row.Age)).filter(age => !isNaN(age));
    
    const ctx = document.getElementById('ageDistribution').getContext('2d');
    
    if (ageDistributionChart) {
        ageDistributionChart.destroy();
    }
    
    ageDistributionChart = new Chart(ctx, {
        type: 'histogram',
        data: {
            labels: Array.from({length: 10}, (_, i) => `${i*10}-${(i+1)*10}`),
            datasets: [{
                label: 'Age Distribution',
                data: calculateHistogram(ages, 10),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function calculateHistogram(data, bins) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / bins;
    const histogram = new Array(bins).fill(0);
    
    data.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
        histogram[binIndex]++;
    });
    
    return histogram;
}

function updateFeatureImportance() {
    // Simulated feature importance (in a real app, calculate using mutual information)
    const featureNames = processedData.featureNames || [];
    const importance = featureNames.map((_, index) => 
        Math.random() * 0.8 + 0.2 // Random values between 0.2 and 1.0
    );
    
    // Sort by importance
    const sortedIndices = importance.map((_, index) => index)
        .sort((a, b) => importance[b] - importance[a])
        .slice(0, 10); // Top 10 features
    
    const ctx = document.getElementById('featureImportance').getContext('2d');
    
    if (featureImportanceChart) {
        featureImportanceChart.destroy();
    }
    
    featureImportanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedIndices.map(i => featureNames[i].substring(0, 20) + (featureNames[i].length > 20 ? '...' : '')),
            datasets: [{
                label: 'Feature Importance',
                data: sortedIndices.map(i => importance[i]),
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateCorrelationMatrix() {
    // Simplified correlation matrix (in a real app, calculate actual correlations)
    const container = document.getElementById('correlationMatrix');
    const featureNames = processedData.featureNames || [];
    const numFeatures = Math.min(8, featureNames.length); // Show top 8 features
    
    // Generate random correlation matrix
    const correlations = [];
    for (let i = 0; i < numFeatures; i++) {
        const row = [];
        for (let j = 0; j < numFeatures; j++) {
            if (i === j) {
                row.push(1);
            } else {
                row.push(Math.random() * 2 - 1); // Random between -1 and 1
            }
        }
        correlations.push(row);
    }
    
    const data = [{
        z: correlations,
        x: featureNames.slice(0, numFeatures),
        y: featureNames.slice(0, numFeatures),
        type: 'heatmap',
        colorscale: 'RdBu',
        zmin: -1,
        zmax: 1
    }];
    
    const layout = {
        title: 'Feature Correlation Matrix',
        height: 300,
        margin: { l: 100, r: 50, b: 100, t: 50 }
    };
    
    Plotly.newPlot(container, data, layout, { responsive: true });
}

async function trainModel() {
    if (!processedData.features || processedData.features.length === 0) {
        alert('Please preprocess the data first.');
        return;
    }
    
    trainingLoading.classList.add('active');
    trainBtn.disabled = true;
    
    try {
        // Convert data to tensors
        const trainFeaturesTensor = tf.tensor2d(processedData.features);
        const trainLabelsTensor = tf.tensor1d(processedData.labels);
        const testFeaturesTensor = tf.tensor2d(processedData.testFeatures);
        const testLabelsTensor = tf.tensor1d(processedData.testLabels);
        
        // Get hyperparameters
        const hidden1 = parseInt(document.getElementById('hidden1').value);
        const hidden2 = parseInt(document.getElementById('hidden2').value);
        const learningRate = parseFloat(document.getElementById('learningRate').value);
        const epochs = parseInt(document.getElementById('epochs').value);
        
        // Create model
        model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [processedData.features[0].length],
                    units: hidden1,
                    activation: 'relu'
                }),
                tf.layers.dense({
                    units: hidden2,
                    activation: 'relu'
                }),
                tf.layers.dense({
                    units: 1,
                    activation: 'sigmoid'
                })
            ]
        });
        
        // Compile model
        model.compile({
            optimizer: tf.train.adam(learningRate),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        // Initialize training chart
        initTrainingChart();
        
        // Train model
        trainingHistory = { loss: [], accuracy: [] };
        
        await model.fit(trainFeaturesTensor, trainLabelsTensor, {
            epochs: epochs,
            batchSize: 32,
            validationData: [testFeaturesTensor, testLabelsTensor],
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    trainingHistory.loss.push(logs.loss);
                    trainingHistory.accuracy.push(logs.acc);
                    updateTrainingChart();
                }
            }
        });
        
        // Make predictions on test set
        predictions = model.predict(testFeaturesTensor);
        const predArray = await predictions.data();
        
        // Calculate metrics
        calculateMetrics(predArray, processedData.testLabels);
        
        // Generate ROC curve data
        generateROCData(predArray, processedData.testLabels);
        
        trainingLoading.classList.remove('active');
        trainBtn.disabled = false;
        
    } catch (error) {
        console.error('Error training model:', error);
        alert('Error training model: ' + error.message);
        trainingLoading.classList.remove('active');
        trainBtn.disabled = false;
    }
}

function initTrainingChart() {
    const ctx = document.getElementById('trainingProgress').getContext('2d');
    
    if (trainingProgressChart) {
        trainingProgressChart.destroy();
    }
    
    trainingProgressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Training Loss',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    yAxisID: 'y'
                },
                {
                    label: 'Training Accuracy',
                    data: [],
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Epoch'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Loss'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Accuracy'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    min: 0,
                    max: 1
                }
            }
        }
    });
}

function updateTrainingChart() {
    if (!trainingProgressChart) return;
    
    const epochs = trainingHistory.loss.map((_, i) => i + 1);
    
    trainingProgressChart.data.labels = epochs;
    trainingProgressChart.data.datasets[0].data = trainingHistory.loss;
    trainingProgressChart.data.datasets[1].data = trainingHistory.accuracy;
    trainingProgressChart.update();
}

function calculateMetrics(predictions, trueLabels) {
    const threshold = parseFloat(thresholdSlider.value);
    const binaryPredictions = predictions.map(p => p >= threshold ? 1 : 0);
    
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    
    for (let i = 0; i < binaryPredictions.length; i++) {
        if (binaryPredictions[i] === 1 && trueLabels[i] === 1) truePositives++;
        else if (binaryPredictions[i] === 1 && trueLabels[i] === 0) falsePositives++;
        else if (binaryPredictions[i] === 0 && trueLabels[i] === 0) trueNegatives++;
        else if (binaryPredictions[i] === 0 && trueLabels[i] === 1) falseNegatives++;
    }
    
    const accuracy = (truePositives + trueNegatives) / (truePositives + trueNegatives + falsePositives + falseNegatives);
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;
    
    document.getElementById('accuracy').textContent = accuracy.toFixed(3);
    document.getElementById('precision').textContent = precision.toFixed(3);
    document.getElementById('recall').textContent = recall.toFixed(3);
    document.getElementById('f1').textContent = f1.toFixed(3);
}

function generateROCData(predictions, trueLabels) {
    const thresholds = Array.from({length: 101}, (_, i) => i / 100);
    const tpr = []; // True Positive Rate (Recall)
    const fpr = []; // False Positive Rate
    
    thresholds.forEach(threshold => {
        const binaryPredictions = predictions.map(p => p >= threshold ? 1 : 0);
        
        let truePositives = 0;
        let falsePositives = 0;
        let actualPositives = trueLabels.filter(label => label === 1).length;
        let actualNegatives = trueLabels.filter(label => label === 0).length;
        
        for (let i = 0; i < binaryPredictions.length; i++) {
            if (binaryPredictions[i] === 1 && trueLabels[i] === 1) truePositives++;
            else if (binaryPredictions[i] === 1 && trueLabels[i] === 0) falsePositives++;
        }
        
        tpr.push(truePositives / actualPositives);
        fpr.push(falsePositives / actualNegatives);
    });
    
    rocData = { tpr, fpr, thresholds };
    updateROCChart();
}

function updateROCChart() {
    if (!rocData) return;
    
    const container = document.getElementById('rocCurve');
    const threshold = parseFloat(thresholdSlider.value);
    const thresholdIndex = Math.round(threshold * 100);
    
    const rocTrace = {
        x: rocData.fpr,
        y: rocData.tpr,
        mode: 'lines',
        name: 'ROC Curve',
        line: { color: 'blue' }
    };
    
    const thresholdTrace = {
        x: [rocData.fpr[thresholdIndex]],
        y: [rocData.tpr[thresholdIndex]],
        mode: 'markers',
        name: `Threshold: ${threshold.toFixed(2)}`,
        marker: { size: 10, color: 'red' }
    };
    
    const diagonalTrace = {
        x: [0, 1],
        y: [0, 1],
        mode: 'lines',
        name: 'Random Classifier',
        line: { dash: 'dash', color: 'gray' }
    };
    
    const data = [rocTrace, thresholdTrace, diagonalTrace];
    
    const layout = {
        title: 'ROC Curve',
        xaxis: { title: 'False Positive Rate' },
        yaxis: { title: 'True Positive Rate' },
        height: 300,
        margin: { l: 50, r: 50, b: 50, t: 50 }
    };
    
    Plotly.newPlot(container,
