const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/analyticsController");

router.use(auth);
router.get("/", c.overview);

module.exports = router;