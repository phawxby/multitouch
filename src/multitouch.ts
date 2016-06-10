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
                
                if (evt.type.indexOf("click") >= 0) {
                    if (target.dataset["passclick"] === true.toString()) 
                    {
                        target.dataset["passclick"] = false.toString();
                        return;
                    } 
                    else 
                    {
                        evt.stopImmediatePropagation();
                        evt.preventDefault();
                        return;
                    }
                }

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

            console.log(interactionsArr);

            if (interactionsArr.length > 0)
            {
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
                                // The plan is to get the left/top most point and based on their previous event set the x/y
                                // position change (See the drag event below)
                                // Then get the right/bottom most point and based on their previous event set the width/height 
                                // change
                                // Emiting based on change allows us to be very relative with our data and it would work for relative or absolute
                                // elements

                                let previousPosA = interaction.previousEvent ? interaction.previousEvent.position : interaction.currentEvent.position;
                                let currentPosA = interaction.currentEvent.position;
                                let previousPosB = matchingScaleInteraction.previousEvent ? matchingScaleInteraction.previousEvent.position : matchingScaleInteraction.currentEvent.position;
                                let currentPosB = matchingScaleInteraction.currentEvent.position;

                                if (previousPosA && currentPosA && previousPosB && currentPosB)
                                {
                                    let xDiffA = currentPosA.pageX - previousPosA.pageX;
                                    let yDiffA = currentPosA.pageY - previousPosA.pageY;
                                    let xDiffB = currentPosB.pageX - previousPosB.pageX;
                                    let yDiffB = currentPosB.pageY - previousPosB.pageY;

                                    let xDiff = Math.ceil(currentPosA.pageX < currentPosB.pageX ? xDiffA : xDiffB);
                                    let yDiff = Math.ceil(currentPosA.pageY < currentPosB.pageY ? yDiffA : yDiffB);
                                    let wDiff = Math.ceil((currentPosA.pageX < currentPosB.pageX ? xDiffB : xDiffA) + (xDiff * -1));
                                    let hDiff = Math.ceil((currentPosA.pageY < currentPosB.pageY ? yDiffB : yDiffA) + (yDiff * -1));

                                    let evt = new CustomEvent("mt-scale");
                                    evt.initCustomEvent("mt-scale", true, true, { "x" : xDiff, "y" : yDiff, "w" : wDiff, "h" : hDiff });
                                    interaction.targetElm.dispatchEvent(evt);
                                    //console.log(`Scale event x=${xDiff} y=${yDiff} w=${wDiff} h=${hDiff}`);
                                }

                                handled = true;
                            }
                        }

                        // console.log(interaction.targetElm);
                        if (!handled && interaction.closestDragElm && interaction.currentEvent && !interaction.ending)
                        {
                            if (interaction.previousEvent)
                            {
                                let previousPos = interaction.previousEvent.position;
                                let currentPos = interaction.currentEvent.position;

                                if (previousPos && currentPos)
                                {
                                    var xDiff = Math.ceil(currentPos.pageX - previousPos.pageX);
                                    var yDiff = Math.ceil(currentPos.pageY - previousPos.pageY);

                                    //let moveDragEvent = new Event("drag");
                                    let evt = new CustomEvent("mt-drag");
                                    evt.initCustomEvent("mt-drag", true, true, { "x" : xDiff, "y" : yDiff });
                                    interaction.targetElm.dispatchEvent(evt);
                                    //console.log(`Drag event x=${xDiff} y=${yDiff}`);
                                }
                            }

                            handled = true;
                        }

                        if (!handled && interaction.targetElm)
                        {
                            if (interaction.startEvent && interaction.currentEvent && interaction.ending) 
                            {
                                if (interaction.currentEvent.time - interaction.startEvent.time < 300)
                                {
                                    let previousPos = interaction.startEvent.position;
                                    let currentPos = interaction.currentEvent.position;

                                    // We could easily use this x-y diff data to be able to 
                                    // emit swipe events and what not too
                                    if (previousPos && currentPos)
                                    {
                                        let xDiff = currentPos.pageX - previousPos.pageX;
                                        xDiff = xDiff < 0 ? xDiff * -1 : 0;
                                        let yDiff = currentPos.pageY - previousPos.pageY;
                                        yDiff = yDiff < 0 ? yDiff * -1 : 0;

                                        if (xDiff < 30 && yDiff < 30)
                                        {
                                            handled = true;


                                            interaction.targetElm.dataset["passclick"] = true.toString();
                                            interaction.targetElm.click();

                                            //console.log(`Click event!`);
                                        }
                                    }
                                }
                            }
                        }

                        if (handled)
                        {
                            interaction.currentEvent.event.preventDefault();
                            interaction.currentEvent.event.stopImmediatePropagation();

                            this.interactions[interaction.key].updated = false;
                        }

                        if (interaction.ending)
                        {
                            delete this.interactions[interaction.key];
                        }
                    }
                }
            }
        }

        public setupDragHandler()
        {
            document.addEventListener("mt-drag", function(e : CustomEvent) {
                let target = <HTMLElement>e.target;

                if (target.matches('.mt-draggable')) 
                {
                    let dragTarget = target;
                    let foundTarget = false;
                    while (!(foundTarget = dragTarget.matches(".mt-draggable-target")) && dragTarget.parentElement !== null) {
                        dragTarget = dragTarget.parentElement;
                    }
                    if (!foundTarget) {
                        dragTarget = target;
                    }

                    let compStyle;
                    if (!dragTarget.style.position && !(compStyle = window.getComputedStyle(dragTarget)).position) {
                        dragTarget.style.position = "relative";
                    }
                    var currentTop = parseInt(dragTarget.style.top || compStyle.top) || 0;
                    var currentLeft = parseInt(dragTarget.style.left || compStyle.left) || 0;

                    dragTarget.style.top = (currentTop + e.detail.y) + "px";
                    dragTarget.style.left = (currentLeft + e.detail.x) + "px";
                }
            });
        }

        public setupScaleHandler()
        {
            document.addEventListener("mt-scale", function(e : CustomEvent) {
                let target = <HTMLElement>e.target;

                if (target.matches('.mt-scaleable')) 
                {

                    let scaleTarget = target;
                    let foundTarget = false;
                    while (!(foundTarget = scaleTarget.matches(".mt-draggable-target")) && scaleTarget.parentElement !== null) {
                        scaleTarget = scaleTarget.parentElement;
                    }
                    if (!foundTarget) {
                        scaleTarget = target;
                    }

                    if (!scaleTarget.style.position) {
                        scaleTarget.style.position = "relative";
                    }

                    var currentTop = parseInt(scaleTarget.style.top) || 0;
                    var currentLeft = parseInt(scaleTarget.style.left) || 0;
                    var currentWidth = parseInt(scaleTarget.style.width) || 0;
                    var currentHeight = parseInt(scaleTarget.style.height) || 0;

                    scaleTarget.style.top = (currentTop + e.detail.y) + "px";
                    scaleTarget.style.left = (currentLeft + e.detail.x) + "px";
                    scaleTarget.style.width = (currentWidth + e.detail.w) + "px";
                    scaleTarget.style.height = (currentHeight + e.detail.h) + "px";
                }
            });
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
        public updated : Boolean = true;

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
                for (let i = 0; i < (<TouchEvent>event).touches.length; i++)
                {
                    let touch : Touch = <Touch>(<TouchEvent>event).touches[i];

                    if (touch.identifier == this.index) {
                        return new Position(
                            touch.pageX, 
                            touch.pageY
                        );
                    }
                }

                for (let i = 0; i < (<TouchEvent>event).changedTouches.length; i++)
                {
                    let touch : Touch = <Touch>(<TouchEvent>event).changedTouches[i];

                    if (touch.identifier == this.index) {
                        return new Position(
                            touch.pageX, 
                            touch.pageY
                        );
                    }
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
    mt.setupDragHandler();
    mt.setupScaleHandler();

})(document);
