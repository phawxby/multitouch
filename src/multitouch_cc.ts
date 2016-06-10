interface Element {
    capturedTouches: Array<MultiTouch.ITouchRegistration>;
}

module MultiTouch {

    export interface ITouchRegistration { id: number; start: number; originalTarget?: EventTarget }

    export class Manager {

        private AllHosts: NodeListOf<Element>;


        constructor() {

            //find all 'touch-host' elements and prepare the 'capturedTouches' array
            this.AllHosts = document.querySelectorAll("[data-mthost]");
            for (var i = 0; i < this.AllHosts.length; i++) {
                var host = this.AllHosts.item(i);
                host.capturedTouches = [];
                if (host.id === "" || host.id === null) {
                    host.id = "host-" + i;
                }
            }


            document.addEventListener("touchstart", evt => this.handleTouchStart(evt));
            document.addEventListener("touchend", evt => this.handleTouchEnd(evt));
            //document.addEventListener("touchcancel", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("touchmove", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("mousedown", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("mouseup", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("mousemove", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("click", function (evt) { _this.handleInteraction(evt); });

        }

        private handleTouchStart = (evt: TouchEvent): void => {
            var host = this.findParentHost(evt.target);
            if (host !== null) {
                for (var i = 0; i < evt.changedTouches.length; i++) {
                    host.capturedTouches.push({ id: evt.changedTouches.item(i).identifier, start: Date.now() });
                }
                console.log("touch start on " + host.id)
            }
        };

        private handleTouchEnd = (evt: TouchEvent): void => {
            for (var i = 0; i < evt.changedTouches.length; i++) {
                var touch = this.findTouch(evt.changedTouches.item(i).identifier);
                if (touch === null)
                    return;

                if(Date.now() - touch.thing.start <= 500){
                    var event = document.createEvent("CustomEvent");
                    event.initEvent("Tap", true, true);
                    evt.target.dispatchEvent(event);
                }                
            }
        };

        /**
         * Finds the parent 'touch host' element from a target element
         */
        private findParentHost = (target: EventTarget): HTMLElement => {

            var currentTarget = <Node>target;
            var attr: Attr;
            while (currentTarget !== document && (attr = currentTarget.attributes.getNamedItem("data-mthost")) === null) {
                currentTarget = currentTarget.parentNode;
            }
            if (attr === null)
                return null;

            return <HTMLElement>currentTarget;
        }

        /**
         * Finds the 'touch host' element and touch reg that contains the supplied identifier
         */
        private findTouch = (touchId: number): { host: Element; thing: ITouchRegistration } => {
            for (var i = 0; i < this.AllHosts.length; i++) {
                var host = this.AllHosts.item(i);
                for (var j = 0; j < host.capturedTouches.length; j++) {
                    if (host.capturedTouches[j].id === touchId) {
                        return { host: host, thing: host.capturedTouches[j] };
                    }
                }
            }
            return null;
        }
    }
}



document["touchManager"] = new MultiTouch.Manager();
document.addEventListener("Tap", evt => { console.log("Tap event on " + evt.target) });