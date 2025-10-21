// =======================
// Global Variables
// =======================
let rawData = [];
let processedData = { X: null, y: null };
let model = null;
let featureNames = [];
let scaler = { min: {}, max: {} };
let categoricalMaps = {};

// =======================
// CSV Upload & Preview
// =======================
document.getElementById('csvFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function(results) {
      rawData = results.data;
      displayPreview(rawData);
    }
  });
});

function displayPreview(data) {
  const previewRows = data.slice(0, 5);
  let html = '<table class="table-auto border-collapse border border-gray-300">';
  html += '<tr>' + Object.keys(previewRows[0]).map(col => `<th class="border px-2 py-1">${col}</th>`).join('') + '</tr>';
  previewRows.forEach(row => {
    html += '<tr>' + Object.values(row).map(val => `<td class="border px-2 py-1">${val}</td>`).join('') + '</tr>';
  });
  html += '</table>';
  document.getElementById('dataPreview').innerHTML = html;
  document.getElementById('dataShape').textContent = `Dataset Shape: ${data.length} rows, ${Object.keys(data[0]).length} columns`;
}

// =======================
// Preprocessing
// =======================
document.getElementById('preprocessBtn').addEventListener('click', () => {
  if (!rawData.length) return alert("Upload dataset first.");

  // Drop rows with missing target
  rawData = rawData.filter(r => r['History of Mental Illness'] !== null && r['History of Mental Illness'] !== undefined);

  // Separate features and target
  const X = rawData.map(r => ({ ...r }));
  const y = rawData.map(r => r['History of Mental Illness'] === 'Yes' ? 1 : 0);

  // Remove non-feature columns
  X.forEach(r => delete r['Name']);
  X.forEach(r => delete r['History of Mental Illness']);

  // Encode categorical variables
  featureNames = Object.keys(X[0]);
  featureNames.forEach(f => {
    if (typeof X[0][f] === 'string') {
      const uniqueVals = [...new Set(X.map(r => r[f]))];
      categoricalMaps[f] = {};
      uniqueVals.forEach((v, i) => { categoricalMaps[f][v] = i; });
      X.forEach(r => { r[f] = categoricalMaps[f][r[f]]; });
    }
  });

  // Normalize numeric columns
  featureNames.forEach(f => {
    const vals = X.map(r => r[f]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    scaler.min[f] = min; scaler.max[f] = max;
    X.forEach(r => { r[f] = (r[f]-min)/(max-min+1e-7); });
  });

  // Convert to tf.tensor
  processedData.X = tf.tensor2d(X.map(r => featureNames.map(f => r[f])));
  processedData.y = tf.tensor2d(y, [y.length, 1]);

  document.getElementById('preprocessStatus').textContent = "Preprocessing Done!";
});

// =======================
// EDA Visualizations
// =======================
function createHistPlot(data, feature) {
  const vals = data.map(r => r[feature]);
  const trace = { x: vals, type: 'histogram', marker: {color: '#4f46e5'} };
  const layout = { title: feature };
  return [trace, layout];
}

function createBarPlot(data, feature) {
  const counts = {};
  data.forEach(r => { counts[r[feature]] = (counts[r[feature]] || 0) + 1; });
  const trace = { x: Object.keys(counts), y: Object.values(counts), type: 'bar', marker: {color: '#f59e0b'} };
  const layout = { title: feature };
  return [trace, layout];
}

function plotEDA() {
  const container = document.getElementById('edaPlots');
  container.innerHTML = '';
  featureNames.forEach(f => {
    const div = document.createElement('div'); div.id = `plot_${f}`; div.className = 'bg-gray-50 p-2 rounded';
    container.appendChild(div);
    if (typeof rawData[0][f] === 'number') {
      const [trace, layout] = createHistPlot(rawData, f);
      Plotly.newPlot(div.id, [trace], layout, {responsive:true});
    } else {
      const [trace, layout] = createBarPlot(rawData, f);
      Plotly.newPlot(div.id, [trace], layout, {responsive:true});
    }
  });
}
document.getElementById('preprocessBtn').addEventListener('click', plotEDA);

// =======================
// Neural Network Model
// =======================
document.getElementById('trainBtn').addEventListener('click', async () => {
  if (!processedData.X) return alert("Preprocess data first.");

  const epochs = parseInt(document.getElementById('epochsInput').value);
  const batchSize = parseInt(document.getElementById('batchSizeInput').value);
  const lr = parseFloat(document.getElementById('lrInput').value);

  // Train/test split
  const datasetSize = processedData.X.shape[0];
  const trainSize = Math.floor(datasetSize * 0.8);
  const [X_train, X_test] = tf.split(processedData.X, [trainSize, datasetSize - trainSize]);
  const [y_train, y_test] = tf.split(processedData.y, [trainSize, datasetSize - trainSize]);

  // Define model
  model = tf.sequential();
  model.add(tf.layers.dense({inputShape: [processedData.X.shape[1]], units: 32, activation: 'relu'}));
  model.add(tf.layers.dense({units: 16, activation: 'relu'}));
  model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));
  model.compile({optimizer: tf.train.adam(lr), loss: 'binaryCrossentropy', metrics: ['accuracy']});

  // Training visualization
  const trainLogs = [];
  await model.fit(X_train, y_train, {
    epochs,
    batchSize,
    validationData: [X_test, y_test],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        trainLogs.push({epoch, ...logs});
        Plotly.newPlot('trainingChart', [
          {x: trainLogs.map(l => l.epoch), y: trainLogs.map(l => l.loss), name: 'Loss', type:'scatter'},
          {x: trainLogs.map(l => l.epoch), y: trainLogs.map(l => l.val_loss), name: 'Val Loss', type:'scatter'}
        ], {title:'Training Progress'});
      }
    }
  });

  computeMetrics(X_test, y_test);
});

