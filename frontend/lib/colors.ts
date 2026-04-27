/**
 * TDM Fabric Color Categories — per Ashish's questionnaire Q3
 * Separated by gender preference for racks (mostly bottom weight).
 */

export type ColorGender = 'Ladies' | 'Gents' | 'Universal' | 'Other'

export const COLOR_CATEGORIES: Record<ColorGender, string[]> = {
  Ladies: ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'PINK', 'LIGHT BLUE', 'PURPLE', 'PEACH', 'CORAL'],
  Gents: ['BLACK', 'GREY', 'KHAKI', 'BROWN', 'OLIVE', 'NAVY', 'NAVY BLUE', 'CHARCOAL', 'MAROON'],
  Universal: ['WHITE', 'CREAM', 'OFF-WHITE', 'BEIGE', 'INDIGO', 'BLUE', 'CHAMBRAY', 'DENIM', 'ECRU'],
  Other: [],
}

// Map of color → tone (for visual swatch in UI)
export const COLOR_HEX: Record<string, string> = {
  RED: '#C83838', ORANGE: '#E8843C', YELLOW: '#E8C84F', GREEN: '#7D8A5D',
  PINK: '#D4889C', 'LIGHT BLUE': '#9BC4DC', PURPLE: '#8B6FB0', PEACH: '#E8B894', CORAL: '#E89070',
  BLACK: '#1F1E1C', GREY: '#6B6963', KHAKI: '#A89968', BROWN: '#8B6F4E',
  OLIVE: '#7A7548', NAVY: '#2D3D5C', 'NAVY BLUE': '#2D3D5C', CHARCOAL: '#3A3935', MAROON: '#6B2D2D',
  WHITE: '#FAF9F5', CREAM: '#F0E8D0', 'OFF-WHITE': '#F5F0E5', BEIGE: '#D8C9A8',
  INDIGO: '#3D4D8B', BLUE: '#4A6D9C', CHAMBRAY: '#8AA0BC', DENIM: '#5C7090', ECRU: '#E8DECB',
}

export function getColorGender(color: string): ColorGender {
  const c = color.toUpperCase().trim()
  for (const [gender, colors] of Object.entries(COLOR_CATEGORIES) as [ColorGender, string[]][]) {
    if (colors.includes(c)) return gender
  }
  return 'Other'
}

export function extractColorFromCode(code: string): string | null {
  const upper = code.toUpperCase()
  // Check all known colors
  const allColors = [
    ...COLOR_CATEGORIES.Ladies,
    ...COLOR_CATEGORIES.Gents,
    ...COLOR_CATEGORIES.Universal,
  ]
  for (const c of allColors) {
    if (upper.includes(c.replace(' ', ''))) return c
  }
  return null
}

export function getRecommendedRack(color: string, fabric: string): string {
  const gender = getColorGender(color)
  const fabricUpper = fabric.toUpperCase()

  // Bottom weight separation per Ashish's rule
  const isBottom = fabricUpper.includes('BOTTOM') || fabricUpper.includes('TWILL')
    || fabricUpper.includes('DRILL') || fabricUpper.includes('MATTY')

  if (isBottom) {
    if (gender === 'Ladies') return 'Bottom — Ladies section'
    if (gender === 'Gents') return 'Bottom — Gents section'
  }

  // Default: by fabric quality
  return 'By quality category'
}
