const express = require("express");
const controller = require("../Controller/announcementController");
const authMiddleware = require("../Middleware/authMiddleware");
const router = express.Router();

// Public: what the bar above the navbar shows
router.get("/announcements", controller.getActive);

// Admin
router.get("/admin/announcements", authMiddleware, controller.getAll);
router.post("/announcements", authMiddleware, controller.create);
router.put("/announcements/reorder", authMiddleware, controller.reorder);
router.put("/announcements/:id", authMiddleware, controller.update);
router.delete("/announcements/:id", authMiddleware, controller.remove);

module.exports = router;
