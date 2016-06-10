var MultiTouch;
(function (MultiTouch) {
    var Manager = (function () {
        function Manager() {
            var _this = this;
            this.handleTouchStart = function (evt) {
                var host = _this.findParentHost(evt.target);
                if (host !== null) {
                    for (var i = 0; i < evt.changedTouches.length; i++) {
                        host.capturedTouches.push({ id: evt.changedTouches.item(i).identifier, start: Date.now() });
                    }
                    console.log("touch start on " + host.id);
                }
            };
            this.handleTouchEnd = function (evt) {
                for (var i = 0; i < evt.changedTouches.length; i++) {
                    var touch = _this.findTouch(evt.changedTouches.item(i).identifier);
                    if (touch === null)
                        return;
                    if (Date.now() - touch.thing.start <= 500) {
                        var event = document.createEvent("CustomEvent");
                        event.initEvent("Tap", true, true);
                        evt.target.dispatchEvent(event);
                    }
                }
            };
            /**
             * Finds the parent 'touch host' element from a target element
             */
            this.findParentHost = function (target) {
                var currentTarget = target;
                var attr;
                while (currentTarget !== document && (attr = currentTarget.attributes.getNamedItem("data-mthost")) === null) {
                    currentTarget = currentTarget.parentNode;
                }
                if (attr === null)
                    return null;
                return currentTarget;
            };
            /**
             * Finds the 'touch host' element and touch reg that contains the supplied identifier
             */
            this.findTouch = function (touchId) {
                for (var i = 0; i < _this.AllHosts.length; i++) {
                    var host = _this.AllHosts.item(i);
                    for (var j = 0; j < host.capturedTouches.length; j++) {
                        if (host.capturedTouches[j].id === touchId) {
                            return { host: host, thing: host.capturedTouches[j] };
                        }
                    }
                }
                return null;
            };
            //find all 'touch-host' elements and prepare the 'capturedTouches' array
            this.AllHosts = document.querySelectorAll("[data-mthost]");
            for (var i = 0; i < this.AllHosts.length; i++) {
                var host = this.AllHosts.item(i);
                host.capturedTouches = [];
                if (host.id === "" || host.id === null) {
                    host.id = "host-" + i;
                }
            }
            document.addEventListener("touchstart", function (evt) { return _this.handleTouchStart(evt); });
            document.addEventListener("touchend", function (evt) { return _this.handleTouchEnd(evt); });
            //document.addEventListener("touchcancel", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("touchmove", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("mousedown", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("mouseup", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("mousemove", function (evt) { _this.handleInteraction(evt); });
            //document.addEventListener("click", function (evt) { _this.handleInteraction(evt); });
        }
        return Manager;
    }());
    MultiTouch.Manager = Manager;
})(MultiTouch || (MultiTouch = {}));
document["touchManager"] = new MultiTouch.Manager();
document.addEventListener("Tap", function (evt) { console.log("Tap event on " + evt.target); });
