const {st0601, klv} = require('../index.js')

const standards = [st0601]

process.stdin.on('data', function (data) {
	const result = klv.decode(data, standards, null, {payload: true, debug: process.argv[2] === 'debug'})
	for (const standard of standards) { // only decode 0601
		for (const packet of result[standard.name]) { // may have multiple 0601 packets from standard in
			const chunks = []
			for (const key of Object.keys(packet)) { // traverse each decoded 0601 key
				chunks.push(packet[key]) //collect the packets for re-assembly
			}
			const result = st0601.assemble(chunks)
			st0601.parse(result, {payload: true, debug: process.argv[2] === 'debug'})
			process.exit(0)
		}
	}
})
