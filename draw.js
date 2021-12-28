// with help from https://www.geeksforgeeks.org/how-to-draw-with-mouse-in-html-5-canvas/ and https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas

window.addEventListener('load', ()=>{
    resetAll();
    document.querySelector('#resetBtn').
        addEventListener('click', (evt) => resetAll());
});

const canvas = document.querySelector('#sketchCanvas');
const ctx = canvas.getContext('2d');
const boxStroke = 'black';
const boxFill = '#ffffaa';

const box = {x: 160, y: 120, w: 320, h: 240};

// all points in paths that split vertically and horizontally
let vPoints=[], hPoints=[];
let vPointLeftCutIndex=0, vPointRightCutIndex=0;
let leftCut=undefined, rightCut=undefined;
let vPath, hPath;
let vPointEqs;
let xgap=0, ygap=0;
let tesselxoffset=0, tesselyoffset=0;

// Stores the initial position of the cursor
let coord = {x:0 , y:0}; 

// current step in the process
let currentStep = 1;

// colour palettes
const palettes = {'rainbow': [ 'red', 'orange' , 'yellow', 'green', 'blue', 'indigo', 'violet'],
                  'yellow-grey': ['#555555', '#888888', '#ffffaa' ],
                  'flame': ['red', 'orange', 'gold'],
                  'random': undefined
                 }

let colours = [];

function genRandomColours(procedure) {
    let colours = [];
    if (procedure == 'random') {
        ncol = 3 + Math.floor(Math.random() * 4);
        for (k=0; k <ncol ; k++) {
            colours.push('#' +
              Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
        }
    } else if (procedure == 'smart-random') {
        colours = genSmartColours(2 + Math.floor(Math.random() * 6));
    } else if (procedure == 'random-shades') {
        colours = genShades(3 + Math.floor(Math.random() * 6));
    }
    return colours;
}

function updateColours() {
    colours = [];
    let selectBtn = document.querySelector('#select-palette');
    colours = palettes[selectBtn.value];
    if (colours === undefined) {
        colours = genRandomColours(selectBtn.value);
    }
    tessellateToMain();
}

function inBox(coords) {
    return coords.x >= box.x && coords.x <= box.x + box.w &&
        coords.y >= box.y && coords.y <= box.y + box.h;
}

function resetAll() {
    if (currentStep > 2) {
        let outputImg = document.querySelector('#output');
        document.getElementById('sketchArea').removeChild(outputImg);
        document.getElementById('sketchArea').appendChild(canvas);
    }
    document.addEventListener('mousedown', startPainting);
    document.addEventListener('mouseup', stopPainting);
    document.addEventListener('mousemove', sketch);
    document.querySelector('#select-palette').removeEventListener(
        'change', updateColours);
    document.querySelector('#randomBtn').removeEventListener(
        'click', updateColours);
    document.querySelector('#save').addEventListener('click', tessellateToSave);
    addTouchListeners();
    currentStep = 1;
    init();
}

function init() {
    resetCanvas();
    // reset instructions
    let instr1 = document.querySelector('#instr1');
    let instr2 = document.querySelector('#instr2');
    let instr3 = document.querySelector('#instr3');
    if (currentStep == 1) {
        vPoints = [];
        hPoints = [];
        vPointEqs = [];
        vPath = [];
        hPath = [];
        instr1.style.color = 'blue';
        instr2.style.color = '#cccccc';
        instr3.style.color = '#cccccc';
        document.querySelector('#save').disabled = true;
    } else if (currentStep == 2) {
        hPath = [];
        hPoints = [];
        instr2.style.color = 'blue';
        instr1.style.color = '#cccccc';
        // draw current shape here
        ctx.fillStyle = boxFill;
        ctx.strokeStyle = boxStroke;
        ctx.fill(vPath);
        ctx.stroke(vPath);
        
    } else if (currentStep == 3) {
        //create final thingy
        updateColours();
        document.querySelector('#select-palette').addEventListener(
            'change', updateColours);
        document.querySelector('#randomBtn').addEventListener(
            'click', updateColours);
        document.removeEventListener('mousedown', startPainting);
        document.removeEventListener('mouseup', stopPainting);
        document.removeEventListener('mousemove', sketch);
        document.querySelector('#save').disabled = false;
    }
}

function tessellateToMain() {
    tessellate(canvas, 4);
    // make the image draggable
    document.getElementById('sketchArea').innerHTML =
        ['<img id="output" class="droppedImage" src="',
         canvas.toDataURL(),
         '" title="tessellated"/>'].join('');
}

function tessellateToSave() {
    let canv = document.createElement('canvas');
    canv.width = 3840;
    canv.height = 2160;
    tessellate(canv, 2);
    let link = document.createElement('a');
    link.download = 'tessellation.png';
    link.href = canv.toDataURL();
    link.click();
}

// calculates the index intervals in order to make a double loop that covers
// the canvas with that path, given that the path is offset by xgap every time
// we go down one cell
function calculateLoopIntervals(can, pathWidth, pathHeight, xgap) {
    let jmax = Math.ceil(can.height / pathHeight);
    let offsetAtBottom = xgap * jmax;
    let iExtra = Math.ceil(offsetAtBottom / pathWidth);
    let imin = Math.min(-3, -iExtra);
    let imaxBase = 1 + Math.ceil(can.width / pathWidth);
    let imax = Math.max(imaxBase, imaxBase - iExtra);
    return {imin: imin, imax: imax, jmin: -1, jmax: jmax};
}

// tessellate given canvas with hPath using given reduction 
function tessellate(canv, reduction) {
    let context = canv.getContext('2d');
    context.clearRect(0, 0, canv.width, canv.height);
    let p = new Path2D();
    let m = new DOMMatrix();
    m.scaleSelf(1/reduction, 1/reduction);
    p.addPath(hPath, m);
    let xstep = (xgap)/(reduction);
    let ystep = (box.h)/(reduction);
    let x=0, y=0;
    let col = 0;
    bounds = calculateLoopIntervals(canv,
                                    box.w / reduction,
                                    box.h / reduction,
                                    xgap / reduction);
    for(i=bounds.imin; i < bounds.imax; i++) {
        for(j=bounds.jmin; j < bounds.jmax; j++) {
            context.save();
            context.translate(box.w/reduction*i + xstep*j, ystep*j);
            context.stroke(p);
            context.fillStyle = colours[col];
            col = (col + 1) % colours.length;
            context.fill(p);
            // context.strokeText(i + ", " + j, box.w/reduction, box.h/reduction);
            context.restore();
        }
    }
}

function resetCanvas() {
    // reset canvas
    ctx.fillStyle = 'white';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
//    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    if (currentStep == 1) {
        ctx.fillStyle = boxFill;
        ctx.strokeStyle = boxStroke;
        ctx.fillRect(canvas.width/4, canvas.height/4,
                     canvas.width/2, canvas.height/2);
        ctx.strokeRect(canvas.width/4, canvas.height/4,
                       canvas.width/2, canvas.height/2);
    }
}

