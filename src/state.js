/* State: target canvas, current canvas and a distance value */
class State {
  constructor (target, canvas, distance = Infinity) {
    this.target = target
    this.canvas = canvas
    this.distance = distance == Infinity ? target.distance(canvas) : distance
  }
}

exports.State = State
