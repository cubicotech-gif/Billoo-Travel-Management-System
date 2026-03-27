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
  // ── Umrah / Hajj misspellings ──
  'umrh': 'Umrah', 'umra': 'Umrah', 'umrha': 'Umrah', 'umraah': 'Umrah',
  'umerah': 'Umrah', 'umraa': 'Umrah', 'ummrah': 'Umrah', 'omra': 'Umrah',
  'omrah': 'Umrah', 'umre': 'Umrah', 'umrah': 'Umrah', 'ummra': 'Umrah',
  'haj': 'Hajj', 'hajj': 'Hajj',
  'ziyarat': 'Ziyarat', 'ziyart': 'Ziyarat', 'ziarat': 'Ziyarat',
  'tawaf': 'Tawaf', 'twaf': 'Tawaf',

  // ── City misspellings ──
  'makka': 'Makkah', 'meca': 'Makkah', 'mecca': 'Makkah', 'makah': 'Makkah',
  'makkh': 'Makkah', 'mekkah': 'Makkah', 'mkh': 'Makkah', 'makkah': 'Makkah',
  'mekka': 'Makkah', 'makke': 'Makkah',
  'madina': 'Madinah', 'medina': 'Madinah', 'madinah': 'Madinah',
  'mdina': 'Madinah', 'medinah': 'Madinah', 'madine': 'Madinah',
  'jedda': 'Jeddah', 'jeda': 'Jeddah', 'jiddah': 'Jeddah', 'jdh': 'Jeddah',
  'jeddh': 'Jeddah', 'jeddah': 'Jeddah',
  'krachi': 'Karachi', 'khi': 'Karachi', 'karchi': 'Karachi', 'karachi': 'Karachi',
  'lhr': 'Lahore', 'lahor': 'Lahore', 'lahore': 'Lahore', 'lahoer': 'Lahore',
  'isb': 'Islamabad', 'islmabad': 'Islamabad', 'islamabd': 'Islamabad',
  'islamabad': 'Islamabad', 'islambad': 'Islamabad',
  'peshwar': 'Peshawar', 'peshawr': 'Peshawar', 'peshawar': 'Peshawar',
  'multan': 'Multan', 'faisalabad': 'Faisalabad', 'fsd': 'Faisalabad',
  'rwp': 'Rawalpindi', 'pindi': 'Rawalpindi', 'rawalpindi': 'Rawalpindi',
  'queta': 'Quetta', 'quetta': 'Quetta',
  'riyadh': 'Riyadh', 'riyad': 'Riyadh', 'riydh': 'Riyadh',
  'dubai': 'Dubai', 'dxb': 'Dubai',
  'taif': 'Taif', 'taaif': 'Taif',

  // ── Common word misspellings ──
  'wat': 'want', 'wnt': 'want', 'wnts': 'wants', 'watn': 'want',
  'wid': 'with', 'wth': 'with', 'wit': 'with',
  'abt': 'about', 'arnd': 'around',
  'nxt': 'next', 'pls': 'please', 'plz': 'please', 'plss': 'please',
  'thnk': 'think', 'thnks': 'thanks', 'thx': 'thanks', 'thanx': 'thanks',
  'bcz': 'because', 'bcoz': 'because', 'coz': 'because',
  'nd': 'and', 'bt': 'but',
  'gud': 'good', 'gd': 'good',
  'evry': 'every', 'evey': 'every',
  'dn': 'done', 'dne': 'done',
  'gve': 'give', 'giv': 'give',
  'hve': 'have', 'hv': 'have',
  'cn': 'can', 'cud': 'could', 'shud': 'should', 'wud': 'would',
  'alrdy': 'already', 'alredy': 'already',
  'availble': 'available', 'availabl': 'available', 'avlbl': 'available',
  'confirmd': 'confirmed', 'cnfrm': 'confirm', 'cnfrmd': 'confirmed',
  'requrd': 'required', 'requird': 'required', 'reqrd': 'required',
  'intrested': 'interested', 'intrstd': 'interested',
  'chek': 'check', 'chck': 'check',
  'thn': 'then', 'ths': 'this', 'tht': 'that',
  'whn': 'when', 'whr': 'where', 'wht': 'what',
  'hw': 'how', 'som': 'some',
  'sm': 'some', 'smth': 'something',
  'nt': 'not', 'dnt': "don't", 'dont': "don't",
  'shd': 'should', 'wl': 'will',

  // ── Travel-specific abbreviations ──
  'pkg': 'package', 'pkge': 'package', 'packg': 'package', 'pakage': 'package',
  'ppl': 'people', 'peple': 'people',
  'prsn': 'person', 'prson': 'person', 'prsns': 'persons', 'persn': 'person',
  'nts': 'nights', 'nght': 'night', 'nghts': 'nights', 'nigts': 'nights', 'nightss': 'nights',
  'dys': 'days', 'dayz': 'days',
  'pax': 'pax', 'psngr': 'passenger', 'psngrs': 'passengers',
  'pasngr': 'passenger', 'passngr': 'passenger',
  'htl': 'hotel', 'hotl': 'hotel', 'hotell': 'hotel', 'hotal': 'hotel',
  'flt': 'flight', 'flght': 'flight', 'flite': 'flight',
  'tkt': 'ticket', 'tckt': 'ticket', 'tiket': 'ticket', 'tickt': 'ticket',
  'bgt': 'budget', 'bdgt': 'budget', 'budgt': 'budget', 'buget': 'budget',
  'trvl': 'travel', 'travl': 'travel', 'travle': 'travel',
  'yr': 'year', 'yrs': 'years',
  'nr': 'near', 'ner': 'near', 'neer': 'near',
  'str': 'star', 'starr': 'star',
  'fm': 'from', 'frm': 'from',
  'retun': 'return', 'retrn': 'return', 'rtrn': 'return',
  'departur': 'departure', 'depature': 'departure', 'dparture': 'departure',
  'arival': 'arrival', 'arrivl': 'arrival',
  'accomodation': 'accommodation', 'accomdation': 'accommodation',
  'econmy': 'economy', 'economi': 'economy',
  'bussines': 'business', 'buisness': 'business', 'busness': 'business',
  'pasport': 'passport', 'paspoort': 'passport', 'passprt': 'passport',
  'airprt': 'airport', 'airpot': 'airport',
  'schedl': 'schedule', 'schdule': 'schedule', 'schedul': 'schedule',
  'cancl': 'cancel', 'cancle': 'cancel',
  'bookng': 'booking', 'bookin': 'booking',
  'confrm': 'confirm', 'confrim': 'confirm',
  'paymt': 'payment', 'paymnt': 'payment', 'paymen': 'payment',
  'refnd': 'refund', 'refud': 'refund',

  // ── Urdu / Roman Urdu common in travel context ──
  'chahye': 'chahiye', 'chaye': 'chahiye',
  'krna': 'karna', 'krne': 'karne',
  'btao': 'batao', 'btaen': 'bataein', 'btaye': 'bataye',
  'kro': 'karo', 'kren': 'karein',
  'mjhe': 'mujhe', 'mje': 'mujhe', 'mjhy': 'mujhe',
  'hmre': 'hamare', 'hmary': 'hamare',
  'inshallah': 'Insha Allah', 'inshallh': 'Insha Allah',
  'mashallah': 'Masha Allah', 'mashallh': 'Masha Allah',
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
