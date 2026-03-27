import { useState } from 'react'
import { Loader2, Sparkles, Lightbulb, X } from 'lucide-react'

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
  showAutoFill?: boolean
}

function parseDetectedFields(text: string): DetectedField[] {
  const fields: DetectedField[] = []
  const lower = text.toLowerCase()

  // Detect package days
  const daysMatch = lower.match(/(\d+)\s*days?/)
  if (daysMatch) {
    fields.push({ label: `${daysMatch[1]} days`, field: 'package_days', value: parseInt(daysMatch[1]) })
  }

  // Detect city order
  if (lower.includes('makkah first') || lower.includes('mecca first')) {
    fields.push({ label: 'Makkah First', field: 'city_order', value: 'makkah_first' })
  } else if (lower.includes('madinah first') || lower.includes('medina first')) {
    fields.push({ label: 'Madinah First', field: 'city_order', value: 'madinah_first' })
  }

  // Detect nights
  const makkahNightsMatch = lower.match(/(\d+)\s*nights?\s*(?:in\s+)?(?:makkah|mecca)/i) ||
    lower.match(/(?:makkah|mecca)\s*(\d+)\s*nights?/i)
  if (makkahNightsMatch) {
    fields.push({ label: `${makkahNightsMatch[1]} nights Makkah`, field: 'makkah_nights', value: parseInt(makkahNightsMatch[1]) })
  }

  const madinahNightsMatch = lower.match(/(\d+)\s*nights?\s*(?:in\s+)?(?:madinah|medina)/i) ||
    lower.match(/(?:madinah|medina)\s*(\d+)\s*nights?/i)
  if (madinahNightsMatch) {
    fields.push({ label: `${madinahNightsMatch[1]} nights Madinah`, field: 'madinah_nights', value: parseInt(madinahNightsMatch[1]) })
  }

  // Detect budget
  const budgetMatch = lower.match(/(?:budget|rs\.?|pkr)\s*[\.:]*\s*([\d,]+(?:\.\d+)?)\s*(?:k|thousand|lac|lakh|lacs)?/i)
  if (budgetMatch) {
    let amount = parseFloat(budgetMatch[1].replace(/,/g, ''))
    if (lower.includes('k') && amount < 1000) amount *= 1000
    if ((lower.includes('lac') || lower.includes('lakh')) && amount < 100000) amount *= 100000
    fields.push({ label: `Rs ${amount.toLocaleString()} budget`, field: 'budget_amount', value: amount })

    if (lower.includes('per person') || lower.includes('per pax') || lower.includes('/person')) {
      fields.push({ label: 'Per Person', field: 'budget_type', value: 'per_person' })
    }
  }

  return fields
}

export default function SmartTextarea({
  value,
  onChange,
  placeholder,
  rows = 6,
  label,
  sublabel,
  onAutoFill,
  showAutoFill = false,
}: SmartTextareaProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState(false)
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([])
  const [showDetected, setShowDetected] = useState(false)

  const handleCleanup = async () => {
    if (!value.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `You are a text cleanup assistant for a travel agency.
Fix the following text:
- Fix spelling errors
- Fix punctuation
- Capitalize properly (names, places, first letters of sentences)
- Rewrite for clarity if messy, but keep the meaning exactly the same
- Keep it concise
- Do NOT add information that isn't there
- Return ONLY the cleaned text, nothing else

Text to clean:
"${value}"`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()
      const cleanedText = data.content?.[0]?.text || value
      onChange(cleanedText)

      // Show toast
      setToast(true)
      setTimeout(() => setToast(false), 2500)

      // Detect fields from cleaned text
      if (showAutoFill && onAutoFill) {
        const detected = parseDetectedFields(cleanedText)
        if (detected.length > 0) {
          setDetectedFields(detected)
          setShowDetected(true)
        }
      }
    } catch {
      setError("Couldn't clean up text. Try again.")
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsLoading(false)
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
        disabled={isLoading}
      />
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={handleCleanup}
          disabled={isLoading || !value.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clean up text with AI"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Clean Up
        </button>
        {toast && (
          <span className="text-xs text-green-600 animate-pulse">
            Text cleaned up ✨
          </span>
        )}
        {error && (
          <span className="text-xs text-red-500">{error}</span>
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
