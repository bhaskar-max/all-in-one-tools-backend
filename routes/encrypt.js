const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });

// AES-256-CBC encrypt
function encryptFile(inputPath, outputPath, password) {
  const key = crypto.createHash('sha256').update(String(password)).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);
  output.write(iv); // prepend iv to file
  input.pipe(cipher).pipe(output);
}

// decrypt
function decryptFile(inputPath, outputPath, password) {
  const key = crypto.createHash('sha256').update(String(password)).digest();
  const input = fs.createReadStream(inputPath);
  const iv = Buffer.alloc(16);
  const fd = fs.openSync(inputPath, 'r');
  fs.readSync(fd, iv, 0, 16, 0);
  fs.closeSync(fd);
  const readStream = fs.createReadStream(inputPath, { start: 16 });
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const output = fs.createWriteStream(outputPath);
  readStream.pipe(decipher).pipe(output);
}

// POST /api/encrypt/upload
router.post('/upload', upload.single('file'), (req, res) => {
  const password = req.body.password || 'default_password';
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const inputPath = req.file.path;
  const outputPath = inputPath + '.enc';
  try {
    encryptFile(inputPath, outputPath, password);
    return res.json({ encryptedFile: `/uploads/${path.basename(outputPath)}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Encryption failed' });
  }
});

// POST /api/encrypt/decrypt
router.post('/decrypt', upload.single('file'), (req, res) => {
  const password = req.body.password || 'default_password';
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const inputPath = req.file.path;
  const outputPath = inputPath + '.dec';
  try {
    decryptFile(inputPath, outputPath, password);
    return res.json({ decryptedFile: `/uploads/${path.basename(outputPath)}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Decryption failed' });
  }
});

module.exports = router;
