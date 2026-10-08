import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CloudUpload, Star, X } from "lucide-react"
import { imageUrl } from "./adminUi"

// Keep in step with backend/src/Middleware/uploadMiddleware.js
export const MAX_IMAGES = 10
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"]

let nextId = 0
const newId = () => `img-${++nextId}`

// Images already saved on the product, as items for the field
export const existingImageItems = (paths = []) => paths.map((path) => ({ id: newId(), kind: "existing", path }))

// Free the preview URLs of new files
export const releaseImageItems = (items) =>
  items.forEach((item) => item.kind === "new" && URL.revokeObjectURL(item.preview))

// Add the images to a product FormData: new files as `images`, plus
// `imageOrder` giving the final order (existing paths and "new:<n>")
export function appendImages(fd, items) {
  let n = 0
  const order = items.map((item) => {
    if (item.kind === "existing") return item.path
    fd.append("images", item.file)
    return `new:${n++}`
  })
  fd.append("imageOrder", JSON.stringify(order))
}

const sameFile = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified

/**
 * Lets the admin build a product's image list: add files over several
 * picks or by drag and drop, remove them, reorder them and pick the cover
 * (the first image, shown on product cards).
 */
export default function ProductImagesField({ items, onChange }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [problems, setProblems] = useState([])

  // Release previews when the form goes away
  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => releaseImageItems(itemsRef.current), [])

  function addFiles(fileList) {
    const found = []
    const added = []
    for (const file of Array.from(fileList || [])) {
      if (!ACCEPTED.includes(file.type)) {
        found.push(`${file.name}: only JPG, PNG, WEBP or GIF images can be used`)
      } else if (file.size > MAX_BYTES) {
        found.push(`${file.name}: larger than 5 MB`)
      } else if ([...items, ...added].some((i) => i.kind === "new" && sameFile(i.file, file))) {
        found.push(`${file.name}: already added`)
      } else if (items.length + added.length >= MAX_IMAGES) {
        found.push(`${file.name}: a product can have at most ${MAX_IMAGES} images`)
      } else {
        added.push({ id: newId(), kind: "new", file, preview: URL.createObjectURL(file) })
      }
    }
    setProblems(found)
    if (added.length) onChange([...items, ...added])
  }

  function remove(id) {
    const item = items.find((i) => i.id === id)
    if (item) releaseImageItems([item])
    onChange(items.filter((i) => i.id !== id))
  }

  function move(index, to) {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  const full = items.length >= MAX_IMAGES

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Images</span>
        <span className="text-xs text-gray-500">
          {items.length} of {MAX_IMAGES}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">
        Add as many photos as you like, up to {MAX_IMAGES}. The first one is the cover shown on product cards.
      </p>

      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-label="Product images">
          {items.map((item, index) => {
            const src = item.kind === "new" ? item.preview : imageUrl(item.path)
            const name = item.kind === "new" ? item.file.name : item.path.split("/").pop()
            return (
              <li key={item.id} className="group relative overflow-hidden rounded-md border bg-gray-50">
                <img src={src} alt={name} className="h-32 w-full object-cover" />
                <div className="absolute left-1.5 top-1.5 flex gap-1">
                  {index === 0 && (
                    <span className="rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Cover
                    </span>
                  )}
                  {item.kind === "new" && (
                    <span className="rounded bg-blue-600/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow hover:bg-white"
                  aria-label={`Remove image ${index + 1}`}
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center justify-between gap-1 border-t bg-white px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    aria-label={`Move image ${index + 1} earlier`}
                    title="Move earlier"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  {index === 0 ? (
                    <span className="truncate text-[11px] text-gray-500" title={name}>
                      {name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => move(index, 0)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-gray-700 hover:bg-gray-100"
                      aria-label={`Make image ${index + 1} the cover`}
                    >
                      <Star className="h-3 w-3" /> Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === items.length - 1}
                    className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    aria-label={`Move image ${index + 1} later`}
                    title="Move later"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!full && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            dragging ? "border-blue-500 bg-blue-50" : "border-slate-400 hover:bg-gray-50"
          }`}
        >
          <CloudUpload className="mb-2 h-8 w-8 text-gray-500" />
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{items.length ? "Add more images" : "Click to upload"}</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            PNG, JPG, WEBP or GIF, up to 5 MB each. You can select several at once.
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose product images"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = "" // so the same file can be picked again after removing it
        }}
      />

      {problems.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-red-600" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
