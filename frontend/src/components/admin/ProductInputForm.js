import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Package, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Label } from "../ui/label"
import ApiService from "../../services/apiService"
import ProductImagesField, { appendImages, existingImageItems, releaseImageItems } from "./ProductImagesField"

// Option lists mirror backend/src/Config/productTypes.js
const SILVER_TYPES = [
  { value: "stock", label: "Stock (ready made, fixed weight)" },
  { value: "custom", label: "Custom (made to the customer's specification)" },
]
const GOLD_FINISHES = [
  { value: "oxidized", label: "Oxidized" },
  { value: "color", label: "Color" },
  { value: "half_gold", label: "Half Gold" },
  { value: "full_gold", label: "Full Gold" },
]
const PLATING_METHODS = [
  { value: "electroplated", label: "Electroplated" },
  { value: "fire_gold_plated", label: "Fire Gold Plated" },
]
const BASE_METALS = [
  { value: "copper", label: "Copper" },
  { value: "bronze", label: "Bronze" },
  { value: "brass", label: "Brass" },
]
const UNITS = [
  { value: "inch", label: "inch" },
  { value: "cm", label: "cm" },
]

const EMPTY_VALUES = {
  category: "",
  materialType: "", // copied from the selected category
  title: "",
  description: "",
  height: "",
  width: "",
  length: "",
  unit: "inch",
  // silver
  silverType: "",
  makingCost: "",
  weightInTola: "",
  stockQuantity: "",
  weightMin: "",
  weightMax: "",
  minHeight: "",
  maxHeight: "",
  designOptions: "",
  allowCustomDesign: true,
  minDays: "",
  maxDays: "",
  // gold / copper / bronze
  constantPrice: "",
  goldFinish: "",
  platingMethod: "",
  baseMetal: "",
  weightInKg: "",
  finish: "",
  isActive: true,
}

const str = (v) => (v === undefined || v === null ? "" : String(v))

// Fill the form from an existing product (edit mode)
function productToValues(p) {
  const dims = p.dimensions || {}
  const opts = p.customOptions || {}
  return {
    ...EMPTY_VALUES,
    category: p.category?._id || p.category || "",
    materialType: p.category?.materialType || "",
    title: p.title || "",
    description: p.description || "",
    height: str(dims.height),
    width: str(dims.width),
    length: str(dims.length),
    unit: dims.unit || opts.sizeRange?.unit || "inch",
    silverType: p.silverType || "",
    makingCost: str(p.makingCost),
    weightInTola: str(p.weightInTola),
    stockQuantity: str(p.stockQuantity),
    weightMin: str(p.weightRange?.min),
    weightMax: str(p.weightRange?.max),
    minHeight: str(opts.sizeRange?.minHeight),
    maxHeight: str(opts.sizeRange?.maxHeight),
    designOptions: (opts.designOptions || []).join(", "),
    allowCustomDesign: opts.allowCustomDesign !== false,
    minDays: str(opts.productionTime?.minDays),
    maxDays: str(opts.productionTime?.maxDays),
    constantPrice: str(p.constantPrice),
    goldFinish: p.goldFinish || "",
    platingMethod: p.platingMethod || "",
    baseMetal: p.baseMetal || "",
    weightInKg: str(p.weightInKg),
    finish: p.finish || "",
    isActive: p.isActive !== false,
  }
}

// Which categories a product may move to: the backend keeps each product
// type in its own schema, so only categories of the same type qualify.
const PRODUCT_TYPE_BY_MATERIAL = { silver: "silver", gold: "gold", copper: "metal", bronze: "metal" }

const isBlank = (v) => v === undefined || v === null || String(v).trim() === ""
const num = (v) => (isBlank(v) ? undefined : Number(v))

