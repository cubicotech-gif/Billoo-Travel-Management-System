/**
 * Text utility functions for auto-capitalization
 */

/** Capitalize first letter of each word: "jawaid ahmed" → "Jawaid Ahmed" */
export const capitalizeWords = (value: string): string => {
  if (!value) return value
  return value.replace(/\b\w/g, (char) => char.toUpperCase())
}

/** Capitalize first letter only: "customer wants budget" → "Customer wants budget" */
export const capitalizeFirst = (value: string): string => {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Local text cleanup fallback (no AI needed).
 * Fixes basic capitalization, spacing, and common proper nouns.
 */
export const localCleanup = (text: string): string => {
  let cleaned = text

  // Capitalize first letter of each sentence
  cleaned = cleaned.replace(/(^\w|[.!?]\s+\w)/g, (match) => match.toUpperCase())

  // Capitalize common proper nouns
  const properNouns = [
    'makkah', 'madinah', 'medina', 'jeddah', 'riyadh', 'karachi', 'lahore',
    'islamabad', 'peshawar', 'multan', 'faisalabad', 'rawalpindi', 'quetta',
    'dallah', 'hilton', 'movenpick', 'pullman', 'meridien', 'marriott', 'sheraton',
    'haram', 'nabawi', 'umrah', 'hajj', 'arafat',
    'pakistan', 'saudi', 'arabia', 'dubai', 'turkey', 'istanbul', 'malaysia',
    'pia', 'saudia', 'emirates', 'qatar', 'etihad', 'flynas', 'flyadeal',
  ]
  properNouns.forEach((noun) => {
    const regex = new RegExp(`\\b${noun}\\b`, 'gi')
    cleaned = cleaned.replace(regex, noun.charAt(0).toUpperCase() + noun.slice(1))
  })

  // Fix common spacing issues
  cleaned = cleaned.replace(/\s+/g, ' ')              // Multiple spaces → single
  cleaned = cleaned.replace(/\s+([.,!?])/g, '$1')     // Remove space before punctuation
  cleaned = cleaned.replace(/([.,!?])(\w)/g, '$1 $2') // Add space after punctuation

  return cleaned.trim()
}
