const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/noteController");

router.use(auth);
router.get("/", c.list);
router.post("/", c.create);
router.patch("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;