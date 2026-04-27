/**
 * Warehouse floor plans digitized from Ashish's hand-drawn layouts (Apr 2026).
 *
 * Coordinate system: 0-100 for both x and y (percent of SVG viewBox).
 * Each rack is a rectangle with position + size.
 * Pillars, staircases, doors are special features.
 *
 * First Floor: Halls 100, 200, 300, 400, 500
 * Second Floor: Halls 600, 700, 800, 900, 1000
 */

export type Floor = 'first' | 'second'

export interface RackPosition {
  number: number
  x: number        // 0-100
  y: number        // 0-100
  w: number        // width in %
  h: number        // height in %
  orientation?: 'horizontal' | 'vertical'
  note?: string    // 'sometimes side', etc.
}

export interface Feature {
  type: 'pillar' | 'staircase' | 'door' | 'sofa' | 'shair-case'
  x: number
  y: number
  w: number
  h: number
  label?: string
}

export interface HallLayout {
  hall: string       // "100", "200", etc.
  label: string      // "Hall 100"
  floor: Floor
  width: number      // SVG viewBox width
  height: number
  racks: RackPosition[]
  features: Feature[]
  entry?: { x: number; y: number; label?: string }
}

// ══════════════ HALL 100 (First Floor) — racks 101-131 ══════════════
const hall100: HallLayout = {
  hall: '100', label: 'Hall 100', floor: 'first', width: 100, height: 70,
  racks: [
    // Top row 113-122
    { number: 113, x: 20, y: 4, w: 7, h: 5 }, { number: 114, x: 27, y: 4, w: 7, h: 5 },
    { number: 115, x: 34, y: 4, w: 7, h: 5 }, { number: 116, x: 41, y: 4, w: 7, h: 5 },
    { number: 117, x: 48, y: 4, w: 7, h: 5 }, { number: 118, x: 55, y: 4, w: 7, h: 5 },
    { number: 119, x: 62, y: 4, w: 7, h: 5 }, { number: 120, x: 69, y: 4, w: 7, h: 5 },
    { number: 121, x: 76, y: 4, w: 7, h: 5 }, { number: 122, x: 83, y: 4, w: 7, h: 5 },
    // Right column 123
    { number: 123, x: 90, y: 30, w: 6, h: 8, orientation: 'vertical' },
    // Bottom row 101-111
    { number: 101, x: 4, y: 60, w: 7, h: 5 }, { number: 102, x: 11, y: 60, w: 7, h: 5 },
    { number: 103, x: 18, y: 60, w: 7, h: 5 }, { number: 104, x: 25, y: 60, w: 7, h: 5 },
    { number: 105, x: 32, y: 60, w: 7, h: 5 }, { number: 106, x: 39, y: 60, w: 7, h: 5 },
    { number: 107, x: 46, y: 60, w: 7, h: 5 }, { number: 108, x: 53, y: 60, w: 7, h: 5 },
    { number: 109, x: 60, y: 60, w: 7, h: 5 }, { number: 110, x: 67, y: 60, w: 7, h: 5 },
    { number: 111, x: 4, y: 14, w: 6, h: 8, orientation: 'vertical' },
    { number: 112, x: 12, y: 4, w: 7, h: 5 },
    // Internal pillar area 128-131
    { number: 124, x: 28, y: 30, w: 7, h: 4 }, { number: 125, x: 21, y: 30, w: 7, h: 4 },
    { number: 126, x: 28, y: 36, w: 7, h: 4 }, { number: 127, x: 21, y: 36, w: 7, h: 4 },
    { number: 128, x: 55, y: 22, w: 7, h: 4 }, { number: 129, x: 62, y: 22, w: 7, h: 4 },
    { number: 130, x: 55, y: 36, w: 7, h: 4 }, { number: 131, x: 62, y: 36, w: 7, h: 4 },
  ],
  features: [
    { type: 'pillar', x: 21, y: 30, w: 14, h: 10, label: 'Pillar' },
    { type: 'pillar', x: 55, y: 22, w: 14, h: 18, label: 'Pillar' },
    { type: 'shair-case', x: 75, y: 58, w: 15, h: 10, label: 'Stairs' },
  ],
  entry: { x: 50, y: 68, label: 'Entry' },
}

