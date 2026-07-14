var header = document.querySelector('h3')
var canvas = document.querySelector('canvas')
var ctx = canvas.getContext('2d')
var height = Math.floor(((85*window.innerHeight)/100))
var width = 0
for (let h = 100; true; h -= 5) {
    width = Math.floor(((h*window.innerWidth)/100))
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

function draw() {

    const cr = constant_real
    const ci = constant_imaginary
    const mi = maxIterations
    const par = pan_real
    const pid = 2 / (height * zoom)
    const prd = 2 / (width * zoom)
    const gr = 255 / mi
    let pii = (1 / zoom) + pan_imaginary

    for (var y = 0; y < height; y++) {
        pii = pii - pid
        let pir = par + (1 / zoom)
        for (var x = 0; x < width; x++) {
            let point_imaginary = pii
            pir = pir - prd
            let point_real = pir
            let i = 0;
            let pr2 = point_real * point_real
            let pi2 = point_imaginary * point_imaginary
            while (((pr2 + pi2) < 4) && (i < mi)) {
                let temp = (pr2 - pi2) + cr
                point_imaginary = (2 * point_real * point_imaginary) + ci
                point_real = temp
                pr2 = point_real * point_real
                pi2 = point_imaginary * point_imaginary
                i++
            }

            let grey = gr * i
            buf32[y * width + x] = (255 << 24) | (grey << 16) | (grey << 8) | grey;

        }
    }

    ctx.putImageData(img, 0, 0)

}

function update() {

    header.innerHTML = constant_real.toString() + ' + ' + constant_imaginary.toString() + 'i at ' + zoom + 'X'
    draw()

}

function size_change() {
    height = Math.floor(((85*window.innerHeight)/100))
    for (let h = 100; true; h -= 5) {
        width = Math.floor(((h*window.innerWidth)/100))
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
update()