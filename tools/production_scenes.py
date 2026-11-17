"""Production geometry for Grand Lake Theater and the generic landscape."""

from math import cos, exp, pi, sin


PALETTE = {
    "pavement": "55586c", "road-wet": "313a4f", "city-stone": "a29387",
    "cream-facade": "cbb59b", "trim": "b18a63", "trim-dark": "6f493d",
    "deep-window": "28273e", "display-glass": "d6a36d", "roof-dusk": "65667d",
    "marquee": "b83d28", "amber": "ed9a4d", "warm-window": "ffce85",
    "sign-steel": "4c3637", "paint": "cbd0c6", "puddle": "966956",
    "brick": "875e5e", "plaster": "b99e8d", "sage": "6d807f",
    "city-tree": "4d525d", "blue-hill": "485a73", "hill-shadow": "555c79",
    "heather": "88816e", "pine": "3f6657", "pine-light": "527c5f",
    "granite": "878e91", "granite-shadow": "686f7a", "snowcap": "d2dbd1",
}


FONT = {
    "A": ("01110", "11011", "11011", "11111", "11011", "11011", "11011"),
    "D": ("11110", "11011", "11011", "11011", "11011", "11011", "11110"),
    "E": ("11111", "11000", "11000", "11110", "11000", "11000", "11111"),
    "G": ("01111", "11000", "11000", "11011", "11011", "11011", "01111"),
    "H": ("11011", "11011", "11011", "11111", "11011", "11011", "11011"),
    "K": ("11011", "11010", "11100", "11100", "11010", "11011", "11011"),
    "L": ("11000", "11000", "11000", "11000", "11000", "11000", "11111"),
    "N": ("11011", "11011", "11111", "11111", "11011", "11011", "11011"),
    "R": ("11110", "11011", "11011", "11110", "11100", "11010", "11011"),
    "T": ("11111", "01110", "01110", "01110", "01110", "01110", "01110"),
}


def pixel_word(b, word, y, scale, depth_at, large, center=0):
    pixels = (len(word) * 6 - 1) * scale
    for letter_index, letter in enumerate(word):
        if letter == " ":
            continue
        for row, stripe in enumerate(FONT[letter]):
            for column, on in enumerate(stripe):
                if on == "0":
                    continue
                x = -pixels / 2 + (letter_index * 6 + column + .5) * scale
                height = y + (3 - row) * scale
                z = depth_at(x)
                if large:
                    b.box((center + x, height, z), (scale * 1.02, scale * 1.02, .15), "marquee")
                if not large or (row + column) % 2 == 0:
                    ratio = .48 if large else .95
                    b.box((center + x, height, z+.091), (scale*ratio, scale*ratio, .07), "bulb")


def curved_band(b, low, high, radius, arc_depth, material):
    angles = [-pi*.49 + index * pi*.98 / 48 for index in range(49)]
    for a, n in zip(angles, angles[1:]):
        x0, x1 = -1.2 + sin(a)*radius, -1.2 + sin(n)*radius
        z0, z1 = 10.55 + cos(a)*arc_depth, 10.55 + cos(n)*arc_depth
        b.mesh(material, [(x0,low,z0),(x1,low,z1),(x1,high,z1),(x0,high,z0)], [(0,1,2,3)])


