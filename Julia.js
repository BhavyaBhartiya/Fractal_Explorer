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
    let mag = Math.sqrt(pr2 + pi2)
    return i + 1 - Math.log(Math.log(mag)) / Math.LN2
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

function draw() {

    const cr = constant_real
    const ci = constant_imaginary
    const mi = maxIterations
    const par = pan_real
    const pid = 2 / (height * zoom)
    const prd = 2 / (width * zoom)
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

            if (theme == 0) {
                let grey = i * 255 / mi
                buf32[y * width + x] = (255 << 24) | (grey << 16) | (grey << 8) | grey;
            }
            else if (i == mi) {
                buf32[y * width + x] = 0xFF000010
            }
            else if (theme == 1) {
                let nu = sescape(i, pr2, pi2)
                let paletteT = nu * 0.035
                let [r, g, b] = palettesample(paletteT, AURORA)
                buf32[y * width + x] = RGBA(r, g, b)
            }
            else if(theme == 2){
                let nu = sescape(i, pr2, pi2)
                let paletteT = nu*0.055
                let [r,g,b] = palettesample(paletteT, FIRE)
                buf32[y*width+x] = RGBA(r, g, b)
            }
            else if(theme == 3){
                let nu = sescape(i, pr2, pi2)
                let h = nu*0.085
                let [r, g, b] = hsvrgb(h ,1, 1)
                buf32[y*width+x] = RGBA(r, g, b)
            }
        }
    }

    ctx.putImageData(img, 0, 0)

}

function update() {

    header.innerHTML = constant_real.toString() + ' + ' + constant_imaginary.toString() + 'i at ' + zoom + 'X'
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
update()