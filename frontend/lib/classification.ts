import type { Category, SubCategory, FabricBase, Usage, Stretch, ClassificationPath } from './types'
import { TDM_CLASSIFICATION } from './types'

/**
 * Infer hierarchical classification from a quality/fabric name.
 * Takes strings like "LY-TWILL", "POPLIN", "SATIN-SHIRTING", "DENIM-LY-BOTTOM"
 * and returns { category, subCategory, fabricBase, usage, stretch, quality }
 */
export function inferClassification(qualityName: string, fabricType?: string): ClassificationPath {
  const text = `${qualityName} ${fabricType || ''}`.toUpperCase()
  const result: ClassificationPath = {}

  // Level 1: Dyed vs Grey (default to Dyed)
  if (text.includes('GREY') || text.includes('RFD') || text.includes('ECRU')) {
    result.category = 'Grey'
  } else {
    result.category = 'Dyed'
  }

  // Level 2: Piece Dyed / Print / Yarndyed / Denim
  if (text.includes('PRINT')) result.subCategory = 'Print'
  else if (text.includes('DENIM') || text.includes('INDIGO') || text.includes('SELVAGE')) result.subCategory = 'Denim'
  else if (text.includes('YARN')) result.subCategory = 'Yarndyed'
  else result.subCategory = 'Piece Dyed'

  // Level 3: Cotton / Poly-cotton
  if (text.includes('POLY') || text.includes('PC-')) result.fabricBase = 'Poly-cotton'
  else result.fabricBase = 'Cotton'

  // Level 4: Bottom / Shirting
  const shirtingKeywords = ['POPLIN', 'SHIRT', 'OXFORD', 'CEMRIC', 'SHTG', '130129', 'VISCOSE', 'LINEN', 'A140D499']
  const bottomKeywords = ['TWILL', 'DRILL', 'DOBBY', 'SATIN', 'MATTY', 'TUSSUR', 'KNIT', '130D07', 'A150C873']
  if (shirtingKeywords.some(k => text.includes(k))) result.usage = 'Shirting'
  else if (bottomKeywords.some(k => text.includes(k))) result.usage = 'Bottom'

  // Level 5: Lycra / Non-Lycra
  if (text.includes('LYCRE') || text.includes('LYCRA') || text.includes(' LY-') || text.startsWith('LY-') || text.includes('4-WAY')) {
    result.stretch = 'Lycra'
  } else {
    result.stretch = 'Non-Lycra'
  }

  // Level 6: Specific quality name
  const qualityMap: Record<string, string> = {
    'TWILL': 'Twill', 'DRILL': 'Drill', 'DOBBY': 'Dobby', 'SATIN': 'Satin',
    'MATTY': 'Matty', 'TUSSUR': 'Tussur', 'POPLIN': 'Poplin', 'OXFORD': 'Oxford',
    'CEMRIC': 'Cemric', 'KNIT': 'Knit', 'VISCOSE': 'Viscose', 'LINEN': 'Linen',
    '130129': '130129', '130D07': '130D07', 'A150C873': 'A150C873', 'A140D499': 'A140D499',
  }
  for (const [k, v] of Object.entries(qualityMap)) {
    if (text.includes(k)) {
      result.quality = v
      break
    }
  }

  return result
}

/**
 * Get available options at a level given parent selections.
 * Used for cascading dropdowns.
 */
export function getOptionsAt(level: 'category' | 'subCategory' | 'fabricBase' | 'usage' | 'stretch' | 'quality', selected: ClassificationPath): string[] {
  const tree: any = TDM_CLASSIFICATION
  if (level === 'category') return Object.keys(tree)

  if (!selected.category) return []
  const lv1 = tree[selected.category]
  if (level === 'subCategory') return Object.keys(lv1 || {})

  if (!selected.subCategory) return []
  const lv2 = lv1[selected.subCategory]
  if (level === 'fabricBase') return Object.keys(lv2 || {})

  if (!selected.fabricBase) return []
  const lv3 = lv2[selected.fabricBase]
  if (level === 'usage') return Object.keys(lv3 || {})

  if (!selected.usage) return []
  const lv4 = lv3[selected.usage]
  if (level === 'stretch') return Object.keys(lv4 || {})

  if (!selected.stretch) return []
  const lv5 = lv4[selected.stretch]
  if (level === 'quality') return Array.isArray(lv5) ? lv5 : []

  return []
}

/**
 * Check if a stock item matches a partial classification filter.
 * Empty filter = match all.
 */
export function matchesClassification(stockClassification: ClassificationPath | undefined, filter: ClassificationPath): boolean {
  if (!stockClassification) return !filter.category  // unclassified only matches empty filter
  if (filter.category && filter.category !== stockClassification.category) return false
  if (filter.subCategory && filter.subCategory !== stockClassification.subCategory) return false
  if (filter.fabricBase && filter.fabricBase !== stockClassification.fabricBase) return false
  if (filter.usage && filter.usage !== stockClassification.usage) return false
  if (filter.stretch && filter.stretch !== stockClassification.stretch) return false
  if (filter.quality && filter.quality !== stockClassification.quality) return false
  return true
}
