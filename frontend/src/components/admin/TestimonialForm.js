import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ImagePlus, MessageSquareQuote, X } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import { Textarea } from "../ui/textarea"
import ApiService from "../../services/apiService"
import { Alert, imageUrl } from "./adminUi"

// Keep in step with backend/src/Middleware/uploadMiddleware.js
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_QUOTE = 600

export default function TestimonialForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [loaded, setLoaded] = useState(!isEdit)
  const [loadError, setLoadError] = useState("")
  const [values, setValues] = useState({ name: "", location: "", quote: "", rating: "5", isPublished: false })
  const [savedPhoto, setSavedPhoto] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    ApiService.getAdminTestimonial(id)
      .then(({ testimonial: t }) => {
        setValues({ name: t.name, location: t.location || "", quote: t.quote, rating: String(t.rating), isPublished: t.isPublished })
        setSavedPhoto(t.photo || null)
        setLoaded(true)
      })
      .catch((err) => setLoadError(err.message || "Failed to load the testimonial"))
  }, [isEdit, id])

  // Free the preview when it's replaced or the form goes away
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const setValue = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function pickPhoto(picked) {
    if (!picked) return
    if (!ACCEPTED.includes(picked.type)) return setErrors((e) => ({ ...e, photo: "Only JPG, PNG, WEBP or GIF images can be used." }))
    if (picked.size > MAX_BYTES) return setErrors((e) => ({ ...e, photo: "The photo must be 5 MB or smaller." }))
    setErrors((e) => ({ ...e, photo: undefined }))
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
    setRemovePhoto(false)
  }

  function clearPhoto() {
    setFile(null)
    setPreview(null)
    setRemovePhoto(true)
  }

  function validate() {
    const found = {}
    if (!values.name.trim()) found.name = "Enter the customer's name."
    if (!values.quote.trim()) found.quote = "Enter what the customer said."
    setErrors(found)
    return Object.keys(found).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError("")
    if (!validate()) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append("name", values.name.trim())
      fd.append("location", values.location.trim())
      fd.append("quote", values.quote.trim())
      fd.append("rating", values.rating)
      fd.append("isPublished", String(values.isPublished))
      if (file) fd.append("image", file)
      else if (removePhoto) fd.append("removePhoto", "true")
      if (isEdit) await ApiService.updateTestimonial(id, fd)
      else await ApiService.createTestimonial(fd)
      navigate("/admin/testimonials", { replace: true })
    } catch (err) {
      const details = err.details ? Object.values(err.details).join(" ") : ""
      setSubmitError(`${err.message || "Failed to save the testimonial"}${details ? `: ${details}` : ""}`)
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
            <Link to="/admin/testimonials" className="text-blue-600 underline">
              Back to testimonials
            </Link>
          </>
        ) : (
          "Loading testimonial..."
        )}
      </div>
    )
  }

  const photoSrc = preview || (!removePhoto && savedPhoto ? imageUrl(savedPhoto) : null)

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-blue-100 p-3">
              <MessageSquareQuote className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{isEdit ? "Edit testimonial" : "Add testimonial"}</h1>
          <p className="text-gray-600">Use the customer's real words, and only publish with their permission.</p>
        </div>

        <Alert onClose={() => setSubmitError("")}>{submitError}</Alert>

        <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-name">Customer name</Label>
              <Input id="t-name" value={values.name} maxLength={80} onChange={(e) => setValue("name", e.target.value)} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-location">Location (optional)</Label>
              <Input id="t-location" value={values.location} maxLength={80} placeholder="e.g. Pokhara, Nepal" onChange={(e) => setValue("location", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-quote">What they said</Label>
            <Textarea
              id="t-quote"
              rows={5}
              maxLength={MAX_QUOTE}
              className="resize-none"
              value={values.quote}
              onChange={(e) => setValue("quote", e.target.value)}
              aria-invalid={!!errors.quote}
            />
            <div className="flex justify-between text-xs">
              <span className="text-red-600">{errors.quote}</span>
              <span className="text-gray-500">
                {values.quote.length} / {MAX_QUOTE}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-rating">Rating</Label>
            <select
              id="t-rating"
              value={values.rating}
              onChange={(e) => setValue("rating", e.target.value)}
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm sm:w-48"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "star" : "stars"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => {
                pickPhoto(e.target.files?.[0])
                e.target.value = ""
              }}
            />
            <div className="flex items-center gap-4">
              {photoSrc ? (
                <img src={photoSrc} alt="" className="h-16 w-16 rounded-full bg-gray-100 object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <ImagePlus className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                {photoSrc ? "Replace" : "Choose photo"}
              </Button>
              {photoSrc && (
                <Button type="button" variant="ghost" size="sm" onClick={clearPhoto}>
                  <X className="mr-1 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
            {errors.photo && <p className="text-sm text-red-600">{errors.photo}</p>}
          </div>

          <div className="flex items-start gap-3 rounded-md border p-4">
            <Switch id="t-published" checked={values.isPublished} onCheckedChange={(on) => setValue("isPublished", on)} className="mt-1" />
            <div className="grid gap-1">
              <Label htmlFor="t-published" className="font-medium">
                Show on home page
              </Label>
              <p className="text-xs text-muted-foreground">Off keeps it hidden from customers.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/admin/testimonials")}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Add testimonial"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
