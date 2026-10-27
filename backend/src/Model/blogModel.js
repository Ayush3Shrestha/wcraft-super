const mongoose = require("mongoose");

// A blog post is a title plus an ordered list of content blocks, each either
// a piece of text or an image, so the writer can mix them in any order.

const BLOCK_TYPES = ["text", "image"];
const BLOG_STATUSES = ["draft", "published"];
// Only admins write posts for now; "user" is kept for customer posts later
const AUTHOR_KINDS = ["admin", "user"];

const WORDS_PER_MINUTE = 200;
const EXCERPT_LENGTH = 220;

const blockSchema = new mongoose.Schema(
  {
    type: { type: String, enum: BLOCK_TYPES, required: true },
    heading: { type: String, trim: true, maxlength: 150 }, // text blocks, optional
    text: { type: String, trim: true }, // text blocks
    image: { type: String }, // image blocks: "/uploads/<file>"
    caption: { type: String, trim: true }, // image blocks
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    topic: { type: String, trim: true, maxlength: 60 },
    // Short summary written by the admin (optional)
    excerpt: { type: String, trim: true, maxlength: 500 },
    coverImage: { type: String },
    blocks: { type: [blockSchema], default: [] },

    author: {
      kind: { type: String, enum: AUTHOR_KINDS, default: "admin" },
      id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, trim: true, default: "Welcome Craft" },
    },

    status: { type: String, enum: BLOG_STATUSES, default: "draft", index: true },
    publishedAt: { type: Date, index: true },
    // Featured posts lead the blog page's top slider
    isFeatured: { type: Boolean, default: false },

    // Worked out on save, so lists don't need to load every block:
    // the excerpt, or the start of the first text block
    summary: { type: String },
    previewImage: { type: String },
    readingMinutes: { type: Number, min: 1, default: 1 },
  },
  { timestamps: true }
);

const firstText = (blocks) => blocks.find((b) => b.type === "text" && b.text)?.text || "";

function shorten(text, length) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= length) return flat;
  return `${flat.slice(0, length).replace(/\s+\S*$/, "")}…`;
}

blogSchema.pre("validate", function (next) {
  const blocks = this.blocks || [];

  if (!blocks.length) {
    this.invalidate("blocks", "Add at least one text or image block");
  }
  blocks.forEach((block, i) => {
    if (block.type === "text") {
      if (!block.text) this.invalidate(`blocks.${i}.text`, `Block ${i + 1}: text can't be empty`);
      if (!block.heading) block.heading = undefined;
      block.image = undefined;
      block.caption = undefined;
    } else if (block.type === "image") {
      if (!block.image) this.invalidate(`blocks.${i}.image`, `Block ${i + 1}: choose an image`);
      block.text = undefined;
      block.heading = undefined;
    }
  });

  const text = this.excerpt || firstText(blocks);
  this.summary = text ? shorten(text, EXCERPT_LENGTH) : undefined;

  this.previewImage = this.coverImage || blocks.find((b) => b.type === "image" && b.image)?.image;

  const words = blocks
    .filter((b) => b.type === "text" && b.text)
    .reduce((sum, b) => sum + b.text.split(/\s+/).filter(Boolean).length, 0);
  this.readingMinutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

  // Publishing for the first time stamps the date shown on the post
  if (this.status === "published" && !this.publishedAt) this.publishedAt = new Date();

  next();
});

// Every stored image of a post, so replaced or deleted ones can be removed
blogSchema.methods.imagePaths = function () {
  return [this.coverImage, ...(this.blocks || []).map((b) => b.image)].filter(Boolean);
};

module.exports = mongoose.model("Blog", blogSchema);
module.exports.BLOCK_TYPES = BLOCK_TYPES;
module.exports.BLOG_STATUSES = BLOG_STATUSES;
