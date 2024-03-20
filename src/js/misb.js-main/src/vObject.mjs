import * as klv from "./klv.mjs";
import { cast } from "./klv.mjs";

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse vObject-------");
	options.debug === true &&
		process.stdout.write(`Buffer ${buffer.toString("hex")} ${buffer.length}\n`);

	const values = [];

	const keyPlusLength = 2;
	let i = 0;
	while (i < packet.length) {
		const key = packet[i];
		const valueLength = packet[i + 1];

		if (packet.length < i + keyPlusLength + valueLength) {
			throw new Error("Invalid vObject buffer, not enough content");
		}

		const valueBuffer = packet.subarray(
			i + keyPlusLength,
			i + keyPlusLength + valueLength
		);
		const parsed = convert(key, valueBuffer);

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

		values.push(parsed);

		i += keyPlusLength + valueLength; // advance past key, length and value bytes
	}
	options.debug === true && console.debug("-------End Parse vObject---------");
	return values;
}

function convert(key, buffer) {
	try {
		switch (key) {
			case 1:
				return {
					key,
					name: "Ontology",
					value: buffer.toString(),
				};
			case 2:
				return {
					key,
					name: "Ontology Class",
					value: buffer.toString(),
				};
			case 3:
				klv.checkMaxSize(key, buffer, 3);
				return {
					key,
					name: "Ontology ID",
					value: klv.readVariableUInt(buffer),
				};
			case 4: // todo this is not correct
				klv.checkMaxSize(key, buffer, 6);
				return {
					key,
					name: "Confidence",
					value: klv.readVariableUInt(buffer),
				};
			default:
				throw Error(`Key ${key} not found`);
		}
	} catch (e) {
		throw e;
	}
}