function pointsToPath(points) {
    let p = new Path2D();
    p.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(t => p.lineTo(t.x, t.y));
    return p;
}

function transToStep2() {
    // update instructions
    let instr1 = document.querySelector('#instr1');
    let instr2 = document.querySelector('#instr2');
    instr1.style.color = '#cccccc';
    instr2.style.color = 'blue';
    // visual transition of the canvas
    // path 1: right half will become left half
    let p1 = pointsToPath(vPoints.concat([{x:box.x + box.w, y:box.y + box.h},
                                        {x:box.x + box.w, y:box.y}]));
    let p2 = pointsToPath(vPoints.concat([{x:box.x, y:box.y + box.h},
                                        {x:box.x, y:box.y}]));
    p1.closePath();
    p2.closePath();
    // store the equation for each segment induced by vPoints
    for (i=0; i<vPoints.length-1; i++) {
        vPointEqs.push(lineEquation(vPoints[i], vPoints[i+1]));
    }
    // also store everything in one path for convenience
    vPath = new Path2D();
    let m1 = new DOMMatrix();
    m1.translateSelf(-box.w / 2, 0);
    let m2 = new DOMMatrix();
    m2.translateSelf(box.w / 2, 0);
    vPath.addPath(p1, m1);
    vPath.addPath(p2, m2);
    // now we animate the transition
    let td = .8; // transition duration in seconds
    let nframes = 60; // number of transition frames
    let offsets = [];
    var frames = 0;
    for(x=1; x <= nframes; x++) {
        offsets.push(Math.round((box.w/2) * Math.sin(x*(Math.PI/2) / nframes)));
    }
    ctx.fillStyle = boxFill;
    ctx.strokeStyle = boxStroke;
    let interval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frames += 1;
        let offset = offsets[frames];
        ctx.save();
        ctx.translate(-offset, 0);
        ctx.stroke(p1);
        ctx.fill(p1);
        ctx.translate(2 * offset, 0);
        ctx.stroke(p2);
        ctx.fill(p2);
        ctx.restore();
        if (frames >= nframes-1) {
            clearInterval(interval);
            // update current step
            currentStep = 2;
            init();
        }
    },
                               1000 * td/nframes);
}

