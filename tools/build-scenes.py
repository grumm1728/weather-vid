"""Build an editable Blender scene and an optimized, material-batched GLB."""

import argparse
from collections import defaultdict
from math import cos, sin, pi, hypot
from pathlib import Path
from random import Random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from production_scenes import PALETTE as PRODUCTION_PALETTE, landscape, theatre


ROOT = Path(__file__).resolve().parent.parent
PALETTE = {
    "red": "d04b34", "red-shadow": "8d342a", "red-light": "ec6b46",
    "asphalt": "42454b", "stone": "8d8981", "rock": "777b78",
    "cream": "e5dbc2", "yellow": "dfb354", "glass": "416779",
    "grass0": "7c8c4a", "grass1": "829354", "grass2": "8e995a",
    "grass3": "9d9b59", "grass4": "769359", "grass5": "75914e",
    "leaf": "43654c", "leaf-light": "5b824e", "leaf-shadow": "344b3e",
    "sand": "b4a98a", "wash": "62959b", "foam": "9cc5bf",
    "bulb": "ffeb9a", "roof": "9b553f", "truck": "e5dcc0",
}
PALETTE.update(PRODUCTION_PALETTE)


def channels(hex_color):
    values = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in values)


class SceneBuilder:
    def __init__(self, seed):
        self.random = Random(seed)
        self.groups = defaultdict(lambda: ([], []))

    def mesh(self, material, points, faces):
        vertices, polygons = self.groups[material]
        offset = len(vertices)
        vertices.extend((x, -z, y) for x, y, z in points)
        polygons.extend(tuple(offset + index for index in face) for face in faces)

    def box(self, center, size, material):
        x, y, z = center
        w, h, d = [axis / 2 for axis in size]
        points = [
            (x-w, y-h, z-d), (x+w, y-h, z-d), (x+w, y-h, z+d), (x-w, y-h, z+d),
            (x-w, y+h, z-d), (x+w, y+h, z-d), (x+w, y+h, z+d), (x-w, y+h, z+d),
        ]
        self.mesh(material, points, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
                                     (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])

    def beam(self, start, end, width, material, depth=None):
        start, end = Vector(start), Vector(end)
        axis = (end - start).normalized()
        reference = Vector((0, 1, 0)) if abs(axis.y) < .85 else Vector((0, 0, 1))
        a = axis.cross(reference).normalized() * (width / 2)
        b = axis.cross(a).normalized() * ((width if depth is None else depth) / 2)
        points = [center + delta for center in (start, end) for delta in (-a-b, a-b, a+b, -a+b)]
        self.mesh(material, points, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4),
                                     (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])

    def tree(self, x, y, z, scale):
        r = self.random
        self.box((x, y + scale*.32, z), (scale*.16, scale*.64, scale*.16), "roof")
        for i in range(3):
            material = ("leaf-shadow", "leaf", "leaf-light")[i]
            dx, dz = r.uniform(-.2, .2)*scale, r.uniform(-.2, .2)*scale
            width = (1.05 - i*.26) * scale
            sy = y + (.48 + .27 * i) * scale
            self.box((x + dx, sy, z + dz), (width, .3*scale, width*.83), material)

    def house(self, x, y, z, width, depth, material="cream"):
        height = width * .55
        self.box((x, y + height/2, z), (width, height, depth), material)
        w, d, h = width*.57, depth*.56, width*.29
        y += height
        self.mesh("roof", [(x-w,y,z-d),(x+w,y,z-d),(x+w,y,z+d),(x-w,y,z+d),
                           (x-w,y+h,z),(x+w,y+h,z)],
                 [(0,4,5,1),(4,3,2,5),(0,3,4),(1,5,2)])
        for side in (-1, 1):
            self.box((x+side*width*.24, y-height*.61, z+depth*.51),
                     (width*.16, height*.32, .05), "glass")

    def build(self, name, blend_path):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        for name_of_material, (vertices, faces) in self.groups.items():
            material = bpy.data.materials.new(name=name_of_material)
            material.use_nodes = True
            shader = material.node_tree.nodes.get("Principled BSDF")
            rgb = (*channels(PALETTE[name_of_material]), 1)
            material.diffuse_color = rgb
            shader.inputs["Base Color"].default_value = rgb
            shader.inputs["Roughness"].default_value = .87
            emission = {"bulb": 1.1, "warm-window": .38, "marquee": .52, "puddle": .12}
            if name_of_material in emission:
                shader.inputs["Emission Color"].default_value = rgb
                shader.inputs["Emission Strength"].default_value = emission[name_of_material]
            mesh = bpy.data.meshes.new(name_of_material)
            mesh.from_pydata(vertices, [], faces)
            mesh.materials.append(material)
            mesh.update()
            obj = bpy.data.objects.new(name_of_material, mesh)
            bpy.context.scene.collection.objects.link(obj)

        if blend_path:
            blend_path.parent.mkdir(parents=True, exist_ok=True)
            bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=True)
        output = ROOT / "public" / "scenes" / f"{name}.glb"
        output.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_lights=False,
                                 export_cameras=False, export_extras=False)


