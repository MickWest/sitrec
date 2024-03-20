import * as klv from "./klv.mjs";
import * as PoiLocalSet from "./PoiLocalSet.mjs";
import * as UserDefinedLocalSet from "./UserDefinedLocalSet.mjs";
import { cast, startsWith } from "./klv.mjs";

// module.exports.name = 'st0806'
export const key = cast("060E2B34020B01010E01030102000000");
export const minSize = 31;

//const keyLength = options.localSet ? 1 : key.length
//const val = key.compare(packet, 0, key.length) // compare first 16 bytes before BER

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse 0806-------");
	options.debug === true &&
		process.stdout.write(`Packet ${packet.toString("hex")} ${packet.length}\n`);

	if (packet.length < minSize) {
		// must have a 16 byte key, 1 byte BER, 10 byte timestamp, 4 byte checksum
		throw new Error("Buffer has no content to read");
	}

	if (!startsWith(packet, key)) {
		// compare first 16 bytes before BER
		throw new Error("Not ST 0806");
	}

	let { berHeader, berLength, contentLength } = klv.getBer(packet[key.length]);
	if (contentLength === null) {
		contentLength = klv.getContentLength(
			packet.subarray(key.length + berHeader, key.length + berHeader + berLength)
		); // read content after key and length
	}

	const parsedLength = key.length + berHeader + berLength + contentLength;
	if (parsedLength > packet.length) {
		// buffer length isn't long enough to read content
		throw new Error("Buffer includes ST 0806 key and BER but not content");
	}

	let i = key.length + berHeader + berLength; //index of first content key

	const values = parseLS(buffer.slice(i, i + parsedLength), {
		...options,
		checksum: false,
		header: false,
	});
	const checksum = values.find((klv) => klv.key === 1);
	const checksumValue =
		checksum.value !== undefined ? checksum.value : checksum.packet.readUInt32BE(0);
	if (!klv.is0806ChecksumValid(packet.subarray(0, packet.length), checksumValue)) {
		checksum.valid = false;
		console.debug("Invalid checksum");
	}

	return values;
}

export function parseLS(buffer, options = {}) {
	const packet = typeof buffer === "string" ? Buffer.from(buffer, "hex") : buffer;

	options.debug === true &&
		options.header !== false &&
		console.debug("-------Start Parse 0806 LS-------");
	options.debug === true &&
		options.header !== false &&
		process.stdout.write(`Packet ${packet.toString("hex")} ${packet.length}\n`);

	const values = [];

	let i = 0;
	while (i < packet.length) {
		const key = packet[i];

		let { berHeader, berLength, contentLength } = klv.getBer(packet[i + 1]);
		if (contentLength === null) {
			contentLength = klv.getContentLength(
				packet.subarray(i + 1 + berHeader, i + 1 + berHeader + berLength)
			); // read content after key and length)
		}

		const valueBuffer = packet.subarray(
			i + berHeader + berLength + 1,
			i + berHeader + berLength + contentLength + 1
		); // read content after key and length

		if (packet.length < i + berHeader + berLength + contentLength + 1) {
			throw new Error("Invalid st0806 buffer, not enough content");
		}
		const parsed = convert(key, valueBuffer, options);
		if (typeof parsed.value === "string") {
			parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, "");
		}

		if (options.debug === true) {
			if (key === 2)
				console.debug(
					key,
					contentLength,
					parsed.name,
					`${new Date(parsed.value / 1000)}${parsed.unit || ""}`,
					valueBuffer
				);
			else
				console.debug(
					key,
					contentLength,
					parsed.name,
					`${parsed.value}${parsed.unit || ""}`,
					valueBuffer
				);
		}

		if (options.debug || options.payload || options.value === false) {
			parsed.packet = valueBuffer;
		}

		values.push(parsed);

		i += berHeader + berLength + contentLength + 1; // advance past key, length and value bytes
	}

	options.debug === true &&
		options.header !== false &&
		console.debug("-------End Parse 0806 LS---------");
	return values;
}

export function encode(items) {
	const chunks = items.map((klv) => {
		if (klv.key == 2) {
			const uint = bnToBuf(klv.value, 8);
			return {
				key: klv.key,
				packet: uint,
			};
		}
		return klv;
	});

	return assemble(chunks);
}

export function assemble(chunks) {
	const header = key.toString("hex");
	let payload = "";
	for (const chunk of chunks) {
		if (chunk.key === 1) {
			continue;
		}
		const packet =
			typeof chunk.packet === "string"
				? chunk.packet
				: chunk.packet.toString("hex");
		payload +=
			chunk.key.toString(16).padStart(2, "0") +
			(packet.length / 2).toString(16).padStart(2, "0") +
			packet;
	}
	const payloadWithCheckSum = payload + `010400000000`;
	const completePacketForChecksum =
		header + getPayloadLengthBer(payloadWithCheckSum) + payloadWithCheckSum;

	const checksum = klv.calculate0806Checksum(completePacketForChecksum); // pad the ending with a fake checksum
	return (
		completePacketForChecksum.slice(0, -8) + checksum.toString(16).padStart(8, "0")
	); // remove 4 blank characters, 2 bytes
}

