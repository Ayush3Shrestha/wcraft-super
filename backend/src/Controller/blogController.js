const mongoose = require("mongoose");
const Blog = require("../Model/blogModel");
const { BLOCK_TYPES, BLOG_STATUSES } = require("../Model/blogModel");
const { toPublicPath, removeStoredImages } = require("../Middleware/uploadMiddleware");

// Blog posts are sent as multipart forms:
//   title, topic, excerpt, authorName, status, isFeatured
//   blocks      JSON array of { type: "text", heading, text } or
//               { type: "image", image, caption }
//   coverImage  optional image reference ("" removes the cover)
//   images      the uploaded files
// An image reference is "new:<n>" for the n-th uploaded file, or the path of
// an image the post already has (when editing).

const LIST_FIELDS = "-blocks";

const parseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

function slugify(text) {
  const slug = String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return slug || "post";
}

// A slug no other post uses: "my-post", then "my-post-2", "my-post-3"...
async function uniqueSlug(title, exceptId) {
  const base = slugify(title);
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await Blog.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
    if (!taken) return slug;
  }
}

// Turn an image reference into a stored path. `existing` lists the images
// the post already has; anything else is rejected.
function resolveImage(ref, uploaded, existing, used) {
  if (ref === undefined || ref === null || ref === "") return { path: undefined };
  const value = String(ref);
  const isNew = /^new:(\d+)$/.exec(value);
  if (isNew) {
    const i = Number(isNew[1]);
    if (i >= uploaded.length) return { error: `Image ${value} was not uploaded` };
    used.add(i);
    return { path: uploaded[i] };
  }
  if (!existing.includes(value)) return { error: `Unknown image: ${value}` };
  return { path: value };
}

// Build the post's fields from the request. Returns { fields } or { error }.
function buildFields(body, uploaded, existing, used) {
  const fields = {};
  for (const key of ["title", "topic", "excerpt"]) {
    if (body[key] !== undefined) fields[key] = String(body[key]).trim();
  }
  if (body.status !== undefined) {
    if (!BLOG_STATUSES.includes(body.status)) return { error: `status must be one of: ${BLOG_STATUSES.join(", ")}` };
    fields.status = body.status;
  }
  if (body.isFeatured !== undefined) fields.isFeatured = String(body.isFeatured) === "true";

  if (body.coverImage !== undefined) {
    const cover = resolveImage(body.coverImage, uploaded, existing, used);
    if (cover.error) return { error: cover.error };
    fields.coverImage = cover.path;
  }

  if (body.blocks !== undefined) {
    const blocks = parseJson(body.blocks);
    if (!Array.isArray(blocks)) return { error: "blocks must be a JSON array" };
    fields.blocks = [];
    for (const [i, block] of blocks.entries()) {
      if (!block || !BLOCK_TYPES.includes(block.type)) {
        return { error: `Block ${i + 1}: type must be one of: ${BLOCK_TYPES.join(", ")}` };
      }
      if (block.type === "text") {
        fields.blocks.push({
          type: "text",
          heading: block.heading ? String(block.heading).trim() : undefined,
          text: block.text == null ? "" : String(block.text),
        });
      } else {
        const image = resolveImage(block.image, uploaded, existing, used);
        if (image.error) return { error: `Block ${i + 1}: ${image.error}` };
        fields.blocks.push({ type: "image", image: image.path, caption: block.caption ? String(block.caption) : undefined });
      }
    }
  }
  return { fields };
}

const authorName = (body) => String(body.authorName || "").trim() || "Welcome Craft";

const validationResponse = (res, error) =>
  res.status(400).json({
    message: "Blog post validation failed",
    errors: Object.fromEntries(Object.entries(error.errors || {}).map(([path, err]) => [path, err.message])),
  });

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Shared by the public and admin lists
async function listPosts(req, res, baseFilter) {
  const { topic, search, featured, status, page = 1, limit = 12 } = req.query;
  const filter = { ...baseFilter };
  if (topic) filter.topic = new RegExp(`^${escapeRegex(String(topic))}$`, "i");
  if (search) filter.title = new RegExp(escapeRegex(String(search)), "i");
  if (String(featured) === "true") filter.isFeatured = true;
  if (status && !baseFilter.status && BLOG_STATUSES.includes(status)) filter.status = status;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
  const [posts, total] = await Promise.all([
    Blog.find(filter)
      .select(LIST_FIELDS)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Blog.countDocuments(filter),
  ]);

  res.status(200).json({
    posts,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalPosts: total,
      hasNext: pageNum * limitNum < total,
      limit: limitNum,
    },
  });
}

