import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useParams } from "react-router-dom"
import { FolderPlus, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "../ui/button"
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
import ApiService from "../../services/apiService"
import { imageUrl as toImageUrl } from "../../lib/productDisplay"

// Mirrors MATERIAL_TYPES in backend/src/Config/productTypes.js
const MATERIAL_TYPES = [
  { value: "silver", label: "Silver", hint: "Stock or custom pieces, priced on the live silver rate." },
  { value: "gold", label: "Gold", hint: "Oxidized, color, half gold or full gold (electroplated / fire gold plated)." },
  { value: "copper", label: "Copper", hint: "Copper sculptures and statues with a fixed price." },
  { value: "bronze", label: "Bronze", hint: "Bronze sculptures and statues with a fixed price." },
]

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  materialType: z.string().min(1, "Material is required"),
  description: z.string().optional(),
  // A pasted URL, or the /uploads/... path of an image uploaded earlier
  imageUrl: z.union([z.literal(""), z.string().trim().regex(/^\/uploads\//), z.string().trim().url("Enter a valid URL")]),
})

const EMPTY = { name: "", materialType: "", description: "", imageUrl: "" }

export default function CategoryInputForm() {
  const { categoryId } = useParams()
  const isEdit = Boolean(categoryId)
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState("")
  const [created, setCreated] = useState(null)
  const [loaded, setLoaded] = useState(!isEdit)
  const [loadError, setLoadError] = useState("")
  const [productCount, setProductCount] = useState(0)
  const [imageFile, setImageFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const filePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile])
  useEffect(() => () => filePreview && URL.revokeObjectURL(filePreview), [filePreview])

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: EMPTY,
  })
  const materialType = form.watch("materialType")
  const hint = MATERIAL_TYPES.find((m) => m.value === materialType)?.hint

  useEffect(() => {
    if (!isEdit) return
    Promise.all([
      ApiService.getCategoryById(categoryId),
      ApiService.getProductsByCategory(categoryId, { limit: 1 }),
    ])
      .then(([category, products]) => {
        form.reset({
          name: category.name || "",
          materialType: category.materialType || "",
          description: category.description || "",
          imageUrl: category.imageUrl || "",
        })
        setProductCount(products.pagination?.totalProducts || 0)
        setLoaded(true)
      })
      .catch((err) => setLoadError(err.message || "Failed to load category"))
  }, [isEdit, categoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Products are stored with their material's schema, so the backend only
  // lets the material change while the category is empty.
  const materialLocked = isEdit && productCount > 0

  async function onSubmit(values) {
    setSubmitError("")
    setCreated(null)
    try {
      const body = {
        name: values.name.trim(),
        materialType: values.materialType,
        description: values.description?.trim() || (isEdit ? "" : undefined),
        imageUrl: values.imageUrl?.trim() || (isEdit ? "" : undefined),
      }
      // Send multipart only when there's a file to upload
      let payload = body
      if (imageFile) {
        payload = new FormData()
        Object.entries(body).forEach(([k, v]) => v !== undefined && payload.append(k, v))
        payload.append("image", imageFile)
      }
      if (isEdit) {
        await ApiService.updateCategory(categoryId, payload)
        navigate("/admin/categories", { replace: true })
        return
      }
      const result = await ApiService.createCategory(payload)
      setCreated(result.category)
      form.reset(EMPTY)
      setImageFile(null)
      setFileInputKey((k) => k + 1)
    } catch (err) {
      setSubmitError(err.message || "Failed to save category")
    }
  }

  if (!loaded) {
    return (
      <div className="py-24 text-center text-gray-600">
        {loadError ? (
          <>
            <p className="text-red-600 mb-4">{loadError}</p>
            <Link to="/admin/categories" className="text-blue-600 underline">Back to categories</Link>
          </>
        ) : (
          "Loading category..."
        )}
      </div>
    )
  }

  const { control } = form

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <FolderPlus className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{isEdit ? "Edit Category" : "Add Category"}</h1>
          <p className="text-gray-600">The material decides which fields its products have.</p>
        </div>

        {created && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <p className="text-sm text-green-800">
              Category <strong>{created.name}</strong> was created.{" "}
              <Link to="/admin/products/new" className="underline">Add a product to it</Link>.
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Silver Statues" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="materialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={materialLocked}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MATERIAL_TYPES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {materialLocked ? (
                      <FormDescription>
                        Locked because this category has {productCount} product{productCount === 1 ? "" : "s"}. Move or delete them to change the material.
                      </FormDescription>
                    ) : (
                      hint && <FormDescription>{hint}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image (optional)</FormLabel>
                    {(imageFile || field.value) && (
                      <img
                        src={filePreview || toImageUrl(field.value)}
                        alt=""
                        className="h-32 w-full max-w-xs rounded-md object-cover bg-gray-100"
                      />
                    )}
                    <input
                      key={fileInputKey}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm"
                    />
                    <FormDescription>Upload an image, or paste an image URL below. An upload replaces the URL.</FormDescription>
                    <FormControl>
                      <Input type="text" placeholder="https://..." {...field} disabled={!!imageFile} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                {isEdit && (
                  <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/admin/categories")}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add category"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
