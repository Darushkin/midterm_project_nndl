class PredictiveMaintenanceModel {
    constructor() {
        this.model = null;
        this.isTrained = false;
        this.csvData = null;
        this.dataStats = null;
        this.trainingHistory = {
            loss: [],
            accuracy: [],
            valLoss: [],
            valAccuracy: []
        };
        this.chart = null;
    }

    async createModel() {
        this.model = tf.sequential();
        
        // Input layer
        this.model.add(tf.layers.dense({
            units: 64,
            activation: 'relu',
            inputShape: [6]
        }));
        
        // Hidden layers with dropout for regularization
        this.model.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));
        
        this.model.add(tf.layers.dropout({ rate: 0.3 }));
        
        this.model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        
        // Output layer - binary classification (failure or no failure)
        this.model.add(tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
        }));

        // Compile the model
        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        console.log('Neural Network model created successfully');
    }

    loadCSVData(csvText) {
        this.csvData = csvText;
        return this.analyzeDataset();
    }

    analyzeDataset() {
        if (!this.csvData) {
            throw new Error('No CSV data loaded');
        }

        const lines = this.csvData.split('\n').slice(1).filter(line => line.trim());
        const stats = {
            totalSamples: 0,
            failureSamples: 0,
            nonFailureSamples: 0,
            failureRate: 0,
            features: {}
        };

        const typeMap = { 'L': 0, 'M': 1, 'H': 2 };
        let featureSums = [0, 0, 0, 0, 0, 0];
        let featureCounts = [0, 0, 0, 0, 0, 0];

        lines.forEach(line => {
            const columns = line.split(',');
            if (columns.length >= 9) {
                const type = typeMap[columns[2]] || 0;
                const airTemp = parseFloat(columns[3]);
                const processTemp = parseFloat(columns[4]);
                const rotationalSpeed = parseFloat(columns[5]);
                const torque = parseFloat(columns[6]);
                const toolWear = parseFloat(columns[7]);
                const failure = parseInt(columns[8]);

                if (!isNaN(airTemp) && !isNaN(processTemp) && !isNaN(rotationalSpeed) && 
                    !isNaN(torque) && !isNaN(toolWear) && !isNaN(failure)) {
                    
                    stats.totalSamples++;
                    if (failure === 1) {
                        stats.failureSamples++;
                    } else {
                        stats.nonFailureSamples++;
                    }

                    // Collect feature stats
                    const features = [type, airTemp, processTemp, rotationalSpeed, torque, toolWear];
                    features.forEach((feature, index) => {
                        if (!isNaN(feature)) {
                            featureSums[index] += feature;
                            featureCounts[index]++;
                        }
                    });
                }
            }
        });

        stats.failureRate = (stats.failureSamples / stats.totalSamples) * 100;
        
        // Calculate feature averages
        stats.features = {
            type: featureSums[0] / featureCounts[0],
            airTemp: featureSums[1] / featureCounts[1],
            processTemp: featureSums[2] / featureCounts[2],
            rotationalSpeed: featureSums[3] / featureCounts[3],
            torque: featureSums[4] / featureCounts[4],
            toolWear: featureSums[5] / featureCounts[5]
        };

        this.dataStats = stats;
        return stats;
    }

    preprocessData() {
        if (!this.csvData) {
            throw new Error('No CSV data loaded');
        }

        const lines = this.csvData.split('\n').slice(1).filter(line => line.trim());
        const features = [];
        const labels = [];
        
        const typeMap = { 'L': 0, 'M': 1, 'H': 2 };

        lines.forEach(line => {
            const columns = line.split(',');
            if (columns.length >= 9) {
                const type = typeMap[columns[2]] || 0;
                const airTemp = parseFloat(columns[3]);
                const processTemp = parseFloat(columns[4]);
                const rotationalSpeed = parseFloat(columns[5]);
                const torque = parseFloat(columns[6]);
                const toolWear = parseFloat(columns[7]);
                const failure = parseInt(columns[8]);
                
                if (!isNaN(airTemp) && !isNaN(processTemp) && !isNaN(rotationalSpeed) && 
                    !isNaN(torque) && !isNaN(toolWear) && !isNaN(failure)) {
                    
                    features.push([type, airTemp, processTemp, rotationalSpeed, torque, toolWear]);
                    labels.push(failure);
                }
            }
        });

        return {
            features: tf.tensor2d(features),
            labels: tf.tensor1d(labels)
        };
    }

    async trainModel(epochs = 100) {
        if (!this.model) {
            await this.createModel();
        }

        if (!this.csvData) {
            throw new Error('Please upload a CSV file first');
        }

        const trainingStatus = document.getElementById('trainingStatus');
        trainingStatus.innerHTML = 'Preprocessing data...';

        try {
            const { features, labels } = this.preprocessData();

            console.log(`Training on ${features.shape[0]} samples`);
            trainingStatus.innerHTML = `Training neural network on ${features.shape[0]} samples...`;

            // Normalize features
            const { mean, variance } = tf.moments(features, 0);
            this.normalizationParams = { mean, variance };
            const normalizedFeatures = features.sub(mean).div(variance.sqrt().add(1e-7));

            // Shuffle and split data
            const indices = tf.util.createShuffledIndices(features.shape[0]);
            const splitIndex = Math.floor(features.shape[0] * 0.8);
            
            const trainIndices = indices.slice(0, splitIndex);
            const valIndices = indices.slice(splitIndex);

            const trainFeatures = this.gatherTensor(normalizedFeatures, trainIndices);
            const trainLabels = this.gatherTensor(labels, trainIndices);
            const valFeatures = this.gatherTensor(normalizedFeatures, valIndices);
            const valLabels = this.gatherTensor(labels, valIndices);

            // Training with early stopping
            let bestValLoss = Infinity;
            let patience = 10;
            let patienceCounter = 0;

            const history = await this.model.fit(trainFeatures, trainLabels, {
                epochs: epochs,
                validationData: [valFeatures, valLabels],
                batchSize: 32,
                callbacks: {
                    onEpochEnd: async (epoch, logs) => {
                        this.trainingHistory.loss.push(logs.loss);
                        this.trainingHistory.accuracy.push(logs.acc);
                        this.trainingHistory.valLoss.push(logs.val_loss);
                        this.trainingHistory.valAccuracy.push(logs.val_acc);
                        
                        this.updateTrainingChart();
                        
                        // Early stopping
                        if (logs.val_loss < bestValLoss) {
                            bestValLoss = logs.val_loss;
                            patienceCounter = 0;
                        } else {
                            patienceCounter++;
                        }
                        
                        const status = 
                            `Epoch ${epoch + 1}/${epochs} - ` +
                            `Loss: ${logs.loss.toFixed(4)}, Acc: ${(logs.acc * 100).toFixed(2)}% | ` +
                            `Val Loss: ${logs.val_loss.toFixed(4)}, Val Acc: ${(logs.val_acc * 100).toFixed(2)}%` +
                            (patienceCounter > 0 ? ` (No improvement: ${patienceCounter}/${patience})` : '');
                        
                        trainingStatus.innerHTML = status;
                        
                        if (patienceCounter >= patience) {
                            this.model.stopTraining = true;
                            trainingStatus.innerHTML += '<br>🛑 Early stopping triggered!';
                        }
                    }
                }
            });

            this.isTrained = true;
            document.getElementById('predictBtn').disabled = false;
            
            const finalAccuracy = history.history.acc[history.history.acc.length - 1] * 100;
            const finalValAccuracy = history.history.val_acc[history.history.val_acc.length - 1] * 100;
            
            trainingStatus.innerHTML = 
                `<span class="safe">✅ Training completed!<br>
                 Final Accuracy: ${finalAccuracy.toFixed(2)}% | 
                 Validation Accuracy: ${finalValAccuracy.toFixed(2)}%<br>
                 Model is ready for predictions!</span>`;

            // Clean up
            tf.dispose([features, labels, normalizedFeatures, trainFeatures, trainLabels, valFeatures, valLabels]);

        } catch (error) {
            trainingStatus.innerHTML = `<span class="danger">❌ Error during training: ${error.message}</span>`;
            console.error('Training error:', error);
        }
    }

    gatherTensor(tensor, indices) {
        return tf.tidy(() => {
            return tf.gather(tensor, indices);
        });
    }

    async predictFailure(inputData) {
        if (!this.isTrained || !this.model) {
            throw new Error('Model not trained yet. Please train the model first.');
        }

        if (!this.normalizationParams) {
            throw new Error('Normalization parameters not found. Please retrain the model.');
        }

        return tf.tidy(() => {
            const inputTensor = tf.tensor2d([inputData]);
            const normalizedInput = inputTensor.sub(this.normalizationParams.mean)
                                             .div(this.normalizationParams.variance.sqrt().add(1e-7));
            const prediction = this.model.predict(normalizedInput);
            return prediction.dataSync()[0];
        });
    }

    updateTrainingChart() {
        const ctx = document.getElementById('trainingChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: this.trainingHistory.loss.length}, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Training Loss',
                        data: this.trainingHistory.loss,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        yAxisID: 'y',
                    },
                    {
                        label: 'Validation Loss',
                        data: this.trainingHistory.valLoss,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        yAxisID: 'y',
                    },
                    {
                        label: 'Training Accuracy',
                        data: this.trainingHistory.accuracy.map(acc => acc * 100),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        yAxisID: 'y1',
                    },
                    {
                        label: 'Validation Accuracy',
                        data: this.trainingHistory.valAccuracy.map(acc => acc * 100),
                        borderColor: 'rgb(153, 102, 255)',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        yAxisID: 'y1',
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
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
                            text: 'Accuracy (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }
}

// Initialize the application
const predictiveModel = new PredictiveMaintenanceModel();

// Event listeners
document.getElementById('csvFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `📄 <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB) - Loading...`;
        
        try {
            const text = await file.text();
            const stats = predictiveModel.loadCSVData(text);
            
            fileInfo.innerHTML = 
                `✅ <strong>${file.name}</strong> loaded successfully!<br>
                 📊 Dataset: ${stats.totalSamples} samples, ${stats.failureRate.toFixed(2)}% failure rate`;
            
            document.getElementById('analyzeBtn').disabled = false;
            document.getElementById('trainBtn').disabled = false;
            
            // Update data analysis display
            document.getElementById('dataAnalysis').innerHTML = `
                <p><strong>Dataset Summary:</strong></p>
                <ul>
                    <li>Total Samples: ${stats.totalSamples}</li>
                    <li>Failure Cases: ${stats.failureSamples} (${stats.failureRate.toFixed(2)}%)</li>
                    <li>Non-Failure Cases: ${stats.nonFailureSamples}</li>
                </ul>
                <p><strong>Feature Averages:</strong></p>
                <ul>
                    <li>Air Temperature: ${stats.features.airTemp.toFixed(2)} K</li>
                    <li>Process Temperature: ${stats.features.processTemp.toFixed(2)} K</li>
                    <li>Rotational Speed: ${stats.features.rotationalSpeed.toFixed(0)} rpm</li>
                    <li>Torque: ${stats.features.torque.toFixed(2)} Nm</li>
                    <li>Tool Wear: ${stats.features.toolWear.toFixed(0)} min</li>
                </ul>
            `;
            
        } catch (error) {
            fileInfo.innerHTML = `<span class="danger">❌ Error loading file: ${error.message}</span>`;
        }
    }
});