function transToStep3() {
    // update instructions
    let instr2 = document.querySelector('#instr2');
    let instr3 = document.querySelector('#instr3');
    instr2.style.color = '#cccccc';
    instr3.style.color = 'blue';
    // visual transition of the canvas
    // path 1: bottom half (which will become top half)
    let bPoints = [];
    bPoints.push(leftCut);
    hPoints.forEach( p => bPoints.push(p));
    vPoints.slice(vPointRightCutIndex+1).forEach ( p=>
        bPoints.push({x: p.x + box.w/2, y: p.y}));
    vPoints.slice(vPointLeftCutIndex+1).reverse().forEach( p =>
        bPoints.push({x: p.x - box.w/2, y: p.y}));
    bPoints.push(leftCut);
    let bPath = pointsToPath(bPoints);
    // path 2: top half (which will become bottom half)
    let tPoints = []
    tPoints.push(leftCut);
    hPoints.forEach( p => tPoints.push(p));
    vPoints.slice(0, vPointRightCutIndex+1).reverse().forEach ( p=>
        tPoints.push({x: p.x + box.w/2, y: p.y}));
    vPoints.slice(0, vPointLeftCutIndex+1).forEach( p =>
        tPoints.push({x: p.x - box.w/2, y: p.y}));
    tPoints.push(leftCut);
    let tPath = pointsToPath(tPoints);
    // also store everything in one path for convenience
    xgap = vPoints[vPoints.length-1].x - vPoints[0].x;
    ygap = hPoints[hPoints.length-1].y - hPoints[0].y;

    tesselxoffset = hPoints[0].x - hPoints[hPoints.length-1].x;
    tesselyoffset = hPoints[0].y - hPoints[hPoints.length-1].y;

    hPath = new Path2D();
    let mb = new DOMMatrix();
    mb.translateSelf(-xgap/2, -box.h/2);
    let mt = new DOMMatrix();
    mt.translateSelf(xgap/2, box.h/2);
    hPath.addPath(bPath, mb);
    hPath.addPath(tPath, mt);
    // now we animate the transition
    let td = .8; // transition duration in seconds
    let nframes = 60; // number of transition frames
    let xoffsets=[], yoffsets=[];
    var frames = 0;
    for(x=1; x <= nframes; x++) {
        xoffsets.push(Math.round((-xgap/2) *Math.sin(x*(Math.PI/2) / nframes)));
        yoffsets.push(Math.round((box.h/2) *Math.sin(x*(Math.PI/2) / nframes)));
    }
    ctx.fillStyle = boxFill;
    ctx.strokeStyle = boxStroke;
    let interval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frames += 1;
        let xoffset = xoffsets[frames];
        let yoffset = yoffsets[frames];
        ctx.save();
        ctx.translate(xoffset, -yoffset);
        ctx.stroke(bPath);
        ctx.fill(bPath);
        ctx.translate(-2 * xoffset, 2 * yoffset);
        ctx.stroke(tPath);
        ctx.fill(tPath);
        ctx.restore();
        if (frames >= nframes-1) {
            clearInterval(interval);
            // update current step
            currentStep = 3;
            init();
        }
    },
                               1000 * td/nframes);
}

// we use these states to determine whether we are drawing the right
// kind of line
const states = {
    NONE: 'none',
    PRECUT: 'pre-cut',
    CUTTING: 'cutting',
    FINISHED: 'finished',
    DOOMED: 'doomed' // case where we already know we cannot partition
                     // vertically with the current line
};

