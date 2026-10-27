# Scene assets

The scene, equipment and generated leather, wood, rubber and powder-coat microtextures are authored in this repository. All assets are served locally.

- Three.js 0.180.0 and its addons: MIT, license at `../assets/vendor/three/LICENSE`.
- `studio.hdr`: [Studio Small 08](https://polyhaven.com/a/studio_small_08), Poly Haven, 1K HDR environment.
- `alps_field.hdr`: [Alps Field](https://polyhaven.com/a/alps_field), Andreas Mischok / Poly Haven, 2K HDR background.
- `textures/concrete-color.jpg`, `concrete-normal.jpg`: [Concrete Floor 03](https://polyhaven.com/a/concrete_floor_03), Poly Haven, 1K. The color map is desaturated and its contrast reduced for finished architectural concrete.

Poly Haven assets are [CC0](https://polyhaven.com/license), including redistribution and modification.

## Framed character artwork

These character illustrations retain their original copyrights; they are not CC0 or covered by this repository's code license. The prints are decorative personal fan displays and do not imply an official affiliation.

- `art/miku.webp`: Hatsune Miku, art by KEI, © Crypton Future Media, INC. [Official character page](https://piapro.net/intl/en_character.html), [source image](https://piapro.net/intl/images/ch_img_miku.png), [Piapro creator guidance](https://piapro.net/intl/en_for_creators.html).
- `art/firefly.webp`: Firefly (1310), Honkai: Star Rail, © HoYoverse. [Source portrait](https://github.com/Mar-7th/StarRailRes/blob/master/image/character_portrait/1310.png).
- `art/robin.webp`: Robin (1309), Honkai: Star Rail, © HoYoverse. [Source portrait](https://github.com/Mar-7th/StarRailRes/blob/master/image/character_portrait/1309.png).

`tools/make_gym_art.py` places the original illustrations on tinted print backgrounds and exports compact WebP textures. The print images include small artist / owner credits. Frames, matte borders and picture lights are modeled in the scene.

No stock render or generated background replaces the navigable scene. Equipment picking, highlights, shadows and mirror reflections are rendered from the 3D geometry.
