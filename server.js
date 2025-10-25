import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import PDFMerger from "pdf-merger-js";
import sharp from "sharp";
import fetch from "node-fetch"; // for AI Chat proxy

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 4000;

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
    const key = crypto.createHash("sha256").update(req.body.key).digest();
    const iv = crypto.randomBytes(16);
    const input = fs.createReadStream(req.file.path);

    const originalName = req.file.originalname;
    const outputPath = `uploads/encrypted_${Date.now()}_${originalName}.enc`;
    const output = fs.createWriteStream(outputPath);

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    output.write(iv); // prepend IV
    input.pipe(cipher).pipe(output);

    output.on("finish", () => {
      res.download(outputPath, `encrypted_${originalName}.enc`, (err) => {
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
    const key = crypto.createHash("sha256").update(req.body.key).digest();
    const input = fs.readFileSync(req.file.path);

    const iv = input.slice(0, 16);
    const encryptedData = input.slice(16);

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    const originalName = req.file.originalname.replace(/^encrypted_\d+_/, "").replace(".enc", "");
    const outputPath = `uploads/decrypted_${Date.now()}_${originalName}`;
    fs.writeFileSync(outputPath, decrypted);

    res.download(outputPath, `decrypted_${originalName}`, (err) => {
      if (err) console.error(err);
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(outputPath);
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
    if (!format) return res.status(400).json({ error: "Target format required" });

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
// 💬 AI CHAT TOOL (OpenAI Proxy Route)
// =====================================================
app.post("/api/chat", express.json(), async (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(400).send("OpenAI API key not configured on backend.");

  const prompt = req.body.prompt || "";
  if (!prompt) return res.status(400).send("Prompt required.");

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
      }),
    });

    const data = await resp.json();
    const text =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      JSON.stringify(data);
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).send("AI proxy failed");
  }
});

// =====================================================
// ✅ START SERVER
// =====================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
