const { CanvasWrapper } = require('./canvasWrapper')
const util = require('./util.js')

/* Shape: a geometric primitive with a bbox */
class Shape {
  static randomPoint (width, height) {
    return [~~(Math.random() * width), ~~(Math.random() * height)]
  }

  static create (cfg, document) {
    let ctors = cfg.shapeTypes
    let index = Math.floor(Math.random() * ctors.length)
    let ctor = ctors[index]
    return new ctor(cfg.width, cfg.height, document)
  }

  constructor (w, h, document) {
    if (!document) {
      throw new Error('Document required')
    }
    this.bbox = {}
    this.document = document
  }

  mutate (cfg) {
    return this
  }

  toSVG () {}

  /* get a new smaller canvas with this shape */
  rasterize (alpha) {
    let canvas = new CanvasWrapper(
      this.bbox.width,
      this.bbox.height,
      this.document
    )
    let ctx = canvas.ctx
    ctx.fillStyle = '#000'
    ctx.globalAlpha = alpha
    ctx.translate(-this.bbox.left, -this.bbox.top)
    this.render(ctx)
    return canvas
  }

  render (ctx) {}
}

class Polygon extends Shape {
  constructor (w, h, document, count) {
    super(w, h, document)

    this.points = this._createPoints(w, h, count)
    this.computeBbox()
  }

  render (ctx) {
    ctx.beginPath()
    this.points.forEach(([x, y], index) => {
      if (index) {
        ctx.lineTo(x, y)
      } else {
        ctx.moveTo(x, y)
      }
    })
    ctx.closePath()
    ctx.fill()
  }

  toSVG () {
    let path = this.document.createElementNS(util.SVGNS, 'path')
    let d = this.points
      .map((point, index) => {
        let cmd = index ? 'L' : 'M'
        return `${cmd}${point.join(',')}`
      })
      .join('')
    path.setAttribute('d', `${d}Z`)
    return path
  }

  mutate (cfg) {
    let clone = new this.constructor(0, 0, this.document)
    clone.points = this.points.map(point => point.slice())

    let index = Math.floor(Math.random() * this.points.length)
    let point = clone.points[index]

    let angle = Math.random() * 2 * Math.PI
    let radius = Math.random() * 20
    point[0] += ~~(radius * Math.cos(angle))
    point[1] += ~~(radius * Math.sin(angle))

    return clone.computeBbox()
  }

  computeBbox () {
    let min = [
      this.points.reduce((v, p) => Math.min(v, p[0]), Infinity),
      this.points.reduce((v, p) => Math.min(v, p[1]), Infinity)
    ]
    let max = [
      this.points.reduce((v, p) => Math.max(v, p[0]), -Infinity),
      this.points.reduce((v, p) => Math.max(v, p[1]), -Infinity)
    ]

    this.bbox = {
      left: min[0],
      top: min[1],
      width: max[0] - min[0] || 1 /* fallback for deformed shapes */,
      height: max[1] - min[1] || 1
    }

    return this
  }

  _createPoints (w, h, count) {
    let first = Shape.randomPoint(w, h)
    let points = [first]

    for (let i = 1; i < count; i++) {
      let angle = Math.random() * 2 * Math.PI
      let radius = Math.random() * 20
      points.push([
        first[0] + ~~(radius * Math.cos(angle)),
        first[1] + ~~(radius * Math.sin(angle))
      ])
    }
    return points
  }
}

class Triangle extends Polygon {
  constructor (w, h, document) {
    super(w, h, document, 3)
  }
}

class Rectangle extends Polygon {
  constructor (w, h, document) {
    super(w, h, document, 4)
  }

  mutate (cfg) {
    let clone = new this.constructor(0, 0)
    clone.points = this.points.map(point => point.slice())

    let amount = ~~((Math.random() - 0.5) * 20)

    switch (Math.floor(Math.random() * 4)) {
      case 0 /* left */:
        clone.points[0][0] += amount
        clone.points[3][0] += amount
        break
      case 1 /* top */:
        clone.points[0][1] += amount
        clone.points[1][1] += amount
        break
      case 2 /* right */:
        clone.points[1][0] += amount
        clone.points[2][0] += amount
        break
      case 3 /* bottom */:
        clone.points[2][1] += amount
        clone.points[3][1] += amount
        break
    }

    return clone.computeBbox()
  }

  _createPoints (w, h, count) {
    let p1 = Shape.randomPoint(w, h)
    let p2 = Shape.randomPoint(w, h)

    let left = Math.min(p1[0], p2[0])
    let right = Math.max(p1[0], p2[0])
    let top = Math.min(p1[1], p2[1])
    let bottom = Math.max(p1[1], p2[1])

    return [[left, top], [right, top], [right, bottom], [left, bottom]]
  }
}

class Ellipse extends Shape {
  constructor (w, h, document) {
    super(w, h, document)

    this.center = Shape.randomPoint(w, h)
    this.rx = 1 + ~~(Math.random() * 20)
    this.ry = 1 + ~~(Math.random() * 20)

    this.computeBbox()
  }

  render (ctx) {
    ctx.beginPath()
    ctx.ellipse(
      this.center[0],
      this.center[1],
      this.rx,
      this.ry,
      0,
      0,
      2 * Math.PI,
      false
    )
    ctx.fill()
  }

  toSVG () {
    let node = this.document.createElementNS(util.SVGNS, 'ellipse')
    node.setAttribute('cx', this.center[0])
    node.setAttribute('cy', this.center[1])
    node.setAttribute('rx', this.rx)
    node.setAttribute('ry', this.ry)
    return node
  }

  mutate (cfg) {
    let clone = new this.constructor(0, 0, this.document)
    clone.center = this.center.slice()
    clone.rx = this.rx
    clone.ry = this.ry

    switch (Math.floor(Math.random() * 3)) {
      case 0:
        let angle = Math.random() * 2 * Math.PI
        let radius = Math.random() * 20
        clone.center[0] += ~~(radius * Math.cos(angle))
        clone.center[1] += ~~(radius * Math.sin(angle))
        break

      case 1:
        clone.rx += (Math.random() - 0.5) * 20
        clone.rx = Math.max(1, ~~clone.rx)
        break

      case 2:
        clone.ry += (Math.random() - 0.5) * 20
        clone.ry = Math.max(1, ~~clone.ry)
        break
    }

    return clone.computeBbox()
  }

  computeBbox () {
    this.bbox = {
      left: this.center[0] - this.rx,
      top: this.center[1] - this.ry,
      width: 2 * this.rx,
      height: 2 * this.ry
    }
    return this
  }
}

class Debug extends Shape {
  constructor (w, h, document) {
    super(w, h, document)
    this.bbox = { left: 0, top: 0, width: w, height: h }
  }

  render (ctx) {
    ctx.fillRect(0, 0, 1.5, 1.5)
  }
}

exports.Debug = Debug
exports.Shape = Shape
exports.Triangle = Triangle
exports.Ellipse = Ellipse
exports.Rectangle = Rectangle
exports.Polygon = Polygon
