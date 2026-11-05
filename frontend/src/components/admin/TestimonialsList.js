import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Pencil, Plus, Star, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import ApiService from "../../services/apiService"
import { Alert, ConfirmDialog, EmptyRow, LoadingRow, PageHeader, Table, deleteMessage, imageUrl } from "./adminUi"

const HEAD = [
  { label: "Customer" },
  { label: "Testimonial" },
  { label: "Rating" },
  { label: "On home page" },
  { label: "Actions", className: "text-right" },
]

export default function TestimonialsList() {
  const navigate = useNavigate()
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ApiService.getAdminTestimonials()
      setTestimonials(data.testimonials || [])
    } catch (err) {
      setError(err.message || "Failed to load testimonials")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function setPublished(item, on) {
    setSaving(item._id)
    setError("")
    try {
      const fd = new FormData()
      fd.append("isPublished", String(on))
      const { testimonial } = await ApiService.updateTestimonial(item._id, fd)
      setTestimonials((list) => list.map((t) => (t._id === item._id ? testimonial : t)))
    } catch (err) {
      setError(err.message || "Failed to update the testimonial")
    } finally {
      setSaving(null)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await ApiService.deleteTestimonial(toDelete._id)
      setNotice(`The testimonial from ${toDelete.name} was deleted.`)
      setToDelete(null)
      load()
    } catch (err) {
      setError(err.message || "Failed to delete the testimonial")
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Testimonials"
        description="Published testimonials appear on the home page, just above the footer."
        actions={
          <Button asChild>
            <Link to="/admin/testimonials/new">
              <Plus className="mr-2 h-4 w-4" />
              Add testimonial
            </Link>
          </Button>
        }
      />

      <Alert type="success" onClose={() => setNotice("")}>{notice}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <Table head={HEAD}>
        {loading ? (
          <LoadingRow colSpan={HEAD.length} text="Loading testimonials..." />
        ) : testimonials.length === 0 ? (
          <EmptyRow colSpan={HEAD.length}>
            No testimonials yet. <Link to="/admin/testimonials/new" className="text-blue-600 underline">Add the first one</Link>.
          </EmptyRow>
        ) : (
          testimonials.map((t) => (
            <tr key={t._id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {t.photo ? (
                    <img src={imageUrl(t.photo)} alt="" className="h-10 w-10 shrink-0 rounded-full bg-gray-100 object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                      {t.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{t.name}</div>
                    {t.location && <div className="text-xs text-gray-500">{t.location}</div>}
                  </div>
                </div>
              </td>
              <td className="max-w-md px-4 py-3 text-gray-700">
                <p className="line-clamp-2">{t.quote}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" /> {t.rating} / 5
                </span>
              </td>
              <td className="px-4 py-3">
                <Switch
                  checked={t.isPublished}
                  disabled={saving === t._id}
                  onCheckedChange={(on) => setPublished(t, on)}
                  aria-label={`Show the testimonial from ${t.name} on the home page`}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Edit" aria-label={`Edit the testimonial from ${t.name}`} onClick={() => navigate(`/admin/testimonials/${t._id}/edit`)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    aria-label={`Delete the testimonial from ${t.name}`}
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setToDelete(t)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete testimonial?"
        message={toDelete ? deleteMessage(`The testimonial from ${toDelete.name}`) : ""}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
