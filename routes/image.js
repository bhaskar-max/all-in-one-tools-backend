const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });

// convert image to jpg or png
router.post('/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const target = req.body.target || 'jpeg'; // 'jpeg' or 'png'
  const inputPath = req.file.path;
  const ext = target === 'png' ? 'png' : 'jpg';
  const outPath = inputPath + `.${ext}`;
  try {
    await sharp(inputPath)
      .toFormat(target === 'png' ? 'png' : 'jpeg')
      .toFile(outPath);
    return res.json({ convertedFile: `/uploads/${path.basename(outPath)}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Conversion failed' });
  }
});

module.exports = router;