// ══════════════ HALL 200 (First Floor) — racks 201-218 ══════════════
const hall200: HallLayout = {
  hall: '200', label: 'Hall 200', floor: 'first', width: 100, height: 70,
  racks: [
    // Left column 201-209 (9 racks)
    { number: 201, x: 5, y: 58, w: 7, h: 4 }, { number: 202, x: 5, y: 52, w: 7, h: 4 },
    { number: 203, x: 5, y: 46, w: 7, h: 4 }, { number: 204, x: 5, y: 40, w: 7, h: 4 },
    { number: 205, x: 5, y: 34, w: 7, h: 4 }, { number: 206, x: 5, y: 28, w: 7, h: 4 },
    { number: 207, x: 5, y: 22, w: 7, h: 4 }, { number: 208, x: 5, y: 16, w: 7, h: 4 },
    { number: 209, x: 5, y: 10, w: 7, h: 4 },
    // Top row
    { number: 210, x: 70, y: 10, w: 7, h: 4 }, { number: 217, x: 82, y: 10, w: 7, h: 4 },
    // Middle pillar area 211, 218
    { number: 211, x: 45, y: 30, w: 6, h: 4 }, { number: 218, x: 52, y: 30, w: 6, h: 4 },
    // Right side 212-216
    { number: 212, x: 82, y: 28, w: 7, h: 4 }, { number: 213, x: 82, y: 34, w: 7, h: 4 },
    { number: 214, x: 82, y: 40, w: 7, h: 4 }, { number: 215, x: 82, y: 46, w: 7, h: 4 },
    { number: 216, x: 82, y: 52, w: 7, h: 4 },
  ],
  features: [
    { type: 'pillar', x: 44, y: 29, w: 15, h: 8, label: 'Pillar' },
    { type: 'sofa', x: 60, y: 5, w: 18, h: 5, label: 'Sofa side' },
    { type: 'shair-case', x: 82, y: 4, w: 10, h: 6, label: 'Stair case' },
  ],
  entry: { x: 48, y: 65, label: '209 bahar' },
}

// ══════════════ HALL 300 (First Floor) — racks 301-320 ══════════════
const hall300: HallLayout = {
  hall: '300', label: 'Hall 300', floor: 'first', width: 100, height: 70,
  racks: [
    // Top row 315, 316
    { number: 315, x: 15, y: 6, w: 7, h: 4 }, { number: 316, x: 45, y: 6, w: 7, h: 4 },
    // Left column 309-314
    { number: 309, x: 5, y: 14, w: 7, h: 4 }, { number: 310, x: 5, y: 24, w: 7, h: 4 },
    { number: 311, x: 5, y: 32, w: 7, h: 4 }, { number: 312, x: 5, y: 40, w: 7, h: 4 },
    { number: 313, x: 5, y: 48, w: 7, h: 4 }, { number: 314, x: 5, y: 56, w: 7, h: 4 },
    // Right column 301-308
    { number: 301, x: 82, y: 14, w: 7, h: 4 }, { number: 302, x: 82, y: 22, w: 7, h: 4 },
    { number: 303, x: 82, y: 30, w: 7, h: 4 }, { number: 304, x: 82, y: 38, w: 7, h: 4 },
    { number: 305, x: 82, y: 46, w: 7, h: 4 }, { number: 306, x: 82, y: 54, w: 7, h: 4 },
    { number: 307, x: 75, y: 62, w: 7, h: 4 }, { number: 308, x: 18, y: 62, w: 7, h: 4 },
    // Central optional racks (sometimes side)
    { number: 320, x: 30, y: 22, w: 7, h: 3, note: 'sometimes side' },
    { number: 317, x: 48, y: 22, w: 7, h: 3, note: 'sometimes side' },
    { number: 319, x: 30, y: 44, w: 7, h: 3, note: 'sometimes side' },
    { number: 318, x: 48, y: 44, w: 7, h: 3, note: 'sometimes side' },
  ],
  features: [
    { type: 'pillar', x: 38, y: 22, w: 10, h: 4 },
    { type: 'pillar', x: 38, y: 44, w: 10, h: 4 },
  ],
  entry: { x: 48, y: 68, label: 'Entry' },
}

