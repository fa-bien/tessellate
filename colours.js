function HSVColour(H, S, V) {
    this.H = H;
    this.S = S;
    this.V = V;
    
    this.RGB = function() {
        let C = this.V * this.S;
        let Hprime = this.H * 6;
        let X = C * (1 - Math.abs(Hprime % 2 - 1));
        let R=0, G=0, B=0;
        if (Hprime < 1) {
            R = C; G = X; B = 0;
        } else if (Hprime < 2) {
            R = X; G = C; B = 0;
        } else if (Hprime < 3) {
            R = 0; G = C; B = X;
        } else if (Hprime < 4) {
            R = 0; G = X; B = C;
        } else if (Hprime < 5) {
            R = X; G = 0; B = C;
        } else if (Hprime < 6) {
            R = C; G = 0; B = X;
        } else {
            console.log('Incorrect H, S, V values: ', H, S, V);
        }
        let m = this.V - C;
        return 'rgb(' + 255*(R+m) + ',' + 255*(G+m) + ',' + 255*(B+m) + ')';
    }
}

const silverRatio = 2.0 / (1 + Math.sqrt(5))

function genSmartColours(n) {
    let colours = [];
    let H = Math.random();
    let S = 0.4 + 0.6* Math.random();
    let V = 0.9 + 0.1 * Math.random();
    for (i=0; i < n; i++) {
        let c = new HSVColour((H + silverRatio * i) % 1, S, V);
        colours.push(c.RGB());
    }
    return colours;
}

function genShades(n) {
    let colours = [];
    let H = Math.random();
    let S = 0.8 + 0.2* Math.random();
    let V = 0.9 + 0.1 * Math.random();
    let step = S / n;
    for (i=0; i < n; i++) {
        // we add a bit of noise on the hue
        let c = new HSVColour( (H * (0.85 + 0.3 * Math.random())) % 1,
                              S - i * step,
                              V);
        colours.push(c.RGB());
    }
    return colours;
}
