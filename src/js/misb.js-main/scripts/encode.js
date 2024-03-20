const { st0601, klv } = require('../index.js')

const standards = [st0601]
const packets = {}
for(const standard of standards) {
	packets[standard.name] = []
}

function print(packet) {
	const encoded = st0601.encode(packet)
	console.log('\n')
	console.log(encoded)
}

process.stdin.on('data', function (data) {
	klv.decode(data, standards, print, { payload: true, debug: true })
})