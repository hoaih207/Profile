const shaderFiles = {
  sakura_point_vsh: '../shaders/sakura_point_vsh.glsl',
  sakura_point_fsh: '../shaders/sakura_point_fsh.glsl',
  fx_common_vsh: '../shaders/fx_common_vsh.glsl',
  bg_fsh: '../shaders/bg_fsh.glsl',
  fx_brightbuf_fsh: '../shaders/fx_brightbuf_fsh.glsl',
  fx_dirblur_r4_fsh: '../shaders/fx_dirblur_r4_fsh.glsl',
  fx_common_fsh: '../shaders/fx_common_fsh.glsl',
  pp_final_vsh: '../shaders/pp_final_vsh.glsl',
  pp_final_fsh: '../shaders/pp_final_fsh.glsl'
};

async function loadShaderSources() {
  await Promise.all(
    Object.entries(shaderFiles).map(async ([shaderId, shaderPath]) => {
      const response = await fetch(shaderPath);

      if (!response.ok) {
        throw new Error(`Không thể tải shader: ${shaderPath}`);
      }

      const shaderSource = await response.text();
      const shaderElement = document.createElement('script');

      shaderElement.id = shaderId;
      shaderElement.type = shaderId.endsWith('_vsh')
        ? 'x-shader/x-vertex'
        : 'x-shader/x-fragment';
      shaderElement.textContent = shaderSource;

      document.body.appendChild(shaderElement);
    })
  );
}