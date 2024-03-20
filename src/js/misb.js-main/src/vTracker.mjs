import * as klv from "./klv.mjs";
import { cast } from "./klv.mjs";

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse vTracker-------");
	options.debug === true &&
		process.stdout.write(`Buffer ${buffer.toString("hex")} ${buffer.length}\n`);

	const values = [];

	let i = 0;
	const berHeader = 1;
	const berLength = 1;
	while (i < packet.length) {
		const key = packet[i];
		const contentLength = packet[i + berLength];

		if (packet.length < i + berHeader + berLength + contentLength) {
			throw new Error("Invalid vTracker buffer, not enough content");
		}

		const valueBuffer = packet.subarray(
			i + berHeader + berLength,
			i + berHeader + berLength + contentLength
		);
		const parsed = convert(key, valueBuffer);

		if (typeof parsed.value === "string")
			parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, "");

		if (options.debug === true) {
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

		i += berHeader + berLength + contentLength; // advance past key, length and value bytes
	}
	options.debug === true && console.debug("-------End Parse vTracker---------");
	return values;
}

function convert(key, buffer) {
	try {
		switch (key) {
			case 1:
				klv.checkRequiredSize(key, buffer, 16);
				return {
					key,
					name: "Track ID",
					value: klv.readVariableUInt(buffer),
				};
			case 3:
				klv.checkRequiredSize(key, buffer, 8);
				return {
					key,
					name: "Start Time",
					value: parseFloat(buffer.readBigUInt64BE(0)),
					unit: "µs",
				};
			case 4:
				klv.checkRequiredSize(key, buffer, 8);
				return {
					key,
					name: "End Time",
					value: parseFloat(buffer.readBigUInt64BE(0)),
					unit: "µs",
				};
			case 9:
				return {
					key,
					name: "TrackHistorySeries", // todo implement
					value: buffer.toString(),
				};
			case 10:
				return {
					key,
					name: "Velocity", // todo implement
					value: buffer.toString(),
				};
			default:
				throw Error(`Key ${key} not found`);
		}
	} catch (e) {
		throw e;
	}
}
