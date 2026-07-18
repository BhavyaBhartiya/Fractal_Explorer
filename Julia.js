var header = document.querySelector('h3')
var canvas = document.querySelector('canvas')
var dropdown = document.getElementById("cars");
var ctx = canvas.getContext('2d')
var height = Math.floor(((85 * window.innerHeight) / 100))
var width = 0
for (let h = 100; true; h -= 5) {
    width = Math.floor(((h * window.innerWidth) / 100))
    if (width <= (height + 50)) {
        break;
    }
}
var center_align = 300 + ((window.innerWidth - 300 - width) / 2)
document.getElementById('canv').style.left = center_align + 'px'
var mouseX = 0
var mouseY = 0
var clicked = false
var pan_real = 0
var pan_imaginary = 0
var zoom = 1
var constant_real = 0.280
var constant_imaginary = 0.010
var maxIterations = 256
var img = ctx.createImageData(width, height)
var data = img.data
var buf32 = new Uint32Array(img.data.buffer)
var dragging = false
var lastMouseX = 0
var lastMouseY = 0
var theme = 0

const THREADS = Math.max(1, (navigator.hardwareConcurrency || 4)-1)
const CHUNK_HEIGHT = 64

let workers = []
let pendingjobs = []
let jobsremaining = 0

var xcoords = new Float64Array(width)
var ycoords = new Float64Array(height)
canvas.width = width
canvas.height = height

const AURORA = [
    [0, 0, 0],
    [0, 0, 96],
    [0, 32, 192],
    [64, 0, 255],
    [160, 0, 255],
    [255, 0, 255],
    [255, 96, 192],
    [255, 160, 0],
    [255, 224, 0],
    [128, 255, 0],
    [0, 255, 96],
    [0, 255, 255],
    [0, 128, 255],
    [0, 0, 128],
    [0, 0, 0]
]

const FIRE = [
    [0, 0, 0],
    [32, 0, 0],
    [96, 0, 0],
    [160, 16, 0],
    [224, 48, 0],
    [255, 96, 0],
    [255, 160, 0],
    [255, 224, 64],
    [255, 255, 255]
];

function zoomin() {
    zoom *= 2
    update()
}

function zoomout() {
    zoom /= 2
    update()
}

function sescape(i, pr2, pi2) {
    return i + 1 - Math.log(Math.log(pr2 + pi2)*0.5) / Math.LN2
}

function lerp(a, b, t) {
    return a + (b - a) * t
}

function palettesample(t, palette) {
    t = ((t % 1) + 1) % 1
    let n = palette.length
    let x = t * n
    let idx = Math.floor(x)
    let f = x - idx
    let c0 = palette[idx]
    let c1 = palette[(idx + 1) % palette.length]
    return [
        Math.round(lerp(c0[0], c1[0], f)),
        Math.round(lerp(c0[1], c1[1], f)),
        Math.round(lerp(c0[2], c1[2], f))]
}

function RGBA(r, g, b) {
    return (255 << 24) | (b << 16) | (g << 8) | r
}

function hsvrgb(h, s, v){
    h = ((h%1)+1)%1
    let i = Math.floor(h*6)
    let f = h*6-i
    let p = v*(1-s)
    let q = v*(1-f*s)
    let t = v*(1-(1-f)*s)

    let r,g,b;
    switch(i%6){
        case 0: r = v
                g = t
                b = p
            break
        case 1: r = q
                g = v
                b = p
            break
        case 2: r = p
                g = v
                b = t
            break
        case 3: r = p
                g = q
                b = v
            break
        case 4: r = t
                g = p
                b = v
            break
        case 5: r = v
                g = p
                b = q
            break

    }
    return [
        Math.round(r*255),
        Math.round(g*255),
        Math.round(b*255)
    ]
}

function buildcoordtable(){
    xcoords = new Float64Array(width)
    ycoords = new Float64Array(height)

    let invertedzoom = 1/zoom
    let xstep = 2/(width*zoom)
    let ystep = 2/(height*zoom)

    for(let x = 0; x<width;x++){
        xcoords[x] = pan_real + invertedzoom - x*xstep
    }

    for(let y = 0; y < height; y++){
        ycoords[y] = pan_imaginary + invertedzoom - y*ystep
    }
}

