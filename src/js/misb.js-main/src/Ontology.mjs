import * as klv from "./klv.mjs";
import { cast } from "./klv.mjs";

export function parse(buffer, options = {}) {
	packet = cast(packet);

	options.debug === true && console.debug("-------Start Parse Ontology-------");
	options.debug === true &&
		process.stdout.write(`Buffer ${buffer.toString("hex")} ${buffer.length}\n`);

	if (buffer.length === 0) {
		// 0x67 0x00 is an empty Ontology
		return;
	}

	let ontologies = [];

	let i = 0;
	while (i < packet.length) {
		let length = 0;
		let read;
		do {
			read = packet[i];
			length += read & 0x7f;
			i++;
		} while (read >>> 7 === 1);

		if (packet.length - 1 < length) {
			throw new Error(
				`Invalid Ontology buffer, not enough content ${packet.length} < ${length}`
			);
		}

		let j = i;
		let ontology = [];
		while (j < i + length) {
			const key = packet[j];
			const contentLength = packet[j + 1];
			const berHeader = 1;
			const berLength = 1;

			const valueBuffer = packet.subarray(
				j + berHeader + berLength,
				j + berHeader + berLength + contentLength
			);
			const parsed = convert(key, valueBuffer, options);

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

			ontology.push(parsed);

			j += berHeader + berLength + contentLength; // advance past key, length and value bytes
		}
		ontologies.push(ontology);
		i += length;
	}
	options.debug === true && console.debug("-------End Parse Ontology---------");
	return ontologies;
}

function convert(key, buffer, options) {
	try {
		switch (key) {
			case 1:
				klv.checkMaxSize(key, buffer, 3);
				return {
					key,
					name: "ID",
					value: klv.readVariableUInt(buffer),
				};
			case 2:
				klv.checkMaxSize(key, buffer, 3);
				return {
					key,
					name: "Parent ID",
					value: klv.readVariableUInt(buffer),
				};
			case 3:
				return {
					key,
					name: "Ontology",
					value: buffer.toString(),
				};
			case 4:
				return {
					key,
					name: "Ontology Class",
					value: buffer.toString(),
				};
			default:
				if (options.strict === true) {
					throw Error(`Ontology key ${key} not found`);
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
