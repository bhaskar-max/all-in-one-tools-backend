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

// ===== ENABLE FULL CORS (Safe for all browsers / file:// frontend) =====
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

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
    const key = crypto.createHash("sha256").update("my-secret-key").digest();
    const iv = crypto.randomBytes(16);

    const input = fs.createReadStream(req.file.path);
    const outputPath = `uploads/encrypted_${Date.now()}.enc`;
    const output = fs.createWriteStream(outputPath);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    output.write(iv); // store IV in file
    input.pipe(cipher).pipe(output);

    output.on("finish", () => {
      res.download(outputPath, "encrypted.enc", (err) => {
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
    const input = fs.createReadStream(req.file.path);
    const outputPath = `uploads/decrypted_${Date.now()}.bin`;
    const output = fs.createWriteStream(outputPath);

    const chunks = [];
    input.on("data", (chunk) => chunks.push(chunk));
    input.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const iv = buffer.slice(0, 16);
      const encryptedData = buffer.slice(16);

      const algorithm = "aes-256-cbc";
      const key = crypto.createHash("sha256").update("my-secret-key").digest();
      const decipher = crypto.createDecipheriv(algorithm, key, iv);

      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);
      fs.writeFileSync(outputPath, decrypted);

      res.download(outputPath, "decrypted_file", (err) => {
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

    res.download(mergedPath, "merged.pdf", (err) => {
      if (err) console.error("Download error:", err);
      req.files.forEach((f) => fs.unlinkSync(f.path));
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
    const outputPath = `uploads/converted_${Date.now()}.${format}`;

    await sharp(req.file.path).toFormat(format).toFile(outputPath);

    res.download(outputPath, `converted.${format}`, (err) => {
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
