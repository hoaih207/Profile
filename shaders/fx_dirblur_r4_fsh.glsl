#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uSrc;
uniform vec2 uDelta;
uniform vec4 uBlurDir;

varying vec2 texCoord;
varying vec2 screenCoord;

void main(void) {
  vec4 col = texture2D(uSrc, texCoord);

  col += texture2D(
    uSrc,
    texCoord + uBlurDir.xy * uDelta
  );

  col += texture2D(
    uSrc,
    texCoord - uBlurDir.xy * uDelta
  );

  col += texture2D(
    uSrc,
    texCoord + (uBlurDir.xy + uBlurDir.zw) * uDelta
  );

  col += texture2D(
    uSrc,
    texCoord - (uBlurDir.xy + uBlurDir.zw) * uDelta
  );

  gl_FragColor = col / 5.0;
}