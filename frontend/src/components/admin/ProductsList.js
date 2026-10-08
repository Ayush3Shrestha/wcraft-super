import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Pencil, Plus, Trash2, ImageOff } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import ApiService from "../../services/apiService"
import {
  Alert,
  ConfirmDialog,
  EmptyRow,
  LoadingRow,
  PageHeader,
  Pagination,
  Table,
  deleteMessage,
  describePrice,
  describeProduct,
  imageUrl,
} from "./adminUi"

const PAGE_SIZE = 20

const HEAD = [
  { label: "" },
  { label: "Product" },
  { label: "Category" },
  { label: "Type" },
  { label: "Price" },
  { label: "Stock" },
  { label: "Actions", className: "text-right" },
]

export default function ProductsList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [filters, setFilters] = useState(() => ({ search: "", category: searchParams.get("category") || "", page: 1 }))
  const [searchInput, setSearchInput] = useState("")
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await ApiService.getAllProducts({ ...filters, includeInactive: true, limit: PAGE_SIZE })
      setProducts(data.products || [])
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message || "Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    ApiService.getAllCategories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  // Search after the admin stops typing
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput, page: 1 })), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  async function confirmDelete() {
    setDeleting(true)
    try {
      await ApiService.deleteProduct(toDelete._id)
      setNotice(`"${toDelete.title}" was deleted.`)
      setToDelete(null)
      load()
    } catch (err) {
      setError(err.message || "Failed to delete product")
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Products"
        description={pagination ? `${pagination.totalProducts} products` : undefined}
        actions={
          <Button asChild>
            <Link to="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add product
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Search by product name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Alert type="success" onClose={() => setNotice("")}>{notice}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <Table head={HEAD}>
        {loading ? (
          <LoadingRow colSpan={HEAD.length} text="Loading products..." />
        ) : products.length === 0 ? (
          <EmptyRow colSpan={HEAD.length}>
            No products found. <Link to="/admin/products/new" className="text-blue-600 underline">Add one</Link>.
          </EmptyRow>
        ) : (
          products.map((p) => {
            const src = imageUrl(p.images?.[0])
            return (
              <tr key={p._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {src ? (
                    <img src={src} alt="" className="h-12 w-12 rounded-md object-cover bg-gray-100" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100">
                      <ImageOff className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{p.title}</div>
                  {p.isActive === false && <div className="text-xs text-gray-500">Hidden</div>}
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{p.category?.name || "—"}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{describeProduct(p)}</td>
                <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{describePrice(p)}</td>
                <td className="px-4 py-3 text-gray-700">
                  {p.silverType === "custom" ? "Made to order" : p.stockQuantity ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      aria-label={`Edit ${p.title}`}
                      onClick={() => navigate(`/admin/products/${p._id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      aria-label={`Delete ${p.title}`}
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setToDelete(p)}
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

      <Pagination pagination={pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete product?"
        message={toDelete ? deleteMessage(toDelete.title) : ""}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
