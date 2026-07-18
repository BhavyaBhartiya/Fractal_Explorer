function draw() {

    const cr = constant_real
    const ci = constant_imaginary
    const mi = maxIterations

    for(let y =0; y<height;y++){
        
        let pointImag = ycoords[y];
        let idx = y*width

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
                buf32[idx] = (255 << 24) | (grey << 16) | (grey << 8) | grey;
            }
            else if (i == mi) {
                buf32[idx] = 0xFF000010
            }
            else if (theme == 1) {
                let nu = sescape(i, pr2, pi2)
                let paletteT = nu * 0.035
                let [r, g, b] = palettesample(paletteT, AURORA)
                buf32[idx] = RGBA(r, g, b)
            }
            else if(theme == 2){
                let nu = sescape(i, pr2, pi2)
                let paletteT = nu*0.055
                let [r,g,b] = palettesample(paletteT, FIRE)
                buf32[idx] = RGBA(r, g, b)
            }
            else if(theme == 3){
                let nu = sescape(i, pr2, pi2)
                let h = nu*0.085
                let [r, g, b] = hsvrgb(h ,1, 1)
                buf32[idx] = RGBA(r, g, b)
            }
            idx+=1
        }
    }

    ctx.putImageData(img, 0, 0)

}