let state = states.NONE;

// are we painting?
let paint = false;

// store mouse coordinates as canvas coordinates
function updateCoords(event){
    let rect = canvas.getBoundingClientRect();
    coord.x = event.clientX - rect.left;
    coord.y = event.clientY - rect.top;
}

function startPainting(event){
    if (event.button != 0) return; // we only care about left button
    paint = true;
    updateCoords(event);
    if (currentStep == 1 && inBox(coord)) {
        state = states.DOOMED;
    } else if (currentStep == 2 && ctx.isPointInPath(vPath, coord.x, coord.y)) {
        state = states.DOOMED;
    } else {
        state = states.PRECUT;
    }
}

function stopPainting(){
    paint = false;
    if (state !== states.FINISHED) {
        init();
    }
    state = states.NONE;
}

// return the equation of a line in the form of a,b,c values for equations of
// the form ax + by + c = 0
function lineEquation(p1, p2) {
    // special case 1: horizontal line
    if (p1.y == p2.y) {
        return {a:0, b:1, c:-p1.y};
    }
    // special case 2: vertical line
    if (p1.x == p2.x) {
        return {a:1, b:0, c:-p1.x};
    }
    // general case
    return {a: p1.y-p2.y, b: p2.x-p1.x, c: p1.x * p2.y - p2.x * p1.y};
}

// equation of top and bottom box boundaries
const topEq = {a:0, b:1, c:-box.y};
const bottomEq = {a:0, b:1, c:-(box.y+box.h)};

// returns x value for eq1 at y value yval
function intersectX(eq1, yval) {
    if (eq1.a == 0) {
        return undefined;
    } else {
        return (- eq1.b * yval - eq1.c) / eq1.a;
    }
}

// returns the point where two lines intersect
function intersect(eq1, eq2) {
    if ( (eq1.a == 0 && eq2.a == 0) || (eq1.b == 0 && eq2.b == 0) ) {
        return undefined;
    } else {
        let y = (eq1.a * (eq1.c - eq2.c) + eq1.c * (eq2.a - eq1.a)) /
            (eq1.a * (eq2.b - eq1.b) + eq1.b * (eq1.a - eq2.a));
        let x;
        if (eq1.a != 0) {
            x = (-eq1.c - eq1.b * y) / eq1.a;
        } else {
            x = (-eq2.c - eq2.b * y) / eq2.a;
        }
        return {x:x, y:y};
    }
}

function sketch(event){
    if (!paint) return;
    // case where we are in the middle of a transition
    if (paint && state == states.FINISHED) return;
    let bCoords = {x:coord.x, y:coord.y};
    ctx.beginPath();
    ctx.moveTo(coord.x, coord.y);
    updateCoords(event);
    ctx.lineTo(coord.x , coord.y);
    ctx.stroke();
    // update state etc
    let eq = lineEquation(bCoords, coord);
    // are we slicing horizontally or vertically?
    if (currentStep == 1) {
        sketchVertical(bCoords, eq);
    } else {
        sketchHorizontal(bCoords, eq);
    }
}