// ══════════════ HALL 400 (First Floor) — racks 401-429 ══════════════
const hall400: HallLayout = {
  hall: '400', label: 'Hall 400', floor: 'first', width: 100, height: 70,
  racks: [
    // Top row 420, 421
    { number: 420, x: 15, y: 6, w: 7, h: 4 }, { number: 421, x: 40, y: 6, w: 7, h: 4 },
    // Right column 401-409
    { number: 401, x: 82, y: 14, w: 7, h: 4 }, { number: 402, x: 82, y: 20, w: 7, h: 4 },
    { number: 403, x: 82, y: 26, w: 7, h: 4 }, { number: 404, x: 82, y: 32, w: 7, h: 4 },
    { number: 405, x: 82, y: 38, w: 7, h: 4 }, { number: 406, x: 82, y: 44, w: 7, h: 4 },
    { number: 407, x: 82, y: 50, w: 7, h: 4 }, { number: 408, x: 82, y: 56, w: 7, h: 4 },
    { number: 409, x: 75, y: 62, w: 7, h: 4 },
    // Left column 411-419
    { number: 411, x: 5, y: 14, w: 7, h: 4 }, { number: 412, x: 5, y: 20, w: 7, h: 4 },
    { number: 413, x: 5, y: 26, w: 7, h: 4 }, { number: 414, x: 5, y: 32, w: 7, h: 4 },
    { number: 415, x: 5, y: 38, w: 7, h: 4 }, { number: 416, x: 5, y: 44, w: 7, h: 4 },
    { number: 417, x: 5, y: 50, w: 7, h: 4 }, { number: 418, x: 5, y: 56, w: 7, h: 4 },
    { number: 419, x: 13, y: 62, w: 7, h: 4 }, { number: 410, x: 20, y: 62, w: 7, h: 4 },
    // Central clusters 422-429
    { number: 422, x: 32, y: 18, w: 6, h: 3 }, { number: 423, x: 38, y: 18, w: 6, h: 3 },
    { number: 428, x: 55, y: 18, w: 6, h: 3 }, { number: 429, x: 61, y: 18, w: 6, h: 3 },
    { number: 424, x: 55, y: 42, w: 6, h: 3 }, { number: 425, x: 61, y: 42, w: 6, h: 3 },
    { number: 426, x: 32, y: 42, w: 6, h: 3 }, { number: 427, x: 38, y: 42, w: 6, h: 3 },
  ],
  features: [
    { type: 'pillar', x: 32, y: 18, w: 12, h: 4 },
    { type: 'pillar', x: 55, y: 18, w: 12, h: 4 },
    { type: 'pillar', x: 32, y: 42, w: 12, h: 4 },
    { type: 'pillar', x: 55, y: 42, w: 12, h: 4 },
  ],
  entry: { x: 50, y: 68, label: 'Entry' },
}

// ══════════════ HALL 500 (First Floor) — racks 501-528 ══════════════
const hall500: HallLayout = {
  hall: '500', label: 'Hall 500', floor: 'first', width: 100, height: 70,
  racks: [
    // Top 501, 502, 520
    { number: 520, x: 18, y: 6, w: 7, h: 4 }, { number: 501, x: 42, y: 6, w: 7, h: 4 }, { number: 502, x: 60, y: 6, w: 7, h: 4 },
    // Right column 503-509
    { number: 503, x: 85, y: 16, w: 6, h: 4 }, { number: 504, x: 85, y: 30, w: 6, h: 4 },
    { number: 505, x: 85, y: 36, w: 6, h: 4 }, { number: 506, x: 85, y: 42, w: 6, h: 4 },
    { number: 509, x: 85, y: 48, w: 6, h: 4 }, { number: 508, x: 80, y: 55, w: 6, h: 4 },
    { number: 507, x: 68, y: 55, w: 6, h: 4 },
    // Staircase in middle-right
    // Left column 510-519
    { number: 510, x: 5, y: 58, w: 6, h: 4 }, { number: 511, x: 5, y: 50, w: 6, h: 4 },
    { number: 512, x: 5, y: 42, w: 6, h: 4 }, { number: 513, x: 5, y: 36, w: 6, h: 4 },
    { number: 514, x: 5, y: 30, w: 6, h: 4 }, { number: 515, x: 5, y: 24, w: 6, h: 4 },
    { number: 516, x: 5, y: 18, w: 6, h: 4 }, { number: 517, x: 5, y: 14, w: 6, h: 3 },
    { number: 518, x: 11, y: 14, w: 6, h: 3 }, { number: 519, x: 17, y: 14, w: 6, h: 3 },
    // Center racks 521-526
    { number: 521, x: 25, y: 20, w: 7, h: 4 }, { number: 522, x: 32, y: 20, w: 7, h: 4 },
    { number: 523, x: 25, y: 34, w: 7, h: 4 }, { number: 524, x: 32, y: 34, w: 7, h: 4 },
    { number: 525, x: 45, y: 35, w: 6, h: 3 }, { number: 526, x: 45, y: 45, w: 6, h: 3 },
  ],
  features: [
    { type: 'pillar', x: 25, y: 20, w: 14, h: 5 },
    { type: 'pillar', x: 25, y: 34, w: 14, h: 5 },
    { type: 'staircase', x: 70, y: 16, w: 15, h: 14, label: 'Stair Case' },
  ],
  entry: { x: 30, y: 68, label: 'Entry' },
}

