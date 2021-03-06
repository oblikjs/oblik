import { Emitter } from "../../utils/emitter";
import { merge } from "../../utils/functions";

export interface ComponentConstructor<
	E extends Element = Element,
	O = object,
	P extends Component = Component
> {
	new (element: E, options?: O, parent?: P): Component<E, O, P>;
	readonly components?: {
		[key: string]: ComponentConstructor<any, any, any>;
	};
	defaults?: Partial<O>;
	$name(ctor: ComponentConstructor<any, any, any>): string;
}

export class Component<
	E extends Element = Element,
	O = object,
	P extends Component = Component<Element, object, any>
> {
	["constructor"]: ComponentConstructor<E, O, P>;

	private _isInit = false;
	private _isDestroyed = false;

	$name: string = null;
	$element: E;
	$options: O;
	$parent: P;
	$emitter: Emitter<any>;
	$children: Component[] = [];

	static $name(this: ComponentConstructor, ctor: ComponentConstructor) {
		if (this.components) {
			let names = Object.entries(this.components)
				.filter((entry) => entry[1] === ctor)
				.map((tuple) => tuple[0]);

			if (names.length === 1) {
				return names[0];
			} else if (names.length < 1) {
				throw new Error(`${this.name} has no child: ${ctor.name}`);
			} else if (names.length > 1) {
				throw new Error(`Subcomponent has multiple names: ${names}`);
			}
		} else {
			throw new Error(`Component has no children: ${this.name}`);
		}
	}

	constructor(element: E, options?: Partial<O>, parent?: P) {
		this.$element = element;
		this.$options = merge({} as any, this.constructor.defaults, options);
		this.$parent = parent;
		this.$emitter = new Emitter();

		this.create();

		if (this.$parent) {
			this.$name = this.$parent.constructor.$name(this.constructor);
			this.$parent._addChild(this);
		}
	}

	$init() {
		if (!this._isInit) {
			this.$children.forEach((child) => child.$init());

			this.init();
			this.$emitter.emit("init");
			this._isInit = true;
		}
	}

	private _ref(component: Component, remove = false) {
		let prop = "$" + component.$name;
		let value = this[prop];

		if (Array.isArray(value)) {
			let index = value.indexOf(component);
			let added = index >= 0;

			if (remove) {
				if (added) {
					value.splice(index, 1);
				}
			} else if (!added) {
				value.push(component);
			}
		} else {
			if (remove) {
				if (value === component) {
					this[prop] = null;
				}
			} else {
				this[prop] = component;
			}
		}
	}

	private _addChild(component: Component<Element, any>) {
		if (this.$children.indexOf(component) < 0) {
			this.$children.push(component);
			this._ref(component);
			this.$emitter.emit("add:" + component.$name, component);
		}
	}

	private _removeChild(component: Component<Element, any>) {
		let index = this.$children.indexOf(component);
		if (index >= 0) {
			this.$children.splice(index, 1);
			this._ref(component, true);
			this.$emitter.emit("remove:" + component.$name, component);
		}
	}

	$destroy() {
		if (!this._isDestroyed) {
			this.destroy();

			Array.from(this.$children).forEach((child) => {
				child.$destroy();
			});

			if (this.$parent) {
				this.$parent._removeChild(this);
			}

			this.$emitter.emit("destroy");
			this._isDestroyed = true;
		}
	}

	create() {}
	init() {}
	destroy() {}
}
