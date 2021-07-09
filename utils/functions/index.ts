export function isObject(input: any): input is object {
	return typeof input === "object" && input !== null;
}

/**
 * Checks for basic user-defined objects.
 * @see https://stackoverflow.com/q/68220676/3130281
 */
export function isPlainObject(input: any): input is object {
	if (isObject(input)) {
		let p = Object.getPrototypeOf(input);
		return p === null || p === Object.prototype;
	}

	return false;
}

export function merge<T, S, S2, S3>(
	target: T,
	source: S,
	source2: S2,
	source3: S3
): T & S & S2 & S3;
export function merge<T, S, S2>(target: T, source: S, source2: S2): T & S & S2;
export function merge<T, S>(target: T, source: S): T & S;
export function merge<T>(target: T, ...sources: any[]): T {
	sources.forEach((obj) => {
		if (isPlainObject(obj)) {
			for (let k in obj) {
				if (obj.hasOwnProperty(k)) {
					if (isPlainObject(obj[k]) && isPlainObject(target[k])) {
						merge(target[k], obj[k]);
					} else {
						let desc = Object.getOwnPropertyDescriptor(target, k);
						if (!desc || desc.configurable === true) {
							target[k] = obj[k];
						}
					}
				}
			}
		}
	});

	return target;
}

export function debounce<T extends (...args: any) => any>(
	callback: T,
	time: number
) {
	let timer: number;

	return function (...args: Parameters<T>) {
		clearTimeout(timer);

		timer = window.setTimeout(() => {
			callback.apply(null, args);
		}, time);
	};
}

export function throttle<T extends (...args: any) => any>(
	callback: T,
	time: number
) {
	let stamp = null;

	return function (...args: Parameters<T>) {
		let now = Date.now();

		if (now - stamp >= time) {
			stamp = now;
			callback.apply(null, args);
		}
	};
}
