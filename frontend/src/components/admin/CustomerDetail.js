import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import ApiService from "../../services/apiService"
import { Alert, EmptyRow, PageHeader, StatusBadge, Table, formatDate, formatRs } from "./adminUi"

const ORDER_HEAD = [{ label: "Date" }, { label: "Product" }, { label: "Qty" }, { label: "Total" }, { label: "Status" }]

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-900">{value}</div>
    </div>
  )
}

export default function CustomerDetail() {
  const { customerId } = useParams()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [notes, setNotes] = useState("")
  const [savedNotes, setSavedNotes] = useState("")
  const [loadError, setLoadError] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ApiService.getCustomer(customerId)
      .then((data) => {
        if (cancelled) return
        setCustomer(data.customer)
        setOrders(data.orders || [])
        setNotes(data.customer.notes || "")
        setSavedNotes(data.customer.notes || "")
      })
      .catch((err) => !cancelled && setLoadError(err.status === 404 ? "This customer doesn't exist." : err.message || "Failed to load the customer"))
    return () => {
      cancelled = true
    }
  }, [customerId])

  async function saveNotes() {
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const data = await ApiService.updateCustomerNotes(customerId, notes)
      setNotes(data.notes)
      setSavedNotes(data.notes)
      setNotice("Notes saved.")
    } catch (err) {
      setError(err.message || "Failed to save the notes")
    } finally {
      setSaving(false)
    }
  }

  if (!customer) {
    return (
      <div className="py-24 text-center text-gray-600">
        {loadError ? (
          <>
            <p className="mb-4 text-red-600">{loadError}</p>
            <Link to="/admin/customers" className="text-blue-600 underline">
              Back to customers
            </Link>
          </>
        ) : (
          "Loading customer..."
        )}
      </div>
    )
  }

  // WhatsApp needs the country code; local numbers are 10 digits like 98XXXXXXXX
  const digits = String(customer.phone).replace(/\D/g, "")
  const whatsapp = digits.length === 10 ? `977${digits}` : digits

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/admin/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> All customers
      </Link>
      <PageHeader title={customer.name} description={`Customer since ${formatDate(customer.firstOrderAt)}`} />

      <Alert type="success" onClose={() => setNotice("")}>{notice}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Orders" value={customer.orderCount} />
        <Stat label="Total spent" value={formatRs(customer.totalSpent)} />
        <Stat label="Last order" value={formatDate(customer.lastOrderAt)} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="font-semibold text-gray-900">Contact</h2>
          <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
            <Phone className="h-4 w-4 shrink-0 text-gray-400" /> {customer.phone}
          </a>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <MessageCircle className="h-4 w-4 shrink-0 text-gray-400" /> Message on WhatsApp
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 break-all text-gray-700 hover:text-blue-600">
              <Mail className="h-4 w-4 shrink-0 text-gray-400" /> {customer.email}
            </a>
          )}
          {customer.address && (
            <p className="flex items-start gap-2 text-gray-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /> {customer.address}
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Label htmlFor="customer-notes" className="font-semibold text-gray-900">
            Private notes
          </Label>
          <Textarea
            id="customer-notes"
            rows={4}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferences, follow-ups... Only admins can see this."
            className="resize-none"
          />
          <Button onClick={saveNotes} disabled={saving || notes === savedNotes} size="sm">
            {saving ? "Saving..." : "Save notes"}
          </Button>
        </section>
      </div>

      <h2 className="mb-3 font-semibold text-gray-900">Order history</h2>
      <Table head={ORDER_HEAD}>
        {orders.length === 0 ? (
          <EmptyRow colSpan={ORDER_HEAD.length}>No orders.</EmptyRow>
        ) : (
          orders.map((o) => (
            <tr key={o._id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <Link to={`/admin/orders/${o._id}/edit`} className="text-blue-600 hover:underline">
                  {formatDate(o.createdAt)}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-900">{o.product?.title || "Product removed"}</td>
              <td className="px-4 py-3 text-gray-700">{o.quantity}</td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-900">{o.totalPrice != null ? formatRs(o.totalPrice) : "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))
        )}
      </Table>
      <p className="mt-2 text-xs text-gray-500">Total spent leaves out cancelled orders.</p>
    </div>
  )
}
