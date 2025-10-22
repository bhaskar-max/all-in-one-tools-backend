// backend/routes/pdfRoutes.js

import express from "express";
import multer from "multer";
import PDFMerger from "pdf-merger-js";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// 📄 Merge multiple PDFs
router.post("/merge", upload.array("pdfs"), async (req, res) => {
  try {
    const merger = new PDFMerger();

    for (const file of req.files) {
      await merger.add(file.path);
    }

    const mergedPath = `uploads/merged_${Date.now()}.pdf`;
    await merger.save(mergedPath);

    // 📤 Send the merged file as a download
    res.download(mergedPath, "merged.pdf", err => {
      if (err) console.error("Download error:", err);

      // 🧹 Clean up temp files
      req.files.forEach(f => fs.unlinkSync(f.path));
      fs.unlinkSync(mergedPath);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Merge failed" });
  }
});

export default router;
