module Multitouch
{
    interface Dictionary<T> {
        [K: string]: T;
    }

    export class Manager {
        private document : HTMLDocument;
        private interactions : Dictionary<Interaction> = {};

        public static generateGuid() : string
        {
            // http://stackoverflow.com/a/8809472
            let d = performance.now();
            let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                let r = (d + Math.random()*16)%16 | 0;
                d = Math.floor(d/16);
                return (c=='x' ? r : (r&0x3|0x8)).toString(16);
            });

            return uuid;
        }

        constructor(_document : HTMLDocument) {
            document = _document;
        }

        init() {
            document.addEventListener("touchstart", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("touchend", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("touchcancel", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("touchmove", (evt) => { this.handleInteraction(evt); });

            document.addEventListener("mousedown", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("mouseup", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("mousemove", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("click", (evt) => { this.handleInteraction(evt); });
        }

        private handleInteraction(evt : UIEvent) 
        {
            if (evt instanceof TouchEvent)
            {
                for (let i = 0; i < evt.changedTouches.length; i++)
                {
                    let touch = evt.changedTouches[i];
                    let key = "touch-" + touch.identifier;
                    let target = <HTMLElement>evt.target;
                    target.dataset["touch"] = true.toString();

                    let currentInteraction = this.interactions[key];

                    if (evt.type.indexOf("start") >= 0) {
                        this.interactions[key] = new Interaction(key, touch.identifier, evt);
                    } else if (evt.type.indexOf("cancel") >= 0) {
                        this.interactions[key] = null;
                    } else if (currentInteraction) {
                        currentInteraction.update(evt);
                    }

                    if (currentInteraction) {
                        currentInteraction.ending = evt.type.indexOf("end") > 0;

                        this.interactions[key] = currentInteraction;
                    }
                }
            }
            else if (evt instanceof MouseEvent)
            {
                let id = "mouse";
                let target = <HTMLElement>evt.target;

                if (target.dataset["touch"] === true.toString()) {
                    if (evt.type.indexOf("up") >= 0) {
                        target.dataset["touch"] = false.toString();
                    }

                    evt.stopImmediatePropagation();
                    evt.preventDefault();
                    return;
                }

                let currentInteraction = this.interactions[id];

                if (evt.type.indexOf("down") >= 0) {
                    this.interactions[id] = new Interaction(id, 0, evt);
                } else if (currentInteraction) {
                    currentInteraction.update(evt);
                }
                
                if (currentInteraction) {
                    currentInteraction.ending = evt.type.indexOf("up") >= 0;

                    this.interactions[id] = currentInteraction;
                }
            }

            this.coalesceInteractions();
        }

        private coalesceInteractions()
        {
            let interactions = this.interactions;
            // It's just easier iterating over arrays
            let interactionsArr = Object.keys(interactions).map(function(key) { return interactions[key]; });

            for (let interaction of interactionsArr)
            {
                if (interaction.updated) 
                {
                    let handled = false;

                    // First handle scale
                    if (!handled && interaction.closestScaleElm) 
                    {
                        let matchingScaleInteraction : Interaction;

                        for (let tryMatchInteaction of interactionsArr)
                        {
                            if (interaction != tryMatchInteaction && tryMatchInteaction.closestScaleElm == interaction.closestScaleElm) {
                                matchingScaleInteraction = tryMatchInteaction;
                                break;
                            }
                        }

                        if (matchingScaleInteraction)
                        {
                            // Logic here to emit scaling events based on the movement of the two interaction points

                            console.log("Scale event");

                            handled = true;
                        }
                    }

                    if (!handled && interaction.closestDragElm && interaction.previousEvent && interaction.currentEvent && !interaction.ending)
                    {
                        var previousPos = interaction.previousEvent.position;
                        var currentPos = interaction.currentEvent.position;

                        if (previousPos && currentPos)
                        {
                            var xDiff = currentPos.pageX - previousPos.pageX;
                            var yDiff = currentPos.pageY - previousPos.pageY;

                            //let moveDragEvent = new Event("drag");
                            console.log(`Drag event x=${xDiff} y=${yDiff}`);

                            handled = true;
                        }
                    }

                    if (!handled && interaction.targetElm)
                    {
                        if (interaction.startEvent && interaction.currentEvent && interaction.ending) 
                        {
                            if (interaction.currentEvent.time - interaction.startEvent.time < 300)
                            {
                                var previousPos = interaction.previousEvent.position;
                                var currentPos = interaction.currentEvent.position;

                                if (previousPos && currentPos)
                                {
                                    var xDiff = currentPos.pageX - previousPos.pageX;
                                    xDiff = xDiff < 0 ? xDiff * -1 : 0;
                                    var yDiff = currentPos.pageY - previousPos.pageY;
                                    yDiff = yDiff < 0 ? yDiff * -1 : 0;

                                    if (xDiff < 30 && yDiff < 30)
                                    {
                                        console.log(`Click event!`);
                                    }
                                }
                            }
                        }
                    }

                    if (interaction.ending)
                    {
                        delete this.interactions[interaction.key];
                    }
                    else if (handled)
                    {
                        this.interactions[interaction.key].updated = false;
                    }
                }
            }
        }
    }

    class Interaction
    {
        public key : string;
        public index : number = 0;
        public startEvent : EventWrapper;
        public currentEvent : EventWrapper;
        public previousEvent : EventWrapper;

        public ending : Boolean = false;
        public updated : Boolean = false;

        public targetElm : HTMLElement;
        public closestDragElm : HTMLElement;
        public closestScaleElm : HTMLElement;

        constructor(_key : string, _index : number, _event : UIEvent) {
            this.key = _key;
            this.index = _index;
            this.startEvent = new EventWrapper(_event, this.index);
            this.currentEvent = new EventWrapper(_event, this.index);

            this.targetElm = <HTMLElement>this.startEvent.event.target;

            if (!this.closestDragElm && this.targetElm.classList.contains("mt-draggable")) {
                this.closestDragElm = this.targetElm;
            } 
            if (!this.closestScaleElm && this.targetElm.classList.contains("mt-scaleable")) {
                this.closestScaleElm = this.targetElm;
            } 

            var parent = this.targetElm.parentElement;
            while (parent != null) {
                if (!this.closestDragElm && parent.classList.contains("mt-draggable")) {
                    this.closestDragElm = parent;
                } 
                if (!this.closestScaleElm && parent.classList.contains("mt-scaleable")) {
                    this.closestScaleElm = parent;
                } 

                parent = parent.parentElement;
            }

            if (this.targetElm && !this.targetElm.dataset["uniqueId"]) {
                this.targetElm.dataset["uniqueId"] = Multitouch.Manager.generateGuid();
            }
            if (this.closestDragElm && !this.closestDragElm.dataset["uniqueId"]) {
                this.closestDragElm.dataset["uniqueId"] = Multitouch.Manager.generateGuid();
            }
            if (this.closestScaleElm && !this.closestScaleElm.dataset["uniqueId"]) {
                this.closestScaleElm.dataset["uniqueId"] = Multitouch.Manager.generateGuid();
            }
        }

        public update(_event : UIEvent)
        {
            this.previousEvent = this.currentEvent;
            this.currentEvent = new EventWrapper(_event, this.index);
            this.updated = true;
        }
    }

    export class Position
    {
        public pageX : number;
        public pageY : number;

        constructor(_pageX : number, _pageY : number) {
            this.pageX = _pageX;
            this.pageY = _pageY;
        }
    }

    class EventWrapper
    {
        public time : number;
        public event : UIEvent;
        public index : number = 0;
        public position : Position;

        constructor(_event : UIEvent, _index : number) {
            this.time = performance.now();
            this.event = _event;
            this.index = _index;
            this.position = this.getEventPostion();
        }

        private getEventPostion() : Position
        {
            if (event instanceof TouchEvent)
            {
                if ((<TouchEvent>event).touches.item(this.index))
                {
                    return new Position(
                        (<TouchEvent>event).touches.item(this.index).pageX, 
                        (<TouchEvent>event).touches.item(this.index).pageY
                    );
                }
                else if ((<TouchEvent>event).changedTouches.item(this.index))
                {
                    return new Position(
                        (<TouchEvent>event).changedTouches.item(this.index).pageX, 
                        (<TouchEvent>event).changedTouches.item(this.index).pageY
                    );
                }
            }
            else if (event instanceof MouseEvent)
            {
                return new Position(
                    (<MouseEvent>event).pageX, 
                    (<MouseEvent>event).pageY
                );
            }
        }
    }
}

(function(d : HTMLDocument) {

    let mt = new Multitouch.Manager(d);
    mt.init();

})(document);
