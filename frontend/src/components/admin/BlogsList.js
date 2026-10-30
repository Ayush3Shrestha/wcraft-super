import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ExternalLink, ImageOff, Pencil, Plus, Star, Trash2 } from "lucide-react"
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
  formatDate,
  imageUrl,
} from "./adminUi"

const PAGE_SIZE = 20

const HEAD = [
  { label: "" },
  { label: "Title" },
  { label: "Topic" },
  { label: "Status" },
  { label: "Date" },
  { label: "Actions", className: "text-right" },
]

export default function BlogsList() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [filters, setFilters] = useState({ search: "", status: "", page: 1 })
  const [searchInput, setSearchInput] = useState("")
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await ApiService.getAdminBlogPosts({ ...filters, limit: PAGE_SIZE })
      setPosts(data.posts || [])
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message || "Failed to load blog posts")
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

  async function confirmDelete() {
    setDeleting(true)
    try {
      await ApiService.deleteBlogPost(toDelete._id)
      setNotice(`"${toDelete.title}" was deleted.`)
      setToDelete(null)
      load()
    } catch (err) {
      setError(err.message || "Failed to delete the post")
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Blog"
        description={pagination ? `${pagination.totalPosts} posts` : undefined}
        actions={
          <Button asChild>
            <Link to="/admin/blogs/new">
              <Plus className="mr-2 h-4 w-4" />
              New post
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by title..."
          className="sm:max-w-xs bg-white"
          aria-label="Search posts"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
          aria-label="Filter by status"
        >
          <option value="">All posts</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      <Alert type="success" onClose={() => setNotice("")}>{notice}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <Table head={HEAD}>
        {loading ? (
          <LoadingRow colSpan={HEAD.length} text="Loading posts..." />
        ) : posts.length === 0 ? (
          <EmptyRow colSpan={HEAD.length}>
            No posts yet. <Link to="/admin/blogs/new" className="text-blue-600 underline">Write the first one</Link>.
          </EmptyRow>
        ) : (
          posts.map((post) => {
            const src = imageUrl(post.previewImage)
            const published = post.status === "published"
            return (
              <tr key={post._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {src ? (
                    <img src={src} alt="" className="h-12 w-16 rounded-md object-cover bg-gray-100" />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded-md bg-gray-100">
                      <ImageOff className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{post.title}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {post.author?.name}
                    {post.isFeatured && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <Star className="h-3 w-3 fill-current" /> Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{post.topic || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(post.publishedAt || post.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {published && (
                      <Button variant="ghost" size="icon" title="View on the site" asChild>
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${post.title}`}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      aria-label={`Edit ${post.title}`}
                      onClick={() => navigate(`/admin/blogs/${post._id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      aria-label={`Delete ${post.title}`}
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setToDelete(post)}
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
        title="Delete post?"
        message={toDelete ? deleteMessage(toDelete.title) : ""}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
