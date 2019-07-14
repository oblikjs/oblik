import Tween from './tween'

export default class extends Tween {
  constructor (options) {
    super(options.update, options.duration, options.easing)
    this.isRunning = false
    this.isTicking = false

    this.values = options.values
    this.updateValues()
  }

  run () {
    if (this.isTicking) {
      // Avoid running multiple times and creating excess RAFs.
      return
    }

    if (this.isComplete) {
      this.isRunning = false
      return
    }

    if (!this.isRunning) {
      this.isRunning = true
      this.stamp = Date.now()
    }

    if (this.elapsed < this.duration) {
      setTimeout(() => {
        this.isTicking = false
        this.step()
        
        if (this.isRunning) {
          this.run()
        }
      }, 0)

      this.isTicking = true
    } else {
      this.step()
    }
  }

  updateValues () {
    for (let name in this.values) {
      let value = this.values[name]
      let diff = value.end - value.start

      this[name] = value.start + (diff * this.value)
    }
  }

  update () {
    this.updateValues()
    super.update()
  }

  stop () {
    this.isRunning = false
  }
}