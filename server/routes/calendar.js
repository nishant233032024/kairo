const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/calendarController");

const dest = path.join(__dirname, "..", "uploads");
fs.mkdirSync(dest, { recursive: true });
const upload = multer({ dest, limits: { fileSize: 2 * 1024 * 1024 } });

router.get("/feed/:token", c.feed);
router.use(auth);
router.get("/reminders", c.listReminders);
router.post("/reminders", c.createReminder);
router.delete("/reminders/:id", c.removeReminder);
router.get("/events", c.listEvents);
router.post("/events", c.createEvent);
router.delete("/events/:id", c.removeEvent);
router.get("/export.ics", c.ics);
router.post("/import", upload.single("file"), c.importIcs);

module.exports = router;