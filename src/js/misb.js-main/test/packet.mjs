import path from 'path';
import fs from 'fs';

const dirname = path.dirname(import.meta.url).replace(/^file:/, '');;

export const DynamicConstantMISMMSPacketData = {
	file: fs.readFileSync(path.join(dirname, './DynamicConstantMISMMSPacketData.bin')),
	json: [
		{ "key": 2, "name": "Precision Time Stamp", "value": 1231798102000000, "unit": "µs" },
		{ "key": 3, "name": "Mission ID", "value": "Mission 12" },
		{ "key": 5, "name": "Platform Heading Angle", "value": 159.97436484321355, "unit": "°" },
		{ "key": 6, "name": "Platform Pitch Angle", "value": -0.43153172399060225, "unit": "°" },
		{ "key": 7, "name": "Platform Roll Angle", "value": 3.4058656575212893, "unit": "°" },
		{ "key": 10, "name": "Platform Designation", "value": "Predator" },
		{ "key": 11, "name": "Image Source Sensor", "value": "EO Nose" },
		{ "key": 12, "name": "Image Coordinate System", "value": "Geodetic WGS84" },
		{ "key": 13, "name": "Sensor Latitude", "value": 60.176822966978335, "unit": "°" },
		{ "key": 14, "name": "Sensor Longitude", "value": 128.42675904204452, "unit": "°" },
		{ "key": 15, "name": "Sensor True Altitude", "value": 14190.719462882429, "unit": "m" },
		{ "key": 16, "name": "Sensor Horizontal Field of View", "value": 144.5712977798123, "unit": "°" },
		{ "key": 17, "name": "Sensor Vertical Field of View", "value": 152.64362554360264, "unit": "°" },
		{ "key": 18, "name": "Sensor Relative Azimuth Angle", "value": 160.71921143697557, "unit": "°" },
		{ "key": 19, "name": "Sensor Relative Elevation Angle", "value": -168.79232483394085, "unit": "°" },
		{ "key": 20, "name": "Sensor Relative Roll Angle", "value": 176.86543764939194, "unit": "°" },
		{ "key": 21, "name": "Slant Range", "value": 68590.98329874477, "unit": "m" },
		{ "key": 22, "name": "Target Width", "value": 722.8198672465096, "unit": "m" },
		{ "key": 23, "name": "Frame Center Latitude", "value": -10.542388633146132, "unit": "°" },
		{ "key": 24, "name": "Frame Center Longitude", "value": 29.15789012292302, "unit": "°" },
		{ "key": 25, "name": "Frame Center Elevation", "value": 3216.0372320134275, "unit": "m" },
		{ "key": 48, "name": "Security Local Set", "value": [
				{ "key": 1, "name": "Security Classification", "value": "UNCLASSIFIED//" },
				{ "key": 2, "name": "Classifying Country Coding Method", "value": "1059 Three Letter" },
				{ "key": 3, "name": "Classifying Country", "value": "//USA" },
				{ "key": 12, "name": "Object Country Coding Method", "value": "1059 Three Letter" },
				{ "key": 13, "name": "Object Country Codes", "value": "USA" },
				{ "key": 22, "name": "Version", "value": 10 }
			]
		},
		{ "key": 65, "name": "UAS Datalink LS Version Number", "value": 6 },
		{ "key": 94, "name": "MIIS Core Identifier", "value": "0170f592f02373364af8aa9162c00f2eb2da16b74341000841a0be365b5ab96a3645" },
		{ "key": 1, "name": "Checksum", "value": 15902, "valid": true }
	]
}

export const DynamicOnlyMISMMSPacketData = {
	file: fs.readFileSync(path.join(dirname, './DynamicOnlyMISMMSPacketData.bin')),
	json: [
		{ "key": 2, "name": "Precision Time Stamp", "value": 1231798102000000, "unit": "µs" },
		{ "key": 5, "name": "Platform Heading Angle", "value": 159.97436484321355, "unit": "°" },
		{ "key": 6, "name": "Platform Pitch Angle", "value": -0.43153172399060225, "unit": "°" },
		{ "key": 7, "name": "Platform Roll Angle", "value": 3.4058656575212893, "unit": "°" },
		{ "key": 13, "name": "Sensor Latitude", "value": 60.176822966978335, "unit": "°" },
		{ "key": 14, "name": "Sensor Longitude", "value": 128.42675904204452, "unit": "°" },
		{ "key": 15, "name": "Sensor True Altitude", "value": 14190.719462882429, "unit": "m" },
		{ "key": 16, "name": "Sensor Horizontal Field of View", "value": 144.5712977798123, "unit": "°" },
		{ "key": 17, "name": "Sensor Vertical Field of View", "value": 152.64362554360264, "unit": "°" },
		{ "key": 18, "name": "Sensor Relative Azimuth Angle", "value": 160.71921143697557, "unit": "°" },
		{ "key": 19, "name": "Sensor Relative Elevation Angle", "value": -168.79232483394085, "unit": "°" },
		{ "key": 20, "name": "Sensor Relative Roll Angle", "value": 0, "unit": "°" },
		{ "key": 21, "name": "Slant Range", "value": 68590.98329874477, "unit": "m" },
		{ "key": 22, "name": "Target Width", "value": 722.8198672465096, "unit": "m" },
		{ "key": 23, "name": "Frame Center Latitude", "value": -10.542388633146132, "unit": "°" },
		{ "key": 24, "name": "Frame Center Longitude", "value": 29.15789012292302, "unit": "°" },
		{ "key": 25, "name": "Frame Center Elevation", "value": 3216.0372320134275, "unit": "m" },
		{ "key": 65, "name": "UAS Datalink LS Version Number", "value": 6 },
		{ "key": 1, "name": "Checksum", "value": 51280, "valid": true }
	]
}
