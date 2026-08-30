const path = require("path");
const fs = require("fs");
const Document = require("../models/Document");
const { summarizeText } = require("../utils/aiClient");
const { getLlmCreds } = require("../utils/llm");

exports.list = async (req, res) => {
  const documents = await Document.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ documents });
};

function readable(file) {
  const name = (file.originalname || "").toLowerCase();
  return (
    file.mimetype.startsWith("text/") ||
    file.mimetype === "application/json" ||
    /\.(md|txt|csv|json|ics|log)$/.test(name)
  );
}

exports.create = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const filePath = req.file.path;
  let excerpt = "";
  try {
    if (readable(req.file)) excerpt = fs.readFileSync(filePath, "utf8").slice(0, 20000);
  } catch {
    excerpt = "";
  }
  let summary = "";
  if (excerpt) {
    try {
      summary = await summarizeText(excerpt, await getLlmCreds(req.user._id));
    } catch {
      summary = "";
    }
  }
  const document = await Document.create({
    user: req.user._id,
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    excerpt: excerpt.slice(0, 4000),
    summary,
  });
  res.status(201).json({ document });
};

exports.summarize = async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, user: req.user._id });
  if (!document) return res.status(404).json({ message: "Document not found" });
  if (!document.excerpt) return res.status(400).json({ message: "No extractable text in this file" });
  document.summary = await summarizeText(document.excerpt, await getLlmCreds(req.user._id));
  await document.save();
  res.json({ document });
};

exports.remove = async (req, res) => {
  const document = await Document.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!document) return res.status(404).json({ message: "Document not found" });
  const filePath = path.join(__dirname, "..", "uploads", document.filename);
  fs.unlink(filePath, () => {});
  res.json({ message: "Deleted" });
};