var Multitouch = (function () {
    function Multitouch(_document) {
        this.interactions = {};
        document = _document;
    }
    Multitouch.prototype.init = function () {
        var _this = this;
        document.addEventListener("touchstart", function (evt) { _this.handleInteraction(evt); });
        document.addEventListener("touchend", function (evt) { _this.handleInteraction(evt); });
        document.addEventListener("touchcancel", function (evt) { _this.handleInteraction(evt); });
        document.addEventListener("touchmove", function (evt) { _this.handleInteraction(evt); });
        document.addEventListener("mousedown", function (evt) { _this.handleInteraction(evt); });
        document.addEventListener("mouseup", function (evt) { _this.handleInteraction(evt); });
        //document.addEventListener("mousemove", (evt) => { this.handleInteraction(evt); });
        document.addEventListener("click", function (evt) { _this.handleInteraction(evt); });
    };
    Multitouch.prototype.handleInteraction = function (evt) {
        if (evt instanceof TouchEvent) {
            for (var i = 0; i < evt.changedTouches.length; i++) {
                var touch = evt.changedTouches[i];
                var id = "touch-" + touch.identifier;
                var target = touch.target;
                var currentInteraction = this.interactions[id];
                if (evt.type.indexOf("start")) {
                    this.interactions[id] = new Interaction(id, evt);
                }
                else if (evt.type.indexOf("cancel")) {
                    this.interactions[id] = null;
                }
                else if (currentInteraction) {
                    currentInteraction.update(evt);
                }
                if (currentInteraction) {
                    currentInteraction.ending = evt.type.indexOf("end") > 0;
                    this.interactions[id] = currentInteraction;
                }
            }
        }
        else if (evt instanceof MouseEvent) {
            var id = "mouse";
            var target = evt.target;
            var currentInteraction = this.interactions[id];
            if (evt.type.indexOf("down")) {
                this.interactions[id] = new Interaction(id, evt);
            }
            else if (currentInteraction) {
                currentInteraction.update(evt);
            }
            if (currentInteraction) {
                currentInteraction.ending = evt.type.indexOf("up") > 0;
                this.interactions[id] = currentInteraction;
            }
        }
        this.coalesceInteractions();
    };
    Multitouch.prototype.coalesceInteractions = function () {
    };
    return Multitouch;
}());
var Interaction = (function () {
    function Interaction(_id, _event) {
        this.ending = false;
        this.updated = false;
        this.id = _id;
        this.startEvent = new EventWrapper(_event);
        this.currentEvent = new EventWrapper(_event);
        this.targetElm = this.startEvent.event.target;
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
    Interaction.prototype.update = function (_event) {
        this.previousEvent = this.currentEvent;
        this.currentEvent = new EventWrapper(_event);
        this.updated = true;
    };
    return Interaction;
}());
var EventWrapper = (function () {
    function EventWrapper(_event) {
        this.time = new Date();
        this.event = _event;
    }
    return EventWrapper;
}());
(function (d) {
    var mt = new Multitouch(d);
    mt.init();
})(document);
