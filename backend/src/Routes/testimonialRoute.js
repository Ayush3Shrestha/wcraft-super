const express = require("express");
const controller = require("../Controller/testimonialController");
const authMiddleware = require("../Middleware/authMiddleware");
const { categoryImage: singleImage } = require("../Middleware/uploadMiddleware");
const router = express.Router();

// Public: published testimonials only
router.get("/testimonials", controller.getPublished);

// Admin
router.get("/admin/testimonials", authMiddleware, controller.getAll);
router.get("/admin/testimonials/:id", authMiddleware, controller.getById);
router.post("/testimonials", authMiddleware, singleImage, controller.create);
router.put("/testimonials/:id", authMiddleware, singleImage, controller.update);
router.delete("/testimonials/:id", authMiddleware, controller.remove);

module.exports = router;
