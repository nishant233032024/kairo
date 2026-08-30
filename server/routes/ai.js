const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/aiController");

router.use(auth);
router.post("/parse-task", c.parseTask);
router.post("/create-task", c.createFromLanguage);
router.post("/prioritize", c.prioritize);
router.post("/summarize", c.summarize);
router.post("/plan", c.plan);
router.post("/plan/apply", c.applyPlan);
router.post("/chat", c.chat);
router.get("/history", c.history);
router.get("/search", c.search);

module.exports = router;