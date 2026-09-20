import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const distDir = path.join(__dirname, 'dist');
const staticDir = fs.existsSync(distDir) ? distDir : __dirname;

app.use(express.static(staticDir));

app.get('*', (req, res) => {
  const indexInDist = path.join(distDir, 'index.html');
  if (fs.existsSync(indexInDist)) {
    res.sendFile(indexInDist);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
