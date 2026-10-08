import { useEffect } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import { imageUrl, formatRs } from "../../lib/productDisplay"

export { imageUrl, formatRs }

// Shared building blocks for the admin list and form pages

export const ORDER_STATUSES = [
  { value: "pending", label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  { value: "contacted", label: "Contacted", className: "bg-sky-100 text-sky-800" },
  { value: "confirmed", label: "Confirmed", className: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completed", className: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", className: "bg-red-100 text-red-800" },
]

const LABELS = {
  stock: "Stock",
  custom: "Custom",
  oxidized: "Oxidized",
  color: "Color",
  half_gold: "Half Gold",
  full_gold: "Full Gold",
  electroplated: "Electroplated",
  fire_gold_plated: "Fire Gold Plated",
}
export const label = (value) => LABELS[value] || value

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—")


// Short description of what kind of product this is
export function describeProduct(product) {
  if (!product) return ""
  if (product.productType === "silver") {
    if (product.silverType === "custom") {
      const { min, max } = product.weightRange || {}
      return `Custom silver · ${min ?? "?"}–${max ?? "?"} tola`
    }
    return `Stock silver · ${product.weightInTola ?? "?"} tola`
  }
  if (product.productType === "gold") {
    return [label(product.goldFinish), product.platingMethod && label(product.platingMethod)].filter(Boolean).join(" · ")
  }
  if (product.productType === "metal") {
    return [product.metal && product.metal[0].toUpperCase() + product.metal.slice(1), product.finish].filter(Boolean).join(" · ")
  }
  return "Needs migration"
}

// Price shown in tables: fixed price, live silver price, or a custom range
export function describePrice(product) {
  const pricing = product?.pricing
  if (!pricing) return formatRs(product?.constantPrice)
  if (pricing.price != null) return formatRs(pricing.price)
  if (pricing.priceRange) return `${formatRs(pricing.priceRange.min)} – ${formatRs(pricing.priceRange.max)}`
  return pricing.pricingType === "fixed" ? "—" : "Needs silver rate"
}

export function StatusBadge({ status }) {
  const s = ORDER_STATUSES.find((x) => x.value === status)
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s?.className || "bg-gray-100 text-gray-700"}`}>
      {s?.label || status}
    </span>
  )
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Alert({ type = "error", children, onClose }) {
  if (!children) return null
  const isError = type === "error"
  const Icon = isError ? AlertCircle : CheckCircle2
  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-lg border p-4 ${
        isError ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"
      }`}
    >
      <Icon className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-xs underline">
          Dismiss
        </button>
      )}
    </div>
  )
}

export function LoadingRow({ colSpan, text = "Loading..." }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-sm text-gray-500">
        <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
        {text}
      </td>
    </tr>
  )
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-sm text-gray-500">
        {children}
      </td>
    </tr>
  )
}

// Table wrapper: scrolls sideways on small screens instead of the page
export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {head.map((h) => (
              <th
                key={h.key || h.label}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap ${h.className || ""}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  )
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null
  const { currentPage, totalPages } = pagination
  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm">
      <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPage(currentPage - 1)}>
        Previous
      </Button>
      <span className="text-gray-600">
        Page {currentPage} of {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPage(currentPage + 1)}>
        Next
      </Button>
    </div>
  )
}

// Modal asking the admin to confirm a destructive action
export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", busy, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === "Escape" && !busy && onCancel()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, busy, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Standard text for the delete confirmation
export const deleteMessage = (name) => `"${name}" will be permanently deleted. This can't be undone.`
