const { st0601, st0903, st0104, st0806, klv } = require('../index.js')

const start = new Date().getTime() / 1000
const standards = [st0601, st0903, st0806, st0104]
const packets = {}
for(const standard of standards) {
	packets[standard.name] = []
}

process.stdin.on('data', function (data) {
	const result = klv.decode(data, standards, null, { payload: true, debug: process.argv[2] === 'debug' })
	let totalPackets = 0
	for (const standard of standards) {
		for(const packet of result[standard.name]) {
			totalPackets++
			packets[standard.name].push(packet)
		}
	}
	if(totalPackets === 0) {
		console.warn('Unknown data found', data.toString('hex'), '\n')
	}
}).on('end', function () {
	for (const standard of standards) {
		const name = standard.name
		console.info(`${name}: ${packets[name]?.length ?? 0}`)
	}
	console.info(`Processing time ${(new Date().getTime() / 1000 - start).toFixed(2)}s`)
})
