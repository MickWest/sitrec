import * as klv from "./klv.mjs";
import { cast } from "./klv.mjs";

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse Point Local Set-------");
	options.debug === true &&
		process.stdout.write(`Buffer ${buffer.toString("hex")} ${buffer.length}\n`);

	const values = [];

	const keyPlusLength = 2;
	let i = 0;
	while (i < packet.length) {
		const key = packet[i];
		const valueLength = packet[i + 1];

		if (packet.length < i + keyPlusLength + valueLength) {
			throw new Error("Invalid POI Local Set buffer, not enough content");
		}

		const valueBuffer = packet.subarray(
			i + keyPlusLength,
			i + keyPlusLength + valueLength
		);
		const parsed = convert(key, valueBuffer, options);

		if (typeof parsed.value === "string") {
			parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, "");
		}

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

		values.push(parsed);

		i += keyPlusLength + valueLength; // advance past key, length and value bytes
	}
	options.debug === true &&
		console.debug("-------End Parse User Defined Local Set---------");

	return values;
}

function convert(key, buffer, options) {
	try {
		switch (key) {
			case 1:
				klv.checkRequiredSize(key, buffer, 2);
				return {
					key,
					name: "POI Number",
					value: buffer.readUInt16BE(0),
				};
			case 2:
				klv.checkRequiredSize(key, buffer, 4);
				return {
					key,
					name: "POI Latitude",
					value: klv.scale(
						buffer.readInt16BE(0),
						[-1 * (2 ** 15 - 1), 2 ** 15 - 1],
						[-90, 90]
					),
					unit: "°",
				};
			case 3:
				klv.checkRequiredSize(key, buffer, 4);
				return {
					key,
					name: "POI Longitude",
					value: klv.scale(
						buffer.readInt16BE(0),
						[-1 * (2 ** 15 - 1), 2 ** 15 - 1],
						[-180, 180]
					),
					unit: "°",
				};
			case 4:
				klv.checkRequiredSize(key, buffer, 2);
				return {
					key,
					name: "POI Altitude",
					value: klv.scale(
						buffer.readUInt16BE(0),
						[0, 2 ** 16 - 1],
						[-900, 19000]
					),
					unit: "m",
				};
			case 5:
				klv.checkRequiredSize(key, buffer, 1);
				const type = buffer[0];
				let value = "Unknown";
				if (type === 1) value = "Friendly";
				else if (type === 2) value = "Hostile";
				else if (type === 3) value = "Target";
				return {
					key,
					name: "POI Type",
					value,
				};
			case 6:
				return {
					key,
					name: "POI Text",
					value: buffer.toString(),
				};
			case 7:
				return {
					key,
					name: "POI Source Icon",
					value: buffer.toString(),
				};
			case 8:
				return {
					key,
					name: "POI Source ID",
					value: buffer.toString(),
				};
			case 9:
				return {
					key,
					name: "POI Label",
					value: buffer.toString(),
				};
			case 10:
				return {
					key,
					name: "Operation ID",
					value: buffer.toString(),
				};
			default:
				if (options.strict === true) {
					throw Error(`Key ${key} not found`);
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
