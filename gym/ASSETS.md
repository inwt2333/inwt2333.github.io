# Scene assets

The scene, equipment, wood, rubber and powder-coat microtextures are authored in this repository. All runtime assets are served locally.

- Three.js 0.180.0 and its addons: MIT, license at `../assets/vendor/three/LICENSE`.
- `studio-small.hdr`: [Studio Small 08](https://polyhaven.com/a/studio_small_08), Poly Haven. Downsampled in linear light from the 1K original to 256 × 128 RGBE with `tools/compact_gym_hdr.py`; loaded after the room becomes interactive.
- `scenery.webp`: [Anime Landscape wallpaper, WallpaperSafari](https://wallpapersafari.com/w/tA5vpb), [source image](https://cdn.wallpapersafari.com/54/58/tA5vpb.png). This decorative illustration retains its original copyright and is not CC0; WallpaperSafari's upload listing does not establish original authorship. `tools/make_gym_scenery.py` preserves the wallpaper's full color, pairs it with a mirrored copy and extends the sky/ground to create a seamless 4096 × 2048 panorama. It is rendered at infinity so no picture edges appear beside the windows.
- `textures/concrete-color.jpg`, `concrete-normal.jpg`: [Concrete Floor 03](https://polyhaven.com/a/concrete_floor_03), Poly Haven, 1K. The color map is desaturated and its contrast reduced for finished architectural concrete.
- `textures/leather-*.webp`: [Fabric Leather 02](https://polyhaven.com/a/fabric_leather_02), Rob Tuytel / Poly Haven. 512 px diffuse, OpenGL normal and roughness. The diffuse map is neutralized and the roughness remapped for indoor upholstery.
- `textures/plaster-*.webp`: [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall), Amal Kumar / Poly Haven. 512 px diffuse, OpenGL normal and roughness. Weathering contrast is reduced for an interior finish.

Poly Haven assets are [CC0](https://polyhaven.com/license), including redistribution and modification.

## Framed character artwork

These character illustrations retain their original copyrights; they are not CC0 or covered by this repository's code license. The prints are decorative personal fan displays and do not imply an official affiliation.

- `art/miku.webp`: Hatsune Miku, art by KEI, © Crypton Future Media, INC. [Official character page](https://piapro.net/intl/en_character.html), [source image](https://piapro.net/intl/images/ch_img_miku.png), [Piapro creator guidance](https://piapro.net/intl/en_for_creators.html).
- `art/firefly.webp`: Firefly (1310), Honkai: Star Rail, © HoYoverse. [Source portrait](https://github.com/Mar-7th/StarRailRes/blob/master/image/character_portrait/1310.png).
- `art/robin.webp`: Robin (1309), Honkai: Star Rail, © HoYoverse. [Source portrait](https://github.com/Mar-7th/StarRailRes/blob/master/image/character_portrait/1309.png).

`tools/make_gym_art.py` places the original illustrations on tinted print backgrounds and exports compact WebP textures. The print images include small artist / owner credits. Frames, matte borders and picture lights are modeled in the scene.

No stock render or generated background replaces the navigable scene. Equipment picking, highlights, shadows and mirror reflections are rendered from the 3D geometry.

## Journal muscle diagrams

`anatomy/front.webp`, `anatomy/back.webp` and the traced masks in `anatomy/regions.mjs` are adapted from [js-rich-body-highlighter](https://github.com/crmapache/js-rich-body-highlighter/tree/107dafe86f91298d66a41ff1c7b7251b073983d8), MIT, © 2026 js-rich-body-highlighter contributors. The complete license is retained in `anatomy/LICENSE`. Source images are `src/assets/bodies/male-front-light.webp` and `male-back-light.webp`; masks come from the male definitions in `src/data/muscles/front.ts` and `back.ts`, with their pixel offsets converted at 25.4 / 96 to match the source SVG coordinate system. Only the images and mask data are used; no framework or library runtime is loaded.

`anatomy.mjs` combines the illustration with semitransparent muscle tints, supplies Chinese labels and front/back controls, and adds an original inner-thigh mask for the combined extension/adductor station. These are broad exercise regions, rather than measured muscle activation.

Exercise-region references include [Mayo Clinic: seated row](https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/seated-row/vid-20084669), [ACE: seated row](https://www.acefitness.org/resources/everyone/exercise-library/168/seated-row/) and [NASM: chest press machine](https://www.nasm.org/resource-center/exercise-library/chest-press-machine).
