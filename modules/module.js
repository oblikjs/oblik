import Emitter from 'events'

export default class {
  constructor (element, value) {
    this.$element = element
    this.$options = value
    this.$parent = null
    this.$emitter = new Emitter()

    this._name = null
    this._children = []
    this._destroyed = false
  }

  $addModule (module) {
    if (this._children.indexOf(module) < 0) {
      this._children.push(module)
      this.$emitter.emit(module._name + ':added', module)
    }
  }

  $removeModule (module) {
    var index = this._children.indexOf(module)
    if (index >= 0) {
      this._children.splice(index, 1)
      this.$emitter.emit(module._name + ':removed', module)
    }
  }

  $destroy () {
    if (this._destroyed) {
      return
    }

    if (this.$parent) {
      this.$parent.$removeModule(this)
      this.$parent = null
    }

    this._children.forEach(child => child.$destroy())
    this._children = null
    this._destroyed = true
  }
}
