import _ from 'lodash'
import Shape from '@doodle3d/clipper-js'
import { SVG } from '@svgdotjs/svg.js'
import { v4 as uuidv4 } from 'uuid'

import type { PointArrayAlias } from '@svgdotjs/svg.js'
import type { Point } from '@doodle3d/clipper-js'

import '@/assets/scss/style.scss'

type MousePosition = {
  x: number
  y: number
}

const DEBUG_DRAW_ENABLED = false
const MAX_DISTANCE = 200
const OFFSET = 10
const OFFSET_OPTION = {
  jointType: 'jtMiter',
}

const rectangles: number[][] = [
  [50, 50, 100, 120],
  [300, 50, 100, 120],
  [60, 250, 100, 120],
  [300, 251, 100, 120],

  [50 + 500, 50 + 350, 100, 120],
  [300 + 520, 50 + 320, 100, 120],
  [60 + 500, 250 + 350, 100, 120],
  [300 + 500, 251 + 350, 100, 120],

  // [100, 150, 100, 120],
  // [600, 50, 100, 120],
  [100, 600, 50, 50],
  [680, 250, 50, 50],
]

//--------------------
// Classes
//--------------------

class Vector {
  constructor(public readonly x: -1 | 0 | 1, public readonly y: -1 | 0 | 1) {}
}

class Vertex {
  constructor(public readonly x: number, public readonly y: number) {}
}

class VertexWithVector {
  constructor(
    public readonly vector: Vector,
    public readonly x: number,
    public readonly y: number,
    public readonly label: 'tl' | 'tr' | 'br' | 'bl'
  ) {}
}

class VLine {
  constructor(public readonly vector: Vector, public readonly v1: Vertex, public readonly v2: Vertex) {}

  public get distance(): number {
    return Math.sqrt(Math.pow(this.v2.x - this.v1.x, 2) + Math.pow(this.v2.y - this.v1.y, 2))
  }
}

class VRect {
  public isolated = false

  constructor(
    public readonly id: string,
    public readonly vertices: VertexWithVector[],
    public readonly width: number,
    public readonly height: number,
    public readonly dummy?: boolean
  ) {}

  public get x(): number {
    return this.vertices[0].x
  }

  public get y(): number {
    return this.vertices[0].y
  }

  public collisionLine(vertex: VertexWithVector): VLine | null {
    let line: VLine | null = null

    if (vertex.x >= this.x && vertex.x <= this.x + this.width) {
      if (vertex.y > this.y + this.height) {
        if (vertex.label === 'tl' || vertex.label === 'tr') {
          const v1: Vertex = {
            x: vertex.x,
            y: vertex.y,
          }

          const v2: Vertex = {
            x: vertex.x,
            y: this.y + this.height,
          }

          const vector: Vector = {
            x: 0,
            y: -1,
          }

          line = new VLine(vector, v1, v2)
        }
      } else {
        if (vertex.label === 'bl' || vertex.label === 'br') {
          const v1: Vertex = {
            x: vertex.x,
            y: vertex.y,
          }

          const v2: Vertex = {
            x: vertex.x,
            y: this.y,
          }

          const vector: Vector = {
            x: 0,
            y: 1,
          }

          line = new VLine(vector, v1, v2)
        }
      }
    }

    if (vertex.y >= this.y && vertex.y <= this.y + this.height) {
      if (vertex.x > this.x + this.width) {
        if (vertex.label === 'tl' || vertex.label === 'bl') {
          const v1: Vertex = {
            x: vertex.x,
            y: vertex.y,
          }

          const v2: Vertex = {
            x: this.x + this.width,
            y: vertex.y,
          }

          const vector: Vector = {
            x: -1,
            y: 0,
          }

          line = new VLine(vector, v1, v2)
        }
      } else {
        if (vertex.label === 'tr' || vertex.label === 'br') {
          const v1: Vertex = {
            x: vertex.x,
            y: vertex.y,
          }
          const v2: Vertex = {
            x: this.x,
            y: vertex.y,
          }
          const vector: Vector = {
            x: 1,
            y: 0,
          }
          line = new VLine(vector, v1, v2)
        }
      }
    }

    if (line && line.distance < MAX_DISTANCE) {
      return line
    } else {
      return null
    }
  }

