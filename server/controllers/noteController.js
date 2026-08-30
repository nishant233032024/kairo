const Note = require("../models/Note");

exports.list = async (req, res) => {
  const { category, q, tag } = req.query;
  const filter = { user: req.user._id };
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  let notes;
  if (q) {
    notes = await Note.find({ ...filter, $text: { $search: q } }).sort({ pinned: -1, updatedAt: -1 });
  } else {
    notes = await Note.find(filter).sort({ pinned: -1, updatedAt: -1 });
  }
  res.json({ notes });
};

exports.create = async (req, res) => {
  const note = await Note.create({ ...req.body, user: req.user._id });
  res.status(201).json({ note });
};

exports.update = async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  if (!note) return res.status(404).json({ message: "Note not found" });
  res.json({ note });
};

exports.remove = async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });
  res.json({ message: "Deleted" });
};