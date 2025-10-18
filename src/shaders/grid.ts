export const gridVert = /* glsl */ `
#extension GL_OES_standard_derivatives : enable
precision mediump float;

uniform mat3 u_ProjectionMatrix;
uniform mat3 u_ViewMatrix;
uniform mat3 u_ViewProjectionInvMatrix;
uniform float u_ZoomScale;
uniform float u_CheckboardStyle;

attribute vec2 a_Position;

varying vec2 v_Position;

vec2 project_clipspace_to_world(vec2 p) {
  return (u_ViewProjectionInvMatrix * vec3(p, 1.0)).xy;
}

void main() {
  v_Position = project_clipspace_to_world(a_Position);
  gl_Position = vec4(a_Position, 0.0, 1.0);
}
`;

export const gridFrag = /* glsl */ `
#extension GL_OES_standard_derivatives : enable
precision mediump float;

uniform mat3 u_ProjectionMatrix;
uniform mat3 u_ViewMatrix;
uniform mat3 u_ViewProjectionInvMatrix;
uniform float u_ZoomScale;
uniform float u_CheckboardStyle;

varying vec2 v_Position;

const vec4 GRID_COLOR = vec4(0.87, 0.87, 0.87, 1.0);
const vec4 PAGE_COLOR = vec4(0.986, 0.986, 0.986, 1.0);
const int CHECKERBOARD_STYLE_NONE = 0;
const int CHECKERBOARD_STYLE_GRID = 1;
const int CHECKERBOARD_STYLE_DOTS = 2;
const float BASE_GRID_PIXEL_SIZE = 100.0;
const float BASE_DOT_SIZE = 2.0;

vec2 scale_grid_size(float zoom) {
  if (zoom < 0.125) return vec2(BASE_GRID_PIXEL_SIZE * 125.0, 0.125);
  else if (zoom < 0.25) return vec2(BASE_GRID_PIXEL_SIZE * 25.0, 0.25);
  else if (zoom < 0.5) return vec2(BASE_GRID_PIXEL_SIZE * 5.0, 0.5);
  return vec2(BASE_GRID_PIXEL_SIZE, 4.0);
}

// Distance (in world units) to the nearest grid line (either x or y) for a given grid size.
float nearest_grid_dist(vec2 coord, float gridSize) {
  vec2 m = mod(coord, gridSize);
  vec2 d = min(m, vec2(gridSize) - m);
  return min(d.x, d.y);
}

vec4 render_grid_checkerboard(vec2 coord) {
  float alpha = 0.0;

  vec2 size = scale_grid_size(u_ZoomScale);
  float gridSize1 = size.x;
  float gridSize2 = gridSize1 / 10.0;
  float zoomStep = size.y;
  int checkboardStyle = int(floor(u_CheckboardStyle + 0.5));

  // Estimate world-units per pixel from zoom (no derivatives available)
  // Avoid division by zero and clamp to a reasonable range.
  float pixelWorld = clamp(1.0 / max(u_ZoomScale, 1e-6), 1e-4, 1.0);
  float aa = pixelWorld * 0.75; // anti-alias band in world units (~0.75px)

  if (checkboardStyle == CHECKERBOARD_STYLE_GRID) {
    vec2 grid1 = abs(fract(coord / gridSize1 - 0.5) - 0.5) / fwidth(coord) * gridSize1 / 2.0;
    vec2 grid2 = abs(fract(coord / gridSize2 - 0.5) - 0.5) / fwidth(coord) * gridSize2;
    float v1 = 1.0 - min(min(grid1.x, grid1.y), 1.0);
    float v2 = 1.0 - min(min(grid2.x, grid2.y), 1.0);

    if (v1 > 0.0) {
      alpha = v1;
    } else {
      alpha = v2 * clamp(u_ZoomScale / zoomStep, 0.0, 1.0);
    }
  } else if (checkboardStyle == CHECKERBOARD_STYLE_DOTS) {
    vec2 grid2 = abs(fract(coord / gridSize2 - 0.5) - 0.5) / fwidth(coord) * gridSize2;
    alpha = 1.0 - smoothstep(0.0, 1.0, length(grid2) - BASE_DOT_SIZE * u_ZoomScale / zoomStep);
  }

  return mix(PAGE_COLOR, GRID_COLOR, alpha);
}

void main() {
  gl_FragColor = render_grid_checkerboard(v_Position);
}
`;