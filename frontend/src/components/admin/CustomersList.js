import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import ApiService from "../../services/apiService"
import { Alert, EmptyRow, LoadingRow, PageHeader, Pagination, Table, formatDate, formatRs } from "./adminUi"

const PAGE_SIZE = 20

const HEAD = [
  { label: "Customer" },
  { label: "Contact" },
  { label: "Orders" },
  { label: "Total spent" },
  { label: "Last order" },
  { label: "Actions", className: "text-right" },
]

export default function CustomersList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({ search: "", sort: "recent", page: 1 })
  const [searchInput, setSearchInput] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await ApiService.getCustomers({ ...filters, limit: PAGE_SIZE })
      setCustomers(data.customers || [])
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message || "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  // Search after the admin stops typing
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput, page: 1 })), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Customers"
        description={pagination ? `${pagination.totalCustomers} customers, grouped from orders by phone number` : "Everyone who has placed an order"}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, phone or email..."
          className="bg-white sm:max-w-xs"
          aria-label="Search customers"
        />
        <select
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
          aria-label="Sort customers"
        >
          <option value="recent">Latest order first</option>
          <option value="spent">Highest spend first</option>
          <option value="orders">Most orders first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <Alert onClose={() => setError("")}>{error}</Alert>

      <Table head={HEAD}>
        {loading ? (
          <LoadingRow colSpan={HEAD.length} text="Loading customers..." />
        ) : customers.length === 0 ? (
          <EmptyRow colSpan={HEAD.length}>
            {filters.search ? "No customers match your search." : "Customers will appear here once orders are placed."}
          </EmptyRow>
        ) : (
          customers.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                <Link to={`/admin/customers/${c.id}`} className="hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700">
                <div className="whitespace-nowrap">{c.phone}</div>
                {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
              </td>
              <td className="px-4 py-3 text-gray-700">{c.orderCount}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-900">{formatRs(c.totalSpent)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(c.lastOrderAt)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <Button variant="ghost" size="icon" title="View customer" aria-label={`View ${c.name}`} onClick={() => navigate(`/admin/customers/${c.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      <Pagination pagination={pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  )
}
