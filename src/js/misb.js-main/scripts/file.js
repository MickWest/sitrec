const fs = require('fs')
const { st0601, st0903, st0104, st0806, klv } = require('../index.js')

const standards = [st0601, st0903, st0806, st0104]
const packets = {}
for(const standard of standards) {
	packets[standard.name] = []
}

if (process.argv.length < 3) {
	console.error(`Command: ${process.argv[0]} ${process.argv[1]} filename <debug>`)
	process.exit()
}

fs.readFile(process.argv[2], (err, file) => {
	const start = new Date().getTime() / 1000
	const result = klv.decode(file, standards, null, { debug: process.argv[3] === 'debug'})
	for (const standard of standards) {
		for(const packet of result[standard.name]) {
			packets[standard.name].push(packet)
		}
	}

	for (const standard of standards) {
		const name = standard.name
		console.info(`${name}: ${packets[name]?.length ?? 0}`)
	}
	console.info(`Processing time ${(new Date().getTime() / 1000 - start).toFixed(2)}s`)
})