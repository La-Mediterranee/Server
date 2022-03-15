const prov = ['steam', 'discord', undefined];
let result;
let obj = Object.create(null, {
		discord: {
			async value(req, res) {
				const cb = () => {};

				// ts complaints that is doesn't have access to `this`
				// because of the typedefinition
				await cb([req, res]);
			}
		},
		stream: {
			async value(req, res) {
				return 'not implemented right now';
			}
		}
	}),
	map = new Map([
		[
			'discord',
			async function value(req, res) {
				const cb = () => {};

				// ts complaints that is doesn't have access to `this`
				// because of the typedefinition
				await cb([req, res]);
			}
		],
		[
			'steam',
			async function value(req, res) {
				return 'not implemented right now';
			}
		]
	]),
	n = 25000;

console.time('Object');
for (let i = 0; i < n; i++) {
	if (!(prov[i % prov.length] in obj)) continue;
	obj['discord'];
}
console.timeEnd('Object');

console.time('Map');
for (let i = 0; i < n; i++) {
	if (!map.has(prov[i % prov.length])) continue;
	map.get('discord');
}
console.timeEnd('Map');
