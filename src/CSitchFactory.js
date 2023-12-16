import {CManager} from "./CManager";


export class CSitchFactory extends CManager {
    constructor(props) {
        super(props);

    }

    register(sitch) {
        this.add(sitch.name, sitch)
    }


}