function schedulejobs(){
    for(const worker of workers){
        
        if(worker.busy)
            continue
        
        if(pendingjobs.length == 0)
            return
        
        const job = pendingjobs.shift()

        worker.busy = true

        worker.postMessage(job)
    }
}

function createWorkers(){
    for(let i = 0; i < THREADS; i++){
        const worker = new Worker(Juliaworker.js)
        worker.busy = false

        worker.onmessage = function (e) {
            const result = e.data

            buf32.set{
                new Uint32Array(result.buffer),
                result.startY*width
            }

            worker.busy = false
            jobsremaining--

            schedulejobs()

            if(jobsremaining == 0){
                ctx.putImageData(img, 0, 0)
            }
        }

        workers.push(worker)
    }
}

function draw() {
    pendingjobs.length = 0

    for(let startY = 0; startY < height; startY += CHUNK_HEIGHT){
        pendingjobs.push({
            startY,
            endY: Math.min(startY + CHUNK_HEIGHT, height),
            width,
            height,
            xcoords,
            ycoords,
            constant_real,
            constant_imaginary,
            maxIterations,
            theme
        })
    }
}

function update() {

    header.innerHTML = constant_real.toString() + ' + ' + constant_imaginary.toString() + 'i at ' + zoom + 'X'
    buildcoordtable()
    draw()

}

function size_change() {
    height = Math.floor(((85 * window.innerHeight) / 100))
    for (let h = 100; true; h -= 5) {
        width = Math.floor(((h * window.innerWidth) / 100))
        if (width <= (height + 50)) {
            break;
        }
    }
    center_align = 300 + ((window.innerWidth - 300 - width) / 2)
    document.getElementById('canv').style.left = center_align + 'px'
    canvas.width = width
    canvas.height = height
    img = ctx.createImageData(width, height)
    data = img.data
    buf32 = new Uint32Array(img.data.buffer)
    update()
}

function generate() {
    clicked = true
    if (document.getElementById("MI").value !== null) {
        if (document.getElementById("MI").value.trim() !== "") {
            maxIterations = parseFloat(document.getElementById("MI").value);
        }
    }
    if (document.getElementById("IC").value !== null) {
        if (document.getElementById("IC").value.trim() !== "") {
            constant_imaginary = parseFloat(document.getElementById("IC").value);
        }
    }

    if (document.getElementById("RC").value !== null) {
        if (document.getElementById("RC").value.trim() !== "") {
            constant_real = parseFloat(document.getElementById("RC").value);
        }
    }
    zoom = 1
    pan_real = 0
    pan_imaginary = 0
    update();
}

function move(event) {

    if (dragging) {

        let dx = event.clientX - lastMouseX;
        let dy = event.clientY - lastMouseY;

        pan_real += dx * (2 / (width * zoom));
        pan_imaginary += dy * (2 / (height * zoom));

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        update();
        return;
    }

    if (clicked) {
        return
    }

    mouseX = event.clientX - canvas.offsetLeft
    mouseY = event.clientY - canvas.offsetTop

    constant_real = ((mouseX / width) * 2) - 1
    constant_imaginary = 1 - ((mouseY / height) * 2)
    constant_real = (constant_real / zoom) + pan_real
    constant_imaginary = (constant_imaginary / zoom) + pan_imaginary
    constant_real = Math.round(constant_real * 1000) / 1000
    constant_imaginary = Math.round(constant_imaginary * 1000) / 1000

    update()

}

var redraw = false
canvas.addEventListener('pointermove', (e) => {
    if (!redraw) {
        redraw = true
        requestAnimationFrame(() => {
            move(e)
            redraw = false
        })
    }
})
canvas.addEventListener('mousedown', (e) => {
    dragging = true
    lastMouseX = e.clientX
    lastMouseY = e.clientY
})
window.addEventListener('mouseup', (e) => {
    dragging = false
})
window.addEventListener("resize", size_change);
dropdown.addEventListener("change", function(event) {
    const selectedValue = event.target.value;
    theme=selectedValue
    update()
});
createWorkers()
update()