import {gui, Sit} from "./Globals";
import {CNodeConstant} from "./nodes/CNode";
import {wgs84} from "./LLA-ECEF-ENU";
import {CNodeGUIValue} from "./nodes/CNodeGUIValue";
import {CNodeTerrain} from "./nodes/CNodeTerrain";

export function SituationSetup() {


    new CNodeConstant({id:"radiusMiles", value: wgs84.radiusMiles});


    for (let key in Sit) {
        console.log(key)

        switch (key) {

            case "flattening":
                new CNodeGUIValue({id: "flattening", value: 0, start: 0, end: 1, step: 0.005, desc: "Flattening"}, gui)
                break

            case "terrain":

                new CNodeTerrain({
                    id: "TerrainModel",
                    radiusMiles: "radiusMiles", // constant
                    lat: Sit.terrain.lat,
                    lon: Sit.terrain.lon,
                    zoom: Sit.terrain.zoom,
                    nTiles: Sit.terrain.nTiles,
                    flattening: Sit.flattening?"flattening":undefined,
                    tileSegments: Sit.terrain.tileSegments ?? 100,
                })

                break;
        }


    }
}