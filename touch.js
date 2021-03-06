// stolen from http://stackoverflow.com/questions/1517924/javascript-mapping-touch-events-to-mouse-events
function touchHandler(event) {
    var touches = event.changedTouches,
        first = touches[0],
        type = "";
    switch(event.type) {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type="mousemove"; break;        
        case "touchend":   type="mouseup"; break;
        default: return;
    }

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                  first.screenX, first.screenY, 
                                  first.clientX, first.clientY, false, 
                                  false, false, false, 0/*left*/, null);
    first.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
}

window.addEventListener('load', ()=>{
    addTouchListeners()
});

function addTouchListeners() {
    let doc = canvas;
    doc.addEventListener("touchstart", touchHandler, true);
    doc.addEventListener("touchmove", touchHandler, true);
    doc.addEventListener("touchend", touchHandler, true);
    doc.addEventListener("touchcancel", touchHandler, true);    
}
