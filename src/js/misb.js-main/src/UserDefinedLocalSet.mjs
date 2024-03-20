import { cast } from "./klv.mjs";

// let LocalSet
// try {
// 	// File does not exist in repo, therefore it's safe to assume it doesn't exist.
// 	// TODO: Define a mechanism for adding/replacing local sets at runtime
// 	LocalSet = require('./CustomLocalSet')
// } catch (e) {
// 	LocalSet = require('./GenericLocalSet')
// }

import * as LocalSet from "./GenericLocalSet.mjs";

let id = null;
let type = null;

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	//options.debug === true && console.debug('-------Start Parse User Defined Local Set-------')
	//options.debug === true && process.stdout.write(`Buffer ${buffer.toString('hex')} ${buffer.length}\n`)

	const values = [];

	const keyPlusLength = 2;
	let i = 0;
	while (i < packet.length) {
		const key = packet[i];
		const valueLength = packet[i + 1];

		if (packet.length < i + keyPlusLength + valueLength) {
			throw new Error("Invalid User Defined Local Set buffer, not enough content");
		}

		const valueBuffer = packet.subarray(
			i + keyPlusLength,
			i + keyPlusLength + valueLength
		);
		const parsed = convert(key, valueBuffer, options);

		if (parsed !== null) {
			if (typeof parsed.value === "string")
				parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, "");

			if (options.debug === true) {
				console.debug(
					key,
					valueLength,
					parsed.name,
					`${parsed.value}${parsed.unit || ""}`,
					valueBuffer
				);
				parsed.packet = valueBuffer;
			}
		} else {
			options.debug === true && console.debug(key, contentLength, "NULL");
		}
		values.push(parsed);

		i += keyPlusLength + valueLength; // advance past key, length and value bytes
	}
	//options.debug === true && console.debug('-------End Parse User Defined Local Set---------')

	return values;
}

function convert(key, buffer, options) {
	try {
		switch (key) {
			case 1:
				const value = buffer.readUInt8(0);
				id = value & 0b00111111; // this must be set before key 2 is read
				type = value & 0b11000000; // this must be set before key 2 is read
				return {
					key,
					name: "ID",
					value: id,
				};
			case 2:
				return {
					key,
					type: getTypeName(type),
					name: LocalSet.getKeyName(id),
					value: LocalSet.decodeValue(id, type, buffer),
				};
			default:
				if (options.debug === true) {
					//throw Error(`Key ${key} not found`)
				}
				return {
					key,
					name: "Unknown",
					value: buffer.toString(),
				};
		}
	} catch (e) {
		throw e;
	}
}

const getTypeName = (type) => {
	switch (type) {
		case 0: // 00
			return "string";
		case 64: // 01
			return "int";
		case 128: // 10
			return "uint";
		case 192: // 11
			return "experimental";
		default:
		case 0: // unknown
	}
};