// =======================
// Metrics & ROC
// =======================
let lastPredProbs = null;
function computeMetrics(X_test, y_test) {
  lastPredProbs = model.predict(X_test).dataSync();
  const y_true = y_test.dataSync();
  const threshold = parseFloat(document.getElementById('thresholdSlider').value);
  const y_pred = Array.from(lastPredProbs).map(p => p>=threshold?1:0);

  const tp = y_pred.reduce((sum, p, i) => sum + (p===1 && y_true[i]===1?1:0),0);
  const tn = y_pred.reduce((sum, p, i) => sum + (p===0 && y_true[i]===0?1:0),0);
  const fp = y_pred.reduce((sum, p, i) => sum + (p===1 && y_true[i]===0?1:0),0);
  const fn = y_pred.reduce((sum, p, i) => sum + (p===0 && y_true[i]===1?1:0),0);

  const accuracy = (tp+tn)/(tp+tn+fp+fn);
  const precision = tp/(tp+fp+1e-7);
  const recall = tp/(tp+fn+1e-7);
  const f1 = 2*precision*recall/(precision+recall+1e-7);

  document.getElementById('metrics').innerHTML = `
    Accuracy: ${accuracy.toFixed(2)}<br>
    Precision: ${precision.toFixed(2)}<br>
    Recall: ${recall.toFixed(2)}<br>
    F1-Score: ${f1.toFixed(2)}
  `;

  plotROCCurve(y_true, lastPredProbs);
}

// ROC curve plotting
function plotROCCurve(y_true, y_prob) {
  const thresholds = Array.from({length:101}, (_,i)=>i/100);
  const tpr = thresholds.map(t => {
    const tp = y_prob.reduce((sum, p, i) => sum + (p>=t && y_true[i]===1?1:0),0);
    const fn = y_prob.reduce((sum, p, i) => sum + (p<t && y_true[i]===1?1:0),0);
    return tp/(tp+fn+1e-7);
  });
  const fpr = thresholds.map(t => {
    const fp = y_prob.reduce((sum, p, i) => sum + (p>=t && y_true[i]===0?1:0),0);
    const tn = y_prob.reduce((sum, p, i) => sum + (p<t && y_true[i]===0?1:0),0);
    return fp/(fp+tn+1e-7);
  });

  Plotly.newPlot('rocCurve', [{x: fpr, y: tpr, type:'scatter', mode:'lines', name:'ROC'}, {x:[0,1], y:[0,1], type:'scatter', mode:'lines', line:{dash:'dash'}, name:'Random'}], {title:'ROC Curve', xaxis:{title:'FPR'}, yaxis:{title:'TPR'}});
}

// Update metrics on threshold change
document.getElementById('thresholdSlider').addEventListener('input', () => {
  if (!lastPredProbs) return;
  // Recompute metrics with new threshold
  const datasetSize = processedData.X.shape[0];
  const testSize = Math.floor(datasetSize * 0.2);
  const X_test = processedData.X.slice([datasetSize-testSize, 0], [testSize, processedData.X.shape[1]]);
  const y_test = processedData.y.slice([datasetSize-testSize,0],[testSize,1]);
  computeMetrics(X_test, y_test);
});

// =======================
// Prediction Form
// =======================
document.getElementById('predictForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!model) return alert("Train model first.");
  const formData = new FormData(e.target);
  const input = {};
  featureNames.forEach(f => {
    let val = formData.get(f);
    if (categoricalMaps[f]) val = categoricalMaps[f][val];
    if (!categoricalMaps[f]) {
      const numVal = parseFloat(val);
      val = (numVal - scaler.min[f]) / (scaler.max[f]-scaler.min[f]+1e-7);
    }
    input[f] = val;
  });
  const inputTensor = tf.tensor2d([featureNames.map(f=>input[f])]);
  const prob = model.predict(inputTensor).dataSync()[0];
  const threshold = parseFloat(document.getElementById('thresholdSlider').value);
  document.getElementById('predictionResult').textContent = `Probability: ${prob.toFixed(2)}, Prediction: ${prob>=threshold?'Yes':'No'}`;
});

// =======================
// Export
// =======================
document.getElementById('exportDataBtn').addEventListener('click', () => {
  const dataToExport = rawData.map(r => {
    const row = {...r};
    featureNames.forEach(f => {
      if (categoricalMaps[f]) {
        // Reverse map
        const revMap = Object.fromEntries(Object.entries(categoricalMaps[f]).map(([k,v])=>[v,k]));
        row[f] = revMap[row[f]];
      }
    });
    return row;
  });
  const csv = Papa.unparse(dataToExport);
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='preprocessed_data.csv'; a.click();
});

document.getElementById('exportModelBtn').addEventListener('click', async () => {
  if (!model) return alert("Train model first.");
  await model.save('downloads://mental_illness_model');
});
