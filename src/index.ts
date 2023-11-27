import _ from 'lodash'
import Shape from '@doodle3d/clipper-js'
import { SVG } from '@svgdotjs/svg.js'
import { v4 as uuidv4 } from 'uuid'

import type { PointArrayAlias } from '@svgdotjs/svg.js'
import type { Point } from '@doodle3d/clipper-js'
import type { Svg } from '@svgdotjs/svg.js'

import '@/assets/scss/style.scss'

type MousePosition = {
  x: number
  y: number
}

const DEBUG_DRAW_ENABLED = false
const MAX_DISTANCE = 200
const OFFSET = 30
const OFFSET_OPTION = {
  jointType: 'jtMiter',
}

const RECTANGLES1: number[][] = [
  [50, 50, 100, 120],
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
      } else if (vertex.label === 'bl' || vertex.label === 'br') {
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
      } else if (vertex.label === 'tr' || vertex.label === 'br') {
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
  constructor(public x: number, public y: number, public readonly width: number, public readonly height: number, public readonly id: string) {}
}

class StructuresGroup {
  public rects: Rect[] = []
  private vRects: VRect[] = []
  private shapes: Shape[] = []
  private vLines: VLine[] = []
  public vLinesAll: VLine[] = []

  // 接続可能な矩形
  private groupedRectangles: VRect[] = []
  public compRectangles: VRect[] = []

  // Shape
  public groupedShape: Shape | undefined
  public isolatedShapes: Shape[] = []

  //--------------------
  // Utility
  //--------------------

  private static rectToShape(x: number, y: number, width: number, height: number): Shape {
    const path = [
      [
        { X: x, Y: y },
        { X: x, Y: y + height },
        { X: x + width, Y: y + height },
        { X: x + width, Y: y },
      ],
    ]
    return new Shape(path)
  }

  public static shapeToArray(shape: Shape): PointArrayAlias {
    const paths: number[][] = []

    for (const p of shape.paths[0]) {
      paths.push([p.X, p.Y])
    }
    return paths as PointArrayAlias
  }

  public static pathToArray(path: Point[]): PointArrayAlias {
    const paths: number[][] = []
    // console.log(path[0])
    for (const p of path) {
      paths.push([p.X, p.Y])
    }

    return paths as PointArrayAlias
  }

  private static lineToGroup(lines: VLine[]): VLine[][] {
    let index = 0

    return lines.reduce((group: VLine[][], line: VLine) => {
      const newGroup: VLine[][] = [...group]

      if (group.length <= 0) {
        newGroup[index] = []
        newGroup[index].push(line)
      } else {
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

        index++
        newGroup[index] = []
        newGroup[index].push(line)
      }

      return newGroup
    }, [])
  }

  //--------------------
  // ロジック系
  //--------------------

  public setRects(rects: Rect[]) {
    this.rects = rects
  }

  private setVRects() {
    for (const rect of this.rects) {
      const { x, y, width, height } = rect

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

      this.vRects.push(vRect)
    }
  }

