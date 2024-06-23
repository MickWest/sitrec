import { CNodeView } from './CNodeView';
import { setChartDiv, updateChartSize } from '../JetChart';

export class CNodeChartView extends CNodeView {
  constructor(v) {
    //   debugger;
    super(v);
    setChartDiv(this.div);
    this.div.style.fontFamily = 'Monospace';
    this.div.style.backgroundColor = 'black';
    this.div.style.color = 'grey';
    this.div.setAttribute('id', 'myChartDiv');
    this.div.style.pointerEvents = 'auto';
    $(this.div)
      .draggable({
        drag: (event, ui) => event.shiftKey,
      })
      .resizable({
        resize: (event, ui) => {
          //                if (!event.shiftKey) return true;
          //    var scale = window.innerHeight / 1080
          //    par.graphSize = 100*ui.size.width/(600*scale)
          updateChartSize();
          return true;
        },
      });
  }

  // if the doubleclick has updated the size, we need to pass that on
  // to the chart object
  doubleClick() {
    super.doubleClick();
    updateChartSize();
  }
}