// ══════════════ HALL 600 (Second Floor) — racks 601-645 ══════════════
const hall600: HallLayout = {
  hall: '600', label: 'Hall 600', floor: 'second', width: 100, height: 80,
  racks: [
    // Top row 609-616
    { number: 609, x: 15, y: 6, w: 6, h: 3 }, { number: 610, x: 21, y: 6, w: 6, h: 3 },
    { number: 611, x: 27, y: 6, w: 6, h: 3 }, { number: 612, x: 33, y: 6, w: 6, h: 3 },
    { number: 613, x: 39, y: 6, w: 6, h: 3 }, { number: 614, x: 45, y: 6, w: 6, h: 3 },
    { number: 615, x: 51, y: 6, w: 6, h: 3 }, { number: 616, x: 57, y: 6, w: 6, h: 3 },
    // Right column 617-625
    { number: 617, x: 85, y: 10, w: 6, h: 3 }, { number: 618, x: 85, y: 16, w: 6, h: 3 },
    { number: 619, x: 85, y: 22, w: 6, h: 3 }, { number: 620, x: 85, y: 28, w: 6, h: 3 },
    { number: 621, x: 85, y: 34, w: 6, h: 3 }, { number: 622, x: 85, y: 40, w: 6, h: 3 },
    { number: 623, x: 85, y: 46, w: 6, h: 3 }, { number: 624, x: 85, y: 52, w: 6, h: 3 },
    { number: 625, x: 85, y: 58, w: 6, h: 3 },
    // Left column 601-608
    { number: 601, x: 5, y: 70, w: 6, h: 3 }, { number: 602, x: 5, y: 64, w: 6, h: 3 },
    { number: 603, x: 5, y: 58, w: 6, h: 3 }, { number: 604, x: 5, y: 52, w: 6, h: 3 },
    { number: 605, x: 5, y: 46, w: 6, h: 3 }, { number: 606, x: 5, y: 40, w: 6, h: 3 },
    { number: 607, x: 5, y: 34, w: 6, h: 3 }, { number: 608, x: 5, y: 28, w: 6, h: 3 },
    // Bottom row 630-639
    { number: 630, x: 63, y: 70, w: 6, h: 3 }, { number: 631, x: 69, y: 70, w: 6, h: 3 },
    { number: 632, x: 75, y: 70, w: 6, h: 3 }, { number: 633, x: 81, y: 70, w: 6, h: 3 },
    // Central 4 clusters
    { number: 634, x: 22, y: 22, w: 7, h: 3 }, { number: 635, x: 22, y: 34, w: 7, h: 3 },
    { number: 636, x: 22, y: 40, w: 7, h: 3 }, { number: 637, x: 22, y: 52, w: 7, h: 3 },
    { number: 638, x: 22, y: 58, w: 7, h: 3 }, { number: 639, x: 22, y: 64, w: 7, h: 3 },
    { number: 645, x: 35, y: 22, w: 6, h: 3 }, { number: 643, x: 35, y: 40, w: 6, h: 3 },
    { number: 644, x: 35, y: 46, w: 6, h: 3 }, { number: 642, x: 35, y: 52, w: 6, h: 3 },
    { number: 641, x: 35, y: 58, w: 6, h: 3 }, { number: 640, x: 35, y: 64, w: 6, h: 3 },
    { number: 629, x: 58, y: 40, w: 6, h: 3 }, { number: 628, x: 58, y: 46, w: 6, h: 3 },
    { number: 626, x: 65, y: 35, w: 6, h: 3 }, { number: 627, x: 65, y: 42, w: 6, h: 3 },
    { number: 649, x: 48, y: 35, w: 6, h: 3 }, { number: 650, x: 48, y: 22, w: 6, h: 3 },
    { number: 651, x: 55, y: 22, w: 6, h: 3 }, { number: 648, x: 55, y: 35, w: 6, h: 3 },
    { number: 647, x: 65, y: 55, w: 6, h: 3 }, { number: 646, x: 72, y: 46, w: 6, h: 3 },
  ],
  features: [
    { type: 'pillar', x: 22, y: 22, w: 8, h: 5 },
    { type: 'pillar', x: 22, y: 42, w: 8, h: 5 },
    { type: 'pillar', x: 35, y: 22, w: 8, h: 5 },
    { type: 'pillar', x: 48, y: 22, w: 14, h: 5 },
    { type: 'pillar', x: 58, y: 40, w: 8, h: 10 },
    { type: 'pillar', x: 65, y: 35, w: 8, h: 10 },
  ],
  entry: { x: 50, y: 76, label: 'Entry' },
}

