import { useState } from 'react'
import { Loader2, Sparkles, Lightbulb, X, AlertCircle } from 'lucide-react'
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
  showAutoFill?: boolean
}

function parseDetectedFields(text: string): DetectedField[] {
  const fields: DetectedField[] = []
  const lower = text.toLowerCase()

  // Detect package nights (from "X nights" or "X days" — convert days to nights)
  const nightsMatch = lower.match(/(\d+)\s*nights?/)
  if (nightsMatch) {
    fields.push({ label: `${nightsMatch[1]} nights`, field: 'package_nights', value: parseInt(nightsMatch[1]) })
  } else {
    const daysMatch = lower.match(/(\d+)\s*days?/)
    if (daysMatch) {
      const nights = parseInt(daysMatch[1]) + 1
      fields.push({ label: `${nights} nights (from ${daysMatch[1]} days)`, field: 'package_nights', value: nights })
    }
  }

  // Detect city order
  if (lower.includes('makkah first') || lower.includes('mecca first')) {
    fields.push({ label: 'Makkah First', field: 'city_order', value: 'makkah_first' })
  } else if (lower.includes('madinah first') || lower.includes('medina first')) {
    fields.push({ label: 'Madinah First', field: 'city_order', value: 'madinah_first' })
  }

  // Detect Makkah nights
  const makkahNightsMatch = lower.match(/(\d+)\s*nights?\s*(?:in\s+)?(?:makkah|mecca)/i) ||
    lower.match(/(?:makkah|mecca)\s*(\d+)\s*nights?/i)
  if (makkahNightsMatch) {
    fields.push({ label: `${makkahNightsMatch[1]} nights Makkah`, field: 'makkah_nights', value: parseInt(makkahNightsMatch[1]) })
  }

  // Detect Madinah nights
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

/** Attempt AI cleanup via Anthropic API, fall back to local cleanup */
async function cleanUpText(text: string): Promise<{ cleaned: string; method: 'ai' | 'local' }> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    return { cleaned: localCleanup(text), method: 'local' }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a text cleanup assistant for a travel agency in Pakistan. Fix the following text:
- Fix all spelling errors
- Fix punctuation (periods, commas, etc.)
- Capitalize properly (names of people, cities, hotels, first letters of sentences)
- Rewrite for clarity if the text is messy, but keep the EXACT same meaning
- Keep it concise — do not add extra information
- Keep the same language (if Urdu/Roman Urdu words are mixed in, keep them)
- Return ONLY the cleaned text. No explanations, no quotes, no markdown.

Text to clean:
${text}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('AI cleanup failed:', response.status, response.statusText)
      return { cleaned: localCleanup(text), method: 'local' }
    }

    const data = await response.json()

    if (data.content && data.content.length > 0) {
      const cleanedText = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('')
      if (cleanedText) {
        return { cleaned: cleanedText, method: 'ai' }
      }
    }

    return { cleaned: localCleanup(text), method: 'local' }
  } catch (error) {
    console.error('AI cleanup error:', error)
    return { cleaned: localCleanup(text), method: 'local' }
  }
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
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null)
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([])
  const [showDetected, setShowDetected] = useState(false)

  const handleCleanup = async () => {
    if (!value || value.trim().length === 0) return

    setIsLoading(true)
    setStatusMsg(null)

    try {
      const { cleaned, method } = await cleanUpText(value)

      if (cleaned !== value) {
        onChange(cleaned)
      }

      if (method === 'ai') {
        setStatusMsg({ text: 'Text cleaned up!', type: 'success' })
      } else {
        setStatusMsg({ text: 'Basic cleanup applied (AI unavailable)', type: 'warning' })
      }
      setTimeout(() => setStatusMsg(null), 3000)

      // Detect fields from cleaned text
      if (showAutoFill && onAutoFill) {
        const detected = parseDetectedFields(cleaned)
        if (detected.length > 0) {
          setDetectedFields(detected)
          setShowDetected(true)
        }
      }
    } catch {
      setStatusMsg({ text: "Couldn't clean up text. Try again.", type: 'error' })
      setTimeout(() => setStatusMsg(null), 3000)
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

  const noApiKey = !import.meta.env.VITE_ANTHROPIC_API_KEY

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
          disabled={isLoading || !value || value.trim().length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={noApiKey ? 'AI key not configured — will use basic cleanup' : 'Clean up text with AI'}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {isLoading ? 'Cleaning...' : 'Clean Up'}
        </button>
        {noApiKey && !statusMsg && (
          <span className="text-xs text-gray-400 flex items-center gap-1" title="Add VITE_ANTHROPIC_API_KEY to .env for AI cleanup">
            <AlertCircle className="w-3 h-3" /> Basic mode
          </span>
        )}
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
