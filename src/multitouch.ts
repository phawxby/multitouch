module Multitouch
{
    interface Dictionary<T> {
        [K: string]: T;
    }

    export class Manager {
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

        constructor(private document : HTMLDocument) {
            
            document.addEventListener("touchstart", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("touchend", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("touchcancel", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("touchmove", (evt) => { this.handleInteraction(evt); });

            document.addEventListener("mousedown", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("mouseup", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("mousemove", (evt) => { this.handleInteraction(evt); });
            document.addEventListener("click", (evt) => { this.handleInteraction(evt); });

            this.setupDragHandler();
            this.setupScaleHandler();
        }

        private handleInteraction = (evt : UIEvent) => {
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

        private coalesceInteractions = () => {
            let interactions = this.interactions;
            // It's just easier iterating over arrays
            let interactionsArr = Object.keys(interactions).map(function(key) { return interactions[key]; });

            if (interactionsArr.length > 0)
            {
                for (let interaction of interactionsArr)
                {
                    if (interaction.updated) 
                    {
                        let handled = Array<Interaction>();

                        // First handle scale
                        if (!handled.length && interaction.closestScaleElm) 
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
                                let startPosA = interaction.startEvent.position;
                                let previousPosB = matchingScaleInteraction.previousEvent ? matchingScaleInteraction.previousEvent.position : matchingScaleInteraction.currentEvent.position;
                                let currentPosB = matchingScaleInteraction.currentEvent.position;
                                let startPosB = matchingScaleInteraction.startEvent.position;

                                if (startPosA && currentPosA && startPosB && currentPosB)
                                {
                                    let xDiff = Math.ceil(startPosA.pageLeft < startPosB.pageLeft ? (currentPosA.targetLeft - startPosA.targetLeft) : (currentPosB.targetLeft - startPosB.targetLeft));
                                    let yDiff = Math.ceil(startPosA.pageTop < startPosB.pageTop ? (currentPosA.targetTop - startPosA.targetTop) : (currentPosB.targetTop - startPosB.targetTop));
                                    let wDiff = Math.ceil((startPosA.pageLeft > startPosB.pageLeft ? (currentPosA.targetRight - startPosA.targetRight) : (currentPosB.targetRight - startPosB.targetRight)) + (xDiff * -1));
                                    let hDiff = Math.ceil((startPosA.pageTop > startPosB.pageTop ? (currentPosA.targetBottom - startPosA.targetBottom) : (currentPosB.targetBottom - startPosB.targetBottom)) + (yDiff * -1));

                                    let evt = new CustomEvent("mt-scale");
                                    evt.initCustomEvent("mt-scale", true, true, { "x" : xDiff, "y" : yDiff, "w" : wDiff, "h" : hDiff });
                                    interaction.targetElm.dispatchEvent(evt);
                                }

                                handled.push(interaction);
                                handled.push(matchingScaleInteraction);
                            }
                        }

                        if (!handled.length && interaction.closestDragElm && interaction.currentEvent && !interaction.ending)
                        {
                            if (interaction.previousEvent)
                            {
                                let previousPos = interaction.previousEvent.position;
                                let currentPos = interaction.currentEvent.position;
                                let startPos = interaction.startEvent.position;

                                if (previousPos && currentPos)
                                {
                                    var xDiff = Math.ceil(currentPos.targetLeft - startPos.targetLeft);
                                    var yDiff = Math.ceil(currentPos.targetTop - startPos.targetTop);

                                    let evt = new CustomEvent("mt-drag");
                                    evt.initCustomEvent("mt-drag", true, true, { "x" : xDiff, "y" : yDiff });
                                    interaction.targetElm.dispatchEvent(evt);
                                }
                            }

                            handled.push(interaction);
                        }

                        if (!handled.length && interaction.targetElm)
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
                                        let xDiff = currentPos.pageLeft - previousPos.pageLeft;
                                        xDiff = xDiff < 0 ? xDiff * -1 : 0;
                                        let yDiff = currentPos.pageTop - previousPos.pageTop;
                                        yDiff = yDiff < 0 ? yDiff * -1 : 0;

                                        if (xDiff < 30 && yDiff < 30)
                                        {
                                            handled.push(interaction);

                                            interaction.targetElm.dataset["passclick"] = true.toString();
                                            interaction.targetElm.click();
                                        }
                                    }
                                }
                            }
                        }

                        for(let handledInteraction of handled)
                        {
                            handledInteraction.currentEvent.event.preventDefault();
                            handledInteraction.currentEvent.event.stopImmediatePropagation();

                            this.interactions[handledInteraction.key].updated = false;
                        }
                    }

                    if (interaction.ending)
                    {
                        delete this.interactions[interaction.key];
                    }
                }
            }
        }

        private setupDragHandler = () => {
            this.document.addEventListener("mt-drag", (e : CustomEvent) => {
                let target = <HTMLElement>e.target;

                if (target.matches('.mt-draggable')) 
                {
                    let dragTarget = this.closestParent(target, ".mt-draggable-target") || target;
                    let styleVals = Manager.getStyleValues(dragTarget);

                    if(!styleVals.isPositioned){
                        dragTarget.style.position = "relative";
                    }
                    dragTarget.style.top = (styleVals.top + e.detail.y) + "px";
                    dragTarget.style.left = (styleVals.left + e.detail.x) + "px";
                }
            });
        };

        private setupScaleHandler = () => {
            this.document.addEventListener("mt-scale", (e : CustomEvent) => {
                let target = <HTMLElement>e.target;

                if (target.matches('.mt-scaleable')) 
                {

                    let scaleTarget = this.closestParent(target, ".mt-scaleable-target") || target;

                    let styleVals = Manager.getStyleValues(scaleTarget);

                    if(!styleVals.isPositioned){
                        scaleTarget.style.position = "relative";
                    }
                    scaleTarget.style.top = (styleVals.top + e.detail.y) + "px";
                    scaleTarget.style.left = (styleVals.left + e.detail.x) + "px";
                    scaleTarget.style.width = (styleVals.width + e.detail.w) + "px";
                    scaleTarget.style.height = (styleVals.height + e.detail.h) + "px";
                }
            });
        };

        /**
         * Gets the current style values required for positioning and scaling an element.
         */
        public static getStyleValues = (target: HTMLElement): { isPositioned: boolean; top: number; left: number; height: number; width: number } =>{
            let compStyle: CSSStyleDeclaration;
            return {
                isPositioned: !(!target.style.position && !(compStyle = window.getComputedStyle(target)).position),
                top: parseInt(target.style.top || (compStyle || (compStyle = window.getComputedStyle(target))).top) || 0,
                left: parseInt(target.style.left || (compStyle || (compStyle = window.getComputedStyle(target))).left) || 0,
                width: parseInt(target.style.width || (compStyle || (compStyle = window.getComputedStyle(target))).width) || 0,
                height: parseInt(target.style.height || (compStyle || (compStyle = window.getComputedStyle(target))).height) || 0,
            };
        };

        /**
         * Finds the closest parent element using the specified selector.
         */
        private closestParent = (element: HTMLElement, selector: string): HTMLElement => {
            let target = element, 
                foundTarget = false;

            while (!(foundTarget = target.matches(selector)) && target.parentElement !== null) {
                target = target.parentElement;
            }

            if (foundTarget) {
                return target;
            }
        };
    }

    class Interaction
    {
        public startEvent: EventWrapper;
        public currentEvent: EventWrapper;
        public previousEvent: EventWrapper;

        public ending = false;
        public updated = true

        public targetElm: HTMLElement;
        public closestDragElm: HTMLElement;
        public closestScaleElm: HTMLElement;

        constructor(public key: string, public index: number, _event: UIEvent) {

            this.startEvent = new EventWrapper(_event, this.index);

            this.targetElm = <HTMLElement>this.startEvent.event.target;

            this.currentEvent = new EventWrapper(_event, this.index, this.targetElm);

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
            this.currentEvent = new EventWrapper(_event, this.index, this.targetElm);
            this.updated = true;
        }
    }

    export interface IPosition
    {
        pageLeft : number;
        pageTop : number;
        target : HTMLElement;
        targetLeft : number;
        targetTop : number;
        targetRight : number;
        targetBottom : number;
    }

    class EventWrapper
    {
        public time : number;
        public position : IPosition;

        constructor(public event : UIEvent, public identifier : number, target : HTMLElement = null) {
            this.time = performance.now();
            this.position = this.getEventPostion(target);
        }

        private getEventPostion(target : HTMLElement) : IPosition
        {
            if (event instanceof TouchEvent)
            {
                for (let touchCollection of [event.touches, event.changedTouches])
                {
                    for (let i = 0; i < touchCollection.length; i++)
                    {
                        let touch : Touch = touchCollection[i];
                        if (touch.identifier == this.identifier) 
                        {
                            let t : HTMLElement = target || <HTMLElement>touch.target;
                            let tStyle = Manager.getStyleValues(t);

                            return {
                                pageLeft: touch.pageX, 
                                pageTop: touch.pageY,
                                target: t,
                                targetLeft: touch.pageX - t.offsetLeft,
                                targetTop: touch.pageY - t.offsetTop,
                                targetRight: touch.pageX - (tStyle.width - t.offsetLeft),
                                targetBottom: touch.pageY - (tStyle.height - t.offsetTop)
                            };
                        }
                    }
                }
            }
            else if (event instanceof MouseEvent)
            {
                let t : HTMLElement = target || <HTMLElement>event.target;
                let tStyle = Manager.getStyleValues(t);

                return {
                    pageLeft: event.pageX, 
                    pageTop: event.pageY,
                    target: t,
                    targetLeft: event.pageX - t.offsetLeft,
                    targetTop: event.pageY - t.offsetTop,
                    targetRight: event.pageX - (tStyle.width - t.offsetLeft),
                    targetBottom: event.pageY - (tStyle.height - t.offsetTop)
                };
            }
        }
    }
}

(function(d : HTMLDocument) {

    let mt = new Multitouch.Manager(d);

})(document);