// Form values are kept as strings; the per-material rules run here so the
// form shows the same errors the backend would return.
const productSchema = z
  .object({
      category: z.string().min(1, "Category is required"),
      title: z.string().trim().min(1, "Product name is required"),
      description: z.string().trim().min(1, "Description is required"),
    })
    .passthrough()
    .superRefine((values, ctx) => {
      const { materialType } = values
      const issue = (path, message) => ctx.addIssue({ code: "custom", path: [path], message })

      const requireNumber = (path, label) => {
        if (isBlank(values[path])) issue(path, `${label} is required`)
        else if (Number.isNaN(Number(values[path])) || Number(values[path]) < 0)
          issue(path, `${label} must be a positive number`)
      }
      const optionalNumber = (path, label) => {
        if (!isBlank(values[path]) && (Number.isNaN(Number(values[path])) || Number(values[path]) < 0))
          issue(path, `${label} must be a positive number`)
      }

      ;["height", "width", "length"].forEach((f) => optionalNumber(f, f[0].toUpperCase() + f.slice(1)))

      if (materialType === "silver") {
        if (!values.silverType) issue("silverType", "Choose stock or custom")
        requireNumber("makingCost", "Making cost")

        if (values.silverType === "stock") {
          requireNumber("weightInTola", "Weight")
          optionalNumber("stockQuantity", "Stock quantity")
        }

        if (values.silverType === "custom") {
          requireNumber("weightMin", "Minimum weight")
          requireNumber("weightMax", "Maximum weight")
          if (num(values.weightMin) > num(values.weightMax))
            issue("weightMax", "Maximum weight must be at least the minimum")
          optionalNumber("minHeight", "Minimum height")
          optionalNumber("maxHeight", "Maximum height")
          if (num(values.minHeight) > num(values.maxHeight))
            issue("maxHeight", "Maximum height must be at least the minimum")
          requireNumber("minDays", "Minimum production days")
          requireNumber("maxDays", "Maximum production days")
          if (num(values.minDays) > num(values.maxDays))
            issue("maxDays", "Maximum days must be at least the minimum")
        }
      }

      if (materialType === "gold") {
        requireNumber("constantPrice", "Price")
        if (!values.goldFinish) issue("goldFinish", "Choose a gold finish")
        if (values.goldFinish === "full_gold" && !values.platingMethod)
          issue("platingMethod", "Choose electroplated or fire gold plated")
        optionalNumber("weightInKg", "Weight")
        optionalNumber("stockQuantity", "Stock quantity")
      }

      if (materialType === "copper" || materialType === "bronze") {
        requireNumber("constantPrice", "Price")
        optionalNumber("weightInKg", "Weight")
        optionalNumber("stockQuantity", "Stock quantity")
      }
    })

// Turn form values into the multipart body POST /api/products expects
function toFormData(values, materialType, images) {
  const fd = new FormData()
  const add = (key, value) => {
    if (!isBlank(value)) fd.append(key, value)
  }

  add("category", values.category)
  add("title", values.title.trim())
  add("description", values.description.trim())
  add("height", values.height)
  add("width", values.width)
  add("length", values.length)
  add("unit", values.unit)
  fd.append("isActive", String(values.isActive !== false))

  if (materialType === "silver") {
    add("silverType", values.silverType)
    add("makingCost", values.makingCost)
    if (values.silverType === "stock") {
      add("weightInTola", values.weightInTola)
      add("stockQuantity", values.stockQuantity)
    } else {
      add("weightRange[min]", values.weightMin)
      add("weightRange[max]", values.weightMax)
      const sizeRange = {}
      if (!isBlank(values.minHeight)) sizeRange.minHeight = num(values.minHeight)
      if (!isBlank(values.maxHeight)) sizeRange.maxHeight = num(values.maxHeight)
      if (Object.keys(sizeRange).length) sizeRange.unit = values.unit
      fd.append(
        "customOptions",
        JSON.stringify({
          sizeRange: Object.keys(sizeRange).length ? sizeRange : undefined,
          designOptions: values.designOptions
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
          allowCustomDesign: values.allowCustomDesign,
          productionTime: { minDays: num(values.minDays), maxDays: num(values.maxDays) },
        })
      )
    }
  } else if (materialType === "gold") {
    add("constantPrice", values.constantPrice)
    add("goldFinish", values.goldFinish)
    if (values.goldFinish === "full_gold") add("platingMethod", values.platingMethod)
    add("baseMetal", values.baseMetal)
    add("weightInKg", values.weightInKg)
    add("stockQuantity", values.stockQuantity)
  } else {
    add("constantPrice", values.constantPrice)
    add("weightInKg", values.weightInKg)
    add("finish", values.finish)
    add("stockQuantity", values.stockQuantity)
  }

  appendImages(fd, images)
  return fd
}