def coast(side, z):
    if side < 0:
        return -31 + .15*z + 4*sin(z*.069) + 2.1*sin(z*.24) + 1.2*cos(z*.37)
    return 28 + .32*z + 3*sin(z*.068) + 2.4*cos(z*.23) + 1.1*sin(z*.37)


def hill(side, z, inset):
    profile = .24 + min(3.0, inset * .61)
    rolling = 1.6 + 1.25*cos(z*.094 + side) + .85*sin(z*.29 + inset*.31)
    return max(.1, profile + rolling * min(inset / 5, 1) + .28*cos(z*.7-inset*.41))


def shoreline(b, side):
    z_values = list(range(-86, 88, 2))
    widths = [0, 1, 2.5, 4.4, 6.7, 9.4, 12.1, 15, 18, 21.7, 26, 31, 37, 44, 54, 70]
    rng = b.random

    def point(z, distance):
        return coast(side, z) + side*distance, hill(side, z, distance), z

    for near, far in zip(widths, widths[1:]):
        for z, following in zip(z_values, z_values[1:]):
            material = rng.choice(["stone", "sand", "rock", "rock"]) if far <= 2.5 else f"grass{rng.randrange(6)}"
            corners = [point(z, near), point(z, far), point(following, far), point(following, near)]
            if side > 0:
                corners.reverse()
            b.mesh(material, corners, [(0, 1, 2), (0, 2, 3)])

    for z in range(-64, 67):
        x0 = coast(side, z)
        x1 = coast(side, z + .9)
        for offset, width, material in ((.1, .88, "wash"), (1.05, .17, "foam")):
            if material == "foam" and rng.random() < .28:
                continue
            y = .028 if material == "wash" else .042
            points = [(x0-side*offset,y,z),(x0-side*(offset+width),y,z),
                      (x1-side*(offset+width),y,z+.88),(x1-side*offset,y,z+.88)]
            b.mesh(material, points if side > 0 else points[::-1], [(0, 1, 2, 3)])

    for _ in range(930):
        z, inset = rng.uniform(-53, 56), rng.uniform(1.4, 36)
        x, y, _ = point(z, inset)
        if inset < 3:
            size = rng.uniform(.2, .8)
            b.box((x, y+.15, z), (size, size*.65, size*.81), rng.choice(["rock", "stone"]))
        elif abs(z) > 3.1 and rng.random() < .42 + .27*sin(z*.45+inset*.21):
            b.tree(x, y, z, rng.uniform(.33, .93))
        else:
            b.box((x, y+.022, z), (rng.uniform(.2,.65), .04, rng.uniform(.2,.55)), rng.choice(["sand", "grass3"]))

    for j in range(20):
        z = side*(-5-j*.65) + rng.uniform(-.24,.24)
        inset = rng.uniform(6, 13)
        x, y, _ = point(z, inset)
        b.house(x, y-.07, z, rng.uniform(.5,1.1), rng.uniform(.44,.9), rng.choice(["cream", "sand"]))

    def road_vertex(index):
        t = index / 43
        z = side * (-3 + 33*t)
        inset = 6.3 + 5*t + 2.8*sin(2.8*pi*t)
        x, y, _ = point(z, inset)
        return x, y+.14, z

    for index in range(43):
        x1,y1,z1 = road_vertex(index)
        x2,y2,z2 = road_vertex(index+1)
        dx,dz = x2-x1,z2-z1
        length = hypot(dx,dz)
        for width, lift, material in [(.90,0,"sand"),(.69,.035,"asphalt"),(.075,.058,"yellow")]:
            if material == "yellow" and index % 2 == 0:
                continue
            nx,nz = dz/length*width/2, -dx/length*width/2
            b.mesh(material, [(x1+nx,y1+lift,z1+nz),(x2+nx,y2+lift,z2+nz),
                              (x2-nx,y2+lift,z2-nz),(x1-nx,y1+lift,z1-nz)], [(3,2,1,0)])


