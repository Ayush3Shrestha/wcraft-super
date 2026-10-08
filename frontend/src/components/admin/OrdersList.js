import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { MailWarning, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import ApiService from "../../services/apiService"
import {
  Alert,
  ConfirmDialog,
  EmptyRow,
  LoadingRow,
  ORDER_STATUSES,
  PageHeader,
  Pagination,
  Table,
  formatDate,
  formatRs,
} from "./adminUi"

const PAGE_SIZE = 20

const HEAD = [
  { label: "Date" },
  { label: "Customer" },
  { label: "Product" },
  { label: "Qty" },
  { label: "Total" },
  { label: "Status" },
  { label: "Actions", className: "text-right" },
]

// "Email failed" note when an order email didn't go out (details on hover)
function EmailProblem({ status }) {
  if (!status) return null
  const failed = [
    status.admin?.startsWith("failed") && `Shop email ${status.admin}`,
    status.customer?.startsWith("failed") && `Customer email ${status.customer}`,
  ].filter(Boolean)
  if (!failed.length) return null
  return (
    <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700" title={failed.join("\n")}>
      <MailWarning className="h-3.5 w-3.5" aria-hidden="true" />
      Email failed
      <span className="sr-only">: {failed.join(". ")}</span>
    </div>
  )
}

const STATUS_STYLES = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.className]))

export default function OrdersList() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [filters, setFilters] = useState({ status: "", search: "", page: 1 })
  const [searchInput, setSearchInput] = useState("")
  const [savingId, setSavingId] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await ApiService.getAllOrders({ ...filters, limit: PAGE_SIZE })
      setOrders(data.orders || [])
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput, page: 1 })), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Quick status change straight from the table
  async function changeStatus(order, status) {
    setSavingId(order._id)
    try {
      const { order: updated } = await ApiService.updateOrder(order._id, { status })
      setOrders((list) => list.map((o) => (o._id === order._id ? updated : o)))
    } catch (err) {
      setError(err.message || "Failed to update status")
    } finally {
      setSavingId(null)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await ApiService.deleteOrder(toDelete._id)
      setNotice(`Order from ${toDelete.customerName} was deleted.`)
      load()
    } catch (err) {
      setError(err.message || "Failed to delete order")
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Orders"
        description={pagination ? `${pagination.totalOrders} orders` : undefined}
        actions={
          <Button asChild>
            <Link to="/admin/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              Create order
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Search name, phone or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <Alert type="success" onClose={() => setNotice("")}>{notice}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <Table head={HEAD}>
        {loading ? (
          <LoadingRow colSpan={HEAD.length} text="Loading orders..." />
        ) : orders.length === 0 ? (
          <EmptyRow colSpan={HEAD.length}>No orders found.</EmptyRow>
        ) : (
          orders.map((o) => (
            <tr key={o._id} className="hover:bg-gray-50 align-top">
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(o.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{o.customerName}</div>
                <div className="text-xs text-gray-500">{o.customerPhone}</div>
                <EmailProblem status={o.emailStatus} />
              </td>
              <td className="px-4 py-3">
                <div className="text-gray-900">{o.product?.title || <span className="text-red-600">Product deleted</span>}</div>
                {o.customSpecification?.preferredWeight != null && (
                  <div className="text-xs text-gray-500">
                    Custom · {o.customSpecification.preferredWeight} tola
                    {o.customSpecification.design ? ` · ${o.customSpecification.design}` : ""}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-gray-700">{o.quantity}</td>
              <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{o.totalPrice != null ? formatRs(o.totalPrice) : "To quote"}</td>
              <td className="px-4 py-3">
                <select
                  value={o.status}
                  disabled={savingId === o._id}
                  onChange={(e) => changeStatus(o, e.target.value)}
                  className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_STYLES[o.status] || ""}`}
                  aria-label={`Status of order from ${o.customerName}`}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    aria-label={`Edit order from ${o.customerName}`}
                    onClick={() => navigate(`/admin/orders/${o._id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    aria-label={`Delete order from ${o.customerName}`}
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setToDelete(o)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      <Pagination pagination={pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete order?"
        message={toDelete ? `The order from ${toDelete.customerName} will be permanently deleted. This can't be undone.` : ""}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
