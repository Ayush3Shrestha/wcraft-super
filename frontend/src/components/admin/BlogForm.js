import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowDown, ArrowUp, FileText, ImagePlus, Newspaper, Trash2, Type, X } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import ApiService from "../../services/apiService"
import { Alert, imageUrl } from "./adminUi"

// Keep in step with backend/src/Middleware/uploadMiddleware.js
const MAX_BYTES = 5 * 1024 * 1024
const MAX_UPLOADS = 20
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"]

let nextId = 0
const newId = () => `block-${++nextId}`

const textBlock = (text = "", heading = "") => ({ id: newId(), type: "text", heading, text })
const imageBlock = (image = null, caption = "") => ({ id: newId(), type: "image", image, caption })

// An image is { kind: "existing", path } or { kind: "new", file, preview }
const existingImage = (path) => (path ? { kind: "existing", path } : null)
const imageSrc = (image) => (image?.kind === "new" ? image.preview : imageUrl(image?.path))
const release = (image) => image?.kind === "new" && URL.revokeObjectURL(image.preview)

function checkFile(file) {
  if (!ACCEPTED.includes(file.type)) return "Only JPG, PNG, WEBP or GIF images can be used."
  if (file.size > MAX_BYTES) return "Each image must be 5 MB or smaller."
  return null
}

// Add the post to a FormData. New files go in `images`; the post refers to
// them as "new:<n>" and to images it already has by their path.
function toFormData(values, cover, blocks) {
  const fd = new FormData()
  let n = 0
  const ref = (image) => {
    if (!image) return ""
    if (image.kind === "existing") return image.path
    fd.append("images", image.file)
    return `new:${n++}`
  }
  fd.append("title", values.title.trim())
  fd.append("topic", values.topic.trim())
  fd.append("excerpt", values.excerpt.trim())
  fd.append("authorName", values.authorName.trim())
  fd.append("status", values.published ? "published" : "draft")
  fd.append("isFeatured", String(values.isFeatured))
  fd.append("coverImage", ref(cover))
  fd.append(
    "blocks",
    JSON.stringify(
      blocks.map((b) =>
        b.type === "text"
          ? { type: "text", heading: b.heading.trim(), text: b.text.trim() }
          : { type: "image", image: ref(b.image), caption: b.caption.trim() }
      )
    )
  )
  return fd
}

const newUploadCount = (cover, blocks) =>
  (cover?.kind === "new" ? 1 : 0) + blocks.filter((b) => b.type === "image" && b.image?.kind === "new").length

