import * as klv from "./klv.mjs";
import { cast, asHexString } from "./klv.mjs";

// module.exports.name = 'st0102'

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse 0102-------");
//	options.debug === true &&
//		process.stdout.write(`Packet ${packet.toString("hex")} ${packet.length}\n`);

	const values = [];

	let i = 0;
	while (i < packet.length) {
		const key = packet[i];
		const length = packet[i + 1]; // todo follow BER encoding
		// const valueBuffer = packet.subarray(i + 2, i + 2 + length) // read content after key and length
		const valueBuffer = new DataView(
			packet.buffer,
			packet.byteOffset + i + 2,
			length
		); // read content after key and length

		const parsed = convert(key, valueBuffer, options);
		if (parsed !== null) {
			if (typeof parsed.value === "string") {
				parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, "");
			}

			if (options.debug === true) {
				console.debug(
					key,
					length,
					parsed.name,
					`${parsed.value}${parsed.unit || ""}`,
					valueBuffer
				);
				parsed.packet = asHexString(
					new Uint8Array(
						valueBuffer.buffer,
						valueBuffer.byteOffset,
						valueBuffer.byteLength
					)
				);
			}

			values.push(parsed);
		} else {
			options.debug === true && console.debug(key, length, "NULL");
		}

		i += 1 + 1 + length; // advance past key, length and value bytes
	}
	options.debug === true && console.debug("-------End Parse 0102---------");
	return values;
}

const textDecoder = new TextDecoder();

function convert(key, dataview, options) {
	const data = {
		key,
	};

	switch (key) {
		case 1:
			// klv.checkRequiredSize(key, buffer, 1)
			data.name = "Security Classification";
			const classificationEnum = dataview.getUint8(0, false);
			switch (classificationEnum) {
				case 0:
					data.value = "UNKNOWN//";
					break;
				case 1:
					data.value = "UNCLASSIFIED//";
					break;
				case 2:
					data.value = "RESTRICTED//";
					break;
				case 3:
					data.value = "CONFIDENTIAL//";
					break;
				case 4:
					data.value = "SECRET//";
					break;
				case 5:
					data.value = "TOP SECRET//";
					break;
				default:
					data.value = "INVALID//";
					break;
			}
			return data;
		case 2:
			// klv.checkRequiredSize(key, buffer, 1)
			data.name = "Classifying Country Coding Method";
			const countryCodingEnum = dataview.getUint8(0, false);
			switch (countryCodingEnum) {
				case 1:
					data.value = "ISO-3166 Two Letter";
					break;
				case 2:
					data.value = "ISO-3166 Three Letter";
					break;
				case 3:
					data.value = "FIPS 10-4 Two Letter";
					break;
				case 4:
					data.value = "FIPS 10-4 Four Letter";
					break;
				case 5:
					data.value = "ISO-3166 Numeric";
					break;
				case 6:
					data.value = "1059 Two Letter";
					break;
				case 7:
					data.value = "1059 Three Letter";
					break;
				case 8:
					data.value = "Omitted Value";
					break;
				case 9:
					data.value = "Omitted Value";
					break;
				case 10:
					data.value = "FIPS 10-4 Mixed";
					break;
				case 11:
					data.value = "ISO 3166 Mixed";
					break;
				case 12:
					data.value = "STANAG 1059 Mixed";
					break;
				case 13:
					data.value = "GENC Two Letter";
					break;
				case 14:
					data.value = "GENC Three Letter";
					break;
				case 15:
					data.value = "GENC Numeric";
					break;
				case 16:
					data.value = "GENC Mixed";
					break;
				default:
					data.value = `No reference for ${countryCodingEnum}`;
			}
			return data;
		case 3:
			return {
				key,
				name: "Classifying Country",
				value: textDecoder.decode(dataview),
			};
		case 4:
			return {
				key,
				name: "Security Information",
				value: textDecoder.decode(dataview),
			};
		case 5:
			return {
				key,
				name: "Caveats",
				value: textDecoder.decode(dataview),
			};
		case 6:
			return {
				key,
				name: "Releasing Instructions",
				value: textDecoder.decode(dataview),
			};
		case 7:
			return {
				key,
				name: "Classified By",
				value: textDecoder.decode(dataview),
			};
		case 8:
			return {
				key,
				name: "Derived From",
				value: textDecoder.decode(dataview),
			};
		case 9:
			return {
				key,
				name: "Classification Reason",
				value: textDecoder.decode(dataview),
			};
		case 11:
			return {
				key,
				name: "Classification and Marking System",
				value: textDecoder.decode(dataview),
			};
		case 12:
			// klv.checkRequiredSize(key, buffer, 1)
			data.name = "Object Country Coding Method";
			const objectCountryCodingEnum = dataview.getUint8(0, false);
			switch (objectCountryCodingEnum) {
				case 1:
					data.value = "ISO-3166 Two Letter";
					break;
				case 2:
					data.value = "ISO-3166 Three Letter";
					break;
				case 3:
					data.value = "ISO-3166 Numeric";
					break;
				case 4:
					data.value = "FIPS 10-4 Two Letter";
					break;
				case 5:
					data.value = "FIPS 10-4 Four Letter";
					break;
				case 6:
					data.value = "1059 Two Letter";
					break;
				case 7:
					data.value = "1059 Three Letter";
					break;
				case 8:
					data.value = "Omitted Value";
					break;
				case 9:
					data.value = "Omitted Value";
					break;
				case 10:
					data.value = "Omitted Value";
					break;
				case 11:
					data.value = "Omitted Value";
					break;
				case 12:
					data.value = "Omitted Value";
					break;
				case 13:
					data.value = "GENC Two Letter";
					break;
				case 14:
					data.value = "GENC Three Letter";
					break;
				case 15:
					data.value = "GENC Numeric";
					break;
				case 64:
					data.value = "GENC AdminSub";
					break;
				default:
					data.value = `No reference for ${objectCountryCodingEnum}`;
			}
			return data;
		case 13:
			let value;
			// if (buffer[0] === 0 && buffer.length > 1) {
			// 	value = buffer.swap16().toString('utf16le') // node.js only supports little endian reading
			// 	buffer.swap16() // return to original order
			// } else {
			value = textDecoder.decode(dataview); // encoding error, utf8
			// }

			return {
				key,
				name: "Object Country Codes",
				value,
			};
		case 14:
			return {
				key,
				name: "Classification Comments",
				value: textDecoder.decode(dataview),
			};
		case 19:
			// klv.checkRequiredSize(key, buffer, 1)
			return {
				key,
				name: "Stream ID",
				value: dataview.getUint8(0, false),
			};
		case 20:
			// klv.checkRequiredSize(key, buffer, 2)
			return {
				key,
				name: "Transport Stream ID",
				value: dataview.getUint16(0, false),
			};
		case 21:
			// klv.checkRequiredSize(key, buffer, 16)
			return {
				key,
				name: "Item Designator ID",
				value: textDecoder.decode(dataview),
			};
		case 22:
			return {
				key,
				name: "Version",
				value: dataview.getUint16(0, false),
			};
		default:
			if (options.strict === true) {
				throw Error(`st0102 key ${key} not found`);
			}
			return {
				key,
				name: "Unknown",
				value: "Not Implemented",
			};
	}
}
