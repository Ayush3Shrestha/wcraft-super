import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import ApiService from "../../services/apiService"
import { Alert, ConfirmDialog, EmptyRow, LoadingRow, PageHeader, Table, deleteMessage } from "./adminUi"

const HEAD = [
  { label: "ID" },
  { label: "Name" },
  { label: "Material" },
  { label: "Products" },
  { label: "Description" },
  { label: "Actions", className: "text-right" },
]

const MATERIAL_STYLES = {
  silver: "bg-slate-100 text-slate-800",
  gold: "bg-amber-100 text-amber-800",
  copper: "bg-orange-100 text-orange-800",
  bronze: "bg-yellow-100 text-yellow-900",
}

export default function CategoriesList() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ApiService.getAllCategories(true, { includeInactive: true })
      setCategories(data.categories || [])
    } catch (err) {
      setError(err.message || "Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function confirmDelete() {
    setDeleting(true)
    try {
      await ApiService.deleteCategory(toDelete._id)
      setNotice(`"${toDelete.name}" was deleted.`)
      load()
    } catch (err) {
      setError(err.message || "Failed to delete category")
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Categories"
        description="The material of a category decides which fields its products have."
        actions={
          <Button asChild>
            <Link to="/admin/categories/new">
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Link>
          </Button>
        }
      />

      <Alert type="success" onClose={() => setNotice("")}>{notice}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <Table head={HEAD}>
        {loading ? (
          <LoadingRow colSpan={HEAD.length} text="Loading categories..." />
        ) : categories.length === 0 ? (
          <EmptyRow colSpan={HEAD.length}>
            No categories yet. <Link to="/admin/categories/new" className="text-blue-600 underline">Add one</Link>.
          </EmptyRow>
        ) : (
          categories.map((c) => {
            const hasProducts = c.productCount > 0
            return (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{c.categoryId ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                <td className="px-4 py-3">
                  {c.materialType ? (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${MATERIAL_STYLES[c.materialType] || ""}`}>
                      {c.materialType}
                    </span>
                  ) : (
                    <span className="text-xs text-red-600">Not set</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {hasProducts ? (
                    <Link to={`/admin/products?category=${c._id}`} className="text-blue-600 hover:underline">
                      {c.productCount}
                    </Link>
                  ) : (
                    <span className="text-gray-500">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={c.description}>
                  {c.description || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      aria-label={`Edit ${c.name}`}
                      onClick={() => navigate(`/admin/categories/${c._id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={hasProducts ? "Move or delete its products first" : "Delete"}
                      aria-label={`Delete ${c.name}`}
                      className="text-red-600 hover:text-red-700"
                      disabled={hasProducts}
                      onClick={() => setToDelete(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })
        )}
      </Table>
      <p className="mt-3 text-xs text-gray-500">A category can only be deleted once it has no products.</p>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete category?"
        message={toDelete ? deleteMessage(toDelete.name) : ""}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