const getPayloadLengthBer = (payload) => {
	const byteLength = payload.length / 2;
	if (byteLength > 127) {
		// BER long form
		const berLength = Math.ceil(byteLength / 255);
		return `8${berLength}${byteLength.toString(16).padStart(berLength * 2, "0")}`;
	} else {
		// BER short form
		return byteLength.toString(16).padStart(2, "0");
	}
};

const bnToBuf = (bn, size) => {
	let hex = BigInt(bn).toString(16);
	hex = hex.padStart(size * 2, "0");
	return hex;
};

function convert(key, buffer, options) {
	switch (key) {
		case 1:
			klv.checkRequiredSize(key, buffer, 4);
			return {
				key,
				name: st0806data(key).name,
				value: buffer.readUInt32BE(0),
			};
		case 2:
			klv.checkRequiredSize(key, buffer, 8);
			return {
				key,
				name: st0806data(key).name,
				value: parseFloat(buffer.readBigUInt64BE(0)),
				unit: "µs",
			};
		case 7:
			klv.checkRequiredSize(key, buffer, 4);
			return {
				key,
				name: st0806data(key).name,
				value: buffer.readUInt32BE(0),
			};
		case 8:
			klv.checkRequiredSize(key, buffer, 1);
			return {
				key,
				name: st0806data(key).name,
				value: buffer.readUInt8(0),
			};
		case 9:
			klv.checkRequiredSize(key, buffer, 4);
			return {
				key,
				name: st0806data(key).name,
				value: buffer.readUInt32BE(0),
			};
		case 10:
			return {
				key,
				name: st0806data(key).name,
				value: buffer.toString(),
			};
		case 11:
			try {
				const localSet = UserDefinedLocalSet.parse(buffer, options);
				const id = localSet.find((klv) => klv.key === 1);
				const data = localSet.find((klv) => klv.key === 2);
				if (id && data) {
					return {
						key,
						type: data.type,
						name: `${data.name} (${id.value})`,
						value: data.value,
					};
				} else {
					return {
						key,
						name: `Error Bad Metadata`,
						value: JSON.stringify(localSet),
					};
				}
			} catch (e) {
				return {
					key,
					name: `Error Bad Metadata`,
					value: buffer.toString(),
				};
			}
		case 12:
			const poiSet = PoiLocalSet.parse(buffer, options);
			return {
				key,
				name: st0806data(key).name,
				value: poiSet,
			};
		case 18:
			klv.checkRequiredSize(key, buffer, 1);
			return {
				key,
				name: st0806data(key).name,
				value: buffer.readUInt8(0),
			};
		case 19:
			klv.checkRequiredSize(key, buffer, 3);
			return {
				key,
				name: st0806data(key).name,
				value: buffer.toString(),
			};
		case 20:
			klv.checkRequiredSize(key, buffer, 3);
			return {
				key,
				name: st0806data(key).name,
				value: buffer.readUIntBE(0, 3),
				unit: "m",
			};
		case 21:
			klv.checkRequiredSize(key, buffer, 3);
			return {
				key,
				name: st0806data(key).name,
				value: buffer.readUIntBE(0, 3),
				unit: "m",
			};
		default:
			if (options.strict === true) {
				throw Error(`Key ${key} not found`);
			}
			return {
				key,
				name: st0806data(key).name,
				value: buffer.toString(),
			};
	}
}

export function keys(key) {
	return st0806data(key);
}

const st0806data = (key) => {
	if (typeof key === "string") {
		key = parseInt(key);
	}
	switch (key) {
		case 1:
			return { name: "Checksum", length: 2 };
		case 2:
			return { name: "Precision Time Stamp", length: 8 };
		case 1:
			return { name: "Checksum", length: 4 };
		case 2:
			return { name: "Precision Time Stamp", length: 8 };
		case 7:
			return { name: "Frame Code", length: 4 };
		case 8:
			return { name: "RVT LS Version Number", length: 1 };
		case 9:
			return { name: "Video Data Rate", length: 4 };
		case 10:
			return { name: "Digital Video File Format" };
		case 11:
			return { name: "User Defined LS" };
		case 12:
			return { name: "Point of Interest LS" };
		case 13:
			return { name: "Area of Interest LS" };
		case 18:
			return { name: "MGRS Zone Second Value", length: 1 };
		case 19:
			return { name: "MGRS Latitude Band and Grid Square Second Value", length: 3 };
		case 20:
			return { name: "MGRS Easting Second Value", length: 3 };
		case 21:
			return { name: "MGRS Northing Second Value", length: 3 };
		default:
			return { name: "Unknown" };
	}
};
