const vert = `
attribute vec2 a_position;
uniform vec2 u_resolution;
uniform mat3 u_matrix;
varying vec2 v_worldPos;

void main() {
  vec2 position = (u_matrix * vec3(a_position, 1)).xy;
  v_worldPos = position;
  vec2 zeroToOne = position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

const frag = `
precision mediump float;
varying vec2 v_worldPos;
uniform float u_x;
uniform float u_y;
uniform float u_width;
uniform float u_height;

void main() {
  float left = min(u_x, u_x + u_width);
  float right = max(u_x, u_x + u_width);
  float top = min(u_y, u_y + u_height);
  float bottom = max(u_y, u_y + u_height);
  float thickness = 3.0; // outline thickness in world units

  float dx = min(abs(v_worldPos.x - left), abs(v_worldPos.x - right));
  float dy = min(abs(v_worldPos.y - top), abs(v_worldPos.y - bottom));
  float d = min(dx, dy);

  float alpha = smoothstep(thickness, thickness - 1.0, d);
  if (d < thickness) {
    gl_FragColor = vec4(0.5, 0.8, 1.0, alpha); // light blue
  } else {
    discard;
  }
}
`;

export { vert as boundingBoxVert, frag as boundingBoxFrag };