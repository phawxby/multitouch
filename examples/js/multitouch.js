var Multitouch;
(function (Multitouch) {
    var Manager = (function () {
        function Manager(document) {
            var _this = this;
            this.document = document;
            this.interactions = {};
            this.setupDragHandler = function () {
                _this.document.addEventListener("mt-drag", function (e) {
                    var target = e.target;
                    if (target.matches('.mt-draggable')) {
                        var dragTarget = _this.closestParent(target, ".mt-draggable-target") || target;
                        var styleVals = _this.getStyleValues(dragTarget);
                        if (!styleVals.isPositioned) {
                            dragTarget.style.position = "relative";
                        }
                        dragTarget.style.top = (styleVals.top + e.detail.y) + "px";
                        dragTarget.style.left = (styleVals.left + e.detail.x) + "px";
                    }
                });
            };
            this.setupScaleHandler = function () {
                _this.document.addEventListener("mt-scale", function (e) {
                    var target = e.target;
                    if (target.matches('.mt-scaleable')) {
                        var scaleTarget = _this.closestParent(target, ".mt-scaleable-target") || target;
                        var styleVals = _this.getStyleValues(scaleTarget);
                        if (!styleVals.isPositioned) {
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
            this.getStyleValues = function (target) {
                var compStyle;
                return {
                    isPositioned: !(!target.style.position && !(compStyle = window.getComputedStyle(target)).position),
                    top: parseInt(target.style.top || (compStyle || (compStyle = window.getComputedStyle(target))).top) || 0,
                    left: parseInt(target.style.left || (compStyle || (compStyle = window.getComputedStyle(target))).left) || 0,
                    width: parseInt(target.style.width || (compStyle || (compStyle = window.getComputedStyle(target))).width) || 0,
                    height: parseInt(target.style.height || (compStyle || (compStyle = window.getComputedStyle(target))).height) || 0
                };
            };
            /**
             * Finds the closest parent element using the specified selector.
             */
            this.closestParent = function (element, selector) {
                var target = element, foundTarget = false;
                while (!(foundTarget = target.matches(selector)) && target.parentElement !== null) {
                    target = target.parentElement;
                }
                if (foundTarget) {
                    return target;
                }
            };
            document.addEventListener("touchstart", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("touchend", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("touchcancel", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("touchmove", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("mousedown", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("mouseup", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("mousemove", function (evt) { _this.handleInteraction(evt); });
            document.addEventListener("click", function (evt) { _this.handleInteraction(evt); });
            this.setupDragHandler();
            this.setupScaleHandler();
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
                if (evt.type.indexOf("click") >= 0) {
                    if (target.dataset["passclick"] === true.toString()) {
                        target.dataset["passclick"] = false.toString();
                        return;
                    }
                    else {
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
            if (interactionsArr.length > 0) {
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
                                // The plan is to get the left/top most point and based on their previous event set the x/y
                                // position change (See the drag event below)
                                // Then get the right/bottom most point and based on their previous event set the width/height 
                                // change
                                // Emiting based on change allows us to be very relative with our data and it would work for relative or absolute
                                // elements
                                var previousPosA = interaction.previousEvent ? interaction.previousEvent.position : interaction.currentEvent.position;
                                var currentPosA = interaction.currentEvent.position;
                                var previousPosB = matchingScaleInteraction.previousEvent ? matchingScaleInteraction.previousEvent.position : matchingScaleInteraction.currentEvent.position;
                                var currentPosB = matchingScaleInteraction.currentEvent.position;
                                if (previousPosA && currentPosA && previousPosB && currentPosB) {
                                    var xDiffA = currentPosA.pageX - previousPosA.pageX;
                                    var yDiffA = currentPosA.pageY - previousPosA.pageY;
                                    var xDiffB = currentPosB.pageX - previousPosB.pageX;
                                    var yDiffB = currentPosB.pageY - previousPosB.pageY;
                                    var xDiff_1 = Math.ceil(currentPosA.pageX < currentPosB.pageX ? xDiffA : xDiffB);
                                    var yDiff_1 = Math.ceil(currentPosA.pageY < currentPosB.pageY ? yDiffA : yDiffB);
                                    var wDiff = Math.ceil((currentPosA.pageX < currentPosB.pageX ? xDiffB : xDiffA) + (xDiff_1 * -1));
                                    var hDiff = Math.ceil((currentPosA.pageY < currentPosB.pageY ? yDiffB : yDiffA) + (yDiff_1 * -1));
                                    var evt = new CustomEvent("mt-scale");
                                    evt.initCustomEvent("mt-scale", true, true, { "x": xDiff_1, "y": yDiff_1, "w": wDiff, "h": hDiff });
                                    interaction.targetElm.dispatchEvent(evt);
                                }
                                handled = true;
                            }
                        }
                        if (!handled && interaction.closestDragElm && interaction.currentEvent && !interaction.ending) {
                            if (interaction.previousEvent) {
                                var previousPos = interaction.previousEvent.position;
                                var currentPos = interaction.currentEvent.position;
                                if (previousPos && currentPos) {
                                    var xDiff = Math.ceil(currentPos.pageX - previousPos.pageX);
                                    var yDiff = Math.ceil(currentPos.pageY - previousPos.pageY);
                                    var evt = new CustomEvent("mt-drag");
                                    evt.initCustomEvent("mt-drag", true, true, { "x": xDiff, "y": yDiff });
                                    interaction.targetElm.dispatchEvent(evt);
                                }
                            }
                            handled = true;
                        }
                        if (!handled && interaction.targetElm) {
                            if (interaction.startEvent && interaction.currentEvent && interaction.ending) {
                                if (interaction.currentEvent.time - interaction.startEvent.time < 300) {
                                    var previousPos = interaction.startEvent.position;
                                    var currentPos = interaction.currentEvent.position;
                                    // We could easily use this x-y diff data to be able to 
                                    // emit swipe events and what not too
                                    if (previousPos && currentPos) {
                                        var xDiff_2 = currentPos.pageX - previousPos.pageX;
                                        xDiff_2 = xDiff_2 < 0 ? xDiff_2 * -1 : 0;
                                        var yDiff_2 = currentPos.pageY - previousPos.pageY;
                                        yDiff_2 = yDiff_2 < 0 ? yDiff_2 * -1 : 0;
                                        if (xDiff_2 < 30 && yDiff_2 < 30) {
                                            handled = true;
                                            interaction.targetElm.dataset["passclick"] = true.toString();
                                            interaction.targetElm.click();
                                        }
                                    }
                                }
                            }
                        }
                        if (handled) {
                            interaction.currentEvent.event.preventDefault();
                            interaction.currentEvent.event.stopImmediatePropagation();
                            this.interactions[interaction.key].updated = false;
                        }
                        if (interaction.ending) {
                            delete this.interactions[interaction.key];
                        }
                    }
                }
            }
        };
        return Manager;
    }());
    Multitouch.Manager = Manager;
    var Interaction = (function () {
        function Interaction(key, index, _event) {
            this.key = key;
            this.index = index;
            this.ending = false;
            this.updated = true;
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
    var EventWrapper = (function () {
        function EventWrapper(event, index) {
            this.event = event;
            this.index = index;
            this.time = performance.now();
            this.position = this.getEventPostion();
        }
        EventWrapper.prototype.getEventPostion = function () {
            if (event instanceof TouchEvent) {
                for (var i = 0; i < event.touches.length; i++) {
                    var touch = event.touches[i];
                    if (touch.identifier == this.index) {
                        return {
                            pageX: touch.pageX,
                            pageY: touch.pageY
                        };
                    }
                }
                for (var i = 0; i < event.changedTouches.length; i++) {
                    var touch = event.changedTouches[i];
                    if (touch.identifier == this.index) {
                        return {
                            pageX: touch.pageX,
                            pageY: touch.pageY
                        };
                    }
                }
            }
            else if (event instanceof MouseEvent) {
                return {
                    pageX: event.pageX,
                    pageY: event.pageY
                };
            }
        };
        return EventWrapper;
    }());
})(Multitouch || (Multitouch = {}));
(function (d) {
    var mt = new Multitouch.Manager(d);
})(document);
