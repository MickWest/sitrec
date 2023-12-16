import {par} from "./par";
import {localDate, utcDate} from "./utils";
import {GlobalDateTimeNode} from "./nodes/CNodeDateTime";

export function AddTimeDisplayToUI(viewUI, x, y, size, color) {

    viewUI.addText("videoTimeLabel", "2022-08-18T07:16:15.540Z", x, y, size, color).listen(par, "frame", function (v) {
        var nowDate = GlobalDateTimeNode.getNowDate(par.frame)

        this.text = utcDate(nowDate) + "  (" + localDate(nowDate)+")"
    })
    viewUI.addInput("dateTimeStart", "dateTimeStart") // Adding dateTimeStart as in input force this to update when dateTimeStart is updated

}