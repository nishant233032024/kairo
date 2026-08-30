const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/authController");

router.post("/register", c.register);
router.post("/login", c.login);
router.get("/me", auth, c.me);
router.patch("/profile", auth, c.updateProfile);
router.post("/password", auth, c.changePassword);
router.post("/calendar-token", auth, c.rotateCalendarToken);
router.post("/llm-key", auth, c.setLlmKey);
router.delete("/llm-key", auth, c.clearLlmKey);
router.post("/llm-key/test", auth, c.testLlmKey);

module.exports = router;