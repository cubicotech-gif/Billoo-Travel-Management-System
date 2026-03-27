/**
 * Text utility functions for auto-capitalization and cleanup
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
 * Common travel-industry misspellings/abbreviations → corrections.
 * Applied word-by-word before proper noun capitalization.
 */
const SPELLING_FIXES: Record<string, string> = {
  // Umrah / Hajj misspellings
  'umrh': 'Umrah', 'umra': 'Umrah', 'umrha': 'Umrah', 'umraah': 'Umrah',
  'umerah': 'Umrah', 'umraa': 'Umrah', 'ummrah': 'Umrah', 'omra': 'Umrah',
  'omrah': 'Umrah', 'umre': 'Umrah',
  'haj': 'Hajj', 'hajj': 'Hajj',
  // City misspellings
  'makka': 'Makkah', 'meca': 'Makkah', 'mecca': 'Makkah', 'makah': 'Makkah',
  'makkh': 'Makkah', 'mekkah': 'Makkah', 'mkh': 'Makkah',
  'madina': 'Madinah', 'medina': 'Madinah', 'madinah': 'Madinah',
  'mdina': 'Madinah', 'medinah': 'Madinah',
  'jedda': 'Jeddah', 'jeda': 'Jeddah', 'jiddah': 'Jeddah', 'jdh': 'Jeddah',
  'krachi': 'Karachi', 'khi': 'Karachi',
  'lhr': 'Lahore', 'lahor': 'Lahore',
  'isb': 'Islamabad', 'islmabad': 'Islamabad', 'islamabd': 'Islamabad',
  'peshwar': 'Peshawar', 'peshawr': 'Peshawar',
  // Common abbreviations
  'pkg': 'package', 'pkge': 'package',
  'ppl': 'people', 'prsn': 'person', 'prson': 'person', 'prsns': 'persons',
  'nts': 'nights', 'nght': 'night', 'nghts': 'nights',
  'dys': 'days',
  'pax': 'pax', 'psngr': 'passenger', 'psngrs': 'passengers',
  'htl': 'hotel', 'hotl': 'hotel',
  'flt': 'flight', 'flght': 'flight',
  'tkt': 'ticket', 'tckt': 'ticket',
  'bgt': 'budget', 'bdgt': 'budget',
  'wat': 'want', 'wnt': 'want', 'wnts': 'wants',
  'wid': 'with', 'wth': 'with', 'wit': 'with',
  'abt': 'about', 'arnd': 'around',
  'nxt': 'next', 'pls': 'please', 'plz': 'please',
  'trvl': 'travel', 'travl': 'travel',
  'yr': 'year', 'yrs': 'years',
  'nr': 'near', 'ner': 'near',
  'str': 'star',
  'fm': 'from', 'frm': 'from',
}

/**
 * Local text cleanup fallback (no AI needed).
 * Fixes common misspellings, capitalization, spacing, and proper nouns.
 */
export const localCleanup = (text: string): string => {
  // Split into words, fix known misspellings
  let cleaned = text.replace(/\b(\w+)\b/g, (match) => {
    const lower = match.toLowerCase()
    return SPELLING_FIXES[lower] || match
  })

  // Capitalize first letter of each sentence
  cleaned = cleaned.replace(/(^\s*\w|[.!?]\s+\w)/g, (match) => match.toUpperCase())

  // Capitalize common proper nouns
  const properNouns = [
    'makkah', 'madinah', 'medina', 'jeddah', 'riyadh', 'karachi', 'lahore',
    'islamabad', 'peshawar', 'multan', 'faisalabad', 'rawalpindi', 'quetta',
    'dallah', 'hilton', 'movenpick', 'pullman', 'meridien', 'marriott', 'sheraton',
    'sofitel', 'novotel', 'hyatt', 'raffles', 'swissotel', 'elaf', 'anjum',
    'haram', 'nabawi', 'umrah', 'hajj', 'arafat', 'mina', 'muzdalifah',
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
