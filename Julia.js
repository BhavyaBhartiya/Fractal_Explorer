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

const THREADS = Math.max(1, (navigator.hardwareConcurrency || 4) - 1)
const CHUNK_HEIGHT = 64

let workers = []
let pendingjobs = []
let jobsremaining = 0

var xcoords = new Float64Array(width)
var ycoords = new Float64Array(height)
canvas.width = width
canvas.height = height

function zoomin() {
    zoom *= 2
    update()
}

function zoomout() {
    zoom /= 2
    update()
}

function buildcoordtable() {
    xcoords = new Float64Array(width)
    ycoords = new Float64Array(height)

    let invertedzoom = 1 / zoom
    let xstep = 2 / (width * zoom)
    let ystep = 2 / (height * zoom)

    for (let x = 0; x < width; x++) {
        xcoords[x] = pan_real + invertedzoom - x * xstep
    }

    for (let y = 0; y < height; y++) {
        ycoords[y] = pan_imaginary + invertedzoom - y * ystep
    }
}

function schedulejobs() {
    for (const worker of workers) {

        if (worker.busy)
            continue

        if (pendingjobs.length == 0)
            return

        const job = pendingjobs.shift()

        worker.busy = true

        worker.postMessage(job)
    }
}

function createWorkers() {
    for (let i = 0; i < THREADS; i++) {
        const worker = new Worker("Juliaworker.js")
        worker.busy = false

        worker.onmessage = function (e) {

            if (e.data.type === "coordsReady") {
                worker.coordsReady = true

                if (workers.every(w => w.coordsReady)) {
                    for (const w of workers) {
                        w.coordsReady = false
                    }
                    draw()
                }
                return
            }

            const result = e.data

            buf32.set(
                new Uint32Array(result.buffer),
                result.startY * width
            )

            worker.busy = false
            jobsremaining--

            schedulejobs()

            if (jobsremaining == 0) {
                ctx.putImageData(img, 0, 0)
            }
        }

        workers.push(worker)
    }
}

function draw() {
    pendingjobs.length = 0

    for (let startY = 0; startY < height; startY += CHUNK_HEIGHT) {
        pendingjobs.push({
            startY,
            endY: Math.min(startY + CHUNK_HEIGHT, height),
            width,
            constant_real,
            constant_imaginary,
            maxIterations,
            theme
        })
    }

    jobsremaining = pendingjobs.length
    schedulejobs();
}

function update() {

    header.innerHTML = constant_real.toString() + ' + ' + constant_imaginary.toString() + 'i at ' + zoom + 'X'
    buildcoordtable()
    for (const worker of workers) {
        worker.postMessage({
            type: "coords",
            xcoords,
            ycoords
        })
    }

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
            maxIterations = parseInt(document.getElementById("MI").value);
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
    constant_real = Math.round(constant_real * 10000) / 10000
    constant_imaginary = Math.round(constant_imaginary * 10000) / 10000

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
window.addEventListener('keydown', (e) => {
    if (e.key == 'Enter') {
        generate()
    }
    else if (e.key == '=' || (e.shiftKey && e.key == '+')) {
        zoomin()
    }
    else if (e.key == '-') {
        zoomout()
    }
    else if (e.altKey && (e.key == 'w' || e.key == 'W')) {
        pan_imaginary += 5 * (2 / (height * zoom));
        update();
    }
    else if (e.shiftKey && (e.key == 'w' || e.key == 'W')) {
        pan_imaginary += 10 * (2 / (height * zoom));
        update();
    }
    else if (e.key == 'w' || e.key == 'W') {
        pan_imaginary += 20 * (2 / (height * zoom));
        update();
    }
    else if (e.altKey && (e.key == 's' || e.key == 'S')) {
        pan_imaginary += -5 * (2 / (height * zoom));
        update();
    }
    else if (e.shiftKey && (e.key == 's' || e.key == 'S')) {
        pan_imaginary += -10 * (2 / (height * zoom));
        update();
    }
    else if (e.key == 's' || e.key == 'S') {
        pan_imaginary += -20 * (2 / (height * zoom));
        update();
    }
    else if (e.altKey && (e.key == 'a' || e.key == 'A')) {
        pan_real += 5 * (2 / (height * zoom));
        update();
    }
    else if (e.shiftKey && (e.key == 'a' || e.key == 'A')) {
        pan_real += 10 * (2 / (height * zoom));
        update();
    }
    else if (e.key == 'a' || e.key == 'A') {
        pan_real += 20 * (2 / (height * zoom));
        update();
    }
    else if (e.key == 'D') {
        pan_real += -5 * (2 / (height * zoom));
        update();
    }
    else if (e.shiftKey && (e.key == 'd' || e.key == 'D')) {
        pan_real += -10 * (2 / (height * zoom));
        update();
    }
    else if (e.key == 'd') {
        pan_real += -20 * (2 / (height * zoom));
        update();
    }
    else if (e.ctrlKey && e.key == 'ArrowRight') {
        constant_real += 0.0001
        constant_real = Math.round(constant_real * 10000) / 10000
        update()
    }
    else if (e.shiftKey && e.key == 'ArrowRight') {
        constant_real += 0.001
        constant_real = Math.round(constant_real * 10000) / 10000
        update()
    }
    else if (e.key == 'ArrowRight') {
        constant_real += 0.01
        constant_real = Math.round(constant_real * 10000) / 10000
        update()
    }
    else if (e.ctrlKey && e.key == 'ArrowLeft') {
        constant_real -= 0.0001
        constant_real = Math.round(constant_real * 10000) / 10000
        update()
    }
    else if (e.shiftKey && e.key == 'ArrowLeft') {
        constant_real -= 0.001
        constant_real = Math.round(constant_real * 10000) / 10000
        update()
    }
    else if (e.key == 'ArrowLeft') {
        constant_real -= 0.01
        constant_real = Math.round(constant_real * 10000) / 10000
        update()
    }
    else if (e.ctrlKey && e.key == 'ArrowUp') {
        constant_imaginary += 0.0001
        constant_imaginary = Math.round(constant_imaginary * 10000) / 10000
        update()
    }
    else if (e.shiftKey && e.key == 'ArrowUp') {
        constant_imaginary += 0.001
        constant_imaginary = Math.round(constant_imaginary * 10000) / 10000
        update()
    }
    else if (e.key == 'ArrowUp') {
        constant_imaginary += 0.01
        constant_imaginary = Math.round(constant_imaginary * 10000) / 10000
        update()
    }
    else if (e.ctrlKey && e.key == 'ArrowDown') {
        constant_imaginary -= 0.0001
        constant_imaginary = Math.round(constant_imaginary * 10000) / 10000
        update()
    }
    else if (e.shiftKey && e.key == 'ArrowDown') {
        constant_imaginary -= 0.001
        constant_imaginary = Math.round(constant_imaginary * 10000) / 10000
        update()
    }
    else if (e.key == 'ArrowDown') {
        constant_imaginary -= 0.01
        constant_imaginary = Math.round(constant_imaginary * 10000) / 10000
        update()
    }

})
window.addEventListener("resize", size_change);
dropdown.addEventListener("change", function (event) {
    const selectedValue = event.target.value;
    theme = Number(selectedValue)
    update()
});
createWorkers()
update()