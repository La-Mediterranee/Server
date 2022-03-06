import chalk from 'chalk';

import bytes from './bytes.js';
import Counter from './passthrough-counter.js';

import { format } from 'node:util';

import type { DefaultContext, DefaultState, ParameterizedContext } from 'koa';

// color map.
const colorCodes = {
	7: 'magenta',
	5: 'red',
	4: 'yellow',
	3: 'cyan',
	2: 'green',
	1: 'green',
	0: 'yellow',
};

/**
 * Show the response time in a human readable format.
 * In milliseconds if less than 10 seconds,
 * in seconds otherwise.
 */
function time(start: number) {
	const delta = Date.now() - start;
	return delta < 10000 ? delta + 'ms' : Math.round(delta / 1000) + 's';
}

// Log helper.
function log(
	print: PrintFunction,
	ctx: ParameterizedContext,
	start: number,
	length_: number | null,
	err: any,
	event?: string
) {
	// get the status code of the response
	const status = err
		? err.isBoom
			? err.output.statusCode
			: err.status || 500
		: ctx.status || 404;

	// set the color of the status code;
	const s = (status / 100) | 0;
	const color = colorCodes.hasOwnProperty(s) ? colorCodes[s] : colorCodes[0];

	// get the human readable response length
	const length = [204, 205, 304].includes(status)
		? ''
		: length_ == null
		? '-'
		: (<string>bytes(length_)).toLowerCase();

	const upstream = err
		? chalk.red('xxx')
		: event === 'close'
		? chalk.yellow('-x-')
		: chalk.gray('-->');

	print(
		'  ' +
			upstream +
			' ' +
			chalk.bold('%s') +
			' ' +
			chalk.gray('%s') +
			' ' +
			chalk[color]('%s') +
			' ' +
			chalk.gray('%s') +
			' ' +
			chalk.gray('%s'),
		ctx.method,
		ctx.originalUrl,
		status,
		time(start),
		length
	);
}

type Transporter = (str: string, args: any[]) => void;
type PrintFunction = (...args: any[]) => void;

interface LoggerOptions {
	transporter?: Transporter;
}

export default function (options?: Transporter | LoggerOptions) {
	// print to console helper.
	const print: PrintFunction = (function () {
		let transporter: Transporter;
		if (typeof options === 'function') {
			transporter = options;
		} else if (options && options.transporter) {
			transporter = options.transporter;
		}

		// eslint-disable-next-line func-names
		return function printFunc(...args: any[]) {
			const string = format(...args);
			if (transporter) transporter(string, args);
			else console.log(...args);
		};
	})();

	return async function logger(
		ctx: ParameterizedContext<DefaultState, DefaultContext, any>,
		next: () => any
	) {
		// request
		const start =
			//@ts-ignore
			ctx[Symbol.for('request-received.startTime')]
				? //@ts-ignore
				  ctx[Symbol.for('request-received.startTime')].getTime()
				: Date.now();
		print(
			'  ' +
				chalk.gray('<--') +
				' ' +
				chalk.bold('%s') +
				' ' +
				chalk.gray('%s'),
			ctx.method,
			ctx.originalUrl
		);

		try {
			await next();
		} catch (err) {
			// log uncaught downstream errors
			log(print, ctx, start, null, err);
			throw err;
		}

		// calculate the length of a streaming response
		// by intercepting the stream with a counter.
		// only necessary if a content-length header is currently not set.
		const {
			body,
			response: { length },
		} = ctx;

		let counter: Counter;

		if (length === null && body?.readable)
			ctx.body = body
				.pipe((counter = new Counter()))
				.on('error', ctx.onerror);

		// log when the response is finished or closed,
		// whichever happens first.
		const { res } = ctx;

		const onfinish = done.bind(null, 'finish');
		const onclose = done.bind(null, 'close');

		res.once('finish', onfinish);
		res.once('close', onclose);

		function done(event: string | undefined) {
			res.removeListener('finish', onfinish);
			res.removeListener('close', onclose);
			log(
				print,
				ctx,
				start,
				counter ? counter.length : length,
				null,
				event
			);
		}
	};
}
