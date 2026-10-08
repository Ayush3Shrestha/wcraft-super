import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ShoppingCart } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Label } from "../ui/label"
import ApiService from "../../services/apiService"
import { Alert, ORDER_STATUSES, describePrice, describeProduct, formatRs } from "./adminUi"

const EMPTY = {
  productId: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  quantity: "1",
  status: "pending",
  totalPrice: "",
  notes: "",
  customization: "",
  // custom silver specification
  preferredWeight: "",
  height: "",
  width: "",
  length: "",
  unit: "inch",
  design: "",
  designNotes: "",
  requiredBy: "",
}

const OTHER_DESIGN = "__other__"
const SPEC_FIELDS = ["preferredWeight", "height", "width", "length", "unit", "design", "designNotes", "requiredBy"]
const str = (v) => (v === undefined || v === null ? "" : String(v))
const isCustomSilver = (p) => p?.productType === "silver" && p?.silverType === "custom"

function orderToValues(o) {
  const spec = o.customSpecification || {}
  return {
    ...EMPTY,
    productId: o.product?._id || "",
    customerName: o.customerName || "",
    customerPhone: o.customerPhone || "",
    customerEmail: o.customerEmail || "",
    customerAddress: o.customerAddress || "",
    quantity: str(o.quantity || 1),
    status: o.status || "pending",
    totalPrice: str(o.totalPrice),
    notes: o.notes || "",
    customization: o.customization || "",
    preferredWeight: str(spec.preferredWeight),
    height: str(spec.size?.height),
    width: str(spec.size?.width),
    length: str(spec.size?.length),
    unit: spec.size?.unit || "inch",
    design: spec.design || "",
    designNotes: spec.designNotes || "",
    requiredBy: spec.requiredBy ? spec.requiredBy.slice(0, 10) : "",
  }
}