// Picks one image, with a preview and a remove button
function ImagePicker({ image, onChange, label, hint }) {
  const inputRef = useRef(null)
  const [problem, setProblem] = useState("")

  function pick(file) {
    if (!file) return
    const issue = checkFile(file)
    setProblem(issue || "")
    if (issue) return
    release(image)
    onChange({ kind: "new", file, preview: URL.createObjectURL(file) })
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      {image ? (
        <div className="relative overflow-hidden rounded-lg border bg-gray-50">
          <img src={imageSrc(image)} alt="" className="max-h-80 w-full object-contain" />
          <div className="absolute right-2 top-2 flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Remove image"
              onClick={() => {
                release(image)
                onChange(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            pick(e.dataTransfer.files?.[0])
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50/40"
        >
          <ImagePlus className="h-6 w-6 text-gray-400" />
          <span className="font-medium">{label}</span>
          {hint && <span className="text-xs text-gray-500">{hint}</span>}
        </button>
      )}
      {problem && <p className="mt-1 text-sm text-red-600">{problem}</p>}
    </div>
  )
}

export default function BlogForm() {
  const { postId } = useParams()
  const isEdit = Boolean(postId)
  const navigate = useNavigate()

  const [loaded, setLoaded] = useState(!isEdit)
  const [loadError, setLoadError] = useState("")
  const [values, setValues] = useState({ title: "", topic: "", excerpt: "", authorName: "Welcome Craft", published: false, isFeatured: false })
  const [cover, setCover] = useState(null)
  const [blocks, setBlocks] = useState(() => [textBlock()])
  const [topics, setTopics] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [saving, setSaving] = useState(false)
  const [slug, setSlug] = useState("")

  // Free image previews when the form goes away
  const stateRef = useRef({ cover, blocks })
  stateRef.current = { cover, blocks }
  useEffect(
    () => () => {
      release(stateRef.current.cover)
      stateRef.current.blocks.forEach((b) => release(b.image))
    },
    []
  )

  useEffect(() => {
    ApiService.getBlogTopics()
      .then((data) => setTopics(data.topics || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    ApiService.getAdminBlogPost(postId)
      .then(({ post }) => {
        setValues({
          title: post.title || "",
          topic: post.topic || "",
          excerpt: post.excerpt || "",
          authorName: post.author?.name || "Welcome Craft",
          published: post.status === "published",
          isFeatured: post.isFeatured === true,
        })
        setCover(existingImage(post.coverImage))
        setBlocks(
          (post.blocks || []).map((b) =>
            b.type === "image" ? imageBlock(existingImage(b.image), b.caption || "") : textBlock(b.text || "", b.heading || "")
          )
        )
        setSlug(post.status === "published" ? post.slug : "")
        setLoaded(true)
      })
      .catch((err) => setLoadError(err.message || "Failed to load the post"))
  }, [isEdit, postId])

  const setValue = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const updateBlock = (id, patch) => {
    setBlocks((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    setErrors((e) => ({ ...e, [id]: undefined, blocks: undefined }))
  }

  const moveBlock = (index, dir) =>
    setBlocks((list) => {
      const next = [...list]
      const [block] = next.splice(index, 1)
      next.splice(index + dir, 0, block)
      return next
    })

  const removeBlock = (id) =>
    setBlocks((list) => {
      release(list.find((b) => b.id === id)?.image)
      return list.filter((b) => b.id !== id)
    })

  const addBlock = (type) => {
    const block = type === "text" ? textBlock() : imageBlock()
    setBlocks((list) => [...list, block])
    setErrors((e) => ({ ...e, blocks: undefined }))
    // Bring the new block into view
    setTimeout(() => document.getElementById(block.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
  }

  function validate() {
    const found = {}
    if (!values.title.trim()) found.title = "Give the post a title."
    if (!blocks.length) found.blocks = "Add at least one text or image block."
    blocks.forEach((b) => {
      if (b.type === "text" && !b.text.trim()) found[b.id] = "Write something here, or remove this block."
      if (b.type === "image" && !b.image) found[b.id] = "Choose an image, or remove this block."
    })
    if (newUploadCount(cover, blocks) > MAX_UPLOADS)
      found.blocks = `You can upload at most ${MAX_UPLOADS} new images per save. Save, then add the rest.`
    setErrors(found)
    return Object.keys(found).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError("")
    if (!validate()) {
      setSubmitError("Please fix the highlighted fields.")
      return
    }
    setSaving(true)
    try {
      const fd = toFormData(values, cover, blocks)
      if (isEdit) await ApiService.updateBlogPost(postId, fd)
      else await ApiService.createBlogPost(fd)
      navigate("/admin/blogs", { replace: true })
    } catch (err) {
      const details = err.details ? Object.values(err.details).join(" ") : ""
      setSubmitError(`${err.message || "Failed to save the post"}${details ? `: ${details}` : ""}`)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="py-24 text-center text-gray-600">
        {loadError ? (
          <>
            <p className="mb-4 text-red-600">{loadError}</p>
            <Link to="/admin/blogs" className="text-blue-600 underline">
              Back to blog posts
            </Link>
          </>
        ) : (
          "Loading post..."
        )}
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-blue-100 p-3">
              <Newspaper className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{isEdit ? "Edit blog post" : "New blog post"}</h1>
          <p className="text-gray-600">Give the post a title, then build it from text and image blocks in any order.</p>
        </div>

        <Alert onClose={() => setSubmitError("")}>{submitError}</Alert>

        <form onSubmit={onSubmit} noValidate className="space-y-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
          {/* Title and details */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="blog-title">Title</Label>
              <Input
                id="blog-title"
                value={values.title}
                onChange={(e) => setValue("title", e.target.value)}
                placeholder="e.g. How a silver Buddha is made in Patan"
                maxLength={200}
                className="text-lg"
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blog-topic">Topic (optional)</Label>
                <Input
                  id="blog-topic"
                  list="blog-topics"
                  value={values.topic}
                  onChange={(e) => setValue("topic", e.target.value)}
                  placeholder="e.g. Craft stories"
                  maxLength={60}
                />
                <datalist id="blog-topics">
                  {topics.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-author">Author name</Label>
                <Input id="blog-author" value={values.authorName} onChange={(e) => setValue("authorName", e.target.value)} maxLength={80} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-excerpt">Short summary (optional)</Label>
              <Textarea
                id="blog-excerpt"
                rows={2}
                className="resize-none"
                value={values.excerpt}
                onChange={(e) => setValue("excerpt", e.target.value)}
                maxLength={500}
                placeholder="Shown on the blog cards. Leave empty to use the start of the first text block."
              />
            </div>

            <div className="space-y-2">
              <Label>Cover image (optional)</Label>
              <ImagePicker image={cover} onChange={setCover} label="Choose a cover image" hint="Leave empty to use the first image in the post." />
            </div>
          </div>

          {/* Content blocks */}
          <fieldset className="space-y-4 border-t pt-6">
            <legend className="pr-2 text-lg font-semibold text-gray-900">Content</legend>
            {errors.blocks && <p className="text-sm text-red-600">{errors.blocks}</p>}

            {blocks.map((block, index) => {
              const isText = block.type === "text"
              return (
                <div
                  key={block.id}
                  id={block.id}
                  className={`rounded-xl border p-4 ${errors[block.id] ? "border-red-300 bg-red-50/40" : "border-gray-200 bg-gray-50/60"}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      {isText ? <Type className="h-4 w-4 text-blue-600" /> : <ImagePlus className="h-4 w-4 text-purple-600" />}
                      {index + 1}. {isText ? "Text" : "Image"}
                    </span>
                    <div className="flex gap-1">
                      <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => moveBlock(index, -1)} aria-label={`Move block ${index + 1} up`}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={index === blocks.length - 1}
                        onClick={() => moveBlock(index, 1)}
                        aria-label={`Move block ${index + 1} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeBlock(block.id)}
                        aria-label={`Remove block ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isText ? (
                    <div className="space-y-3">
                      <Input
                        value={block.heading}
                        onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                        placeholder="Section heading (optional)"
                        maxLength={150}
                        aria-label={`Heading for block ${index + 1}`}
                        className="bg-white font-semibold"
                      />
                      <Textarea
                        rows={6}
                        value={block.text}
                        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                        placeholder="Write a section of the post. Leave a blank line between paragraphs."
                        aria-label={`Text for block ${index + 1}`}
                        className="bg-white"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ImagePicker image={block.image} onChange={(image) => updateBlock(block.id, { image })} label="Choose an image" hint="JPG, PNG, WEBP or GIF, up to 5 MB" />
                      <Input
                        value={block.caption}
                        onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                        placeholder="Caption (optional)"
                        aria-label={`Caption for block ${index + 1}`}
                        className="bg-white"
                      />
                    </div>
                  )}
                  {errors[block.id] && <p className="mt-2 text-sm text-red-600">{errors[block.id]}</p>}
                </div>
              )
            })}

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => addBlock("text")} className="h-12 border-dashed">
                <FileText className="mr-2 h-4 w-4" />
                Add text
              </Button>
              <Button type="button" variant="outline" onClick={() => addBlock("image")} className="h-12 border-dashed">
                <ImagePlus className="mr-2 h-4 w-4" />
                Add image
              </Button>
            </div>
          </fieldset>

          {/* Publishing */}
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-start gap-3 rounded-md border p-4">
              <Switch checked={values.published} onCheckedChange={(on) => setValue("published", on)} className="mt-1" id="blog-published" />
              <div className="grid gap-1">
                <Label htmlFor="blog-published" className="font-medium">
                  Published
                </Label>
                <p className="text-xs text-muted-foreground">Off keeps the post as a draft that only admins can see.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-4">
              <Switch checked={values.isFeatured} onCheckedChange={(on) => setValue("isFeatured", on)} className="mt-1" id="blog-featured" />
              <div className="grid gap-1">
                <Label htmlFor="blog-featured" className="font-medium">
                  Featured
                </Label>
                <p className="text-xs text-muted-foreground">Featured posts lead the slider at the top of the blog page.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/admin/blogs")}>
              Cancel
            </Button>
            {slug && (
              <Button type="button" variant="outline" className="flex-1" asChild>
                <a href={`/blog/${slug}`} target="_blank" rel="noreferrer">
                  View post
                </a>
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : values.published ? (isEdit ? "Save and publish" : "Publish post") : "Save draft"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
