import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Minus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { Button } from "../ui/button"
import ApiService from "../../services/apiService"
import { Alert, EmptyRow, LoadingRow, PageHeader, Pagination, Table, formatRs } from "./adminUi"

const PAGE_SIZE = 20

const METALS = [
  { value: "silver", label: "Silver", dot: "bg-slate-400", fetch: (params) => ApiService.getSilverPriceHistory(params) },
  { value: "gold", label: "Gold", dot: "bg-amber-400", fetch: (params) => ApiService.getGoldPriceHistory(params) },
]

const HEAD = [
  { label: "Date" },
  { label: "Price per tola" },
  { label: "Day's change" },
  { label: "Since previous record" },
  { label: "Last scraped" },
]

// Prices are recorded per Nepal day, so dates are shown in Nepal time wherever
// the admin is
const TIME_ZONE = "Asia/Kathmandu"
const formatDay = (value) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TIME_ZONE })
const formatTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE })
    : "—"

function Change({ amount, children }) {
  const up = amount > 0
  const down = amount < 0
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap font-medium ${up ? "text-green-700" : down ? "text-red-700" : "text-gray-500"}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  )
}

const signed = (amount) => (amount === 0 ? "No change" : `${amount > 0 ? "+" : "-"}${formatRs(Math.abs(amount))}`)

// The change reported by the source that day, e.g. "+600", "-20" or 0
function DayChange({ value }) {
  const amount = Number(String(value ?? "").replace(/[,\s]/g, ""))
  if (value == null || value === "" || Number.isNaN(amount)) return <span className="text-gray-400">—</span>
  return <Change amount={amount}>{signed(amount)}</Change>
}

// Days can be missing from the history, so this names the day it compares with
function SincePrevious({ record, previous }) {
  if (!previous) return <span className="text-gray-400">First record</span>
  const amount = record.pricePerTola - previous.pricePerTola
  const percent = previous.pricePerTola ? Math.abs((amount / previous.pricePerTola) * 100).toFixed(2) : null
  return (
    <div>
      <Change amount={amount}>
        {signed(amount)}
        {amount !== 0 && percent != null && <span className="text-xs font-normal">({percent}%)</span>}
      </Change>
      <div className="text-xs text-gray-500">since {formatDay(previous.effectiveDate)}</div>
    </div>
  )
}

export default function PriceHistory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const metal = METALS.find((m) => m.value === searchParams.get("metal")) || METALS[0]
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState([])
  // The record just after this page, to compare the page's last row with
  const [olderRecord, setOlderRecord] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    ;(async () => {
      try {
        const data = await metal.fetch({ page, limit: PAGE_SIZE })
        const older = data.pagination?.hasNext ? await metal.fetch({ page: page * PAGE_SIZE + 1, limit: 1 }) : null
        if (cancelled) return
        setRecords(data.history || [])
        setOlderRecord(older?.history?.[0] || null)
        setPagination(data.pagination)
      } catch (err) {
        if (!cancelled) {
          setRecords([])
          setPagination(null)
          setError(err.message || `Failed to load ${metal.label.toLowerCase()} price history`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [metal, page, refreshKey])

  const selectMetal = (value) => {
    setPage(1)
    setSearchParams(value === METALS[0].value ? {} : { metal: value }, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Price History"
        description={pagination ? `${pagination.totalRecords} daily ${metal.label.toLowerCase()} rates, newest first` : "Daily silver and gold rates per tola"}
        actions={
          <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 inline-flex rounded-lg bg-gray-100 p-1" role="group" aria-label="Metal">
        {METALS.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={m.value === metal.value}
            onClick={() => selectMetal(m.value)}
            className={`inline-flex items-center gap-2 rounded-md px-5 py-1.5 text-sm font-medium transition-colors ${
              m.value === metal.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} aria-hidden="true" />
            {m.label}
          </button>
        ))}
      </div>

      <Alert onClose={() => setError("")}>{error}</Alert>

      <Table head={HEAD}>
        {loading ? (
          <LoadingRow colSpan={HEAD.length} text="Loading price history..." />
        ) : records.length === 0 ? (
          <EmptyRow colSpan={HEAD.length}>
            {error ? "Couldn't load the history." : `No ${metal.label.toLowerCase()} prices have been recorded yet.`}
          </EmptyRow>
        ) : (
          records.map((record, i) => (
            <tr key={record._id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{formatDay(record.effectiveDate)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">{formatRs(record.pricePerTola)}</td>
              <td className="px-4 py-3">
                <DayChange value={record.dailyChange} />
              </td>
              <td className="px-4 py-3">
                <SincePrevious record={record} previous={records[i + 1] || olderRecord} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatTime(record.lastScrapedAt)}</td>
            </tr>
          ))
        )}
      </Table>

      <Pagination pagination={pagination} onPage={setPage} />
    </div>
  )
}
