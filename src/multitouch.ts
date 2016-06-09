interface Dictionary<T> {
    [K: string]: T;
}

class Multitouch {
    private document : HTMLDocument;

    private interactions : Dictionary<Interaction> = {};

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
        //document.addEventListener("mousemove", (evt) => { this.handleInteraction(evt); });
        document.addEventListener("click", (evt) => { this.handleInteraction(evt); });
    }

    private handleInteraction(evt : UIEvent) 
    {
        if (evt instanceof TouchEvent)
        {
            for (let i = 0; i < evt.changedTouches.length; i++)
            {
                let touch = evt.changedTouches[i];
                let id = "touch-" + touch.identifier;
                let target = touch.target;

                let currentInteraction = this.interactions[id];

                if (evt.type.indexOf("start")) {
                    this.interactions[id] = new Interaction(id, evt);
                } else if (evt.type.indexOf("cancel")) {
                    this.interactions[id] = null;
                } else if (currentInteraction) {
                    currentInteraction.update(evt);
                }

                if (currentInteraction) {
                    currentInteraction.ending = evt.type.indexOf("end") > 0;

                    this.interactions[id] = currentInteraction;
                }
            }
        }
        else if (evt instanceof MouseEvent)
        {
            let id = "mouse";
            let target = evt.target;

            let currentInteraction = this.interactions[id];

            if (evt.type.indexOf("down")) {
                this.interactions[id] = new Interaction(id, evt);
            } else if (currentInteraction) {
                currentInteraction.update(evt);
            }
            
            if (currentInteraction) {
                currentInteraction.ending = evt.type.indexOf("up") > 0;

                this.interactions[id] = currentInteraction;
            }
        }

        this.coalesceInteractions();
    }

    private coalesceInteractions()
    {
        
    }
}

class Interaction
{
    public id : string;
    public startEvent : EventWrapper;
    public currentEvent : EventWrapper;
    public previousEvent : EventWrapper;

    public ending : Boolean = false;
    public updated : Boolean = false;

    public targetElm : HTMLElement;
    public closestDragElm : HTMLElement;
    public closestScaleElm : HTMLElement;

    constructor(_id : string, _event : UIEvent) {
        this.id = _id;
        this.startEvent = new EventWrapper(_event);
        this.currentEvent = new EventWrapper(_event);

        this.targetElm = <HTMLElement>this.startEvent.event.target;

        var parent = this.targetElm.parentElement;
        while (parent != null) {
            if (!this.closestDragElm && parent.classList.contains("mt-draggable")) {
                this.closestDragElm = parent;
            } 
            if (!this.closestDragElm && parent.classList.contains("mt-scaleable")) {
                this.closestScaleElm = parent;
            } 

            parent = parent.parentElement;
        }
    }

    public update(_event : UIEvent)
    {
        this.previousEvent = this.currentEvent;
        this.currentEvent = new EventWrapper(_event);
        this.updated = true;
    }
}

class EventWrapper
{
    public time : Date;
    public event : UIEvent;

    constructor(_event : UIEvent) {
        this.time = new Date();
        this.event = _event;
    }
}

(function(d : HTMLDocument) {

    let mt = new Multitouch(d);
    mt.init();

})(document);