  public clone(): VRect {
    return new VRect(this.id, [...this.vertices], this.width, this.height, this.dummy)
  }
}

class Rect {
  constructor(public readonly x: number, public readonly y: number, public readonly width: number, public readonly height: number) {}
}

//--------------------
// Utility
//--------------------

function rectToShape(x: number, y: number, width: number, height: number): Shape {
  let path = [
    [
      { X: x, Y: y },
      { X: x, Y: y + height },
      { X: x + width, Y: y + height },
      { X: x + width, Y: y },
    ],
  ]
  return new Shape(path)
}

function shapeToArray(shape: any): PointArrayAlias {
  let paths: number[][] = []

  for (let p of shape.paths[0]) {
    paths.push([p.X, p.Y])
  }
  return paths as PointArrayAlias
}

function pathToArray(path: any): PointArrayAlias {
  let paths: number[][] = []
  // console.log(path[0])
  for (let p of path) {
    paths.push([p.X, p.Y])
  }

  return paths as PointArrayAlias
}

function lineToGroup(lines: VLine[]): VLine[][] {
  let index = 0

  return lines.reduce((group: VLine[][], line: VLine) => {
    let newGroup: VLine[][] = [...group]

    if (group.length <= 0) {
      newGroup[index] = []
      newGroup[index].push(line)
    } else {
      let result = false

      for (let i = 0; i < group.length; i++) {
        const lines = group[i]

        lines.forEach((l: VLine, j: number) => {
          if (l.distance === line.distance) {
            if (l.v1.x === line.v1.x || l.v1.x === line.v2.x || l.v1.y === line.v1.y || l.v1.y === line.v2.y) {
              if (newGroup[i]) {
                newGroup[i].push(line)
              }
            }
          }
        })
      }

      if (!result) {
        index++
        newGroup[index] = []
        newGroup[index].push(line)
      }
    }

    return newGroup
  }, [])
}