  private setGroupedRectangles(rects: VRect[], targetRects: VRect[], isSecond: boolean = false) {
    this.vLines = []
    this.vLinesAll = []
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
              this.vLinesAll.push(vLine)

              // 頂点と線の方向が一致したもののみ
              if (vertex.vector.y === vLine.vector.y || vertex.vector.x === vLine.vector.x) {
                this.vLines.push(vLine)
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

          const found = newGroupedRectangles.find((r: VRect) => r.id === rect.id)

          if (!found) {
            newGroupedRectangles.push(clone)
          }
        })
      } else if (isSecond && !this.groupedRectangles.find((r: VRect) => r.id === rect.id)) {
        rect.isolated = true
      }
    })

    this.groupedRectangles = newGroupedRectangles

    let group = StructuresGroup.lineToGroup(this.vLines) as VLine[][]

    group = group.filter((lines: VLine[]) => {
      return lines.length >= 2
    })

    // reset
    this.compRectangles = []

    for (const key in group) {
      const lines: VLine[] = group[key]
      const vertices = [
        new Vertex(lines[0].v1.x, lines[0].v1.y),
        new Vertex(lines[0].v2.x, lines[0].v2.y),
        new Vertex(lines[1].v1.x, lines[1].v1.y),
        new Vertex(lines[1].v2.x, lines[1].v2.y),
      ]

      const xList = vertices.map((v: Vertex) => v.x)
      const yList = vertices.map((v: Vertex) => v.y)
      const x = Math.min(...xList)
      const y = Math.min(...yList)
      const width = Math.max(...xList) - x
      const height = Math.max(...yList) - y

      const v1 = new VertexWithVector({ x: -1, y: -1 }, x, y, 'tl')
      const v2 = new VertexWithVector({ x: 1, y: -1 }, x + width, y, 'tr')
      const v3 = new VertexWithVector({ x: 1, y: 1 }, x + width, y + height, 'br')
      const v4 = new VertexWithVector({ x: -1, y: 1 }, x, y + height, 'bl')

      const rect = new VRect(uuidv4(), [v1, v2, v3, v4], width, height, true)
      this.compRectangles.push(rect)
    }
  }

  // ClipperJS用のShapeデータ作成
  private setShapes() {
    for (const rect of this.groupedRectangles) {
      const shape = StructuresGroup.rectToShape(rect.x, rect.y, rect.width, rect.height)
      this.shapes.push(shape)
    }

    for (const rect of this.compRectangles) {
      const shape = StructuresGroup.rectToShape(rect.x, rect.y, rect.width, rect.height)
      this.shapes.push(shape)
    }

    // 各要素のShapeを結合したパス(Shape)を作成
    for (const shape of this.shapes) {
      if (!this.groupedShape) {
        this.groupedShape = shape
      } else {
        this.groupedShape = this.groupedShape.union(shape)
      }
    }

    this.groupedShape = this.groupedShape?.offset(OFFSET, OFFSET_OPTION)

    // 孤立した矩形
    const isolatedRects = this.vRects.filter((rect) => {
      return rect.isolated
    })

    isolatedRects.forEach((rect) => {
      let shape = StructuresGroup.rectToShape(rect.x, rect.y, rect.width, rect.height)
      shape = shape.offset(OFFSET, OFFSET_OPTION)
      this.isolatedShapes.push(shape)
    })
  }

  // 空洞の削除
  private removeShapeCavity() {
    const deletePathIndices: number[] = []
    const rectFromPath = (path: Point[]): Rect => {
      const xList = path.map((p: Point) => p.X)
      const yList = path.map((p: Point) => p.Y)
      const minX = Math.min(...xList)
      const maxX = Math.max(...xList)
      const minY = Math.min(...yList)
      const maxY = Math.max(...yList)
      const width = maxX - minX
      const height = maxY - minY
      const rect = new Rect(minX, minY, width, height, uuidv4())
      return rect
    }

    this.groupedShape?.paths.forEach((path, i) => {
      const rect1 = rectFromPath(path)

      this.groupedShape?.paths.forEach((path, j) => {
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
      const filteredPaths = this.groupedShape?.paths.filter((_, index) => {
        return !deletePathIndices.includes(index)
      })

      if (filteredPaths) {
        this.groupedShape = new Shape(filteredPaths)
      }
    }
  }

  //--------------------
  // インタラクション系
  //--------------------

  public update() {
    // reset
    this.vRects = []
    this.shapes = []
    this.groupedRectangles = []
    this.compRectangles = []
    this.groupedShape = undefined
    this.isolatedShapes = []

    // logic
    this.setVRects()
    this.setGroupedRectangles(this.vRects, this.vRects)
    this.setGroupedRectangles(this.vRects, this.vRects.concat(this.compRectangles), true)
    this.setShapes()
    this.removeShapeCavity()
  }
}

class Drawer {
  public groups: StructuresGroup[] = []
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly svg: Svg

  // インタラクション系
  private isMouseDown = false
  private selectedId: string | null = null
  private readonly mousePosition: MousePosition = { x: 0, y: 0 }

  constructor() {
    this.canvas = document.getElementById('myCanvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D
    this.svg = SVG().addTo('body').size(1000, 1000)

    window.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
  }

  public setGroups(groups: StructuresGroup[]) {
    this.groups = groups
  }

  private getHitId(mouseX: number, mouseY: number): string | null {
    let id: string | null = null

    this.groups.forEach((group) => {
      group.rects.forEach((rect) => {
        const { x, y, width, height } = rect

        if (mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height) {
          id = rect.id
          return
        }
      })
    })

    return id
  }

  private onMouseDown(event: MouseEvent) {
    this.isMouseDown = true

    const x = event.clientX
    const y = event.clientY
    this.mousePosition.x = x
    this.mousePosition.y = y
    this.selectedId = this.getHitId(x, y)
  }

  onMouseUp() {
    this.isMouseDown = false
  }

  onMouseMove(event: MouseEvent) {
    if (this.isMouseDown) {
      if (this.selectedId !== null) {
        const x = event.clientX
        const y = event.clientY
        this.mousePosition.x = x
        this.mousePosition.y = y
        let foundRect: Rect | null = null

        this.groups.forEach((group) => {
          group.rects.forEach((rect) => {
            if (rect.id === this.selectedId) {
              foundRect = rect
            }
          })
        })

        if (foundRect) {
          const rect = foundRect as Rect
          rect.x = this.mousePosition.x - 50
          rect.y = this.mousePosition.y - 50
        }
      }

      this.draw()
    }
  }

  //--------------------
  // 描画系
  //--------------------

  // ベース矩形を描画
  private drawBaseRectangles() {
    if (this.ctx) {
      for (const group of this.groups) {
        for (const rect of group.rects) {
          const { x, y, width, height } = rect
          this.ctx.beginPath()
          this.ctx.rect(x, y, width, height)
          this.ctx.strokeStyle = '#000'
          this.ctx.stroke()
          this.ctx.fillStyle = '#ccc'
          this.ctx.fill()
        }
      }
    }
  }

  // 補完矩形の描画
  private drawCompRectangles() {
    if (this.ctx && DEBUG_DRAW_ENABLED) {
      for (const group of this.groups) {
        group.compRectangles.forEach((rect) => {
          this.ctx.beginPath()
          this.ctx.rect(rect.x, rect.y, rect.width, rect.height)
          this.ctx.fillStyle = 'rgba(0, 0, 255, 0.2)'
          this.ctx.fill()
        })
      }
    }
  }

  // 衝突線の描画
  private drawVLines() {
    if (this.ctx && DEBUG_DRAW_ENABLED) {
      for (const group of this.groups) {
        group.vLinesAll.forEach((line) => {
          this.ctx.beginPath()

          if (line.vector.y > 0 || line.vector.x > 0) {
            this.ctx.strokeStyle = '#ff0000'
          } else {
            this.ctx.strokeStyle = '#00ff00'
          }

          this.ctx.moveTo(line.v1.x, line.v1.y)
          this.ctx.lineTo(line.v2.x, line.v2.y)
          this.ctx.stroke()
        })
      }
    }
  }

  private drawShapes() {
    for (const group of this.groups) {
      group.groupedShape?.paths.forEach((path) => {
        this.svg
          .polygon()
          .plot(StructuresGroup.pathToArray(path) as PointArrayAlias)
          .attr({ fill: 'none' })
          .stroke({ color: 'orange', width: 2, opacity: 1 })
      })

      group.isolatedShapes.forEach((shape) => {
        this.svg
          .polygon()
          .plot(StructuresGroup.shapeToArray(shape) as PointArrayAlias)
          .attr({ fill: 'none' })
          .stroke({ color: 'red', width: 2, opacity: 1 })
      })
    }
  }

  public draw() {
    for (const group of this.groups) {
      group.update()
    }

    this.svg.clear()

    if (this.ctx) {
      this.ctx.clearRect(0, 0, 1000, 1000)
    }

    this.drawBaseRectangles()
    this.drawCompRectangles()
    this.drawVLines()
    this.drawShapes()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const groups: StructuresGroup[] = []

  RECTANGLES.forEach((rectangles: number[][]) => {
    const rects: Rect[] = rectangles.map((value: number[]) => {
      const [x, y, width, height] = value
      return {
        x,
        y,
        width,
        height,
        id: uuidv4(),
      }
    })

    const group = new StructuresGroup()
    group.setRects(rects)
    groups.push(group)
  })

  const drawer = new Drawer()
  drawer.setGroups(groups)
  drawer.draw()
})