document.getElementById('analyzeBtn').addEventListener('click', () => {
    if (predictiveModel.dataStats) {
        const stats = predictiveModel.dataStats;
        alert(`Dataset Analysis:\n\n` +
              `Total Samples: ${stats.totalSamples}\n` +
              `Failure Rate: ${stats.failureRate.toFixed(2)}%\n` +
              `Failure Cases: ${stats.failureSamples}\n` +
              `Non-Failure Cases: ${stats.nonFailureSamples}`);
    }
});

document.getElementById('trainBtn').addEventListener('click', async () => {
    const epochs = parseInt(document.getElementById('epochs').value) || 100;
    await predictiveModel.trainModel(epochs);
});

document.getElementById('predictBtn').addEventListener('click', async () => {
    const type = parseInt(document.getElementById('type').value);
    const airTemp = parseFloat(document.getElementById('airTemp').value);
    const processTemp = parseFloat(document.getElementById('processTemp').value);
    const rotationalSpeed = parseFloat(document.getElementById('rotationalSpeed').value);
    const torque = parseFloat(document.getElementById('torque').value);
    const toolWear = parseFloat(document.getElementById('toolWear').value);

    try {
        const probability = await predictiveModel.predictFailure([
            type, airTemp, processTemp, rotationalSpeed, torque, toolWear
        ]);

        const resultElement = document.getElementById('predictionResult');
        const percentage = (probability * 100).toFixed(2);

        if (probability < 0.3) {
            resultElement.innerHTML = `<span class="safe">✅ LOW RISK (${percentage}% failure probability)</span>`;
        } else if (probability < 0.7) {
            resultElement.innerHTML = `<span class="warning">⚠️ MEDIUM RISK (${percentage}% failure probability)</span>`;
        } else {
            resultElement.innerHTML = `<span class="danger">🚨 HIGH RISK (${percentage}% failure probability)</span>`;
        }

    } catch (error) {
        document.getElementById('predictionResult').innerHTML = 
            `<span class="danger">❌ Error: ${error.message}</span>`;
    }
});

// Initialize chart on load
window.addEventListener('load', () => {
    predictiveModel.updateTrainingChart();
});
