/*!
 * bytes
 * Copyright(c) 2012-2014 TJ Holowaychuk
 * Copyright(c) 2015 Jed Watson
 * MIT Licensed
 */

'use strict';

/**
 * Module exports.
 * @public
 */

export default bytes;
export { bytes, format, parse };

/**
 * Module variables.
 * @private
 */

const formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g;

const formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/;

const map = {
	b: 1,
	kb: 1 << 10,
	mb: 1 << 20,
	gb: 1 << 30,
	tb: Math.pow(1024, 4),
	pb: Math.pow(1024, 5),
};

const parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;

interface ByteOptions {
	case?: string;
	decimalPlaces?: number;
	fixedDecimals?: boolean;
	thousandsSeparator?: string;
	unitSeparator?: string;
}

/**
 * Convert the given value in bytes into a string or
 * parse to string to an integer in bytes.
 *
 * @param value
 * @param options bytes options.
 */
function bytes(
	value: string | number,
	options?: ByteOptions
): string | number | null {
	if (typeof value === 'string') {
		return parse(value);
	}

	if (typeof value === 'number') {
		return format(value, options);
	}

	return null;
}

interface FormatOptions extends ByteOptions {
	unit?: string;
}

/**
 * Format the given value in bytes into a string.
 *
 * If the value is negative, it is kept as such. If it is a float,
 * it is rounded.
 * @public
 */
function format(value: number, options?: FormatOptions): string | null {
	if (!Number.isFinite(value)) {
		return null;
	}

	var mag = Math.abs(value);
	var thousandsSeparator = (options && options.thousandsSeparator) || '';
	var unitSeparator = (options && options.unitSeparator) || '';
	var decimalPlaces =
		options && options.decimalPlaces !== undefined
			? options.decimalPlaces
			: 2;
	var fixedDecimals = Boolean(options && options.fixedDecimals);
	var unit = (options && options.unit) || '';

	if (!unit || !map[unit.toLowerCase()]) {
		if (mag >= map.pb) {
			unit = 'PB';
		} else if (mag >= map.tb) {
			unit = 'TB';
		} else if (mag >= map.gb) {
			unit = 'GB';
		} else if (mag >= map.mb) {
			unit = 'MB';
		} else if (mag >= map.kb) {
			unit = 'KB';
		} else {
			unit = 'B';
		}
	}

	var val = value / map[unit.toLowerCase()];
	var str = val.toFixed(decimalPlaces);

	if (!fixedDecimals) {
		str = str.replace(formatDecimalsRegExp, '$1');
	}

	if (thousandsSeparator) {
		str = str
			.split('.')
			.map(function (s, i) {
				return i === 0
					? s.replace(formatThousandsRegExp, thousandsSeparator)
					: s;
			})
			.join('.');
	}

	return str + unitSeparator + unit;
}

/**
 * Parse the string value into an integer in bytes.
 *
 * If no unit is given, it is assumed the value is in bytes.
 *
 * @public
 */
function parse(val: number | string): number | null {
	if (typeof val === 'number' && !isNaN(val)) {
		return val;
	}

	if (typeof val !== 'string') {
		return null;
	}

	// Test if the string passed is valid
	var results = parseRegExp.exec(val);
	var floatValue: number;
	var unit = 'b';

	if (!results) {
		// Nothing could be extracted from the given string
		floatValue = parseInt(val, 10);
		unit = 'b';
	} else {
		// Retrieve the value and the unit
		floatValue = parseFloat(results[1]);
		unit = results[4].toLowerCase();
	}

	if (isNaN(floatValue)) {
		return null;
	}

	return Math.floor(map[unit] * floatValue);
}