// ══════════════ HALL 800 (Second Floor) — racks 801-832 ══════════════
const hall800: HallLayout = {
  hall: '800', label: 'Hall 800', floor: 'second', width: 100, height: 70,
  racks: [
    // Top 815-819
    { number: 815, x: 32, y: 6, w: 6, h: 3 }, { number: 816, x: 38, y: 6, w: 6, h: 3 },
    { number: 817, x: 44, y: 6, w: 6, h: 3 }, { number: 818, x: 50, y: 6, w: 6, h: 3 },
    { number: 819, x: 56, y: 6, w: 6, h: 3 },
    // Right column 801-809
    { number: 801, x: 85, y: 10, w: 6, h: 3 }, { number: 802, x: 85, y: 18, w: 6, h: 3 },
    { number: 803, x: 85, y: 30, w: 6, h: 3 }, { number: 804, x: 85, y: 56, w: 6, h: 3 },
    { number: 805, x: 79, y: 56, w: 6, h: 3 }, { number: 806, x: 73, y: 56, w: 6, h: 3 },
    { number: 807, x: 67, y: 56, w: 6, h: 3 }, { number: 808, x: 61, y: 56, w: 6, h: 3 },
    { number: 809, x: 5, y: 56, w: 6, h: 3 },
    // Left column 810-814
    { number: 810, x: 5, y: 46, w: 6, h: 3 }, { number: 811, x: 5, y: 40, w: 6, h: 3 },
    { number: 812, x: 5, y: 34, w: 6, h: 3 }, { number: 813, x: 5, y: 28, w: 6, h: 3 },
    { number: 814, x: 5, y: 22, w: 6, h: 3 },
    // Central clusters 819-832
    { number: 820, x: 30, y: 26, w: 6, h: 3 }, { number: 821, x: 36, y: 22, w: 6, h: 3 },
    { number: 822, x: 42, y: 22, w: 6, h: 3 }, { number: 823, x: 48, y: 22, w: 6, h: 3 },
    { number: 824, x: 28, y: 40, w: 6, h: 3 }, { number: 825, x: 34, y: 40, w: 6, h: 3 },
    { number: 826, x: 40, y: 40, w: 6, h: 3 }, { number: 827, x: 28, y: 46, w: 6, h: 3 },
    { number: 828, x: 34, y: 46, w: 6, h: 3 }, { number: 829, x: 40, y: 46, w: 6, h: 3 },
    { number: 830, x: 46, y: 46, w: 6, h: 3 }, { number: 831, x: 52, y: 40, w: 6, h: 3 },
    { number: 832, x: 58, y: 40, w: 6, h: 3 },
  ],
  features: [
    { type: 'pillar', x: 36, y: 22, w: 18, h: 5, label: 'Center' },
    { type: 'pillar', x: 28, y: 40, w: 30, h: 10 },
  ],
  entry: { x: 50, y: 62, label: 'Entry' },
}