// --- small field helpers ---------------------------------------------------

function TextField({ control, name, label, description, type = "text", placeholder, step }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} step={step} min={type === "number" ? 0 : undefined} placeholder={placeholder} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function SelectField({ control, name, label, description, options, placeholder = "Select..." }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function Section({ title, children }) {
  return (
    <fieldset className="space-y-6 border-t pt-6">
      <legend className="text-lg font-semibold text-gray-900 pr-2">{title}</legend>
      {children}
    </fieldset>
  )
}

// ---------------------------------------------------------------------------

export default function ProductInputForm() {
  const { productId } = useParams()
  const isEdit = Boolean(productId)
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loadError, setLoadError] = useState("")
  const [images, setImages] = useState([])
  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState("")
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [submitError, setSubmitError] = useState("")
  const [created, setCreated] = useState(null)

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_VALUES,
  })

  const materialType = form.watch("materialType")
  const silverType = form.watch("silverType")
  const goldFinish = form.watch("goldFinish")

  useEffect(() => {
    ApiService.getAllCategories()
      .then((data) => setCategories(data.categories || []))
      .catch((err) => setCategoriesError(err.message || "Failed to load categories"))
      .finally(() => setLoadingCategories(false))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    ApiService.getProductById(productId)
      .then((data) => {
        setProduct(data.product)
        setImages(existingImageItems(data.product.images))
        form.reset(productToValues(data.product))
      })
      .catch((err) => setLoadError(err.message || "Failed to load product"))
  }, [isEdit, productId]) // eslint-disable-line react-hooks/exhaustive-deps

  // In edit mode only offer categories with the same product type
  const productType = isEdit && product ? product.productType || PRODUCT_TYPE_BY_MATERIAL[product.category?.materialType] : null
  const categoryOptions = productType
    ? categories.filter((c) => PRODUCT_TYPE_BY_MATERIAL[c.materialType] === productType)
    : categories

  async function onSubmit(values) {
    setSubmitError("")
    setCreated(null)
    try {
      if (isEdit) {
        await ApiService.updateProduct(productId, toFormData(values, materialType, images))
        navigate("/admin/products", { replace: true })
        return
      }
      const result = await ApiService.createProduct(toFormData(values, materialType, images))
      setCreated(result.product)
      // Keep the category selected so similar products are quick to add
      form.reset({ ...EMPTY_VALUES, category: values.category, materialType: values.materialType })
      releaseImageItems(images)
      setImages([])
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      const details = err.details ? Object.values(err.details).join(" ") : ""
      setSubmitError(`${err.message || "Failed to save product"}${details ? `: ${details}` : ""}`)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  if (isEdit && !product) {
    return (
      <div className="py-24 text-center text-gray-600">
        {loadError ? (
          <>
            <p className="text-red-600 mb-4">{loadError}</p>
            <Link to="/admin/products" className="text-blue-600 underline">Back to products</Link>
          </>
        ) : (
          "Loading product..."
        )}
      </div>
    )
  }

  const { control } = form
  const isSubmitting = form.formState.isSubmitting

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{isEdit ? "Edit Product" : "Add New Product"}</h1>
          <p className="text-gray-600">
            {isEdit
              ? "Categories are limited to the same material, because each material stores different fields."
              : "The fields change with the material of the category you pick."}
          </p>
        </div>

        {created && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <p className="text-sm text-green-800">
              <strong>{created.title}</strong> was created.
            </p>
          </div>
        )}

        {submitError && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto" noValidate>
              <FormField
                control={control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        const cat = categories.find((c) => c._id === value)
                        form.setValue("materialType", cat?.materialType || "")
                      }}
                      value={field.value}
                      disabled={loadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select a category"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id} disabled={!cat.materialType}>
                            {cat.name}
                            {cat.materialType ? ` (${cat.materialType})` : " (no material set)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {categoriesError && <p className="text-sm text-red-600">{categoriesError}</p>}
                    {!loadingCategories && !categoriesError && categories.length === 0 && (
                      <p className="text-sm text-gray-600">
                        No categories yet. <Link to="/admin/categories/new" className="text-blue-600 underline">Create one first</Link>.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {materialType && (
                <>
                  <Section title="Basic details">
                    <TextField control={control} name="title" label="Product name" placeholder="e.g. Shakyamuni Buddha" />
                    <FormField
                      control={control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Product description" className="resize-none" rows={4} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <ProductImagesField items={images} onChange={setImages} />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <TextField control={control} name="height" label="Height" type="number" step="any" />
                      <TextField control={control} name="width" label="Width" type="number" step="any" />
                      <TextField control={control} name="length" label="Length" type="number" step="any" />
                      <SelectField control={control} name="unit" label="Unit" options={UNITS} />
                    </div>
                  </Section>

                  {materialType === "silver" && (
                    <Section title="Silver details">
                      <p className="text-sm text-gray-600 -mt-2">
                        Price = today's silver rate per tola × weight + making cost.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <SelectField control={control} name="silverType" label="Listing type" options={SILVER_TYPES} />
                        <TextField control={control} name="makingCost" label="Making cost (Rs)" type="number" step="any" />
                      </div>

                      {silverType === "stock" && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          <TextField control={control} name="weightInTola" label="Weight (tola)" type="number" step="any" />
                          <TextField control={control} name="stockQuantity" label="Stock quantity" type="number" />
                        </div>
                      )}

                      {silverType === "custom" && (
                        <>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <TextField control={control} name="weightMin" label="Minimum weight (tola)" type="number" step="any" />
                            <TextField control={control} name="weightMax" label="Maximum weight (tola)" type="number" step="any" />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <TextField control={control} name="minHeight" label="Minimum height" type="number" step="any" description="Smallest size the customer can order (unit above)." />
                            <TextField control={control} name="maxHeight" label="Maximum height" type="number" step="any" description="Largest size the customer can order." />
                          </div>
                          <TextField
                            control={control}
                            name="designOptions"
                            label="Design options"
                            placeholder="Green Tara, White Tara, Medicine Buddha"
                            description="Comma separated. Leave empty to let customers describe their own."
                          />
                          <FormField
                            control={control}
                            name="allowCustomDesign"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-start gap-3 rounded-md border p-4">
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                                  </FormControl>
                                  <div className="grid gap-1">
                                    <Label className="font-medium">Allow customers' own designs</Label>
                                    <p className="text-muted-foreground text-xs">
                                      If off, customers must pick one of the design options above.
                                    </p>
                                  </div>
                                </div>
                              </FormItem>
                            )}
                          />
                          <div className="grid sm:grid-cols-2 gap-4">
                            <TextField control={control} name="minDays" label="Production time, from (days)" type="number" />
                            <TextField control={control} name="maxDays" label="Production time, to (days)" type="number" />
                          </div>
                        </>
                      )}
                    </Section>
                  )}

                  {materialType === "gold" && (
                    <Section title="Gold details">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <SelectField control={control} name="goldFinish" label="Gold finish" options={GOLD_FINISHES} />
                        {goldFinish === "full_gold" && (
                          <SelectField control={control} name="platingMethod" label="Plating method" options={PLATING_METHODS} />
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <TextField control={control} name="constantPrice" label="Price (Rs)" type="number" step="any" />
                        <SelectField control={control} name="baseMetal" label="Base metal (optional)" options={BASE_METALS} />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <TextField control={control} name="weightInKg" label="Weight (kg, optional)" type="number" step="any" />
                        <TextField control={control} name="stockQuantity" label="Stock quantity" type="number" />
                      </div>
                    </Section>
                  )}

                  {(materialType === "copper" || materialType === "bronze") && (
                    <Section title={`${materialType === "copper" ? "Copper" : "Bronze"} details`}>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <TextField control={control} name="constantPrice" label="Price (Rs)" type="number" step="any" />
                        <TextField control={control} name="weightInKg" label="Weight (kg, optional)" type="number" step="any" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <TextField control={control} name="finish" label="Finish (optional)" placeholder="e.g. antique, polished" />
                        <TextField control={control} name="stockQuantity" label="Stock quantity" type="number" />
                      </div>
                    </Section>
                  )}

                  <FormField
                    control={control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3 rounded-md border p-4">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                          </FormControl>
                          <div className="grid gap-1">
                            <Label className="font-medium">Visible in shop</Label>
                            <p className="text-muted-foreground text-xs">Turn off to hide the product without deleting it.</p>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    {isEdit && (
                      <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/admin/products")}>
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add product"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