const init = () => {
  const canvas = document.getElementById('myCanvas') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')
  const svg = SVG().addTo('body').size(1000, 1000)

  let vRects: VRect[] = []
  let shapes: Shape[] = []
  let vLines: VLine[] = []
  let vLinesAll: VLine[] = []

  // 接続可能な矩形
  let groupedRectangles: VRect[] = []
  let compRectangles: VRect[] = []

  // Shape
  let groupedShape: Shape | undefined
  let isolatedShapes: Shape[] = []

  // インタラクション系
  let isMouseDown = false
  let selectedIndex: number | null = null
  const mousePosition: MousePosition = { x: 0, y: 0 }

  //--------------------
  // ロジック系
  //--------------------

  function setVRects() {
    for (const rect of rectangles) {
      const [x, y, width, height] = rect

      // top left
      const v1: VertexWithVector = {
        x,
        y,
        vector: {
          x: -1,
          y: -1,
        },
        label: 'tl',
      }

      // top right
      const v2: VertexWithVector = {
        x: x + width,
        y,
        vector: {
          x: 1,
          y: -1,
        },
        label: 'tr',
      }

      // bottom right
      const v3: VertexWithVector = {
        x: x + width,
        y: y + height,
        vector: {
          x: 1,
          y: 1,
        },
        label: 'br',
      }

      // bottom left
      const v4: VertexWithVector = {
        x: x,
        y: y + height,
        vector: {
          x: -1,
          y: 1,
        },
        label: 'bl',
      }

      const vRect: VRect = new VRect(uuidv4(), [v1, v2, v3, v4], width, height)

      vRects.push(vRect)
    }
  }

  function setGroupedRectangles(rects: VRect[], targetRects: VRect[], isSecond: boolean = false) {
    vLines = []
    vLinesAll = []
    const newGroupedRectangles: VRect[] = []

    rects.forEach((rect, i) => {
      let collisionFound = false
      const foundIndices: number[] = []

      rect.vertices.forEach((vertex) => {
        targetRects.forEach((r, j) => {
          // 自分自身は除外
          if (i !== j) {
            const vLine = r.collisionLine(vertex)

            if (vLine) {
              vLinesAll.push(vLine)

              // 頂点と線の方向が一致したもののみ
              if (vertex.vector.y === vLine.vector.y || vertex.vector.x === vLine.vector.x) {
                vLines.push(vLine)
                collisionFound = true
                foundIndices.push(j)
              }
            }
          }
        })
      })

      if (collisionFound) {
        const clone = rect.clone()
        clone.isolated = false
        newGroupedRectangles.push(clone)

        foundIndices.forEach((index) => {
          const rect = targetRects[index]
          const clone = rect.clone()
          clone.isolated = false

          const found = newGroupedRectangles.find((r) => r.id === rect.id)

          if (!found) {
            newGroupedRectangles.push(clone)
          }
        })
      } else {
        if (isSecond) {
          if (!groupedRectangles.find((r) => r.id === rect.id)) {
            rect.isolated = true
          }
        }
      }
    })

    groupedRectangles = newGroupedRectangles

    let group = lineToGroup(vLines) as VLine[][]

    group = group.filter((lines: VLine[]) => {
      return lines.length >= 2
    })

    // reset
    compRectangles = []

    for (const key in group) {
      const lines: VLine[] = group[key]
      const vertices = [
        new Vertex(lines[0].v1.x, lines[0].v1.y),
        new Vertex(lines[0].v2.x, lines[0].v2.y),
        new Vertex(lines[1].v1.x, lines[1].v1.y),
        new Vertex(lines[1].v2.x, lines[1].v2.y),
      ]

      const xList = vertices.map((v) => v.x)
      const yList = vertices.map((v) => v.y)
      const x = Math.min(...xList)
      const y = Math.min(...yList)
      const width = Math.max(...xList) - x
      const height = Math.max(...yList) - y

      const v1 = new VertexWithVector({ x: -1, y: -1 }, x, y, 'tl')
      const v2 = new VertexWithVector({ x: 1, y: -1 }, x + width, y, 'tr')
      const v3 = new VertexWithVector({ x: 1, y: 1 }, x + width, y + height, 'br')
      const v4 = new VertexWithVector({ x: -1, y: 1 }, x, y + height, 'bl')

      const rect = new VRect(uuidv4(), [v1, v2, v3, v4], width, height, true)
      compRectangles.push(rect)
    }
  }

  // ClipperJS用のShapeデータ作成
  function setShapes() {
    for (const rect of groupedRectangles) {
      const shape = rectToShape(rect.x, rect.y, rect.width, rect.height)
      shapes.push(shape)
    }

    for (const rect of compRectangles) {
      const shape = rectToShape(rect.x, rect.y, rect.width, rect.height)
      shapes.push(shape)
    }

    // 各要素のShapeを結合したパス(Shape)を作成
    for (let shape of shapes) {
      if (!groupedShape) {
        groupedShape = shape
      } else {
        groupedShape = groupedShape.union(shape)
      }
    }

    groupedShape = groupedShape?.offset(OFFSET, OFFSET_OPTION)

    // 孤立した矩形
    const isolatedRects = vRects.filter((rect) => {
      return rect.isolated
    })

    isolatedRects.forEach((rect) => {
      let shape = rectToShape(rect.x, rect.y, rect.width, rect.height)
      shape = shape.offset(OFFSET, OFFSET_OPTION)
      isolatedShapes.push(shape)
    })
  }

  // 空洞の削除
  function removeShapeCavity() {
    const deletePathIndices: number[] = []
    const rectFromPath = (path: Point[]): Rect => {
      const xList = path.map((p) => p.X)
      const yList = path.map((p) => p.Y)
      const minX = Math.min(...xList)
      const maxX = Math.max(...xList)
      const minY = Math.min(...yList)
      const maxY = Math.max(...yList)
      const width = maxX - minX
      const height = maxY - minY
      const rect = new Rect(minX, minY, width, height)
      return rect
    }

    groupedShape?.paths.forEach((path, i) => {
      const rect1 = rectFromPath(path)

      groupedShape?.paths.forEach((path, j) => {
        if (i === j) {
          return
        }

        const rect2 = rectFromPath(path)

        if (
          rect1.x > rect2.x &&
          rect1.x + rect1.width < rect2.x + rect2.width &&
          rect1.y > rect2.y &&
          rect1.y + rect1.height < rect2.x + rect2.height
        ) {
          deletePathIndices.push(i)
        }
      })
    })

    if (deletePathIndices.length > 0) {
      const filteredPaths = groupedShape?.paths.filter((_, index) => {
        return !deletePathIndices.includes(index)
      })

      if (filteredPaths) {
        groupedShape = new Shape(filteredPaths)
      }
    }
  }

  //--------------------
  // 描画系
  //--------------------

  // ベース矩形を描画
  function drawBaseRectangles() {
    if (ctx) {
      for (const rect of rectangles) {
        const [x, y, width, height] = rect
        ctx.beginPath()
        ctx.rect(x, y, width, height)
        ctx.strokeStyle = '#000'
        ctx.stroke()
        ctx.fillStyle = '#ccc'
        ctx.fill()
      }
    }
  }

  // 補完矩形の描画
  function drawCompRectangles() {
    if (ctx && DEBUG_DRAW_ENABLED) {
      compRectangles.forEach((rect) => {
        ctx.beginPath()
        ctx.rect(rect.x, rect.y, rect.width, rect.height)
        ctx.fillStyle = 'rgba(0, 0, 255, 0.2)'
        ctx.fill()
      })
    }
  }

  // 衝突線の描画
  function drawVLines() {
    if (ctx && DEBUG_DRAW_ENABLED) {
      vLinesAll.forEach((line) => {
        ctx.beginPath()

        if (line.vector.y > 0 || line.vector.x > 0) {
          ctx.strokeStyle = '#ff0000'
        } else {
          ctx.strokeStyle = '#00ff00'
        }

        ctx.moveTo(line.v1.x, line.v1.y)
        ctx.lineTo(line.v2.x, line.v2.y)
        ctx.stroke()
      })
    }
  }

  function drawShapes() {
    groupedShape?.paths.forEach((path) => {
      svg
        .polygon()
        .plot(pathToArray(path) as PointArrayAlias)
        .attr({ fill: 'none' })
        .stroke({ color: 'orange', width: 2, opacity: 1 })
    })

    isolatedShapes.forEach((shape) => {
      svg
        .polygon()
        .plot(shapeToArray(shape) as PointArrayAlias)
        .attr({ fill: 'none' })
        .stroke({ color: 'red', width: 2, opacity: 1 })
    })
  }

  //--------------------
  // インタラクション系
  //--------------------

  const getHitIndex = (mouseX: number, mouseY: number): number | null => {
    const foundIndex = rectangles.findIndex((rect: number[]) => {
      const [x, y, width, height] = rect

      if (mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height) {
        return true
      }

      return false
    })

    if (foundIndex >= 0) {
      return foundIndex
    }

    return null
  }

  const onMouseDown = (event: MouseEvent) => {
    isMouseDown = true

    const x = event.clientX
    const y = event.clientY
    const index = getHitIndex(x, y)

    mousePosition.x = x
    mousePosition.y = y
    selectedIndex = index
  }

  const onMouseUp = () => {
    isMouseDown = false
  }

  const onMouseMove = (event: MouseEvent) => {
    if (isMouseDown) {
      if (selectedIndex !== null && selectedIndex >= 0) {
        const x = event.clientX
        const y = event.clientY
        mousePosition.x = x
        mousePosition.y = y
        rectangles[selectedIndex][0] = mousePosition.x - 50
        rectangles[selectedIndex][1] = mousePosition.y - 50
      }

      update()
    }
  }

  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onMouseMove)

  //--------------------
  // execute
  //--------------------

  function update() {
    // reset
    vRects = []
    shapes = []
    groupedRectangles = []
    compRectangles = []
    groupedShape = undefined
    isolatedShapes = []

    svg.clear()

    if (ctx) {
      ctx.clearRect(0, 0, 1000, 1000)
    }

    // logic
    setVRects()
    setGroupedRectangles(vRects, vRects)
    setGroupedRectangles(vRects, vRects.concat(compRectangles), true)
    setShapes()
    removeShapeCavity()

    // draw
    drawBaseRectangles()
    drawCompRectangles()
    drawVLines()
    drawShapes()
  }

  update()
}

document.addEventListener('DOMContentLoaded', init)