function Field({ label, error, children, hint }) {
  return (
    <div className="space-y-2">
      <Label className={error ? "text-red-600" : ""}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm"

export default function OrderForm() {
  const { orderId } = useParams()
  const isEdit = Boolean(orderId)
  const navigate = useNavigate()
  const [values, setValues] = useState(EMPTY)
  const [initialValues, setInitialValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [products, setProducts] = useState([])
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [submitError, setSubmitError] = useState("")
  // New orders only: email the customer that their order was placed
  const [notifyCustomer, setNotifyCustomer] = useState(false)
  const [saving, setSaving] = useState(false)
  const [designChoice, setDesignChoice] = useState("")

  useEffect(() => {
    const requests = isEdit
      ? [ApiService.getOrderById(orderId)]
      : [ApiService.getAllProducts({ limit: 500 })]
    Promise.all(requests)
      .then(([data]) => {
        if (isEdit) {
          setOrder(data.order)
          setValues(orderToValues(data.order))
          setInitialValues(orderToValues(data.order))
        } else {
          setProducts((data.products || []).filter((p) => p.isActive !== false))
        }
      })
      .catch((err) => setLoadError(err.message || "Failed to load"))
      .finally(() => setLoading(false))
  }, [isEdit, orderId])

  const product = isEdit ? order?.product : products.find((p) => p._id === values.productId)
  const custom = isCustomSilver(product)
  const designOptions = product?.customOptions?.designOptions || []
  const allowCustomDesign = product?.customOptions?.allowCustomDesign !== false

  // Keep the design dropdown in sync when an order is loaded or the product changes
  useEffect(() => {
    if (!custom) return setDesignChoice("")
    if (!values.design) return setDesignChoice(designOptions.length ? "" : OTHER_DESIGN)
    setDesignChoice(designOptions.includes(values.design) ? values.design : OTHER_DESIGN)
  }, [product?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  // Price preview using today's rate (or the rate locked on the order)
  const estimate = useMemo(() => {
    if (!product) return null
    const qty = Math.max(1, Number(values.quantity) || 1)
    if (custom) {
      const rate = isEdit ? order?.silverPriceSnapshot : product.pricing?.silverRate
      const weight = Number(values.preferredWeight)
      if (!rate || !weight) return null
      return (rate * weight + (product.makingCost || 0)) * qty
    }
    const unit = isEdit ? (order?.totalPrice != null ? order.totalPrice / order.quantity : null) : product.pricing?.price
    return unit != null ? unit * qty : null
  }, [product, custom, values.quantity, values.preferredWeight, isEdit, order])

  const productsByCategory = useMemo(() => {
    const groups = {}
    products.forEach((p) => {
      const key = p.category?.name || "Uncategorised"
      ;(groups[key] = groups[key] || []).push(p)
    })
    return Object.entries(groups)
  }, [products])

  function validate() {
    const e = {}
    if (!isEdit && !values.productId) e.productId = "Choose a product"
    if (!values.customerName.trim()) e.customerName = "Customer name is required"
    if (!values.customerPhone.trim()) e.customerPhone = "Phone number is required"
    if (values.customerEmail && !/^\S+@\S+\.\S+$/.test(values.customerEmail)) e.customerEmail = "Enter a valid email"
    const qty = Number(values.quantity)
    if (!Number.isInteger(qty) || qty < 1) e.quantity = "Quantity must be a whole number of at least 1"
    if (values.totalPrice !== "" && (Number.isNaN(Number(values.totalPrice)) || Number(values.totalPrice) < 0))
      e.totalPrice = "Total must be a positive number"

    if (custom) {
      const { min, max } = product.weightRange || {}
      const w = Number(values.preferredWeight)
      if (values.preferredWeight === "") e.preferredWeight = "Weight is required for custom silver"
      else if (Number.isNaN(w) || w < min || w > max) e.preferredWeight = `Weight must be between ${min} and ${max} tola`

      const { minHeight, maxHeight } = product.customOptions?.sizeRange || {}
      const h = Number(values.height)
      if (values.height !== "" && ((minHeight != null && h < minHeight) || (maxHeight != null && h > maxHeight)))
        e.height = `Height must be between ${minHeight ?? 0} and ${maxHeight ?? "any"}`

      if (!allowCustomDesign && designOptions.length && !designOptions.includes(values.design))
        e.design = "Choose one of the designs"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function buildBody() {
    const body = {
      customerName: values.customerName.trim(),
      customerPhone: values.customerPhone.trim(),
      customerEmail: values.customerEmail.trim() || undefined,
      customerAddress: values.customerAddress.trim() || undefined,
      quantity: Number(values.quantity),
      notes: values.notes.trim() || undefined,
      customization: values.customization.trim() || undefined,
    }
    // On edit, only resend the spec when it changed: the backend re-prices
    // custom orders from the spec, which would undo a manual price override.
    const specChanged = !isEdit || SPEC_FIELDS.some((f) => values[f] !== initialValues[f])
    if (custom && specChanged) {
      body.customSpecification = {
        preferredWeight: Number(values.preferredWeight),
        size: {
          height: values.height || undefined,
          width: values.width || undefined,
          length: values.length || undefined,
          unit: values.unit,
        },
        design: values.design.trim() || undefined,
        designNotes: values.designNotes.trim() || undefined,
        requiredBy: values.requiredBy || undefined,
      }
    }
    return body
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError("")
    if (!validate()) return
    setSaving(true)
    try {
      const body = buildBody()
      if (isEdit) {
        await ApiService.updateOrder(orderId, {
          ...body,
          // Send empty strings so cleared fields are cleared
          customerEmail: body.customerEmail ?? "",
          customerAddress: body.customerAddress ?? "",
          notes: body.notes ?? "",
          customization: body.customization ?? "",
          status: values.status,
          totalPrice: values.totalPrice === str(order.totalPrice) ? undefined : values.totalPrice,
        })
      } else {
        const { order: created } = await ApiService.createOrder({
          ...body,
          productId: values.productId,
          notifyCustomer: notifyCustomer && Boolean(body.customerEmail),
        })
        // New orders always start as pending; apply the chosen status/price after
        const extra = {}
        if (values.status !== "pending") extra.status = values.status
        if (values.totalPrice !== "") extra.totalPrice = values.totalPrice
        if (Object.keys(extra).length) await ApiService.updateOrder(created._id, extra)
      }
      navigate("/admin/orders", { replace: true })
    } catch (err) {
      const details = Array.isArray(err.details) ? `: ${err.details.join(", ")}` : ""
      setSubmitError(`${err.message || "Failed to save order"}${details}`)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSaving(false)
    }
  }

  if (loading || loadError) {
    return (
      <div className="py-24 text-center text-gray-600">
        {loadError ? (
          <>
            <p className="text-red-600 mb-4">{loadError}</p>
            <Link to="/admin/orders" className="text-blue-600 underline">Back to orders</Link>
          </>
        ) : (
          "Loading..."
        )}
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <ShoppingCart className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{isEdit ? "Edit Order" : "Create Order"}</h1>
          <p className="text-gray-600">
            {isEdit ? "The product can't be changed; create a new order instead." : "For orders taken by phone, WhatsApp or in the shop."}
          </p>
        </div>

        <Alert>{submitError}</Alert>

        <form onSubmit={onSubmit} noValidate className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 space-y-8">
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-gray-900 mb-2">Product</legend>
            {isEdit ? (
              <div className="rounded-md border p-4 text-sm">
                {product ? (
                  <>
                    <div className="font-medium text-gray-900">{product.title}</div>
                    <div className="text-gray-600">{product.category?.name} · {describeProduct(product)}</div>
                  </>
                ) : (
                  <span className="text-red-600">This order's product has been deleted.</span>
                )}
              </div>
            ) : (
              <Field label="Product" error={errors.productId}>
                <select value={values.productId} onChange={set("productId")} className={selectClass}>
                  <option value="">Select a product</option>
                  {productsByCategory.map(([category, items]) => (
                    <optgroup key={category} label={category}>
                      {items.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.title} — {describeProduct(p)} — {describePrice(p)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Quantity" error={errors.quantity}>
                <Input type="number" min={1} step={1} value={values.quantity} onChange={set("quantity")} />
              </Field>
              <Field label="Status">
                <select value={values.status} onChange={set("status")} className={selectClass}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>

          {custom && (
            <fieldset className="space-y-4 border-t pt-6">
              <legend className="text-lg font-semibold text-gray-900 pr-2">Custom specification</legend>
              <p className="text-sm text-gray-600 -mt-2">
                Allowed weight: {product.weightRange?.min}–{product.weightRange?.max} tola
                {product.customOptions?.productionTime &&
                  ` · Production: ${product.customOptions.productionTime.minDays}–${product.customOptions.productionTime.maxDays} days`}
              </p>
              <Field label="Weight (tola)" error={errors.preferredWeight}>
                <Input type="number" step="any" min={0} value={values.preferredWeight} onChange={set("preferredWeight")} />
              </Field>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Height" error={errors.height}>
                  <Input type="number" step="any" min={0} value={values.height} onChange={set("height")} />
                </Field>
                <Field label="Width">
                  <Input type="number" step="any" min={0} value={values.width} onChange={set("width")} />
                </Field>
                <Field label="Length">
                  <Input type="number" step="any" min={0} value={values.length} onChange={set("length")} />
                </Field>
                <Field label="Unit">
                  <select value={values.unit} onChange={set("unit")} className={selectClass}>
                    <option value="inch">inch</option>
                    <option value="cm">cm</option>
                  </select>
                </Field>
              </div>
              <Field label="Design" error={errors.design}>
                {designOptions.length > 0 && (
                  <select
                    value={designChoice}
                    onChange={(e) => {
                      setDesignChoice(e.target.value)
                      set("design")(e.target.value === OTHER_DESIGN ? "" : e.target.value)
                    }}
                    className={selectClass}
                  >
                    <option value="">Select a design</option>
                    {designOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    {allowCustomDesign && <option value={OTHER_DESIGN}>Other (describe)</option>}
                  </select>
                )}
                {(designChoice === OTHER_DESIGN || designOptions.length === 0) && (
                  <Input placeholder="Describe the design" value={values.design} onChange={set("design")} className="mt-2" />
                )}
              </Field>
              <Field label="Design notes">
                <Textarea rows={3} className="resize-none" value={values.designNotes} onChange={set("designNotes")} />
              </Field>
              <Field label="Needed by (optional)">
                <Input type="date" value={values.requiredBy} onChange={set("requiredBy")} />
              </Field>
            </fieldset>
          )}

          <fieldset className="space-y-4 border-t pt-6">
            <legend className="text-lg font-semibold text-gray-900 pr-2">Customer</legend>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name" error={errors.customerName}>
                <Input value={values.customerName} onChange={set("customerName")} />
              </Field>
              <Field label="Phone" error={errors.customerPhone}>
                <Input type="tel" value={values.customerPhone} onChange={set("customerPhone")} />
              </Field>
            </div>
            <Field label="Email (optional)" error={errors.customerEmail}>
              <Input type="email" value={values.customerEmail} onChange={set("customerEmail")} />
            </Field>
            {!isEdit && (
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={notifyCustomer}
                  disabled={!values.customerEmail.trim()}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                />
                <span>
                  Email the customer that their order has been placed
                  <span className="block text-xs text-gray-500">
                    {values.customerEmail.trim() ? "Uses the shop's order email settings." : "Add an email address to use this."}
                  </span>
                </span>
              </label>
            )}
            <Field label="Address (optional)">
              <Textarea rows={2} className="resize-none" value={values.customerAddress} onChange={set("customerAddress")} />
            </Field>
          </fieldset>

          <fieldset className="space-y-4 border-t pt-6">
            <legend className="text-lg font-semibold text-gray-900 pr-2">Price and notes</legend>
            <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700">
              Estimated total: <strong>{estimate != null ? formatRs(estimate) : "—"}</strong>
              {custom && (
                <span className="block text-xs text-gray-500 mt-1">
                  {isEdit ? "Uses the silver rate locked when the order was placed." : "Uses today's silver rate; it's locked in when the order is saved."}
                </span>
              )}
            </div>
            <Field label="Total price override (Rs, optional)" error={errors.totalPrice} hint="Leave as is to use the calculated price. Set it for a negotiated price.">
              <Input type="number" step="any" min={0} value={values.totalPrice} onChange={set("totalPrice")} />
            </Field>
            <Field label="Customization request (optional)">
              <Textarea rows={2} className="resize-none" value={values.customization} onChange={set("customization")} />
            </Field>
            <Field label="Notes (optional)">
              <Textarea rows={2} className="resize-none" value={values.notes} onChange={set("notes")} />
            </Field>
          </fieldset>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/admin/orders")}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
