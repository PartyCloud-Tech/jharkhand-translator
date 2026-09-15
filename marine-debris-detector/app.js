const canvas = document.querySelector('#sonarCanvas');
const context = canvas.getContext('2d', { willReadFrequently: true });
const fileInput = document.querySelector('#fileInput');
const dropZone = document.querySelector('#dropZone');
const sceneSelect = document.querySelector('#sceneSelect');
const preprocessSelect = document.querySelector('#preprocess');
const sensitivity = document.querySelector('#sensitivity');
const sensitivityValue = document.querySelector('#sensitivityValue');
const results = document.querySelector('#results');
const toast = document.querySelector('#toast');
let sourceImage = null;
let currentSourceName = 'Sample / ghost-net-field.sonar';
let scanNumber = 1;

const sceneNames = {
  'ghost-net': 'ghost-net-field.sonar',
  pipe: 'pipeline-fragment.sonar',
  wreckage: 'wreckage-cluster.sonar',
  'clean-seabed': 'clean-seabed.sonar'
};

function noise(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function createSample(kind) {
  const image = context.createImageData(canvas.width, canvas.height);
  const pixels = image.data;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const seabed = 18 + (y / canvas.height) * 22;
      const grain = (noise(x * 0.17 + y * 0.71) - 0.5) * 15;
      const ripple = Math.sin(y * 0.075 + Math.sin(x * 0.012) * 2) * 4;
      const value = Math.max(4, Math.min(120, seabed + grain + ripple));
      const index = (y * canvas.width + x) * 4;
      pixels[index] = value * 0.45;
      pixels[index + 1] = value * 0.9;
      pixels[index + 2] = value * 0.84;
      pixels[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  context.save();
  context.globalCompositeOperation = 'lighter';
  if (kind === 'ghost-net') {
    context.strokeStyle = '#9ce5c9';
    context.lineWidth = 5;
    context.globalAlpha = .78;
    for (let offset = -150; offset <= 160; offset += 34) {
      context.beginPath(); context.moveTo(520 + offset, 210); context.lineTo(735 + offset, 420); context.stroke();
      context.beginPath(); context.moveTo(750 + offset, 210); context.lineTo(535 + offset, 420); context.stroke();
    }
    context.fillStyle = '#d8f3ca'; context.globalAlpha = .9; context.fillRect(625, 300, 82, 46);
  } else if (kind === 'pipe') {
    context.fillStyle = '#c7f0d0'; context.globalAlpha = .95;
    context.translate(500, 340); context.rotate(-0.15); context.fillRect(-210, -32, 420, 64);
    context.fillStyle = '#77baa9'; context.fillRect(-202, -22, 405, 12);
    context.strokeStyle = '#e4f5d8'; context.lineWidth = 8; context.strokeRect(-210, -32, 420, 64);
    context.restore(); context.save(); context.globalCompositeOperation = 'lighter';
  } else if (kind === 'wreckage') {
    context.fillStyle = '#d7efc8'; context.globalAlpha = .9;
    [[390,330,95,50],[535,278,130,74],[700,365,110,60],[600,420,90,44]].forEach(([x,y,w,h]) => context.fillRect(x,y,w,h));
    context.strokeStyle = '#b7e6c3'; context.lineWidth = 13;
    context.beginPath(); context.moveTo(370,300); context.lineTo(760,430); context.moveTo(440,445); context.lineTo(720,270); context.stroke();
  }
  context.restore();
  return canvas.toDataURL();
}

function drawImage(dataUrl) {
  const image = new Image();
  image.onload = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    sourceImage = context.getImageData(0, 0, canvas.width, canvas.height);
    runAnalysis();
  };
  image.src = dataUrl;
}

function preprocess() {
  const input = sourceImage || context.getImageData(0, 0, canvas.width, canvas.height);
  const output = context.createImageData(input);
  const strength = preprocessSelect.value === 'smooth' ? 2 : preprocessSelect.value === 'detail' ? 0 : 1;
  const values = new Float32Array(canvas.width * canvas.height);
  for (let i = 0; i < values.length; i += 1) {
    const offset = i * 4;
    values[i] = input.data[offset] * .22 + input.data[offset + 1] * .61 + input.data[offset + 2] * .17;
  }
  let min = 255; let max = 0;
  for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      let value = values[y * canvas.width + x];
      if (strength) {
        let sum = 0; let count = 0;
        for (let dy = -strength; dy <= strength; dy += 1) for (let dx = -strength; dx <= strength; dx += 1) {
          const nx = Math.max(0, Math.min(canvas.width - 1, x + dx));
          const ny = Math.max(0, Math.min(canvas.height - 1, y + dy));
          sum += values[ny * canvas.width + nx]; count += 1;
        }
        value = sum / count;
      }
      const normalized = Math.max(0, Math.min(255, ((value - min) / Math.max(1, max - min)) * 255));
      const offset = (y * canvas.width + x) * 4;
      output.data[offset] = normalized * .58;
      output.data[offset + 1] = normalized;
      output.data[offset + 2] = normalized * .84;
      output.data[offset + 3] = 255;
    }
  }
  context.putImageData(output, 0, 0);
  return output;
}

