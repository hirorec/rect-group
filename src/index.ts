import { StructureGroupApp } from './features/structure-group'

import '@/assets/scss/style.scss'

const RECTANGLES1: number[][] = [
  [50 + 50, 50 + 50, 100, 120],
  [300, 50, 100, 120],
  [60, 250, 100, 120],
  [300, 251, 100, 120],
]

const RECTANGLES2: number[][] = [
  [50 + 500, 50 + 350, 100, 120],
  [300 + 520, 50 + 320, 100, 120],
  [60 + 500, 250 + 350, 100, 120],
  [300 + 500, 251 + 350, 100, 120],
]

const RECTANGLES3: number[][] = [
  [100, 600, 50, 50],
  [680, 250, 50, 50],
]

const RECTANGLES = [RECTANGLES1, RECTANGLES2, RECTANGLES3]

document.addEventListener('DOMContentLoaded', () => {
  const app = new StructureGroupApp(RECTANGLES)
  app.init()
})
