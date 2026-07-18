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
onmessage = function(e){
    const {
        startY,
        endY,
        width,
        xcoords,
        ycoords,
        constant_real,
        constant_imaginary,
        maxIterations,
        theme
    } = e.data

    const output = new Uint32Array((endY-startY)*width)
    let out = 0
    for(let y =0; y<height;y++){
        
        let pointImag = ycoords[y];

        for(let x = 0; x<width;x++){

            let point_real = xcoords[x]
            let point_imaginary = pointImag;
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
                output[out++] = (255 << 24) | (grey << 16) | (grey << 8) | grey;
            }
            else if (i == mi) {
                output[out++] = 0xFF000010
            }
            else if (theme == 1) {
                let nu = sescape(i, pr2, pi2)
                let paletteT = nu * 0.035
                let [r, g, b] = palettesample(paletteT, AURORA)
                output[out++] = RGBA(r, g, b)
            }
            else if(theme == 2){
                let nu = sescape(i, pr2, pi2)
                let paletteT = nu*0.055
                let [r,g,b] = palettesample(paletteT, FIRE)
                output[out++] = RGBA(r, g, b)
            }
            else if(theme == 3){
                let nu = sescape(i, pr2, pi2)
                let h = nu*0.085
                let [r, g, b] = hsvrgb(h ,1, 1)
                output[out++] = RGBA(r, g, b)
            }
        }
    }

    postMessage({
        startY,
        buffer:output.buffer
    },[output.buffer]);
};