// --- Public ---------------------------------------------------------------

exports.getPublishedPosts = async (req, res) => {
  try {
    await listPosts(req, res, { status: "published" });
  } catch (error) {
    console.error("Get blog posts error:", error);
    res.status(500).json({ message: "Error fetching blog posts", error: error.message });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const topics = (await Blog.distinct("topic", { status: "published" })).filter(Boolean).sort();
    res.status(200).json({ topics });
  } catch (error) {
    res.status(500).json({ message: "Error fetching blog topics", error: error.message });
  }
};

// By slug, or by id for old links
exports.getPublishedPost = async (req, res) => {
  try {
    const { slug } = req.params;
    const match = mongoose.isValidObjectId(slug) ? { $or: [{ slug }, { _id: slug }] } : { slug };
    const post = await Blog.findOne({ ...match, status: "published" });
    if (!post) return res.status(404).json({ message: "Blog post not found" });
    res.status(200).json({ post });
  } catch (error) {
    res.status(500).json({ message: "Error fetching blog post", error: error.message });
  }
};

// --- Admin ----------------------------------------------------------------

exports.getAllPosts = async (req, res) => {
  try {
    await listPosts(req, res, {});
  } catch (error) {
    console.error("Get admin blog posts error:", error);
    res.status(500).json({ message: "Error fetching blog posts", error: error.message });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.postId).catch(() => null);
    if (!post) return res.status(404).json({ message: "Blog post not found" });
    res.status(200).json({ post });
  } catch (error) {
    res.status(500).json({ message: "Error fetching blog post", error: error.message });
  }
};

exports.createPost = async (req, res) => {
  const uploaded = (req.files || []).map(toPublicPath);
  const used = new Set();
  try {
    if (!req.body.title || !String(req.body.title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    const { fields, error } = buildFields(req.body, uploaded, [], used);
    if (error) return res.status(400).json({ message: error });

    const post = new Blog({
      ...fields,
      slug: await uniqueSlug(fields.title),
      author: { kind: "admin", id: req.user?.id, name: authorName(req.body) },
    });
    await post.save();

    removeStoredImages(uploaded.filter((_, i) => !used.has(i)));
    res.status(201).json({ message: "Blog post created", post });
  } catch (error) {
    if (error.name === "ValidationError") return validationResponse(res, error);
    console.error("Create blog post error:", error);
    res.status(500).json({ message: "Error creating blog post", error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  const uploaded = (req.files || []).map(toPublicPath);
  const used = new Set();
  try {
    const post = await Blog.findById(req.params.postId).catch(() => null);
    if (!post) return res.status(404).json({ message: "Blog post not found" });

    const before = post.imagePaths();
    const { fields, error } = buildFields(req.body, uploaded, before, used);
    if (error) return res.status(400).json({ message: error });
    if (fields.title !== undefined && !fields.title) return res.status(400).json({ message: "Title can't be empty" });

    post.set(fields);
    if (req.body.authorName !== undefined) post.author.name = authorName(req.body);
    // Moving back to draft hides the post; publishing again gives a new date
    if (fields.status === "draft") post.publishedAt = undefined;

    await post.save();

    const after = post.imagePaths();
    removeStoredImages([...before.filter((p) => !after.includes(p)), ...uploaded.filter((_, i) => !used.has(i))]);
    res.status(200).json({ message: "Blog post updated", post });
  } catch (error) {
    if (error.name === "ValidationError") return validationResponse(res, error);
    console.error("Update blog post error:", error);
    res.status(500).json({ message: "Error updating blog post", error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Blog.findByIdAndDelete(req.params.postId).catch(() => null);
    if (!post) return res.status(404).json({ message: "Blog post not found" });
    removeStoredImages(post.imagePaths());
    res.status(200).json({ message: "Blog post deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting blog post", error: error.message });
  }
};
