# Rendering

## WebGL Context & Programs

- Context is created with `alpha: true` and `premultipliedAlpha: false`.
- Blending is enabled with `SRC_ALPHA` / `ONE_MINUS_SRC_ALPHA`.
- Programs:
  - `shape`: basic geometry (Rect/Triangle) rendering.
  - `img`: textured quads for image rendering.
  - `grid`: background grid.

Standard derivative extension `OES_standard_derivatives` is enabled for shader features (e.g., `fwidth`).

## Frame Steps

1. Clear color and depth, set viewport.
2. Update camera viewport based on canvas parent bounds.
3. Compute camera AABB; cull shapes outside view.
4. Render grid first (at back depth), then shapes/images.
5. Draw selection overlays.

## Z-Ordering & Depth

- `Shape.getZ()` maps `renderOrder` to a normalized depth ratio; higher `renderOrder` ⇒ closer to camera.
- Grid is assigned the farthest depth so it stays behind all content.
- Depth testing can be combined with blending; complex translucency may need order control for correct compositing.

## Culling

- Per-frame camera bounding box is computed via `Camera.getBoundingBox()`.
- Each shape’s AABB (`Shape.getBoundingBox()`) is tested against the camera AABB; non-intersecting shapes are marked `culled` and skipped.

## Low-Resolution Images

- `Img.determineIfLowRes(cameraBoundingBox, zoom)` decides if a low-res texture should be used based on on-screen coverage and zoom level.
- If low-res is selected, `Img.setUseLowRes(useLowRes, gl)` switches the bound texture to the low-res version.

## Resource Management

- `destroy()` on `Canvas` cleans programs and asks children to release GPU buffers/textures.
- Shapes implement `destroy()` to free buffers and mark themselves uninitialized.
