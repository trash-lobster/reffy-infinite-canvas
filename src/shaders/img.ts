const vert = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;
uniform mat3 u_matrix;
uniform float u_z;

varying vec2 v_texCoord;

void main() {
  vec2 position = (u_matrix * vec3(a_position, 1)).xy;
  vec2 zeroToOne = position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  float z = mix(1.0, -1.0, u_z);

  gl_Position = vec4(clipSpace * vec2(1, -1), z, 1);

  v_texCoord = a_texCoord;
}
`;

const frag = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
 
uniform sampler2D u_image;
 
varying vec2 v_texCoord;
 
void main() {
  gl_FragColor = texture2D(u_image, v_texCoord);
}
`;

export { vert as imageVert, frag as imageFrag };