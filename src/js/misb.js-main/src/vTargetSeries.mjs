import * as klv from "./klv.mjs";
import * as vTargetPack from "./vTargetPack.mjs";
import { cast } from "./klv.mjs";

export function parse(buffer, options = {}) {
	const packet = cast(buffer);

	options.debug === true && console.debug("-------Start Parse vTarget Series-------");
	options.debug === true &&
		process.stdout.write(`Buffer ${buffer.toString("hex")} ${buffer.length}\n`);

	const values = [];

	let i = 0;
	while (i < packet.length) {
		let { berHeader, berLength, contentLength } = klv.getBer(packet[i]);
		if (contentLength === null) {
			contentLength = klv.getContentLength(
				packet.subarray(i + berHeader, i + berHeader + berLength)
			); // read content after key and length)
		}

		const valueBuffer = packet.subarray(
			i + berHeader + berLength,
			i + berHeader + berLength + contentLength
		); // read content after key and length
		const parsed = vTargetPack.parse(valueBuffer, options);

		if (options.debug === true) {
			//console.debug('VTarget Pack', length, value, valueBuffer)
			parsed.packet = valueBuffer;
		}
		values.push(parsed);

		i += berHeader + berLength + contentLength; // advance past length and value bytes
	}
	options.debug === true && console.debug("-------End Parse vTarget Series---------");
	return values;
}