// ══════════════ HALL 900 (Second Floor) — racks 901-942 ══════════════
const hall900: HallLayout = {
  hall: '900', label: 'Hall 900', floor: 'second', width: 100, height: 75,
  racks: [
    // Top row 919-922
    { number: 919, x: 28, y: 6, w: 6, h: 3 }, { number: 920, x: 34, y: 6, w: 6, h: 3 },
    { number: 921, x: 40, y: 6, w: 6, h: 3 }, { number: 922, x: 46, y: 6, w: 6, h: 3 },
    // Right column 901-905
    { number: 901, x: 85, y: 12, w: 6, h: 3 }, { number: 902, x: 85, y: 18, w: 6, h: 3 },
    { number: 903, x: 85, y: 24, w: 6, h: 3 }, { number: 904, x: 85, y: 30, w: 6, h: 3 },
    { number: 905, x: 85, y: 36, w: 6, h: 3 },
    // Left column 910-918
    { number: 910, x: 5, y: 58, w: 6, h: 3 }, { number: 911, x: 5, y: 52, w: 6, h: 3 },
    { number: 912, x: 5, y: 46, w: 6, h: 3 }, { number: 913, x: 5, y: 40, w: 6, h: 3 },
    { number: 914, x: 5, y: 34, w: 6, h: 3 }, { number: 915, x: 5, y: 28, w: 6, h: 3 },
    { number: 916, x: 5, y: 22, w: 6, h: 3 }, { number: 917, x: 5, y: 16, w: 6, h: 3 },
    { number: 918, x: 5, y: 10, w: 6, h: 3 },
    // Bottom row 906-909
    { number: 906, x: 60, y: 68, w: 6, h: 3 }, { number: 907, x: 54, y: 68, w: 6, h: 3 },
    { number: 908, x: 48, y: 68, w: 6, h: 3 }, { number: 909, x: 42, y: 68, w: 6, h: 3 },
    // Central clusters 923-942
    { number: 923, x: 28, y: 18, w: 6, h: 3 }, { number: 924, x: 34, y: 18, w: 6, h: 3 },
    { number: 925, x: 28, y: 24, w: 6, h: 3 }, { number: 926, x: 34, y: 24, w: 6, h: 3 },
    { number: 927, x: 28, y: 30, w: 6, h: 3 }, { number: 928, x: 34, y: 30, w: 6, h: 3 },
    { number: 929, x: 40, y: 24, w: 6, h: 3 }, { number: 930, x: 40, y: 30, w: 6, h: 3 },
    { number: 932, x: 50, y: 24, w: 6, h: 3 }, { number: 933, x: 68, y: 24, w: 6, h: 3 },
    { number: 934, x: 68, y: 30, w: 6, h: 3 }, { number: 935, x: 62, y: 30, w: 6, h: 3 },
    { number: 936, x: 56, y: 30, w: 6, h: 3 }, { number: 937, x: 50, y: 36, w: 6, h: 3 },
    { number: 938, x: 56, y: 36, w: 6, h: 3 }, { number: 939, x: 50, y: 42, w: 6, h: 3 },
    { number: 940, x: 56, y: 42, w: 6, h: 3 }, { number: 941, x: 50, y: 48, w: 6, h: 3 },
    { number: 942, x: 56, y: 48, w: 6, h: 3 },
  ],
  features: [
    { type: 'pillar', x: 28, y: 18, w: 18, h: 5 },
    { type: 'pillar', x: 50, y: 24, w: 6, h: 18 },
    { type: 'pillar', x: 68, y: 24, w: 6, h: 10 },
  ],
  entry: { x: 50, y: 72, label: 'Entry' },
}

export const FLOOR_PLANS: HallLayout[] = [
  hall100, hall200, hall300, hall400, hall500,
  hall600, hall800, hall900,
]

export function getHallsByFloor(floor: Floor): HallLayout[] {
  return FLOOR_PLANS.filter((h) => h.floor === floor)
}
