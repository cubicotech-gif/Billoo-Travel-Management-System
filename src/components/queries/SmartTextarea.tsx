import { useState, useEffect, useRef } from 'react'
import { Sparkles, Lightbulb, X } from 'lucide-react'
import { localCleanup } from '@/lib/textUtils'

interface DetectedField {
  label: string
  field: string
  value: string | number
}

interface SmartTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  label?: string
  sublabel?: string
  onAutoFill?: (fields: Record<string, string | number>) => void
}

// ─── MONTH DETECTION ───────────────────────────────────────────────
const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
}

function detectApproxDate(text: string): { label: string; date: string } | null {
  const lower = text.toLowerCase()
  const now = new Date()
  const currentYear = now.getFullYear()

  // Match: "mid of may", "start of june", "end of march", "early april", "late july"
  const periodMatch = lower.match(
    /(?:mid|middle|start|beginning|early|end|late|last\s+week|first\s+week|second\s+week)\s*(?:of\s+)?(?:the\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i
  )

  if (periodMatch) {
    const period = periodMatch[0].toLowerCase()
    const monthStr = periodMatch[1].toLowerCase()
    const monthIdx = MONTH_MAP[monthStr]
    if (monthIdx === undefined) return null

    let year = currentYear
    // If month already passed this year, assume next year
    if (monthIdx < now.getMonth() || (monthIdx === now.getMonth() && now.getDate() > 20)) year++

    let day = 15
    if (period.includes('start') || period.includes('beginning') || period.includes('early') || period.includes('first week')) day = 5
    if (period.includes('end') || period.includes('late') || period.includes('last week')) day = 25

    const date = new Date(year, monthIdx, day)
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const monthName = date.toLocaleString('default', { month: 'long' })

    return { label: `~${day} ${monthName} ${year}`, date: dateStr }
  }

  // Match: "in may", "in june", "march" standalone
  const monthOnlyMatch = lower.match(
    /\b(?:in\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
  )
  if (monthOnlyMatch) {
    const monthStr = monthOnlyMatch[1].toLowerCase()
    const monthIdx = MONTH_MAP[monthStr]
    if (monthIdx === undefined) return null

    let year = currentYear
    if (monthIdx < now.getMonth() || (monthIdx === now.getMonth() && now.getDate() > 20)) year++

    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-15`
    const monthName = new Date(year, monthIdx, 1).toLocaleString('default', { month: 'long' })

    return { label: `~${monthName} ${year}`, date: dateStr }
  }

  return null
}

// ─── FIELD DETECTION ───────────────────────────────────────────────
function parseDetectedFields(text: string): DetectedField[] {
  const fields: DetectedField[] = []
  const lower = text.toLowerCase()

  // 1. Detect SERVICE TYPE
  const umrahWords = ['umrah', 'umra', 'umrh', 'umrha', 'omra', 'omrah', 'umerah']
  const hajjWords = ['hajj', 'haj']
  if (umrahWords.some((w) => lower.includes(w))) {
    fields.push({ label: 'Umrah Package', field: 'service_type', value: 'Umrah Package' })
  } else if (hajjWords.some((w) => lower.includes(w))) {
    fields.push({ label: 'Hajj Package', field: 'service_type', value: 'Hajj Package' })
  } else if (/\bvisa\b/i.test(lower)) {
    fields.push({ label: 'Visa Service', field: 'service_type', value: 'Visa Service' })
  } else if (/\b(?:ticket|flight|fly|plane)\b/i.test(lower)) {
    fields.push({ label: 'Ticket Booking', field: 'service_type', value: 'Ticket Booking' })
  } else if (/\b(?:hotel|room|stay|accommodation)\b/i.test(lower)) {
    fields.push({ label: 'Hotel Only', field: 'service_type', value: 'Hotel Only' })
  } else if (/\b(?:transport|transfer|pickup|drop)\b/i.test(lower)) {
    fields.push({ label: 'Transport Service', field: 'service_type', value: 'Transport Service' })
  } else if (/\b(?:tour|leisure|holiday|vacation)\b/i.test(lower)) {
    fields.push({ label: 'Leisure Tourism', field: 'service_type', value: 'Leisure Tourism' })
  }

  // 2. Detect PACKAGE NIGHTS
  const nightsMatch = lower.match(/(\d+)\s*(?:nights?|nts|nghts?)/)
  if (nightsMatch) {
    fields.push({ label: `${nightsMatch[1]} nights`, field: 'package_nights', value: parseInt(nightsMatch[1]) })
  } else {
    const daysMatch = lower.match(/(\d+)\s*(?:days?|dys)/)
    if (daysMatch) {
      const nights = parseInt(daysMatch[1]) + 1
      fields.push({ label: `${nights} nights (from ${daysMatch[1]} days)`, field: 'package_nights', value: nights })
    }
  }

  // 3. Detect CITY ORDER
  if (/makkah\s*first|mecca\s*first|makka\s*first|pehle\s*makk/i.test(lower)) {
    fields.push({ label: 'Makkah First', field: 'city_order', value: 'makkah_first' })
  } else if (/madinah?\s*first|medina\s*first|pehle\s*madin/i.test(lower)) {
    fields.push({ label: 'Madinah First', field: 'city_order', value: 'madinah_first' })
  }

  // 4. Detect MAKKAH NIGHTS
  const makkahNightsMatch = lower.match(/(\d+)\s*(?:nights?|nts)\s*(?:in\s+)?(?:makkah|mecca|makka)/i) ||
    lower.match(/(?:makkah|mecca|makka)\s*(?:mein?\s*)?(\d+)\s*(?:nights?|nts)/i)
  if (makkahNightsMatch) {
    const n = parseInt(makkahNightsMatch[1])
    fields.push({ label: `${n} nights Makkah`, field: 'makkah_nights', value: n })
  }

  // 5. Detect MADINAH NIGHTS
  const madinahNightsMatch = lower.match(/(\d+)\s*(?:nights?|nts)\s*(?:in\s+)?(?:madinah?|medina)/i) ||
    lower.match(/(?:madinah?|medina)\s*(?:mein?\s*)?(\d+)\s*(?:nights?|nts)/i)
  if (madinahNightsMatch) {
    const n = parseInt(madinahNightsMatch[1])
    fields.push({ label: `${n} nights Madinah`, field: 'madinah_nights', value: n })
  }

  // 6. Detect BUDGET
  const budgetMatch = lower.match(
    /(?:budget|rs\.?|pkr|amount|price|cost|around|approx(?:imately)?)\s*[:.]?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lac|lakh|lacs)?/i
  )
  if (budgetMatch) {
    let amount = parseFloat(budgetMatch[1].replace(/,/g, ''))
    if (isNaN(amount) || amount <= 0) return fields
    const suffix = budgetMatch[2]?.toLowerCase()
    if (suffix === 'k' || suffix === 'thousand') amount *= 1000
    if (suffix === 'lac' || suffix === 'lakh' || suffix === 'lacs') amount *= 100000
    fields.push({ label: `Rs ${amount.toLocaleString()} budget`, field: 'budget_amount', value: amount })

    if (/per\s*person|per\s*pax|\/person|per\s*head|har\s*ek|each/i.test(lower)) {
      fields.push({ label: 'Per Person', field: 'budget_type', value: 'per_person' })
    }
  }

  // 7. Detect HOTEL PREFERENCES
  const hotelHints: string[] = []
  if (/near\s*(?:the\s*)?haram|close\s*(?:to\s*)?haram|haram\s*(?:ke\s*)?(?:qareeb|pass|near)/i.test(lower)) {
    hotelHints.push('Near Haram')
  }
  if (/walking\s*distance|paidal/i.test(lower)) {
    hotelHints.push('Walking distance')
  }
  if (/5\s*star|five\s*star|premium|luxury/i.test(lower)) {
    hotelHints.push('5-star')
  } else if (/4\s*star|four\s*star/i.test(lower)) {
    hotelHints.push('4-star')
  } else if (/3\s*star|three\s*star|sasta|cheap/i.test(lower)) {
    hotelHints.push('Budget/Economy')
  }
  if (hotelHints.length > 0) {
    fields.push({ label: hotelHints.join(', '), field: 'hotel_preferences', value: hotelHints.join(', ') })
  }

  // 8. Detect TRAVEL DATE (approximate)
  const dateDetection = detectApproxDate(lower)
  if (dateDetection) {
    fields.push({ label: `Depart ${dateDetection.label}`, field: 'travel_date', value: dateDetection.date })
  }

  // 9. Detect NUMBER OF PASSENGERS
  const paxMatch = lower.match(/(\d+)\s*(?:people|persons?|prson|prsn|pax|passengers?|adults?|log|banda|bande|members?|family)/)
  if (paxMatch) {
    const count = parseInt(paxMatch[1])
    if (count >= 1 && count <= 99) {
      fields.push({ label: `${count} passengers`, field: 'adults', value: count })
    }
  }

  return fields
}

// ─── COMPONENT ─────────────────────────────────────────────────────

export default function SmartTextarea({
  value,
  onChange,
  placeholder,
  rows = 6,
  label,
  sublabel,
  onAutoFill,
}: SmartTextareaProps) {
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null)
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([])
  const [showDetected, setShowDetected] = useState(false)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  const handleCleanup = () => {
    if (!value || value.trim().length === 0) return

    const cleaned = localCleanup(value)
    const wasChanged = cleaned !== value

    if (wasChanged) {
      onChange(cleaned)
      setStatusMsg({ text: 'Text cleaned up!', type: 'success' })
    } else {
      setStatusMsg({ text: 'Text looks good — no changes needed', type: 'success' })
    }

    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    statusTimerRef.current = setTimeout(() => setStatusMsg(null), 4000)

    // Detect fields from cleaned text (use cleaned version either way)
    if (onAutoFill) {
      const detected = parseDetectedFields(cleaned)
      if (detected.length > 0) {
        setDetectedFields(detected)
        setShowDetected(true)
      } else {
        setDetectedFields([])
        setShowDetected(false)
      }
    }
  }

  const handleAutoFill = () => {
    if (!onAutoFill) return
    const fields: Record<string, string | number> = {}
    detectedFields.forEach((f) => {
      fields[f.field] = f.value
    })
    onAutoFill(fields)
    setShowDetected(false)
    setDetectedFields([])
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {sublabel && <span className="text-xs text-gray-500 ml-2">{sublabel}</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full"
        rows={rows}
        placeholder={placeholder}
      />
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={handleCleanup}
          disabled={!value || value.trim().length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clean up text and detect fields"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Clean Up
        </button>
        {statusMsg && (
          <span className={`text-xs font-medium ${
            statusMsg.type === 'success' ? 'text-green-600' :
            statusMsg.type === 'warning' ? 'text-amber-600' : 'text-red-600'
          }`}>
            {statusMsg.text}
          </span>
        )}
      </div>

      {showDetected && detectedFields.length > 0 && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800">
                  Detected: {detectedFields.map((f) => f.label).join(', ')}
                </p>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="mt-1 text-xs font-medium text-primary-600 hover:text-primary-800 underline"
                >
                  Auto-fill fields
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDetected(false)}
              className="text-amber-400 hover:text-amber-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
