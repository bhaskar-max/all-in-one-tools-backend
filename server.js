import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import PDFMerger from "pdf-merger-js";
import sharp from "sharp";

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = 4000;

app.use(cors());
app.use(express.json());

// ===== TEST ROUTE =====
app.get("/", (req, res) => {
  res.send("✅ All-in-One Tools Backend Running");
});

// =====================================================
// 🔐 FILE ENCRYPTION / DECRYPTION TOOL
// =====================================================
app.post("/api/encrypt", upload.single("file"), (req, res) => {
  try {
    const algorithm = "aes-256-cbc";
    const key = crypto.createHash("sha256").update(req.body.key).digest(); // use provided key
    const iv = crypto.randomBytes(16);

    const input = fs.createReadStream(req.file.path);
    const originalName = req.file.originalname; // preserve original filename
    const outputPath = `uploads/encrypted_${Date.now()}_${originalName}.enc`;
    const output = fs.createWriteStream(outputPath);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    output.write(iv); // store IV in file
    input.pipe(cipher).pipe(output);

    output.on("finish", () => {
      res.download(outputPath, `encrypted_${originalName}.enc`, err => {
        if (err) console.error(err);
        fs.unlinkSync(req.file.path);
        fs.unlinkSync(outputPath);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Encryption failed" });
  }
});

app.post("/api/decrypt", upload.single("file"), (req, res) => {
  try {
    const key = crypto.createHash("sha256").update(req.body.key).digest(); // use provided key
    const input = fs.createReadStream(req.file.path);
    const chunks = [];

    input.on("data", chunk => chunks.push(chunk));
    input.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const iv = buffer.slice(0, 16);
      const encryptedData = buffer.slice(16);

      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

      // Get original filename from FormData or fallback
      const originalName = req.body.originalName || "decrypted_file";
      const outputPath = `uploads/decrypted_${Date.now()}_${originalName}`;

      fs.writeFileSync(outputPath, decrypted);

      res.download(outputPath, originalName, err => {
        if (err) console.error(err);
        fs.unlinkSync(req.file.path);
        fs.unlinkSync(outputPath);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Decryption failed" });
  }
});

// =====================================================
// 📚 PDF MERGE TOOL
// =====================================================
app.post("/api/pdf/merge", upload.array("pdfs"), async (req, res) => {
  try {
    const merger = new PDFMerger();
    for (const file of req.files) await merger.add(file.path);

    const mergedPath = `uploads/merged_${Date.now()}.pdf`;
    await merger.save(mergedPath);

    res.download(mergedPath, "merged.pdf", err => {
      if (err) console.error("Download error:", err);
      req.files.forEach(f => fs.unlinkSync(f.path));
      fs.unlinkSync(mergedPath);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Merge failed" });
  }
});

// =====================================================
// 🖼️ IMAGE CONVERTER TOOL
// =====================================================
app.post("/api/convert", upload.single("image"), async (req, res) => {
  try {
    const { format } = req.body;
    const originalName = req.file.originalname.split(".")[0]; // remove extension
    const outputPath = `uploads/converted_${Date.now()}_${originalName}.${format}`;

    await sharp(req.file.path).toFormat(format).toFile(outputPath);

    res.download(outputPath, `${originalName}.${format}`, err => {
      if (err) console.error(err);
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Conversion failed" });
  }
});

// =====================================================
// ✅ START SERVER
// =====================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
