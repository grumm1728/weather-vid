"""Build an Oakland street block from the surveyed scene-frame measurements."""

import json
from math import floor, hypot
from pathlib import Path


SITE = json.loads(Path(__file__).with_name("grand-lake-site.json").read_text(encoding="utf-8"))


def ground_height(x, z):
    rows = SITE["ground"]
    start, step = SITE["groundOrigin"], SITE["groundStep"]
    u = max(0, min(len(rows[0]) - 1, (x - start) / step))
    v = max(0, min(len(rows) - 1, (z - start) / step))
    col, row = min(floor(u), len(rows[0]) - 2), min(floor(v), len(rows) - 2)
    fx, fz = u - col, v - row
    near = rows[row][col] * (1 - fx) + rows[row][col + 1] * fx
    far = rows[row + 1][col] * (1 - fx) + rows[row + 1][col + 1] * fx
    return near * (1 - fz) + far * fz


def mass(b, outline, roof, wall, top, base=None):
    area = sum(x * v - u * z for (x, z), (u, v) in zip(outline, outline[1:] + outline[:1]))
    ring = outline[::-1] if area > 0 else outline
    count = len(ring)
    vertices = [(x, min(roof - .55, ground_height(x, z) - .12) if base is None else base, z) for x, z in ring]
    vertices += [(x, roof, z) for x, z in ring]
    walls = [(i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count)]
    b.mesh(wall, vertices, walls)
    b.mesh(top, vertices[count:], [tuple(range(count))])


def ribbon(b, start, end, width, lift, material):
    x0, z0 = start
    x1, z1 = end
    dx, dz = x1 - x0, z1 - z0
    length = hypot(dx, dz)
    if length < .04:
        return
    nx, nz = dz / length * width / 2, -dx / length * width / 2
    divisions = max(1, round(length / 1.8))
    for i in range(divisions):
        a, t = i / divisions, (i + 1) / divisions
        cx, cz = x0 + dx * a, z0 + dz * a
        ex, ez = x0 + dx * t, z0 + dz * t
        corners = [(cx - nx, cz - nz), (ex - nx, ez - nz), (ex + nx, ez + nz), (cx + nx, cz + nz)]
        b.mesh(material, [(x, ground_height(x, z) + lift, z) for x, z in corners], [(0, 1, 2, 3)])


def blocks(b):
    start, step = SITE["groundOrigin"], SITE["groundStep"]
    rows = SITE["ground"]
    b.box((0, -2.1, 0), (290, .4, 290), "city-stone")
    for z, (near, far) in enumerate(zip(rows, rows[1:])):
        for x in range(len(near) - 1):
            x0, z0 = start + x * step, start + z * step
            b.mesh("city-stone", [
                (x0, near[x], z0), (x0, far[x], z0 + step),
                (x0 + step, far[x + 1], z0 + step), (x0 + step, near[x + 1], z0),
            ], [(0, 1, 2), (0, 2, 3)])

    for road in SITE["roads"]:
        line = road["line"]
        width = 5.2 if road["major"] else 3.5
        for start, end in zip(line, line[1:]):
            if all(abs(value) <= 90 for value in (*start, *end)):
                ribbon(b, start, end, width + 1.7, .09, "pavement")
                ribbon(b, start, end, width, .16, "road-wet")
                if road["name"] in {"Grand Avenue", "Lake Park Avenue"}:
                    x0, z0 = start
                    x1, z1 = end
                    length = hypot(x1 - x0, z1 - z0)
                    for tick in range(2, round(length) - 2, 3):
                        a, t = tick / length, (tick + .95) / length
                        ribbon(b, (x0 + (x1-x0)*a, z0 + (z1-z0)*a),
                               (x0 + (x1-x0)*t, z0 + (z1-z0)*t), .075, .23, "yellow")

    for x, z, w in [(2.1, 21.5, 4.8), (-4.2, 23.7, 4.2)]:
        for i in range(8):
            ribbon(b, (x-w/2+i*w/8, z), (x-w/2+i*w/8, z+1.35), .21, .26, "paint")

    materials = ["brick", "plaster", "sage", "cream-facade", "blue-hill"]
    for i, building in enumerate(SITE["buildings"]):
        outline = building["outline"]
        # Keep the camera-side block from hiding the marquee and intersection.
        if min(z for _, z in outline) < 42:
            mass(b, outline, building["roof"], materials[i % len(materials)], "roof-dusk")

    theater = SITE["theater"]
    mass(b, theater["outline"], theater["roof"], "cream-facade", "roof-dusk")
    mass(b, SITE["canopy"], 3.06, "marquee", "trim-dark", base=2.84)
    mass(b, [(-8.7, -12.5), (.1, -19.3), (4.6, -14.7), (-4.2, -8.1)],
         12.3, "brick", "roof-dusk")

    for x, z, scale in [(-10, 16, 1.8), (9.2, 15, 1.9), (12.8, 24, 1.4), (-14, 10, 1.9),
                        (-23, 5, 2.9), (18, 16.4, 2.3), (-25, -15, 2.6), (22, -11, 2.6)]:
        b.tree(x, ground_height(x, z), z, scale)

    for x, z in [(-6, 18), (9, 15), (1, 26), (-10, 19)]:
        ground = ground_height(x, z)
        b.box((x, ground + 1.6, z), (.12, 3.2, .12), "sign-steel")
        b.box((x, ground + 3.22, z), (.3, .24, .3), "bulb")