def theatre(b):
    from grand_lake import blocks

    blocks(b)
    curved_band(b, .03, 11.01, 4.28, 3.00, "cream-facade")
    for low, high, radius, depth, material in [
        (10.72,11.14,4.4,3.12,"trim"), (10.54,10.72,4.43,3.14,"trim-dark"),
        (9.83,9.95,4.35,3.08,"trim"), (7.95,8.13,4.43,3.13,"trim"),
        (7.77,7.95,4.43,3.13,"trim-dark"), (4.43,4.55,4.36,3.08,"trim"),
    ]:
        curved_band(b,low,high,radius,depth,material)

    for angle in (-1.05,-.73,-.36,0,.36,.73,1.05):
        x, z = -1.2 + sin(angle)*4.24, 10.56+cos(angle)*3.03
        b.box((x,6.09,z), (.23,3.18,.20), "trim")
        b.box((x,7.62,z+.04), (.40,.23,.31), "trim")
        b.box((x,4.63,z+.04), (.42,.27,.30), "trim")
        window = z + .13
        b.box((x+.39,6.05,window), (.38,1.64,.11), "deep-window")
        for segment in range(8):
            a, n = pi*segment/8, pi*(segment+1)/8
            b.beam((x+.39+.24*cos(a),6.80+.32*sin(a),window+.02),
                   (x+.39+.24*cos(n),6.80+.32*sin(n),window+.02),.066,"trim")
        b.box((x+.39,9.21,window), (.20,.76,.11), "deep-window")

    for offset in (-2.9,-2.25,-1.60,-.95,-.3,.35,1.,1.65,2.3,2.95):
        x = -1.2 + offset
        z = 10.58 + 3.02 * (1-(offset/4.33)**2)**.5
        b.box((x,1.42,z), (.58,2.46,.16), "trim-dark")
        b.box((x,1.54,z+.10), (.43,1.76,.06), "warm-window")
        b.box((x,1.50,z+.15), (.053,1.95,.07), "trim-dark")

    for start, end in [((-10.42,9.12),(-5.02,13.19)), ((3.63,12.02),(9.32,7.21))]:
        x0,z0 = start
        x1,z1 = end
        for y in (8.04,9.90,10.78):
            b.beam((x0,y,z0+.04),(x1,y,z1+.04),.12,"trim")
        for i in range(1,6):
            t = i/6
            x,z = x0+(x1-x0)*t,z0+(z1-z0)*t+.18
            b.box((x,6.13,z),(.31,1.51,.25),"trim-dark")
            b.box((x,6.18,z+.15),(.19,1.23,.055),"deep-window")
            b.box((x,1.69,z),(.29,.91,.19),"display-glass")

    for low, high, radius, arc, material in [
        (3.90,4.15,4.70,6.12,"marquee"), (3.39,3.90,4.70,6.12,"marquee"),
        (2.98,3.39,4.73,6.15,"cream"), (2.86,2.98,4.71,6.12,"marquee"),
    ]:
        curved_band(b,low,high,radius,arc,material)
    for index in range(64):
        angle = -1.47 + index*2.94/63
        for y in (2.94,3.34,4.12):
            b.box((-1.2+sin(angle)*4.76,y,10.55+cos(angle)*6.18),(.078,.076,.072),"bulb")
    pixel_word(b,"GRAND LAKE",3.62,.071,lambda x:10.59+6.13*(1-(x/4.72)**2)**.5,False,center=-1.2)

    def sign_plane(x):
        return -12.51 + (x+.65)*.14

    base = 11.04
    for x in (-6.22,-4.4,-2.55,-.65,1.19,3.03,4.84):
        z = sign_plane(x)
        b.beam((x,base,z),(x,19.3-.56*((x+.65)/5.55)**2,z),.13,"sign-steel")
        b.beam((x,base,z-2.40),(x,16.25,z),.11,"sign-steel")
    for level in (11.55,13.22,15.12,17.13,18.64):
        b.beam((-6.25,level,sign_plane(-6.25)),(4.86,level,sign_plane(4.86)),.105,"sign-steel")
        for x in (-6.2,-4.35,-2.5,-.65,1.2,3.05):
            b.beam((x,level-.75,sign_plane(x)),(x+1.8,level+.7,sign_plane(x+1.8)),.059,"sign-steel")
            b.beam((x+1.8,level-.75,sign_plane(x+1.8)),(x,level+.7,sign_plane(x)),.059,"sign-steel")
    top = [(x*.31-.65,19.37-.57*(x/18)**2) for x in range(-18,19)]
    for (x,y),(nx,ny) in zip(top,top[1:]):
        b.beam((x,y,sign_plane(x)),(nx,ny,sign_plane(nx)),.125,"sign-steel")
        b.box((x,y,sign_plane(x)+.10),(.12,.105,.065),"amber")
    for word,y,scale in [("GRAND",17.89,.296),("LAKE",15.46,.29),("THEATRE",13.30,.221)]:
        pixel_word(b,word,y,scale,lambda x:sign_plane(x-.65)+.23,True,center=-.65)
    for index in range(12):
        angle = index*pi/6
        length = .69 if index%2 == 0 else .45
        b.beam((-.65,19.47,sign_plane(-.65)+.21),
               (-.65+cos(angle)*length,19.47+sin(angle)*length,sign_plane(-.65)+.22),.063,"bulb")



def landscape(b):
    rng = b.random
    material_choices = ["grass0","grass1","grass2","grass4","grass5","heather"]

    def elevation(x, z):
        far = 27*exp(-((x+6)/23)**2 - ((z+38)/15)**2)
        left = 19*exp(-((x+33)/16)**2 - ((z+11)/31)**2)
        right = 14*exp(-((x-34)/17)**2 - ((z+7)/25)**2)
        ridge = 5.4 * (sin(x*.29)*cos(z*.27)) * min(1,(far+left+right)/11)
        island = 4.5*exp(-((x-1)/6.5)**2 - ((z-4)/4.6)**2)
        bank = 4*exp(-((z-38)/16)**2) * (1+.34*cos(x*.2))
        return far+left+right+ridge+island+bank-1.65

    for z in range(-95,96,2):
        for x in range(-105,106,2):
            corners = [(x,elevation(x,z),z), (x,elevation(x,z+2),z+2),
                       (x+2,elevation(x+2,z+2),z+2), (x+2,elevation(x+2,z),z)]
            high = max(p[1] for p in corners)
            if high <= 0:
                continue
            tilt = high - min(p[1] for p in corners)
            material = ("snowcap" if high > 24 else "granite" if high > 19 or tilt>3.9 else
                        "sand" if high < .8 else rng.choice(material_choices))
            b.mesh(material, corners, [(0,1,2),(0,2,3)])

    for _ in range(2300):
        x,z = rng.uniform(-63,63),rng.uniform(-52,62)
        height = elevation(x,z)
        if 1.0 < height < 15 and rng.random() < .48+.23*sin(x*.69+z*.21):
            size = rng.uniform(.52,1.85)
            b.box((x,height+.36*size,z),(.17*size,.72*size,.17*size),"roof")
            for index in range(4):
                width = (.92-.18*index)*size
                b.box((x,height+(.47+.235*index)*size,z),(width,.29*size,width),
                      "pine" if index < 2 else "pine-light")
    b.house(.4,elevation(.4,3.6),3.6,2.6,2.0,"cream")
    for x,z in [(1.6,4.2),(-.5,5.3),(2.2,4.8)]:
        b.box((x,elevation(x,z)+.37,z),(.13,.23,.09),"bulb")
    for x in range(-4,5):
        b.box((x*.22,.21,9.87),(.19,.21,2.7),"roof")
    for x,z in [(-7,14), (7,-4), (15,11), (-11,-4)]:
        b.box((x,.14,z),(.37,.20,.88),"cream")
