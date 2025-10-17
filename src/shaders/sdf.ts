export const vert = `
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

export const frag = `
precision mediump float;

void main() {
  gl_FragColor = vec4(1, 0, 0.5, 1); // return reddish-purple
}
`;

export const imageVert = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;
uniform mat3 u_matrix;

varying vec2 v_texCoord;

void main() {
  vec2 position = (u_matrix * vec3(a_position, 1)).xy;
  vec2 zeroToOne = position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  v_texCoord = a_texCoord;
}
`;

export const imageFrag = `
precision mediump float;
 
uniform sampler2D u_image;
 
varying vec2 v_texCoord;
 
void main() {
  gl_FragColor = texture2D(u_image, v_texCoord);
}
`;