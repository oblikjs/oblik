import { getTag } from '../../utils/dom'
import { Gesture, Swipe } from '../../utils/gesture'
import { Ticker } from '../../utils'
import { Component } from '../..'

export class Item extends Component<HTMLElement> { }

interface Options {
	clickThreshold: number
	screenChangeSpeed: number
	overdrag: number
	infinite: boolean
}

interface Screen {
	left: number
	right: number
}

export class Slider extends Component<HTMLElement, Options> {
	static components = {
		item: Item,
	}

	static defaults: Options = {
		clickThreshold: 40,
		screenChangeSpeed: 500,
		overdrag: 0.3,
		infinite: false
	}

	$item: Item[] = []
	isDraggingLink: boolean
	isDrag: boolean
	isDragging: boolean
	drag: Gesture
	swipe: Swipe
	activeScreen: Screen
	screens: Screen[]
	offset: number
	offsetRender: number
	offsetLogical: number
	order: Item[]
	orderNum: number = 1
	orderNumBack: number = -1
	elReference: HTMLElement
	ticker: Ticker

	init () {
		this.isDraggingLink = null
		this.isDrag = null
		this.offset = 0
		this.offsetRender = 0
		this.offsetLogical = 0

		this.drag = new Gesture(this.$element)
		this.drag.on('start', this.pointerDown.bind(this))
		this.drag.on('move', this.pointerUpdate.bind(this))
		this.drag.on('end', this.pointerUp.bind(this))

		this.$element.addEventListener('click', (event) => {
			if (this.isDraggingLink && this.isDrag) {
				// The user tried to drag, prevent redirection.
				event.preventDefault()
			}
		})

		this.screens = this.getScreens()
		this.setScreen(this.screens[0])

		this.ticker = new Ticker()
		this.ticker.start()

		if (this.$options.infinite) {
			this.elReference = this.$element.parentElement
			this.order = [...this.$item]

			this.ticker.on('tick', this.reorderElements, this)
		}
	}

	getScreens (): Screen[] {
		let groups: Item[][] = []
		let current: Item[] = null

		this.$item.forEach(el => {
			if (!current || current.length >= 2) {
				current = []
				groups.push(current)
			}

			current.push(el)
		})

		return groups.map(el => {
			return {
				left: el[0].$element.offsetLeft,
				right: el[0].$element.offsetLeft + el[0].$element.offsetWidth
			}
		})
	}

	pointerDown (event) {
		this.swipe = this.drag.swipes[0]

		this.isDrag = false
		this.isDragging = false
		this.isDraggingLink = !!getTag(event.target, 'A')
		this.$element.classList.add('is-dragged')

		// Don't prevent default for touchstart because if the slide is a link,
		// you can't follow it. The browser should automatically detect a drag and
		// prevent redirection.
		if (event.type !== 'touchstart') {
			event.preventDefault()
		}

		// Stop propagating so when nesting sliders, parent sliders don't move.
		event.stopPropagation()

		this.ticker.on('tick', this.update, this)
	}

	pointerUpdate () {
		if (!this.isDrag && Math.abs(this.swipe.offset().x) >= this.$options.clickThreshold) {
			this.isDrag = true
		}
	}

	getClosestScreen (offset: number) {
		return this.screens.reduce((prev, curr) => {
			let offsetPrev = this.getClosestScreenOffset(offset, prev)
			let offsetCurr = this.getClosestScreenOffset(offset, curr)
			return Math.abs(offsetCurr) < Math.abs(offsetPrev) ? curr : prev
		})
	}

	getClosestScreenOffset (offset: number, screen: Screen) {
		let width = this.screens[this.screens.length - 1].right
		let diff = screen.left - (offset % width)

		if (this.$options.infinite) {
			return [diff, width + diff, -width + diff].reduce((prev, curr) => {
				return Math.abs(curr) < Math.abs(prev) ? curr : prev
			})
		} else {
			return diff
		}
	}

	setScreen (screen: Screen) {
		if (this.$options.infinite) {
			this.offset = this.offsetRender + this.getClosestScreenOffset(this.offsetRender, screen)
		} else {
			this.offset = screen.left
		}

		this.activeScreen = screen
	}

	getScreenByOffset (offset: number) {
		let idx = this.screens.indexOf(this.activeScreen) + offset

		if (this.$options.infinite) {
			if (idx >= this.screens.length) {
				idx = 0
			} else if (idx < 0) {
				idx = this.screens.length - 1
			}
		}

		return this.screens[idx]
	}

	nextScreen () {
		let screen = this.getScreenByOffset(1)

		if (screen) {
			this.setScreen(screen)
		}
	}

	prevScreen () {
		let screen = this.getScreenByOffset(-1)

		if (screen) {
			this.setScreen(screen)
		}
	}

	pointerUp () {
		let diff = this.swipe.origin.to(this.swipe.position)
		let direction = Math.sign(Math.cos(diff.direction))
		let closestScreen = this.getClosestScreen(this.offsetRender)

		this.setScreen(closestScreen)

		if (this.swipe.speed > this.$options.screenChangeSpeed) {
			if (direction === 1) {
				this.prevScreen()
			} else {
				this.nextScreen()
			}
		}

		this.swipe = null

		this.ticker.off('tick', this.update, this)
		this.update()

		this.$element.classList.remove('is-dragged')
	}

	overdrag (amount: number) {
		let limit = this.$element.offsetWidth * this.$options.overdrag
		return (amount * limit) / (amount + limit)
	}

	constrainOffset (offset: number) {
		let left = this.screens[0].left
		let right = this.screens[this.screens.length - 1].left

		if (offset < left) {
			return left - this.overdrag(left - offset)
		} else if (offset > right) {
			return right + this.overdrag(offset - right)
		}

		return offset
	}

	reorderElements () {
		let rectRef = this.elReference.getBoundingClientRect()
		let rectFirst = this.order[0].$element.getBoundingClientRect()
		let rectLast = this.order[this.order.length - 1].$element.getBoundingClientRect()

		if (rectLast.right < rectRef.right) {
			let target = this.order.shift()
			target.$element.style.order = this.orderNum.toString()
			this.order.push(target)
			this.offsetLogical += target.$element.offsetWidth
			this.orderNum++
		} else if (rectFirst.left > rectRef.left) {
			let target = this.order.pop()
			target.$element.style.order = this.orderNumBack.toString()
			this.order.unshift(target)
			this.offsetLogical -= target.$element.offsetWidth
			this.orderNumBack--
		}

		this.$element.style.left = `${this.offsetLogical}px`
	}

	update () {
		let renderOffset = this.offset

		if (this.swipe) {
			renderOffset -= this.swipe.offset().x
		}

		if (!this.$options.infinite) {
			renderOffset = this.constrainOffset(renderOffset)
		}

		this.render(renderOffset)
	}

	render (offset: number) {
		this.$element.style.transform = `translateX(${-offset}px)`
		this.offsetRender = offset
	}
}

export default Slider
