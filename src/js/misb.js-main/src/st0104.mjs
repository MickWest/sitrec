import * as klv from "./klv.mjs";
import { cast, startsWith } from "./klv.mjs";

// module.exports.name = 'st0104'
export const key = cast("060e2b34020101010e01010201010000");
export const minSize = 31;

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse 0104-------");
	options.debug === true &&
		process.stdout.write(`Packet ${packet.toString("hex")} ${packet.length}\n`);

	if (packet.length < minSize) {
		// must have a 16 byte key, 1 byte BER, 10 byte timestamp, 4 byte checksum
		throw new Error("Buffer has no content to read");
	}

	if (!startsWith(packet, key)) {
		// compare first 16 bytes before BER
		throw new Error("Not ST0104");
	}

	let { berHeader, berLength, contentLength } = klv.getBer(packet[key.length]);
	if (contentLength === null) {
		contentLength = klv.getContentLength(
			packet.subarray(key.length + berHeader, key.length + berHeader + berLength)
		); // read content after key and length)
	}

	const parsedLength = key.length + berHeader + berLength + contentLength;
	if (parsedLength > packet.length) {
		// buffer length isn't long enough to read content
		throw new Error("Buffer includes ST0104 key and BER but not content");
	}

	const values = [];

	let i = key.length + berHeader + berLength; //index of first content key
	while (i < parsedLength) {
		const key = packet.subarray(i, i + 16);

		let { berHeader, berLength, contentLength } = klv.getBer(packet[i + key.length]);
		if (contentLength === null) {
			contentLength = klv.getContentLength(
				packet.subarray(i + key.length + berHeader, i + 1 + berHeader + berLength)
			); // read content after key and length
		}

		const valueBuffer = packet.subarray(
			i + key.length + berHeader + berLength,
			i + key.length + berHeader + berLength + contentLength
		); // read content after key and length

		if (parsedLength < i + berHeader + berLength + contentLength + 1) {
			throw new Error("Invalid ST0104 buffer, not enough content");
		}

		const keyString = key.toString("hex");
		const parsed = convert(keyString, valueBuffer, options);

		if (parsed !== null) {
			if (typeof parsed.value === "string")
				parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, "");

			if (options.debug === true) {
				console.debug(
					keyString,
					contentLength,
					parsed.name,
					`${parsed.value}${parsed.unit || ""}`,
					valueBuffer
				);
				parsed.packet = valueBuffer;
			}
			values.push(parsed);
		} else {
			options.debug === true && console.debug(keyString, contentLength, "NULL");
		}

		i += key.length + berHeader + berLength + contentLength; // advance past key, length and value bytes
	}
	/*
		if (!klv.isChecksumValid(packet.subarray(0, parsedLength), values[1]?.value || values[1])) {
			throw new Error('Invalid checksum')
		}
	*/
	return values;
}

function convert(key, buffer, options) {
	try {
		switch (key) {
			case "060e2b34010101030702010101050000":
				return {
					key,
					name: "User Defined Time Stamp",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010702010201010000":
				return {
					key,
					name: "Start Date Time - UTC",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010702010207010000":
				return {
					key,
					name: "Event Start Date Time - UTC",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010420010201010000":
				return {
					key,
					name: "Image Source Device",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701020103020000":
				return {
					key,
					name: "Frame Center Latitude",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701020103040000":
				return {
					key,
					name: "Frame Center Longitude",
					value: buffer.toString("hex"),
				};
			case "060e2b340101010a0701020103160000":
				return {
					key,
					name: "???",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701090201000000":
				return {
					key,
					name: "Target Width",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701020102020000":
				return {
					key,
					name: "Device Altitude",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101030701020102060200":
				return {
					key,
					name: "Device Longitude",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101030701020102040200":
				return {
					key,
					name: "Device Latitude",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701080101000000":
				return {
					key,
					name: "Slant Range",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701100102000000":
				return {
					key,
					name: "Angle to North",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701100101000000":
				return {
					key,
					name: "Sensor Roll Angle",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101020420020101080000":
				return {
					key,
					name: "Field of View (Horizontal)",
					value: buffer.toString("hex"),
				};
			case "060e2b340101010704200201010a0100":
				return {
					key,
					name: "Field of View (Vertical)",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701100103000000":
				return {
					key,
					name: "Obliquity Angle",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101070701100106000000":
				return {
					key,
					name: "Platform Heading Angle",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101070701100104000000":
				return {
					key,
					name: "Platform Roll Angle",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101070701100105000000":
				return {
					key,
					name: "Platform Pitch Angle",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101030701020103070100":
				return {
					key,
					name: "Corner Latitude Point 1",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101030701020103080100":
				return {
					key,
					name: "Corner Latitude Point 2",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101030701020103090100":
				return {
					key,
					name: "Corner Latitude Point 3",
					value: buffer.toString("hex"),
				};
			case "060e2b340101010307010201030a0100":
				return {
					key,
					name: "Corner Latitude Point 4",
					value: buffer.toString("hex"),
				};
			case "060e2b340101010307010201030b0100":
				return {
					key,
					name: "Corner Longitude Point 1",
					value: buffer.toString("hex"),
				};
			case "060e2b340101010307010201030c0100":
				return {
					key,
					name: "Corner Longitude Point 2",
					value: buffer.toString("hex"),
				};
			case "060e2b340101010307010201030d0100":
				return {
					key,
					name: "Corner Longitude Point 3",
					value: buffer.toString("hex"),
				};
			case "060e2b340101010307010201030e0100":
				return {
					key,
					name: "Corner Longitude Point 4",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701010100000000":
				return {
					key,
					name: "Image Coordinate System",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010101200100000000":
				return {
					key,
					name: "Device Designation",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701030101010000":
				return {
					key,
					name: "???",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010701010200000000":
				return {
					key,
					name: "???",
					value: buffer.toString("hex"),
				};
			case "060e2b34010101010105050000000000":
				return {
					key,
					name: "Episode Number",
					value: buffer.toString("hex"),
				};
			default:
				if (options.strict === true) {
					throw Error(`st0104 key ${key} not found`);
				}
				return {
					key,
					name: "Unknown",
					value: "Not Implemented",
				};
		}
	} catch (e) {
		throw e;
	}
}
