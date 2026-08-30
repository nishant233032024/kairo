const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/taskController");

router.use(auth);
router.get("/", c.list);
router.post("/", c.create);
router.patch("/:id", c.update);
router.delete("/:id", c.remove);
router.post("/:id/share", c.share);
router.post("/:id/unshare", c.unshare);

module.exports = router;