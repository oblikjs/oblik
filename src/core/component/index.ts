import { Emitter } from '../../utils/emitter'
import { merge } from '../../utils/functions'

type Options<O> = Partial<O> & { $preset?: string }
type Input<O> = string | Partial<Options<O>>

export interface ComponentConstructor<O = object> {
	new(element: Element, options?: Input<O>, parent?: Component): Component
	readonly components?: {
		[key: string]: ComponentConstructor
	}
	defaults?: Partial<O>
	presets?: {
		[key: string]: Partial<O>
	}
	isMovable?: boolean
	$name (ctor: ComponentConstructor): string
	$options (input: Input<O>): Options<O>
}

export class Component<E extends Element = Element, O = object> {
	['constructor']: ComponentConstructor<O>

	private _isInit = false
	private _isDestroyed = false
	private _name: string = null
	private _children: Component[] = []

	$element: E
	$options: Options<O>
	$parent: Component
	$emitter: Emitter

	static isMovable = true

	static $name (this: ComponentConstructor, ctor: ComponentConstructor) {
		if (this.components) {
			let names = Object.entries(this.components)
				.filter(entry => entry[1] === ctor)
				.map(tuple => tuple[0])

			if (names.length === 1) {
				return names[0]
			} else if (names.length < 1) {
				throw new Error(`${parent.name} has no child: ${ctor.name}`)
			} else if (names.length > 1) {
				throw new Error(`Subcomponent has multiple names: ${names}`)
			}
		} else {
			throw new Error(`Component has no children: ${parent.name}`)
		}
	}

	static $options (this: ComponentConstructor, input: Input<object>): Options<object> {
		let options: Options<object>
		let preset: Options<object>
		let presetName: string

		if (input) {
			if (typeof input === 'string') {
				presetName = input
			} else if (typeof input === 'object') {
				presetName = input.$preset
				delete input.$preset
				options = input
			}

			if (presetName) {
				preset = this.presets?.[presetName]

				if (!preset) {
					throw new Error(`Invalid preset: ${presetName}`)
				}
			}
		}

		return merge({}, this.defaults, preset, options)
	}

	constructor (element: E, options?: Input<O>, parent?: Component) {
		this.$element = element
		this.$options = this.constructor.$options(options)
		this.$parent = parent
		this.$emitter = new Emitter()

		this.create()

		if (this.$parent) {
			this._name = this.$parent.constructor.$name(this.constructor)
			this.$parent._addChild(this)
		}
	}

	$init () {
		if (!this._isInit) {
			this._children.forEach(child => child.$init())

			this.init()
			this.$emitter.emit('init')
			this._isInit = true
		}
	}

	private _ref (component: Component, remove = false) {
		let prop = '$' + component._name
		let value = this[prop]

		if (Array.isArray(value)) {
			let index = value.indexOf(component)
			let added = index >= 0

			if (remove) {
				if (added) {
					value.splice(index, 1)
				}
			} else if (!added) {
				value.push(component)
			}
		} else {
			if (remove) {
				if (value === component) {
					this[prop] = null
				}
			} else {
				this[prop] = component
			}
		}
	}

	private _addChild (component: Component) {
		if (this._children.indexOf(component) < 0) {
			this._children.push(component)
			this._ref(component)
			this.$emitter.emit('add:' + component._name, component)
		}
	}

	private _removeChild (component: Component) {
		let index = this._children.indexOf(component)
		if (index >= 0) {
			this._children.splice(index, 1)
			this._ref(component, true)
			this.$emitter.emit('remove:' + component._name, component)
		}
	}

	$destroy () {
		if (!this._isDestroyed) {
			this.destroy()

			Array.from(this._children).forEach(child => {
				child.$destroy()
			})

			if (this.$parent) {
				this.$parent._removeChild(this)
			}

			this.$emitter.emit('destroy')
			this._isDestroyed = true
		}
	}

	create () { }
	init () { }
	destroy () { }
}

export default Component