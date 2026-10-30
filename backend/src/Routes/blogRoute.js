const express = require("express");
const blogController = require("../Controller/blogController");
const authMiddleware = require("../Middleware/authMiddleware");
const { blogImages } = require("../Middleware/uploadMiddleware");
const router = express.Router();

// Public: published posts only
router.get("/blogs", blogController.getPublishedPosts);
router.get("/blogs/topics", blogController.getTopics);
router.get("/blogs/:slug", blogController.getPublishedPost);

// Admin: drafts included. Only admins can write posts for now.
router.get("/admin/blogs", authMiddleware, blogController.getAllPosts);
router.get("/admin/blogs/:postId", authMiddleware, blogController.getPostById);
router.post("/blogs", authMiddleware, blogImages, blogController.createPost);
router.put("/blogs/:postId", authMiddleware, blogImages, blogController.updatePost);
router.delete("/blogs/:postId", authMiddleware, blogController.deletePost);

module.exports = router;
