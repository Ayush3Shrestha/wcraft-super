const Testimonial = require("../Model/testimonialModel");
const { toPublicPath, removeStoredImages } = require("../Middleware/uploadMiddleware");

const PUBLIC_FIELDS = "name location quote rating photo";

// Only the fields present in the request, so a partial update (such as
// publishing from the list) leaves the rest alone
function buildFields(body) {
  const fields = {};
  for (const key of ["name", "location", "quote"]) {
    if (body[key] !== undefined) fields[key] = String(body[key]).trim();
  }
  if (body.rating !== undefined) fields.rating = Number(body.rating);
  if (body.isPublished !== undefined) fields.isPublished = String(body.isPublished) === "true";
  return fields;
}

const validationResponse = (res, error) =>
  res.status(400).json({
    message: "Testimonial validation failed",
    errors: Object.fromEntries(Object.entries(error.errors || {}).map(([path, err]) => [path, err.message])),
  });

// Published testimonials, for the home page
exports.getPublished = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isPublished: true }, PUBLIC_FIELDS).sort({ createdAt: -1 }).limit(24).lean();
    res.status(200).json({ testimonials });
  } catch (error) {
    res.status(500).json({ message: "Error fetching testimonials", error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ testimonials });
  } catch (error) {
    res.status(500).json({ message: "Error fetching testimonials", error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id).catch(() => null);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });
    res.status(200).json({ testimonial });
  } catch (error) {
    res.status(500).json({ message: "Error fetching testimonial", error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const testimonial = new Testimonial({
      ...buildFields(req.body),
      photo: req.file ? toPublicPath(req.file) : undefined,
    });
    await testimonial.save();
    res.status(201).json({ message: "Testimonial created", testimonial });
  } catch (error) {
    if (error.name === "ValidationError") return validationResponse(res, error);
    console.error("Create testimonial error:", error);
    res.status(500).json({ message: "Error creating testimonial", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id).catch(() => null);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });

    const oldPhoto = testimonial.photo;
    testimonial.set(buildFields(req.body));
    if (req.file) testimonial.photo = toPublicPath(req.file);
    else if (String(req.body.removePhoto) === "true") testimonial.photo = undefined;

    await testimonial.save();
    if (oldPhoto && oldPhoto !== testimonial.photo) removeStoredImages([oldPhoto]);
    res.status(200).json({ message: "Testimonial updated", testimonial });
  } catch (error) {
    if (error.name === "ValidationError") return validationResponse(res, error);
    console.error("Update testimonial error:", error);
    res.status(500).json({ message: "Error updating testimonial", error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id).catch(() => null);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });
    if (testimonial.photo) removeStoredImages([testimonial.photo]);
    res.status(200).json({ message: "Testimonial deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting testimonial", error: error.message });
  }
};
