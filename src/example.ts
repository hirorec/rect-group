import '@/assets/scss/style.scss'

import Shape from '@doodle3d/clipper-js'
import { SVG } from '@svgdotjs/svg.js'

import type { PointArrayAlias } from '@svgdotjs/svg.js'

document.addEventListener('DOMContentLoaded', () => {
  init()
})

const init = () => {
  //矩形をClipper用Shapeに変換する
  function boxToShape(x: number, y: number, w: number, h: number) {
    let path = [
      [
        { X: x, Y: y },
        { X: x, Y: y + h },
        { X: x + w, Y: y + h },
        { X: x + w, Y: y },
      ],
    ]
    return new Shape(path)
  }

  //Shapeのパスを座標配列に変換する（穴が無いシンプルなShapeを前提）
  function shapeToArray(shape: any) {
    let paths = []
    for (let p of shape.paths[0]) {
      paths.push([p.X, p.Y])
    }
    return paths
  }

  //削除マーカの描画
  // function drawDelMark(draw: any, elems: any) {
  //   //削除マーカー
  //   let marker = draw.marker(10, 10, function (add: any) {
  //     add.line(0, 0, 10, 10).stroke({ width: 1, color: 'blue' })
  //     add.line(0, 10, 10, 0).stroke({ width: 1, color: 'blue' })
  //   })
  //   for (let elm of elems) {
  //     //矩形の上部の線の中央にマーカをつける（他の図形はそれぞれ対応が必要）
  //     if (elm.type === 'rect') {
  //       let l = elm.x()
  //       let t = elm.y()
  //       let r = elm.x() + elm.width()
  //       //midの場合は、中央点が必要
  //       draw.polyline([l, t, l + (r - l) / 2, t, r, t]).marker('mid', marker)
  //     }
  //   }
  // }

  // 対象となる図形を適当に描画する(SVG.js)
  let draw = SVG().addTo('body').size(1000, 800)
  draw.rect(100, 100).attr({ x: 100, y: 100, stroke: 'red', fill: 'none' }).opacity(0.6).addClass('add-item')
  draw.rect(100, 100).attr({ x: 150, y: 160, stroke: 'blue', fill: 'none' }).opacity(0.8).addClass('del-item')
  draw.rect(20, 20).attr({ x: 80, y: 100, stroke: 'red', fill: 'none' }).opacity(0.6).addClass('add-item')
  draw.rect(20, 20).attr({ x: 110, y: 110, stroke: 'blue', fill: 'none' }).opacity(0.8).addClass('del-item')
  draw.rect(200, 20).attr({ x: 120, y: 120, stroke: 'blue', fill: 'none' }).opacity(0.8).addClass('del-item')
  draw.text('vwxyz').attr({ x: 220, y: 220, stroke: 'red', fill: 'none' }).opacity(0.8).addClass('add-item')
  draw
    .text('abcde')
    .attr({
      x: 220,
      y: 230,
      stroke: 'blue',
      fill: 'none',
      'text-decoration': 'line-through',
    })
    .opacity(0.8)
    .addClass('del-item')

  draw.rect(100, 100).attr({ x: 200, y: 200, stroke: 'red', fill: 'none' })

  //削除クラスの図形に対して×マークを付ける
  // let list = draw.find('.del-item')
  // drawDelMark(draw, list)

  //全ての要素を取り出し、バウンディングBoxをClipper用Shapeに変換する
  //実際は重なりループ分けが必要
  let shapes = []
  let p = draw.children()
  for (let elm of p) {
    let b = elm.bbox()
    shapes.push(boxToShape(b.x, b.y, b.w, b.h))
  }

  //各要素のShapeを結合したパス(Shape)を作成
  let resultShape = null

  for (let shape of shapes) {
    if (resultShape === null) {
      resultShape = shape
    } else {
      resultShape = resultShape.union(shape)
    }
  }
  //囲み枠をオフセット分広げる
  resultShape = resultShape?.offset(10)

  console.log(resultShape)

  //囲み枠の描画
  draw
    .polygon()
    .plot(shapeToArray(resultShape) as PointArrayAlias)
    .attr({ fill: 'none', width: '10' })
    .stroke({ color: 'orange', width: 2, opacity: 1 })
}
