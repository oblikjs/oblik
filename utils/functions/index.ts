export function isObject(input: any): input is object {
	return input && typeof input === "object";
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
		if (isObject(obj)) {
			for (let k in obj) {
				if (obj.hasOwnProperty(k)) {
					if (isObject(obj[k]) && isObject(target[k])) {
						merge(target[k], obj[k]);
					} else {
						target[k] = obj[k];
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
