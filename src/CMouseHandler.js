// The basic functionality of a mouse handler attached to a view
// stores last mouse position, delta, etc
// TODO: touch functionality
export class CMouseHandler {
    constructor(view, handlers) {
        this.view = view
        this.handlers = handlers;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.dragging = false;

        this.view.canvas.addEventListener('wheel', e => this.handleMouseWheel(e));
        this.view.canvas.addEventListener('pointermove', e => this.handleMouseMove(e));
        this.view.canvas.addEventListener('pointerdown', e => this.handleMouseDown(e));
        this.view.canvas.addEventListener('pointerup', e => this.handleMouseUp(e));
        this.view.canvas.addEventListener('dblclick', e => this.handleMouseDblClick(e));
        this.view.canvas.addEventListener('contextmenu', e => this.handleContextMenu(e));
        this.view.canvas.addEventListener('mouseLeave', e => this.handleMouseLeave(e));
    }

    newPosition(e, anchor) {
        const x = e.clientX - this.view.leftPx;
        const y = e.clientY - this.view.topPx;
        this.dx = x - this.x;
        this.dy = y - this.y;
        this.x = x;
        this.y = y;
        if (anchor) {
            this.anchorX = x;
            this.anchorY = y
        }
        // console.log("Mouse: "+this.x+","+this.y+","+" Delta: "+this.dx+","+this.dy)
    }

    handleMouseLeave(e) {
        // does not seem like it makes a diference
        //       e.preventDefault();

    }

    handleMouseWheel(e) {
        e.preventDefault();
        this.newPosition(e, true)
        if (this.handlers.wheel) this.handlers.wheel(e)
    }

    handleMouseMove(e) {
//        console.log("Move, dragging = "+this.dragging)
//        e.preventDefault();
        this.newPosition(e)

        if (this.dragging) {
            if (e.buttons === 1) {
                if (this.handlers.drag) {
                    this.handlers.drag(e)
                }
            }
            if (e.buttons === 2) {
                if (this.handlers.rightDrag) {
                    this.handlers.rightDrag(e)
                }
            }
            if (e.buttons === 4) {
                if (this.handlers.centerDrag) {
                    this.handlers.centerDrag(e)
                }
            }


        } else {
            if (this.handlers.move) this.handlers.move(e)
        }
    }

    handleMouseDown(e) {
//        e.preventDefault();
        this.view.canvas.setPointerCapture(e.pointerId)


        this.newPosition(e, true)
        this.dragging = true;
        if (this.handlers.down) this.handlers.down(e)

    }

    handleMouseUp(e) {
//        e.preventDefault();
        this.view.canvas.releasePointerCapture(e.pointerId)


        this.newPosition(e)
        this.dragging = false;
        if (this.handlers.up) this.handlers.up(e)

    }

    handleMouseDblClick(e) {
        e.preventDefault();
        this.newPosition(e)
        if (this.handlers.dblClick) this.handlers.dblClick(e)
    }

    handleContextMenu(event) {

//		console.log("onConrxt")

        if (this.enabled === false) return;

        event.preventDefault();

    }


}