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


def pixel_word(b, word, y, scale, depth_at, large):
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
                    b.box((x, height, z), (scale * 1.02, scale * 1.02, .15), "marquee")
                if not large or (row + column) % 2 == 0:
                    ratio = .48 if large else .95
                    b.box((x, height, z+.091), (scale*ratio, scale*ratio, .07), "bulb")


def curved_band(b, low, high, radius, arc_depth, material, inset=0, samples=48):
    angles = [-pi*.49 + index * pi*.98 / samples for index in range(samples+1)]
    radius -= inset
    arc_depth -= inset
    for a, n in zip(angles, angles[1:]):
        x0, x1 = sin(a)*radius, sin(n)*radius
        z0, z1 = 4.15+cos(a)*arc_depth, 4.15+cos(n)*arc_depth
        b.mesh(material, [(x0,low,z0),(x1,low,z1),(x1,high,z1),(x0,high,z0)], [(0,1,2,3)])


def theatre(b):
    r = b.random
    b.box((0,-.18,0), (550,.28,550), "road-wet")
    b.box((0,.045,-3.2), (33,.17,25.6), "pavement")
    b.box((0,.11,-3.2), (32.7,.17,25.3), "city-stone")
    b.box((-7,4.44,-.12), (13.5,8.5,9.5), "cream-facade")
    b.box((5.22,4.63,-1.36), (12.1,8.9,11.6), "cream-facade")
    b.box((0,8.82,-1.5), (23.25,.3,12.1), "roof-dusk")
    b.box((-10,6.35,-7.35), (7.2,12.35,4.5), "brick")
    for level, material in [(8.91,"trim-dark"),(8.73,"trim"),(7.85,"trim-dark"),(7.66,"trim")]:
        b.box((0,level,-1.45), (23.64,.17,12.26), material)
    for x in (-10,-7,5,8):
        b.box((x,9.16,-3-r.random()*3), (1.28,.68,1.1), "pavement")

    curved_band(b,.19,8.85,5.6,3.15,"cream-facade")
    for low, high, material in [(8.55,9.07,"trim"),(8.45,8.56,"trim-dark"),
                                (7.94,8.03,"trim"),(6.78,6.93,"trim"),
                                (4.22,4.37,"trim-dark"),(4.05,4.22,"trim")]:
        curved_band(b,low,high,5.74,3.24,material)
    for angle in (-1,-.66,-.33,0,.33,.66,1):
        x,z = sin(angle)*5.55,4.17+cos(angle)*3.17
        b.box((x,5.52,z), (.36,2.49,.34), "trim")
        b.box((x,6.69,z+.045), (.49,.24,.42), "trim-dark")
        for low in (5.6,7.35):
            b.box((x+.35,low,z+.07), (.29,.68,.12), "deep-window")
    for x in (-4,-3,-2,-1,0,1,2,3,4):
        z = 4.15+3.17*(1-(x/5.65)**2)**.5
        b.box((x,1.35,z), (.82,2.27,.18), "trim-dark")
        b.box((x,1.49,z+.095), (.61,1.8,.06), "warm-window")
        b.box((x,1.49,z+.135), (.087,1.8,.08), "trim-dark")

    for low, high, radius, arc, material in [
        (3.91,4.07,6.62,4.31,"marquee"),(3.28,3.91,6.64,4.34,"marquee"),
        (2.94,3.28,6.68,4.37,"amber"),(2.73,2.94,6.64,4.34,"marquee"),
    ]:
        curved_band(b,low,high,radius,arc,material)
    for index in range(58):
        angle = -1.47 + index*2.94/57
        for y in (2.82,3.25,3.99):
            b.box((sin(angle)*6.68, y, 4.15+cos(angle)*4.37), (.11,.095,.102), "bulb")
    pixel_word(b,"GRAND LAKE",3.59,.078,lambda x:4.19+4.37*(1-(x/6.66)**2)**.5,False)

    sign_z = 2.35
    base = 9.13
    for x in [-7.54,-5.1,-2.55,0,2.55,5.1,7.54]:
        b.beam((x,base,sign_z),(x,18.16-.52*(x/7.54)**2,sign_z),.18,"sign-steel")
        b.beam((x,base,sign_z-3),(x,16.05,sign_z),.13,"sign-steel")
    for level in [9.6,11.6,13.6,15.6,17.6]:
        b.beam((-7.56,level,sign_z),(7.56,level,sign_z),.15,"sign-steel")
        for x in [-7.54,-5.05,-2.55,0,2.55,5.05]:
            b.beam((x,level-1,sign_z),(x+2.45,level+.83,sign_z),.08,"sign-steel")
            b.beam((x+2.45,level-1,sign_z-.04),(x,level+.83,sign_z-.04),.08,"sign-steel")
    top = [(index*.45,18.28-.63*(index*.45/7.65)**2,sign_z) for index in range(-17,18)]
    for p0,p1 in zip(top,top[1:]):
        b.beam(p0,p1,.2,"sign-steel")
        b.box((p0[0],p0[1],p0[2]+.12),(.15,.15,.10),"amber")
    for word, y, scale in [("GRAND",16.65,.369),("LAKE",13.82,.37),("THEATRE",11.27,.28)]:
        pixel_word(b,word,y,scale,lambda x:sign_z+.32,True)
    for index in range(12):
        angle = index*pi/6
        length = .98 if index%2 == 0 else .6
        b.beam((0,18.6,sign_z+.29),(cos(angle)*length,18.6+sin(angle)*length,sign_z+.31),.10,"bulb")

    for x in [-12.7,-11.2,-9.7,-8.2,7.4,8.9,10.4]:
        for level in [1.55,5.68]:
            b.box((x,level,4.66),(.98,1.65,.16),"trim-dark")
            b.box((x,level+.07,4.75),(.69,1.39,.11),r.choice(["deep-window","display-glass","warm-window"]))

    for x in range(-45,47,3):
        b.box((x,.036,12.2),(1.52,.026,.09),"yellow")
        b.box((x,.042,12.46),(1.52,.026,.09),"yellow")
    for x in [-15.3,15.7]:
        for z in range(10,16):
            b.box((x,.043,z), (2.2,.025,.36), "paint")
    for x,z in [(-7,9.9),(7,9.9),(-12,7.6),(13,6),(17,15),(-18,15)]:
        b.box((x,1.77,z),(.13,3.48,.13),"sign-steel")
        b.box((x,3.63,z),(.35,.32,.35),"bulb")
        for _ in range(12):
            b.box((x+r.uniform(-.41,.41),.05,z+r.uniform(-1.6,1.6)),
                  (r.uniform(.11,.4),.019,r.uniform(.17,.68)), "puddle")
    for x,z in [(-11,7.05),(10.8,7.35),(15,3),(-19,4),(-19,-6),(15,-7),(-21,-14),(21,-14)]:
        b.tree(x,.15,z,r.uniform(1.8,3.2))

    for z in [-53,-38,-27,-18]:
        for x in range(-58,61,5):
            px,pz = x+r.uniform(-1,1), z+r.uniform(-1,1)
            height = r.uniform(1.8,6.5) + 5*exp(-((z+45)/14)**2) * (.6+.4*sin(x*.16))
            width = r.uniform(2.25,4.25)
            if r.random() < .76:
                b.box((px,height/2,pz),(width,height,3.6),r.choice(["brick","plaster","sage","pavement","blue-hill"]))
                b.box((px,height,pz),(width+.18,.13,3.73),"roof-dusk")
                for floor in range(1,int(height)):
                    for w in (-.29,0,.29):
                        if r.random()<.62:
                            b.box((px+width*w,floor+.19,pz+1.82),(.28,.45,.058),
                                  r.choice(["deep-window","display-glass","warm-window"]))
            else:
                b.tree(px,0,pz,r.uniform(2.2,4.6))


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
