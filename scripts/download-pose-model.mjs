import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const modelPath = resolve('backend/models/pose_landmarker/pose_landmarker_heavy.task');
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task';

if (existsSync(modelPath) && statSync(modelPath).size > 20 * 1024 * 1024) {
  console.log('Pose Landmarker Heavy model is ready.');
  process.exit(0);
}

mkdirSync(dirname(modelPath), { recursive: true });
console.log('Downloading the official Pose Landmarker Heavy model...');
const response = await fetch(modelUrl);
if (!response.ok || !response.body) {
  throw new Error(`Model download failed: HTTP ${response.status}`);
}
await pipeline(Readable.fromWeb(response.body), createWriteStream(modelPath));
console.log('Pose Landmarker Heavy model downloaded.');
