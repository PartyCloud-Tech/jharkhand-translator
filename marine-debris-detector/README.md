# Abyssal Scan

A lightweight, offline prototype for side-scan sonar marine debris and anomaly detection.

## Run

```powershell
cd marine-debris-detector
npm install
npm start
```

The app has no server, cloud API, model download, or network requirement. Built-in scenes make it presentation-ready immediately. Local PNG, JPEG, WebP, and BMP images can be loaded with the browse control or by dropping them on the sonar frame.

## Pipeline

1. Ingest a local image or deterministic sample scene.
2. Resize analysis to a bounded canvas, convert to grayscale, normalize contrast, and apply a lightweight neighborhood denoise pass.
3. Extract bright, locally unusual connected regions.
4. Score each region using brightness, area, elongation, compactness, and edge density.
5. Map the feature profile to a prototype class: ghost net, pipe, wreckage, or unknown anomaly.
6. Render bounding boxes, confidence scores, timing, and operator-review results.

The current detector is an explainable heuristic demonstration, not a trained marine perception model. Its labels and confidence values must not be used for navigation, collision avoidance, salvage decisions, or environmental enforcement.

## Future model adapter

Replace the `detectAnomalies` adapter in `app.js` with a quantized ONNX Runtime Web or TensorFlow Lite model when a licensed, labeled side-scan dataset and target-device benchmark are available. Keep the existing canvas preprocessing contract and return normalized boxes, labels, and confidence values so the UI remains unchanged.

For AUV deployment, benchmark the replacement model on the target CPU/RAM budget, preserve raw sonar metadata, account for slant-range and layover effects, and require human review for uncertain detections.
