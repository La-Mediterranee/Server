import util from 'node:util';
import { Transform, TransformOptions } from 'node:stream';

class Counter extends Transform {
	length = 0;

	constructor(options?: TransformOptions) {
		super(options);
		if (!(this instanceof Counter)) return new Counter(options);
	}

	_transform(chunk: string | any[], encoding: any, callback: () => void) {
		this.length += chunk.length;
		this.push(chunk);
		callback();
	}
}

export default Counter;
