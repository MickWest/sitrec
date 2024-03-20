// const st0601 = require('../src/st0601.js')
// const packet = require('./packet.js')
import * as st0601 from '../src/st0601.mjs';
import * as packet from './packet.mjs';


test('Parse DynamicConstantMISMMSPacketData 0601 buffer', () => {
	expect(st0601.parse(packet.DynamicConstantMISMMSPacketData.file)).toStrictEqual(packet.DynamicConstantMISMMSPacketData.json)
})

test('Parse DynamicConstantMISMMSPacketData 0601 string', () => {
	expect(st0601.parse(packet.DynamicConstantMISMMSPacketData.file.toString('hex'))).toStrictEqual(packet.DynamicConstantMISMMSPacketData.json)
})

test('Parse DynamicOnlyMISMMSPacketData 0601 buffer', () => {
	expect(st0601.parse(packet.DynamicOnlyMISMMSPacketData.file)).toStrictEqual(packet.DynamicOnlyMISMMSPacketData.json)
})

/*
test('Encode DynamicOnlyMISMMSPacketData 0601', () => {
	expect(st0601.encode(packet.DynamicOnlyMISMMSPacketData.json)).toStrictEqual(packet.DynamicOnlyMISMMSPacketData.file.toString('hex'))
})
*/
