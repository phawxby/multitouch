var Multitouch;
(function (Multitouch) {
    var Manager = (function () {
        function Manager(_document) {
            this.interactions = {};
            document = _document;
        }
        Manager.generateGuid = function () {
            // http://stackoverflow.com/a/8809472
            var d = performance.now();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        };
        Manager.prototype.init = function () {
            var _this = this;
            document.addEventListener("touchstart", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("touchend", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("touchcancel", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("touchmove", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("mousedown", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("mouseup", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("mousemove", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("click", function (evt) { _this.handleInteraction(evt); });
        };
        Manager.prototype.handleInteraction = function (evt) {
            if (evt instanceof TouchEvent) {
                for (var i = 0; i < evt.changedTouches.length; i++) {
                    var touch = evt.changedTouches[i];
                    var key = "touch-" + touch.identifier;
                    var target = evt.target;
                    target.dataset["touch"] = true.toString();
                    var currentInteraction = this.interactions[key];
                    if (evt.type.indexOf("start") >= 0) {
                        this.interactions[key] = new Interaction(key, touch.identifier, evt);
                    }
                    else if (evt.type.indexOf("cancel") >= 0) {
                        this.interactions[key] = null;
                    }
                    else if (currentInteraction) {
                        currentInteraction.update(evt);
                    }
                    if (currentInteraction) {
                        currentInteraction.ending = evt.type.indexOf("end") > 0;
                        this.interactions[key] = currentInteraction;
                    }
                }
            }
            else if (evt instanceof MouseEvent) {
                var id = "mouse";
                var target = evt.target;
                if (target.dataset["touch"] && !!target.dataset["touch"]) {
                    if (evt.type.indexOf("up")) {
                        target.dataset["touch"] = false.toString();
                    }
                    evt.stopImmediatePropagation();
                    evt.preventDefault();
                    return;
                }
                var currentInteraction = this.interactions[id];
                if (evt.type.indexOf("down") >= 0) {
                    this.interactions[id] = new Interaction(id, 0, evt);
                }
                else if (currentInteraction) {
                    currentInteraction.update(evt);
                }
                if (currentInteraction) {
                    currentInteraction.ending = evt.type.indexOf("up") >= 0;
                    this.interactions[id] = currentInteraction;
                }
            }
            this.coalesceInteractions();
        };
        Manager.prototype.coalesceInteractions = function () {
            var interactions = this.interactions;
            // It's just easier iterating over arrays
            var interactionsArr = Object.keys(interactions).map(function (key) { return interactions[key]; });
            for (var _i = 0, interactionsArr_1 = interactionsArr; _i < interactionsArr_1.length; _i++) {
                var interaction = interactionsArr_1[_i];
                if (interaction.updated) {
                    var handled = false;
                    // First handle scale
                    if (!handled && interaction.closestScaleElm) {
                        var matchingScaleInteraction = void 0;
                        for (var _a = 0, interactionsArr_2 = interactionsArr; _a < interactionsArr_2.length; _a++) {
                            var tryMatchInteaction = interactionsArr_2[_a];
                            if (interaction != tryMatchInteaction && tryMatchInteaction.closestScaleElm == interaction.closestScaleElm) {
                                matchingScaleInteraction = tryMatchInteaction;
                                break;
                            }
                        }
                        if (matchingScaleInteraction) {
                            // Logic here to emit scaling events based on the movement of the two interaction points
                            console.log("Scale event");
                            handled = true;
                        }
                    }
                    if (!handled && interaction.closestDragElm && interaction.previousEvent && interaction.currentEvent && !interaction.ending) {
                        var previousPos = interaction.previousEvent.position;
                        var currentPos = interaction.currentEvent.position;
                        if (previousPos && currentPos) {
                            var xDiff = currentPos.pageX - previousPos.pageX;
                            var yDiff = currentPos.pageY - previousPos.pageY;
                            //let moveDragEvent = new Event("drag");
                            console.log("Drag event x=" + xDiff + " y=" + yDiff);
                            handled = true;
                        }
                    }
                    if (!handled && interaction.targetElm) {
                        if (interaction.startEvent && interaction.currentEvent && interaction.ending) {
                            if (interaction.currentEvent.time - interaction.startEvent.time < 300) {
                                var previousPos = interaction.previousEvent.position;
                                var currentPos = interaction.currentEvent.position;
                                if (previousPos && currentPos) {
                                    var xDiff = currentPos.pageX - previousPos.pageX;
                                    xDiff = xDiff < 0 ? xDiff * -1 : 0;
                                    var yDiff = currentPos.pageY - previousPos.pageY;
                                    yDiff = yDiff < 0 ? yDiff * -1 : 0;
                                    if (xDiff < 30 && yDiff < 30) {
                                        console.log("Click event!");
                                    }
                                }
                            }
                        }
                    }
                    if (interaction.ending) {
                        delete this.interactions[interaction.key];
                    }
                    else if (handled) {
                        this.interactions[interaction.key].updated = false;
                    }
                }
            }
        };
        return Manager;
    }());
    Multitouch.Manager = Manager;
    var Interaction = (function () {
        function Interaction(_key, _index, _event) {
            this.index = 0;
            this.ending = false;
            this.updated = false;
            this.key = _key;
            this.index = _index;
            this.startEvent = new EventWrapper(_event, this.index);
            this.currentEvent = new EventWrapper(_event, this.index);
            this.targetElm = this.startEvent.event.target;
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
        Interaction.prototype.update = function (_event) {
            this.previousEvent = this.currentEvent;
            this.currentEvent = new EventWrapper(_event, this.index);
            this.updated = true;
        };
        return Interaction;
    }());
    var Position = (function () {
        function Position(_pageX, _pageY) {
            this.pageX = _pageX;
            this.pageY = _pageY;
        }
        return Position;
    }());
    Multitouch.Position = Position;
    var EventWrapper = (function () {
        function EventWrapper(_event, _index) {
            this.index = 0;
            this.time = performance.now();
            this.event = _event;
            this.index = _index;
            this.position = this.getEventPostion();
        }
        EventWrapper.prototype.getEventPostion = function () {
            if (event instanceof TouchEvent) {
                if (event.touches.item(this.index)) {
                    return new Position(event.touches.item(this.index).pageX, event.touches.item(this.index).pageY);
                }
                else if (event.changedTouches.item(this.index)) {
                    return new Position(event.changedTouches.item(this.index).pageX, event.changedTouches.item(this.index).pageY);
                }
            }
            else if (event instanceof MouseEvent) {
                return new Position(event.pageX, event.pageY);
            }
        };
        return EventWrapper;
    }());
})(Multitouch || (Multitouch = {}));
(function (d) {
    var mt = new Multitouch.Manager(d);
    mt.init();
})(document);