function sketchVertical(bCoords, eq) {
    // case 1: did we just start cutting from top?
    if (state == states.PRECUT && inBox(coord) && bCoords.y < coord.y) {
        // calculate intersection of this stroke with top box boundary
        let x = intersectX(eq, box.y);
        if (x !== undefined && x >= box.x && x <= box.x+box.w) {
            vPoints.push({x: x, y: box.y});
            state = states.CUTTING;
            // draw visual indication of cutting point
            ctx.beginPath();
            ctx.arc(x, box.y, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = '#ff0000aa';
            ctx.fill();
        } else { // we went in the wrong way
            state = states.DOOMED;
        }
    } else if (state == states.CUTTING && ! inBox(coord)
               && bCoords.y < coord.y) {
        // case 2: did we just complete a cut?
        // calculate intersection of this stroke with bottom box boundary
        let x = intersectX(eq, box.y + box.h);
        if (x !== undefined && x >= box.x && x <= box.x+box.w) {
            vPoints.push({x: x, y: box.y + box.h});
            state = states.FINISHED;
            // draw visual indication of cutting point
            ctx.beginPath();
            ctx.arc(x, box.y + box.h, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = '#ff0000aa';
            ctx.fill();
            // move to step 2
            transToStep2();
        } else { // we went out the wrong way
            state = states.DOOMED;
        }
    } else if (state == states.CUTTING) {
        vPoints.push({x: coord.x, y: coord.y});
    } else { // other cases where we're doomed
        if (state != states.FINISHED && inBox(bCoords) != inBox(coord)) {
            state = states.DOOMED;
        }
    }
}

function sketchHorizontal(bCoords, eq) {
    // case 1: did we just start cutting from left?
    if (state == states.PRECUT && ctx.isPointInPath(vPath, coord.x, coord.y)) {
        // we need to check if we just crossed one segment on the left
        // this corresponds to vPoints translated to the left
        let cutp = intersectWithPoints({x: bCoords.x + box.w/2, y: bCoords.y},
                                       {x: coord.x + box.w/2, y: coord.y},
                                       vPoints);
        if (cutp !== undefined) {
            let realp = {x: cutp.point.x - box.w/2, y: cutp.point.y};
            vPointLeftCutIndex = cutp.index;
            hPoints.push(realp);
            state = states.CUTTING;
            leftCut = realp;
            ctx.beginPath();
            ctx.arc(realp.x, realp.y, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = '#ff0000aa';
            ctx.fill();
        } else {
            state = states.DOOMED;
        }
    } else if (state == states.CUTTING &&
               ! ctx.isPointInPath(vPath, coord.x, coord.y)) {
        // case 2: did we just complete a cut?
        // we need to check if we just crossed one segment on the right
        // this corresponds to vPoints translated to the right
        let cutp = intersectWithPoints({x: bCoords.x - box.w/2, y: bCoords.y},
                                       {x: coord.x - box.w/2, y: coord.y},
                                       vPoints);
        if (cutp !== undefined) {
            let realp = {x: cutp.point.x + box.w/2, y: cutp.point.y};
            vPointRightCutIndex = cutp.index;
            hPoints.push(realp);
            state = states.FINISHED;
            rightCut = realp;
            ctx.beginPath();
            ctx.arc(realp.x, realp.y, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = '#ff0000aa';
            ctx.fill();
            // move to step 2
            transToStep3();
        } else { // we went out the wrong way
            state = states.DOOMED;
        }
    } else if (state == states.CUTTING) {
        // case 3: in the middle of a cut
        hPoints.push({x: coord.x, y: coord.y});
    } else {
        // other cases where we are doomed
        if (state != states.FINISHED &&
            ctx.isPointInPath(vPath, coord.x, coord.y) !=
            ctx.isPointInPath(vPath, bCoords.x, bCoords.y)) {
            state = states.DOOMED;
        }
    }
}

// chjecks if the segment defined by (p1, p2) intersects with any of the
// consecutive segments induced by points
// returns the coordinates of intersection or undefined
function intersectWithPoints(p1, p2, points) {
    let eq1 = lineEquation(p1, p2);
    for(i=0; i<vPointEqs.length; i++) {
        let tp = intersect(eq1, vPointEqs[i]);
        if (tp !== undefined) {
            // we need to check that ptmp is on both segments,
            // otherwise it's not a crossing
            let p3=vPoints[i], p4=vPoints[i+1];
            let x1=Math.min(p1.x, p2.x), x2=Math.max(p1.x, p2.x),
                y1=Math.min(p1.y, p2.y), y2=Math.max(p1.y, p2.y),
                x3=Math.min(p3.x, p4.x), x4=Math.max(p3.x, p4.x),
                y3=Math.min(p3.y, p4.y), y4=Math.max(p3.y, p4.y);
            if ( tp.x < x1 || tp.x < x3 || tp.x > x2 || tp.x > x4 ||
                 tp.y < y1 || tp.y < y3 || tp.y > y2 || tp.y > y4 ) {
                continue;
            } else {
                return {index: i, point: tp};
            }
        }
    }
    return undefined;
}

function plotPoints(points) {
    ctx.fillStyle = '#0000ffaa';
    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI, false);
        ctx.fill();
    });
}
