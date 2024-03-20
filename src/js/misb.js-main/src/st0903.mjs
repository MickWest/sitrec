import * as klv from "./klv.mjs";
import * as vTargetSeries from "./vTargetSeries.mjs";
import * as Ontology from "./Ontology.mjs";
import * as AlgorithmSeries from "./AlgorithmSeries.mjs";
import { cast, startsWith } from "./klv.mjs";

// module.exports.name = 'st0903'
export const key = cast("060e2b34020b01010e01030306000000");
export const minSize = 31;

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse 0903-------");
	options.debug === true &&
		process.stdout.write(`Packet ${packet.toString("hex")} ${packet.length}\n`);

	if (packet.length < minSize) {
		// must have a 16 byte key, 1 byte BER, 10 byte timestamp, 4 byte checksum
		throw new Error("Buffer has no content to read");
	}

	if (!startsWith(packet, key)) {
		// compare first 16 bytes before BER
		throw new Error("Not ST 0903");
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
		throw new Error("Buffer includes ST 0903 key and BER but not content");
	}

	let i = key.length + berHeader + berLength; //index of first content key

	const values = parseLS(buffer.slice(i, i + parsedLength), {
		...options,
		header: false,
	});

	const checksum = values.find((klv) => klv.key === 1);
	if (!klv.isChecksumValid(packet.subarray(0, parsedLength), checksum.value)) {
		throw new Error("Invalid checksum");
	}

	return values;
}

export function parseLS(buffer, options = {}) {
	const packet = typeof buffer === "string" ? Buffer.from(buffer, "hex") : buffer;

	options.debug === true &&
		options.header !== false &&
		console.debug("-------Start Parse 0903 LS-------");
	options.debug === true &&
		options.header !== false &&
		process.stdout.write(`Packet ${packet.toString("hex")} ${packet.length}\n`);

	const values = [];

	let i = 0;
	while (i < packet.length) {
		const key = packet[i];
		const keyLength = 1;

		let { berHeader, berLength, contentLength } = klv.getBer(packet[i + keyLength]);
		if (contentLength === null) {
			contentLength = klv.getContentLength(
				packet.subarray(
					i + keyLength + berHeader,
					i + keyLength + berHeader + berLength
				)
			); // read content after key and length)
		}

		const valueBuffer = packet.subarray(
			i + keyLength + berHeader + berLength,
			i + keyLength + berHeader + berLength + contentLength
		); // read content after key and length

		if (packet.length < i + keyLength + berHeader + berLength + contentLength) {
			throw new Error("Invalid st0903 buffer, not enough content");
		}

		let parsed;
		try {
			parsed = convert(key, valueBuffer, options);
		} catch (e) {
			console.error("Error occured", e);
		}

		if (parsed) {
			if (typeof parsed.value === "string")
				parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, "");

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
				parsed.packet = valueBuffer;
			}

			values.push(parsed);
		}
		i += keyLength + berHeader + berLength + contentLength; // advance past key, length and value bytes
	}

	return values;
}

function convert(key, buffer, options) {
	try {
		switch (key) {
			case 1:
				klv.checkRequiredSize(key, buffer, 2);
				return {
					key,
					name: "Checksum",
					value: buffer.readUInt16BE(0),
				};
			case 2:
				klv.checkRequiredSize(key, buffer, 8);
				return {
					key,
					name: "Precision Time Stamp",
					value: parseFloat(klv.readVariableUInt(buffer)),
					//value: parseFloat(buffer.readBigUInt64BE(0)),
					unit: "µs",
				};
			case 3:
				klv.checkMaxSize(key, buffer, 128);
				return {
					key,
					name: "VMTI System Name",
					value: buffer.toString(),
				};
			case 4:
				klv.checkMaxSize(key, buffer, 2);
				return {
					key,
					name: "VMTI Version Number",
					value: klv.readVariableUInt(buffer),
				};
			case 5:
				klv.checkMaxSize(key, buffer, 3);
				return {
					key,
					name: "Total Number Targets Reported",
					value: klv.readVariableUInt(buffer),
				};
			case 6:
				klv.checkMaxSize(key, buffer, 3);
				return {
					key,
					name: "Number Targets Reported",
					value: klv.readVariableUInt(buffer),
				};
			case 7:
				klv.checkMaxSize(key, buffer, 3);
				return {
					key,
					name: "Motion Imagery Frame Num",
					value: klv.readVariableUInt(buffer),
				};
			case 8:
				klv.checkMaxSize(key, buffer, 3);
				return {
					key,
					name: "Frame Width",
					value: klv.readVariableUInt(buffer),
				};
			case 9:
				klv.checkMaxSize(key, buffer, 3);
				return {
					key,
					name: "Frame Height",
					value: klv.readVariableUInt(buffer),
				};
			case 10:
				klv.checkMaxSize(key, buffer, 128);
				return {
					key,
					name: "VMTI Source Sensor",
					value: buffer.toString(),
				};
			case 11:
				klv.checkRequiredSize(key, buffer, 2);
				return {
					key,
					name: "VMTI Horizontal FoV",
					value: klv.scale(buffer.readUInt16BE(0), [0, 2 ** 16], [0, 180]),
					unit: "°",
				};
			case 12:
				klv.checkRequiredSize(key, buffer, 2);
				return {
					key,
					name: "VMTI Vertical FoV",
					value: klv.scale(buffer.readUInt16BE(0), [0, 2 ** 16], [0, 180]),
					unit: "°",
				};
			case 101:
				return {
					key,
					name: "VTarget Series",
					value: vTargetSeries.parse(buffer, options),
				};
			case 102:
				return {
					key,
					name: "Algorithm Series",
					value: AlgorithmSeries.parse(buffer, options),
				};
			case 103:
				return {
					key,
					name: "Ontology Series",
					value: Ontology.parse(buffer, options),
				};
			default:
				if (options.strict === true) {
					throw Error(`st0903 key ${key} not found`);
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
