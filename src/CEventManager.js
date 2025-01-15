class CEventManager {
    constructor() {
        this.events = {};
    }

    addEventListener(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }

        this.events[event].push(callback);
    }

    removeEventListener(event, callback) {
        if (!this.events[event]) {
            return;
        }

        this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }

    dispatchEvent(event, data) {
        if (!this.events[event]) {
            return;
        }

        //this.events[event].forEach((cb) => cb(data));

        // call the callbacks, if any return true, then delete that one
        this.events[event] = this.events[event].filter((cb) => !cb(data));

    }

    removeAll() {
        this.events = {};
    }

}

export const EventManager = new CEventManager();
