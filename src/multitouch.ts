module Multitouch
{
    interface Dictionary<T> {
        [K: string]: T;
    }

    export class Manager {
        private interactions : Dictionary<Interaction> = {};

        public static get SCALABLE_CLASS():string { return ".mt-scalable" };
        public static get SCALABLE_TARGET_CLASS():string { return ".mt-scalable-target" };
        public static get DRAGGABLE_CLASS():string { return ".mt-draggable" };
        public static get DRAGGABLE_TARGET_CLASS():string { return ".mt-draggable-target" };

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
            this.setupScrollHandler();
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

                                let currentPosA = interaction.currentEvent.position[Manager.SCALABLE_CLASS];
                                let startPosA = interaction.startEvent.position[Manager.SCALABLE_CLASS];
                                let currentPosB = matchingScaleInteraction.currentEvent.position[Manager.SCALABLE_CLASS];
                                let startPosB = matchingScaleInteraction.startEvent.position[Manager.SCALABLE_CLASS];

                                if (startPosA && currentPosA && startPosB && currentPosB)
                                {
                                    let xDiff = Math.ceil(startPosA.pageLeft < startPosB.pageLeft ? (currentPosA.targetLeft - startPosA.targetLeft) : (currentPosB.targetLeft - startPosB.targetLeft));
                                    let yDiff = Math.ceil(startPosA.pageTop < startPosB.pageTop ? (currentPosA.targetTop - startPosA.targetTop) : (currentPosB.targetTop - startPosB.targetTop));
                                    let wDiff = Math.ceil(startPosA.pageLeft > startPosB.pageLeft ? (currentPosA.targetRight - startPosA.targetRight) : (currentPosB.targetRight - startPosB.targetRight));
                                    let hDiff = Math.ceil(startPosA.pageTop > startPosB.pageTop ? (currentPosA.targetBottom - startPosA.targetBottom) : (currentPosB.targetBottom - startPosB.targetBottom));

                                    wDiff += xDiff * -1;
                                    hDiff += yDiff * -1;

                                    console.log( xDiff, yDiff, wDiff, hDiff );

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
                                let currentPos = interaction.currentEvent.position[Manager.DRAGGABLE_CLASS];
                                let startPos = interaction.startEvent.position[Manager.DRAGGABLE_CLASS];

                                if (startPos && currentPos)
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
                            if (interaction.startEvent && interaction.currentEvent) 
                            {
                                let startPos = interaction.startEvent.position["target"];
                                let currentPos = interaction.currentEvent.position["target"];
                                let previousPos = interaction.previousEvent.position["target"];
                                
                                if (interaction.currentEvent.time - interaction.startEvent.time < 300)
                                {
                                    let xDiff = currentPos.pageLeft - startPos.pageLeft;
                                    let yDiff = currentPos.pageTop - startPos.pageTop;
                                    xDiff = xDiff < 0 ? xDiff * -1 : 0;
                                    yDiff = yDiff < 0 ? yDiff * -1 : 0;

                                    // We could easily use this x-y diff data to be able to 
                                    // emit swipe events and what not too
                                    if (startPos && currentPos)
                                    {
                                        if (xDiff < 30 && yDiff < 30)
                                        {
                                            handled.push(interaction);

                                            interaction.targetElm.dataset["passclick"] = true.toString();
                                            interaction.targetElm.click();
                                        }
                                    }
                                }

                                if (!handled.length && interaction.closestScrollingElm && previousPos)
                                {
                                    let xDiff = currentPos.pageLeft - previousPos.pageLeft;
                                    let yDiff = currentPos.pageTop - previousPos.pageTop;

                                    let evt = new CustomEvent("mt-scroll");
                                    evt.initCustomEvent("mt-scroll", true, true, { "x" : xDiff, "y" : yDiff });
                                    interaction.closestScrollingElm.dispatchEvent(evt);

                                    handled.push(interaction);
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

                let closestDraggable = Manager.closest(target, Manager.DRAGGABLE_CLASS);

                if (closestDraggable) 
                {
                    let dragTarget = Manager.closest(closestDraggable, Manager.DRAGGABLE_TARGET_CLASS) || closestDraggable;
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
                
                let closestScalable = Manager.closest(target, Manager.SCALABLE_CLASS);

                if (closestScalable) 
                {
                    let scaleTarget = Manager.closest(closestScalable, Manager.SCALABLE_TARGET_CLASS) || closestScalable;

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

        private setupScrollHandler = () => {
            this.document.addEventListener("mt-scroll", (e : CustomEvent) => {
                let target = <HTMLElement>e.target;
                
                target.scrollLeft -= e.detail.x;
                target.scrollTop -= e.detail.y;
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
        public static closest = (element: HTMLElement, selector: string): HTMLElement => {
            let target = element, 
                foundTarget = false;

            if (target.matches(selector)) {
                return target;
            }

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
        public closestScrollingElm: HTMLElement;

        constructor(public key: string, public index: number, _event: UIEvent) {

            this.startEvent = new EventWrapper(_event, this.index);

            this.targetElm = <HTMLElement>this.startEvent.event.target;

            this.currentEvent = new EventWrapper(_event, this.index, this.targetElm);

            this.closestDragElm = Manager.closest(this.targetElm, Manager.DRAGGABLE_CLASS);
            this.closestScaleElm = Manager.closest(this.targetElm, Manager.SCALABLE_CLASS);
            
            let findScrollingElm = this.targetElm;
            while (findScrollingElm != null) {
                if (findScrollingElm.scrollHeight > findScrollingElm.getBoundingClientRect().height + 2) {
                    this.closestScrollingElm = findScrollingElm;
                    break;
                }
                findScrollingElm = findScrollingElm.parentElement;
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
        public position : Dictionary<IPosition>;

        constructor(public event : UIEvent, public identifier : number, target : HTMLElement = null) {
            this.time = performance.now();
            this.position = this.getEventPostion(target);
        }

        private getEventPostion(target : HTMLElement) : Dictionary<IPosition>
        {
            let positions : Dictionary<IPosition> = {};

            for (let elmRel of ["target", Manager.DRAGGABLE_CLASS, Manager.SCALABLE_CLASS])
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

                                if (elmRel !== "target") {
                                    t = Manager.closest(t, elmRel);
                                }

                                if (t != null)
                                {
                                    let tStyle = Manager.getStyleValues(t);

                                    let offsetLeft = 0;
                                    let offsetTop = 0;
                                    let startElm = t;
                                    while (startElm != null)
                                    {
                                        if (!isNaN(startElm.offsetLeft)) {
                                            offsetLeft += startElm.offsetLeft;
                                        }
                                        if (!isNaN(startElm.offsetTop)) {
                                            offsetTop += startElm.offsetTop;
                                        }
                                        startElm = <HTMLElement>startElm.offsetParent;
                                    }

                                    positions[elmRel] = {
                                        pageLeft: touch.pageX, 
                                        pageTop: touch.pageY,
                                        target: t,
                                        targetLeft: touch.pageX - offsetLeft,
                                        targetTop: touch.pageY - offsetTop,
                                        targetRight: touch.pageX - (tStyle.width + offsetLeft),
                                        targetBottom: touch.pageY - (tStyle.height + offsetTop)
                                    };
                                }
                            }
                        }
                    }
                }
                else if (event instanceof MouseEvent)
                {
                    let t : HTMLElement = target || <HTMLElement>event.target;

                    if (elmRel !== "target") {
                        t = Manager.closest(t, elmRel);
                    }

                    if (t != null)
                    {
                        let tStyle = Manager.getStyleValues(t);

                        let offsetLeft = 0;
                        let offsetTop = 0;
                        let startElm = t;
                        while (startElm != null)
                        {
                            if (!isNaN(startElm.offsetLeft)) {
                                offsetLeft += startElm.offsetLeft;
                            }
                            if (!isNaN(startElm.offsetTop)) {
                                offsetTop += startElm.offsetTop;
                            }
                            startElm = <HTMLElement>startElm.offsetParent;
                        }

                        positions[elmRel] = {
                            pageLeft: event.pageX, 
                            pageTop: event.pageY,
                            target: t,
                            targetLeft: event.pageX - offsetLeft,
                            targetTop: event.pageY - offsetTop,
                            targetRight: event.pageX - (tStyle.width + offsetLeft),
                            targetBottom: event.pageY - (tStyle.height + offsetTop)
                        };
                    }
                }
            }

            return positions;
        }
    }
}

(function(d : HTMLDocument) {

    let mt = new Multitouch.Manager(d);

})(document);