def golden_gate(b):
    for side in (-1, 1):
        shoreline(b, side)

    deck = 3.05
    b.box((0, deck-.26, 0), (73, .51, 2.58), "red-shadow")
    b.box((0, deck, 0), (73, .14, 2.32), "asphalt")
    for side in (-1, 1):
        z = side*1.22
        b.box((0, deck+.16, z), (73, .11, .125), "red")
        b.box((0, deck-.69, z), (72, .12, .15), "red")
        for x in range(-35, 35):
            b.beam((x,deck-.69,z),(x+.48,deck-.12,z), .064, "red")
            b.beam((x+.48,deck-.12,z),(x+1,deck-.69,z), .064, "red")
            b.box((x,deck+.12,z), (.05,.32,.08), "red-light")

    tower = 13.2
    for x in (-tower, tower):
        b.box((x,.18,0), (2.22,.38,3.58), "stone")
        b.box((x,.51,0), (1.75,.39,3.2), "sand")
        for z in (-1.3, 1.3):
            b.box((x,5.36,z), (.71,9.55,.62), "red")
            b.box((x-.39,5.48,z), (.09,9.23,.43), "red-shadow")
            b.box((x+.37,5.48,z+.18), (.11,9.31,.12), "red-light")
            b.box((x,10.15,z), (.76,.17,.69), "red-light")
        for y in (1.8,4.52,6.05,7.68,9.38):
            b.box((x,y,0), (.47,.38,2.43), "red-shadow")
            b.box((x,y+.21,0), (.52,.10,2.57), "red")

    def cable_height(x):
        normalized = abs(x) / tower
        return 3.84 + 6.16 * normalized ** 2 if normalized <= 1 else 10 - 6.78*(abs(x)-tower)/(35-tower)

    for z in (-1.27, 1.27):
        step = .55
        control = sorted([-35, -tower, tower, 35] + [-34.8 + i*step for i in range(127)])
        for start, finish in zip(control, control[1:]):
            b.beam((start,cable_height(start),z),(finish,cable_height(finish),z), .097,"red-light")
        for i in range(-41, 42):
            x = i*.81
            b.beam((x,deck+.09,z),(x,cable_height(x),z), .037,"red")
    for x in range(-34, 36, 2):
        b.box((x,deck+.082,0), (.65,.019,.055), "yellow")
    for x, z, material in [(-24,-.42,"cream"),(-13,.43,"truck"),(-6,-.38,"red-light"),(3,.41,"cream"),
                           (10,-.41,"yellow"),(18,.4,"truck"),(25,-.4,"glass")]:
        b.box((x,deck+.23,z), (.6,.32,.26),material)
        b.box((x+.11,deck+.37,z), (.30,.18,.215),material)
        b.box((x+.27,deck+.36,z), (.035,.116,.20),"glass")

    for x, z in [(-14,15),(18,24),(-23,-11),(11,-16)]:
        b.mesh("foam", [(x-.22,.034,z),(x-1.7,.034,z+3.2),(x,.034,z+1.65),
                        (x+1.7,.034,z+3.2),(x+.22,.034,z)], [(4,3,2,1,0)])
        b.box((x,.19,z), (.49,.34,1.18),"cream")
        b.box((x,.44,z-.06), (.34,.27,.55),"glass")


if __name__ == "__main__":
    builders = {"bridge": (560, golden_gate), "theatre": (1834, theatre), "landscape": (207, landscape)}
    args_after_separator = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scene", choices=[*builders, "all"])
    parser.add_argument("--blend", action="store_true")
    options = parser.parse_args(args_after_separator)
    for name in builders if options.scene == "all" else [options.scene]:
        seed, populate = builders[name]
        builder = SceneBuilder(seed)
        populate(builder)
        blend = ROOT / "scene-source" / f"{name}.blend" if options.blend else None
        builder.build(name, blend)