function detectAnomalies(processed) {
  const width = 240; const height = 140;
  const sample = document.createElement('canvas'); sample.width = width; sample.height = height;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  sampleContext.drawImage(canvas, 0, 0, width, height);
  const data = sampleContext.getImageData(0, 0, width, height).data;
  const threshold = 130 + Number(sensitivity.value) * .9;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) mask[i] = data[i * 4 + 1] > threshold ? 1 : 0;
  const found = []; const visited = new Uint8Array(mask.length);
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    const queue = [start]; visited[start] = 1; const points = [];
    while (queue.length) {
      const index = queue.pop(); points.push(index); const x = index % width; const y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx; const ny = y + dy; const next = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[next] && !visited[next]) { visited[next] = 1; queue.push(next); }
      }
    }
    if (points.length < 8) continue;
    const xs = points.map(point => point % width); const ys = points.map(point => Math.floor(point / width));
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const boxWidth = maxX - minX + 1; const boxHeight = maxY - minY + 1; const area = boxWidth * boxHeight;
    const fill = points.length / area; const elongation = Math.max(boxWidth, boxHeight) / Math.max(1, Math.min(boxWidth, boxHeight));
    let label = 'Unknown anomaly';
    if (elongation > 3.2 && fill > .35) label = 'Pipe / linear object';
    else if (fill < .42 || (boxWidth > 20 && boxHeight > 16)) label = 'Ghost net signature';
    else if (area > 180) label = 'Wreckage cluster';
    const confidence = Math.max(55, Math.min(98, Math.round(52 + fill * 28 + Math.min(18, points.length / 18) + (label === 'Unknown anomaly' ? 0 : 8))));
    found.push({ label, confidence, x: minX / width, y: minY / height, width: boxWidth / width, height: boxHeight / height });
  }
  return found.filter(item => item.confidence >= Number(sensitivity.value)).sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function renderOverlay(detections) {
  context.putImageData(preprocess(), 0, 0);
  context.save(); context.strokeStyle = '#63d4c1'; context.fillStyle = '#63d4c1'; context.lineWidth = 3; context.font = '500 16px Consolas, monospace';
  detections.forEach((item, index) => {
    const x = item.x * canvas.width; const y = item.y * canvas.height; const width = item.width * canvas.width; const height = item.height * canvas.height;
    context.strokeStyle = item.confidence >= 80 ? '#63d4c1' : '#e7c66a'; context.strokeRect(x, y, width, height); context.fillText(`${String(index + 1).padStart(2, '0')}  ${item.confidence}%`, x + 7, Math.max(20, y - 8));
  }); context.restore();
}

function renderResults(detections, elapsed) {
  document.querySelector('#anomalyCount').textContent = String(detections.length).padStart(2, '0');
  document.querySelector('#meanConfidence').textContent = detections.length ? `${Math.round(detections.reduce((sum, item) => sum + item.confidence, 0) / detections.length)}%` : '—';
  document.querySelector('#processingTime').textContent = `Processed in ${elapsed} ms`;
  results.innerHTML = detections.length ? detections.map((item, index) => `<article class="result ${item.confidence < 80 ? 'medium' : ''}"><i class="result-bar"></i><div><h4>${String(index + 1).padStart(2, '0')} · ${item.label}</h4><p>${Math.round(item.width * 100)}% W × ${Math.round(item.height * 100)}% H · review target</p></div><strong class="result-confidence">${item.confidence}%</strong></article>`).join('') : '<div class="empty-result">No target exceeded the review threshold.</div>';
}

function runAnalysis() {
  const started = performance.now();
  const processed = preprocess();
  const detections = detectAnomalies(processed);
  renderOverlay(detections);
  renderResults(detections, Math.max(12, Math.round(performance.now() - started)));
  document.querySelector('#runtimeStatus').textContent = 'SCANNED';
}

function loadSample(kind) {
  currentSourceName = `Sample / ${sceneNames[kind]}`;
  document.querySelector('#imageName').textContent = currentSourceName;
  createSample(kind);
  sourceImage = context.getImageData(0, 0, canvas.width, canvas.height);
  runAnalysis();
}

function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }

sceneSelect.addEventListener('change', () => { scanNumber += 1; document.querySelector('#scanCount').textContent = String(scanNumber).padStart(2, '0'); loadSample(sceneSelect.value); });
sensitivity.addEventListener('input', () => { sensitivityValue.textContent = `${sensitivity.value}%`; runAnalysis(); });
preprocessSelect.addEventListener('change', runAnalysis);
document.querySelector('#runBtn').addEventListener('click', () => { runAnalysis(); showToast('Analysis complete'); });
document.querySelector('#resetBtn').addEventListener('click', () => { sceneSelect.value = 'ghost-net'; scanNumber = 1; document.querySelector('#scanCount').textContent = '01'; loadSample('ghost-net'); showToast('Sample scene restored'); });
document.querySelector('#uploadBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });
dropZone.addEventListener('dragover', event => { event.preventDefault(); dropZone.classList.add('dragging'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', event => { event.preventDefault(); dropZone.classList.remove('dragging'); if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]); });
function loadFile(file) { if (!file.type.startsWith('image/')) { showToast('Choose a supported image file'); return; } currentSourceName = file.name; document.querySelector('#imageName').textContent = file.name; document.querySelector('#imageMeta').textContent = 'Local image · normalized for analysis'; const reader = new FileReader(); reader.onload = () => drawImage(reader.result); reader.readAsDataURL(file); }
loadSample('ghost-net');
