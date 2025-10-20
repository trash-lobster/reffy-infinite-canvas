const vert = `
attribute vec2 a_position;

uniform vec2 u_resolution;
uniform mat3 u_matrix;

// all shaders have a main function
void main() {
  vec2 position = (u_matrix * vec3(a_position, 1)).xy;

  vec2 zeroToOne = position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

const frag = `
precision mediump float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

export { vert as shapeVert, frag as shapeFrag };