import * as klv from "./klv.mjs";
import * as Location from "./Location.mjs";
import * as vObject from "./vObject.mjs";
import * as vObjectSeries from "./vObjectSeries.mjs";
import * as vTracker from "./vTracker.mjs";
import { cast } from "./klv.mjs";

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse vTarget Pack-------");
	options.debug === true &&
		process.stdout.write(`Buffer ${buffer.toString("hex")} ${buffer.length}\n`);

	const values = [];

	let i = 0;
	let targetId = 0;
	let read;
	do {
		read = packet[i];
		const highBits = targetId << 7;
		const lowBits = read & 0x7f;
		targetId = highBits + lowBits;
		i++;
	} while (read >>> 7 === 1);

	values.push({
		key: 0,
		name: "Target ID",
		value: targetId,
	});

	options.debug === true && console.debug("Target", targetId);

	while (i < packet.length) {
		const key = packet[i];
		const length = packet[i + 1];

		if (packet.length < i + 2 + length) {
			throw new Error("Invalid vTargetPack buffer, not enough content");
		}

		const valueBuffer = packet.subarray(i + 2, i + 2 + length);
		const parsed = convert(key, valueBuffer, options);

		if (typeof parsed.value === "string")
			parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, "");

		if (options.debug === true) {
			console.debug(
				key,
				length,
				parsed.name,
				`${parsed.value}${parsed.unit || ""}`,
				valueBuffer
			);
			parsed.packet = valueBuffer;
		}

		values.push(parsed);

		i += 1 + 1 + length; // advance past key, length and value bytes
	}
	options.debug === true && console.debug("-------End Parse vTarget Pack---------");
	return values;
}

function convert(key, buffer, options) {
	try {
		switch (key) {
			case 1:
				klv.checkMaxSize(key, buffer, 6);
				return {
					key,
					name: "Target Centroid",
					value: klv.readVariableUInt(buffer),
				};
			case 2:
				klv.checkMaxSize(key, buffer, 6);
				return {
					key,
					name: "Boundary Top Left",
					value: klv.readVariableUInt(buffer),
				};
			case 3:
				klv.checkMaxSize(key, buffer, 6);
				return {
					key,
					name: "Boundary Bottom Right",
					value: klv.readVariableUInt(buffer),
				};
			case 5:
				klv.checkMaxSize(key, buffer, 6);
				return {
					key,
					name: "Target Confidence Level",
					value: buffer.readUInt8(0),
				};
			case 6:
				klv.checkMaxSize(key, buffer, 6);
				return {
					key,
					name: "Target History",
					value: klv.readVariableUInt(buffer),
				};
			case 17:
				klv.checkRequiredSize(key, buffer, 22);
				return {
					key,
					name: "Target Location",
					value: Location.parse(buffer, options),
				};
			case 19:
				klv.checkMaxSize(key, buffer, 4);
				return {
					key,
					name: "Centroid Pix Row",
					value: klv.readVariableUInt(buffer),
				};
			case 20:
				klv.checkMaxSize(key, buffer, 4);
				return {
					key,
					name: "Centroid Pix Col",
					value: klv.readVariableUInt(buffer),
				};
			case 22:
				klv.checkMaxSize(key, buffer, 4);
				return {
					key,
					name: "Algorithm ID",
					value: klv.readVariableUInt(buffer),
				};
			case 102:
				return {
					key,
					name: "VObject",
					value: vObject.parse(buffer, options),
				};
			case 104:
				return {
					key,
					name: "VTracker",
					value: vTracker.parse(buffer, options),
				};
			case 107:
				return {
					key,
					name: "vObjectSeries",
					value: vObjectSeries.parse(buffer, options),
				};
			default:
				if (options.debug === true) {
					throw Error(`vTargetPack key ${key} not found`);
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
