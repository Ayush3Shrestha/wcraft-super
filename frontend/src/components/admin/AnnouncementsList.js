import { useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"
import ApiService from "../../services/apiService"
import { Alert, ConfirmDialog, EmptyRow, LoadingRow, PageHeader, Table, deleteMessage } from "./adminUi"

const MAX_TEXT = 120

const HEAD = [
  { label: "Order" },
  { label: "Text" },
  { label: "Showing" },
  { label: "Actions", className: "text-right" },
]

const RATE_NOTE = {
  silver_rate: "Followed by today's silver rate and its daily change",
  gold_rate: "Followed by today's gold rate and its daily change",
}

// A row's text, saved when the admin changes it and presses Save
function TextCell({ item, disabled, onSave }) {
  const [draft, setDraft] = useState(item.text)
  useEffect(() => setDraft(item.text), [item.text])
  const changed = draft.trim() !== item.text
  const save = (e) => {
    e.preventDefault()
    if (changed && draft.trim()) onSave(item, draft.trim())
  }
  return (
    <form onSubmit={save} className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <Input
          value={draft}
          maxLength={MAX_TEXT}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={item.type === "text" ? "Announcement text" : "Label for the live rate"}
          className="bg-white"
        />
        {RATE_NOTE[item.type] && <p className="mt-1 text-xs text-gray-500">{RATE_NOTE[item.type]}</p>}
      </div>
      {changed && (
        <Button type="submit" size="sm" disabled={disabled || !draft.trim()}>
          Save
        </Button>
      )}
    </form>
  )
}

export default function AnnouncementsList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [newText, setNewText] = useState("")
  const [toDelete, setToDelete] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await ApiService.getAdminAnnouncements()
      setItems(data.announcements || [])
    } catch (err) {
      setError(err.message || "Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Run a change, show any problem, then reload what's saved
  async function run(action, successMessage) {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await action()
      if (successMessage) setNotice(successMessage)
      await load()
      return true
    } catch (err) {
      const details = err.details ? Object.values(err.details).join(" ") : ""
      setError(details || err.message || "Something went wrong")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function add(e) {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return
    if (await run(() => ApiService.createAnnouncement(text), "Announcement added.")) setNewText("")
  }

  const move = (index, dir) => {
    const ids = items.map((i) => i._id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + dir, 0, id)
    run(() => ApiService.reorderAnnouncements(ids))
  }

  const confirmDelete = async () => {
    const item = toDelete
    setToDelete(null)
    await run(() => ApiService.deleteAnnouncement(item._id), "Announcement deleted.")
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title="Announcements" description="The scrolling messages in the bar above the shop's navbar." />

      <Alert type="success" onClose={() => setNotice("")}>{notice}</Alert>
      <Alert onClose={() => setError("")}>{error}</Alert>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input
          value={newText}
          maxLength={MAX_TEXT}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a message, e.g. Free delivery inside Kathmandu valley"
          aria-label="New announcement"
          className="bg-white"
        />
        <Button type="submit" disabled={busy || !newText.trim()} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </form>

      <Table head={HEAD}>
        {loading ? (
          <LoadingRow colSpan={HEAD.length} text="Loading announcements..." />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={HEAD.length}>No announcements yet.</EmptyRow>
        ) : (
          items.map((item, i) => (
            <tr key={item._id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <Button variant="ghost" size="icon" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move "${item.text}" up`}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={busy || i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move "${item.text}" down`}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </td>
              <td className="w-full min-w-64 px-4 py-3">
                <TextCell item={item} disabled={busy} onSave={(it, text) => run(() => ApiService.updateAnnouncement(it._id, { text }), "Announcement saved.")} />
              </td>
              <td className="px-4 py-3">
                <Switch
                  checked={item.isActive}
                  disabled={busy}
                  onCheckedChange={(on) => run(() => ApiService.updateAnnouncement(item._id, { isActive: on }))}
                  aria-label={`Show "${item.text}" in the bar`}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  {item.type === "text" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      aria-label={`Delete "${item.text}"`}
                      className="text-red-600 hover:text-red-700"
                      disabled={busy}
                      onClick={() => setToDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="whitespace-nowrap text-xs font-medium text-gray-500">Live rate</span>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete announcement?"
        message={toDelete ? deleteMessage(toDelete.text) : ""}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
