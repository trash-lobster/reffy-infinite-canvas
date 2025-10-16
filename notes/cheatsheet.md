## Graphics programming glossary

### Data and shaders
- Shader: Small GPU program (vertex or fragment in WebGL) written in GLSL.
- Vertex shader (VS): Runs per-vertex; outputs clip-space position and varyings.
- Fragment shader (FS): Runs per-fragment (pixel); computes final color.
- Program: Linked pair of vertex + fragment shaders; you bind it with `gl.useProgram`.
- Uniform: Read-only value set from CPU; constant across a draw call for the current program (e.g., matrices, colors, texture units). Not shared between programs.
- Attribute: Per-vertex input (positions, normals, UVs) sourced from buffers.
- Varying: VS output interpolated across the primitive into the FS input.
- Buffer: GPU memory holding arrays (vertices, indices, sometimes uniforms in WebGL2). They are created for the GL context and can be used across multiple programs.
- VBO (vertex buffer): Buffer of vertex attributes.
- IBO/EBO (index/element buffer): Buffer of indices for indexed drawing.
- VAO (vertex array object, WebGL2): Captures attribute/buffer bindings for fast rebinding.
- UBO (uniform buffer object, WebGL2): Buffer-backed uniforms shareable across programs with the same block layout.
- Sampler: Uniform that stores a texture unit index (e.g., `sampler2D`). It does not hold the image itself.
- Texture: GPU image object sampled in shaders (2D, cube). Can be reused across programs.
- Texel: A pixel of a texture.
- UV (texture coordinates): 2D coords mapping geometry to texture space.
- Mipmap: Downsampled levels of a texture for better minification quality.
- Filtering: Sampling modes (`NEAREST`, `LINEAR`, mip filters).
- Wrapping: Addressing mode (`REPEAT`, `CLAMP_TO_EDGE`, `MIRRORED_REPEAT`).
- Anisotropic filtering: Extension that improves texture quality at grazing angles.

### Spaces and transforms
- Local/Model space: Coordinates relative to the object’s own origin.
- World space: After placing the object in the scene.
- View/Camera space: Coordinates relative to the camera.
- Clip space: After projection; before perspective divide.
- NDC (normalized device coordinates): Clip-space divided by w, range [-1, 1].
- Screen space: Pixel coordinates after viewport transform.
- Model (world) matrix: Transforms local → world.
- View matrix: Transforms world → camera.
- Projection matrix: Transforms camera → clip (orthographic or perspective).
- WVP (world-view-projection): Combined P * V * W transform (column-vector convention).
- Orthographic projection: Parallel projection; no perspective foreshortening.
- Perspective projection: Adds depth-based foreshortening using FOV/aspect.
- Translation: a uniform value fed into the vertex shader that denotes movement for all vertices
- Rotation: a uniform value fed into the vertex shader to rotate all vertices -> perform rotation first before translation. Rotation vector is [sin(angle), cos(angle)].
- Scale: record another uniform value and multiply before rotation.
- Transform matrix: combines all three modifications in one matrix. For 2D transformation, provide a 3 x 3 matrix.

### Drawing and pipeline
- Primitive topology: How vertices form shapes (TRIANGLES, LINES, STRIP, FAN).
- Draw call: A call to `gl.drawArrays` or `gl.drawElements`.
- Viewport: Rectangle on the canvas to render into.
- Scissor test: Clips rendering to a rectangle region.
- Depth test (Z-test): Discards fragments hidden behind others.
- Stencil test: Masking using the stencil buffer.
- Blending: Mixes fragment color with framebuffer (e.g., alpha blending).
- Premultiplied alpha: Colors multiplied by alpha to improve blending stability.
- Face culling: Skip back/front faces based on winding (CW/CCW).
- Winding order: Vertex order that defines a triangle’s front face.

### Framebuffers and passes
- Framebuffer (FBO): Offscreen render target with color/depth/stencil attachments.
- Renderbuffer: Non-texturable attachment (often depth/stencil/MSAA storage).
- Color/Depth/Stencil buffer: Framebuffer attachments for respective data.
- MSAA: Multisample anti-aliasing to reduce jaggies.
- Render-to-texture (RTT): Rendering into a texture for later use.
- Post-processing: Screen-space effects after the main render.

### Lighting and materials (basics)
- Normal: Per-vertex/per-fragment surface direction.
- Tangent space: Local space aligned to the surface; used for normal mapping.
- Normal map: Texture that perturbs normals for fine detail.
- TBN matrix: Tangent–Bitangent–Normal basis to transform between spaces.
- Albedo/Base color: Material base color without lighting.

### Cameras and culling
- Frustum: View volume after projection.
- Frustum culling: Skip objects outside the frustum.
- Occlusion culling: Skip objects hidden behind others (advanced).
- Infinite/virtual canvas: Large world using a floating origin and culling.

### Performance and organization
- Batching: Combine geometry/state to reduce draw calls.
- Instancing (WebGL2): Draw many copies with one call (`draw*Instanced`).
- State change: Switching program/texture/buffer; minimize where possible.
- Command buffer: Recorded GPU commands (concept; explicit in some APIs).
- Level of detail (LOD): Simpler meshes/textures at distance.
- Texture atlas: Pack sprites into one texture to reduce binds.
- Sprite/Quad: Two-triangle rect used for 2D rendering.

### Color and precision
- Linear vs sRGB: Color spaces; correct gamma handling is essential.
- Tone mapping: Map HDR values into displayable range.
- HDR: High dynamic range rendering.
- Precision qualifiers: `lowp`/`mediump`/`highp` in GLSL ES affect perf/quality.

### WebGL specifics
- WebGLRenderingContext: WebGL 1.0 context object.
- Extensions: Optional features (e.g., `OES_vertex_array_object`, `EXT_texture_filter_anisotropic`).
- Context loss/restore: Browsers can lose the GL context; handle events to recover.
- Resource lifetime: Delete GPU objects (`deleteTexture`, `deleteBuffer`, `deleteProgram`) to avoid leaks.

Notes
- Textures and buffers are context objects and can be shared across programs.
- Programs are unique to their attached/linked shaders; uniforms/locations are per-program.

