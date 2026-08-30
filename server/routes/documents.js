const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/documentController");

const dest = path.join(__dirname, "..", "uploads");
fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dest),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

router.use(auth);
router.get("/", c.list);
router.post("/", upload.single("file"), c.create);
router.post("/:id/summarize", c.summarize);
router.delete("/:id", c.remove);

module.exports = router;