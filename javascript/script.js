const Vector3 = {};
const Matrix44 = {};

Vector3.create = function (x, y, z) {
  return { x, y, z };
};

Vector3.dot = function (v0, v1) {
  return v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
};

Vector3.cross = function (v, v0, v1) {
  v.x = v0.y * v1.z - v0.z * v1.y;
  v.y = v0.z * v1.x - v0.x * v1.z;
  v.z = v0.x * v1.y - v0.y * v1.x;
};

Vector3.normalize = function (v) {
  let length = v.x * v.x + v.y * v.y + v.z * v.z;

  if (length > 0.00001) {
    length = 1.0 / Math.sqrt(length);
    v.x *= length;
    v.y *= length;
    v.z *= length;
  }
};

Vector3.arrayForm = function (v) {
  if (v.array) {
    v.array[0] = v.x;
    v.array[1] = v.y;
    v.array[2] = v.z;
  } else {
    v.array = new Float32Array([v.x, v.y, v.z]);
  }

  return v.array;
};

Matrix44.createIdentity = function () {
  return new Float32Array([
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0
  ]);
};

Matrix44.loadProjection = function (m, aspect, vdeg, near, far) {
  const h = near * Math.tan((vdeg * Math.PI) / 180.0 * 0.5) * 2.0;
  const w = h * aspect;

  m[0] = (2.0 * near) / w;
  m[1] = 0.0;
  m[2] = 0.0;
  m[3] = 0.0;

  m[4] = 0.0;
  m[5] = (2.0 * near) / h;
  m[6] = 0.0;
  m[7] = 0.0;

  m[8] = 0.0;
  m[9] = 0.0;
  m[10] = -(far + near) / (far - near);
  m[11] = -1.0;

  m[12] = 0.0;
  m[13] = 0.0;
  m[14] = (-2.0 * far * near) / (far - near);
  m[15] = 0.0;
};

Matrix44.loadLookAt = function (m, vpos, vlook, vup) {
  const frontv = Vector3.create(
    vpos.x - vlook.x,
    vpos.y - vlook.y,
    vpos.z - vlook.z
  );

  Vector3.normalize(frontv);

  const sidev = Vector3.create(1.0, 0.0, 0.0);
  Vector3.cross(sidev, vup, frontv);
  Vector3.normalize(sidev);

  const topv = Vector3.create(1.0, 0.0, 0.0);
  Vector3.cross(topv, frontv, sidev);
  Vector3.normalize(topv);

  m[0] = sidev.x;
  m[1] = topv.x;
  m[2] = frontv.x;
  m[3] = 0.0;

  m[4] = sidev.y;
  m[5] = topv.y;
  m[6] = frontv.y;
  m[7] = 0.0;

  m[8] = sidev.z;
  m[9] = topv.z;
  m[10] = frontv.z;
  m[11] = 0.0;

  m[12] = -(vpos.x * m[0] + vpos.y * m[4] + vpos.z * m[8]);
  m[13] = -(vpos.x * m[1] + vpos.y * m[5] + vpos.z * m[9]);
  m[14] = -(vpos.x * m[2] + vpos.y * m[6] + vpos.z * m[10]);
  m[15] = 1.0;
};

const timeInfo = {
  start: 0,
  prev: 0,
  delta: 0,
  elapsed: 0
};

let gl;

const renderSpec = {
  width: 0,
  height: 0,
  aspect: 1,
  array: new Float32Array(3),
  halfWidth: 0,
  halfHeight: 0,
  halfArray: new Float32Array(3)
};

renderSpec.setSize = function (w, h) {
  renderSpec.width = w;
  renderSpec.height = h;
  renderSpec.aspect = renderSpec.width / renderSpec.height;

  renderSpec.array[0] = renderSpec.width;
  renderSpec.array[1] = renderSpec.height;
  renderSpec.array[2] = renderSpec.aspect;

  renderSpec.halfWidth = Math.floor(w / 2);
  renderSpec.halfHeight = Math.floor(h / 2);

  renderSpec.halfArray[0] = renderSpec.halfWidth;
  renderSpec.halfArray[1] = renderSpec.halfHeight;
  renderSpec.halfArray[2] = renderSpec.halfWidth / renderSpec.halfHeight;
};

function deleteRenderTarget(rt) {
  gl.deleteFramebuffer(rt.frameBuffer);
  gl.deleteRenderbuffer(rt.renderBuffer);
  gl.deleteTexture(rt.texture);
}

function createRenderTarget(w, h) {
  const ret = {
    width: w,
    height: h,
    sizeArray: new Float32Array([w, h, w / h]),
    dtxArray: new Float32Array([1.0 / w, 1.0 / h])
  };

  ret.frameBuffer = gl.createFramebuffer();
  ret.renderBuffer = gl.createRenderbuffer();
  ret.texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, ret.texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  gl.bindFramebuffer(gl.FRAMEBUFFER, ret.frameBuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    ret.texture,
    0
  );

  gl.bindRenderbuffer(gl.RENDERBUFFER, ret.renderBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    ret.renderBuffer
  );

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return ret;
}

function compileShader(shaderType, shaderSource) {
  const shader = gl.createShader(shaderType);

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const errorLog = gl.getShaderInfoLog(shader);

    gl.deleteShader(shader);
    console.error(errorLog);

    return null;
  }

  return shader;
}

function createShader(vertexSource, fragmentSource, uniformList, attributeList) {
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

  if (vertexShader === null || fragmentShader === null) {
    return null;
  }

  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  program.uniforms = {};
  program.attributes = {};

  if (uniformList) {
    for (let i = 0; i < uniformList.length; i += 1) {
      const uniformName = uniformList[i];
      program.uniforms[uniformName] = gl.getUniformLocation(
        program,
        uniformName
      );
    }
  }

  if (attributeList) {
    for (let i = 0; i < attributeList.length; i += 1) {
      const attributeName = attributeList[i];
      program.attributes[attributeName] = gl.getAttribLocation(
        program,
        attributeName
      );
    }
  }

  return program;
}

function useShader(program) {
  gl.useProgram(program);

  for (const attribute in program.attributes) {
    if (program.attributes[attribute] >= 0) {
      gl.enableVertexAttribArray(program.attributes[attribute]);
    }
  }
}

function unuseShader(program) {
  for (const attribute in program.attributes) {
    if (program.attributes[attribute] >= 0) {
      gl.disableVertexAttribArray(program.attributes[attribute]);
    }
  }

  gl.useProgram(null);
}

const projection = {
  angle: 60,
  nearfar: new Float32Array([0.1, 100.0]),
  matrix: Matrix44.createIdentity()
};

const camera = {
  position: Vector3.create(0, 0, 100),
  lookat: Vector3.create(0, 0, 0),
  up: Vector3.create(0, 1, 0),
  dof: Vector3.create(10.0, 4.0, 8.0),
  matrix: Matrix44.createIdentity()
};

const pointFlower = {};
let sceneStandBy = false;

function BlossomParticle() {
  this.velocity = new Array(3);
  this.rotation = new Array(3);
  this.position = new Array(3);
  this.euler = new Array(3);
  this.size = 1.0;
  this.alpha = 1.0;
  this.zkey = 0.0;
}

BlossomParticle.prototype.setVelocity = function (vx, vy, vz) {
  this.velocity[0] = vx;
  this.velocity[1] = vy;
  this.velocity[2] = vz;
};

BlossomParticle.prototype.setRotation = function (rx, ry, rz) {
  this.rotation[0] = rx;
  this.rotation[1] = ry;
  this.rotation[2] = rz;
};

BlossomParticle.prototype.setPosition = function (nx, ny, nz) {
  this.position[0] = nx;
  this.position[1] = ny;
  this.position[2] = nz;
};

BlossomParticle.prototype.setEulerAngles = function (rx, ry, rz) {
  this.euler[0] = rx;
  this.euler[1] = ry;
  this.euler[2] = rz;
};

BlossomParticle.prototype.setSize = function (size) {
  this.size = size;
};

BlossomParticle.prototype.update = function (deltaTime) {
  this.position[0] += this.velocity[0] * deltaTime;
  this.position[1] += this.velocity[1] * deltaTime;
  this.position[2] += this.velocity[2] * deltaTime;

  this.euler[0] += this.rotation[0] * deltaTime;
  this.euler[1] += this.rotation[1] * deltaTime;
  this.euler[2] += this.rotation[2] * deltaTime;
};

function createPointFlowers() {
  const pointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);

  renderSpec.pointSize = {
    min: pointSizeRange[0],
    max: pointSizeRange[1]
  };

  const vertexSource =
    document.getElementById('sakura_point_vsh').textContent;

  const fragmentSource =
    document.getElementById('sakura_point_fsh').textContent;

  pointFlower.program = createShader(
    vertexSource,
    fragmentSource,
    [
      'uProjection',
      'uModelview',
      'uResolution',
      'uOffset',
      'uDOF',
      'uFade'
    ],
    ['aPosition', 'aEuler', 'aMisc']
  );

  if (!pointFlower.program) {
    throw new Error('Không thể tạo Sakura shader program.');
  }

  pointFlower.offset = new Float32Array([0.0, 0.0, 0.0]);
  pointFlower.fader = Vector3.create(0.0, 10.0, 0.0);
  pointFlower.numFlowers = 1600;
  pointFlower.particles = new Array(pointFlower.numFlowers);

  pointFlower.dataArray = new Float32Array(
    pointFlower.numFlowers * (3 + 3 + 2)
  );

  pointFlower.positionArrayOffset = 0;
  pointFlower.eulerArrayOffset = pointFlower.numFlowers * 3;
  pointFlower.miscArrayOffset = pointFlower.numFlowers * 6;

  pointFlower.buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  for (let i = 0; i < pointFlower.numFlowers; i += 1) {
    pointFlower.particles[i] = new BlossomParticle();
  }
}

function initPointFlowers() {
  pointFlower.area = Vector3.create(20.0, 20.0, 20.0);
  pointFlower.area.x = pointFlower.area.y * renderSpec.aspect;

  pointFlower.fader.x = 10.0;
  pointFlower.fader.y = pointFlower.area.z;
  pointFlower.fader.z = 0.1;

  const pi2 = Math.PI * 2.0;
  const temporaryVector = Vector3.create(0, 0, 0);

  const symmetryRandom = function () {
    return Math.random() * 2.0 - 1.0;
  };

  for (let i = 0; i < pointFlower.numFlowers; i += 1) {
    const particle = pointFlower.particles[i];

    temporaryVector.x = symmetryRandom() * 0.3 + 0.8;
    temporaryVector.y = symmetryRandom() * 0.2 - 1.0;
    temporaryVector.z = symmetryRandom() * 0.3 + 0.5;

    Vector3.normalize(temporaryVector);

    const speed = 2.0 + Math.random() * 1.0;

    particle.setVelocity(
      temporaryVector.x * speed,
      temporaryVector.y * speed,
      temporaryVector.z * speed
    );

    particle.setRotation(
      symmetryRandom() * pi2 * 0.5,
      symmetryRandom() * pi2 * 0.5,
      symmetryRandom() * pi2 * 0.5
    );

    particle.setPosition(
      symmetryRandom() * pointFlower.area.x,
      symmetryRandom() * pointFlower.area.y,
      symmetryRandom() * pointFlower.area.z
    );

    particle.setEulerAngles(
      Math.random() * Math.PI * 2.0,
      Math.random() * Math.PI * 2.0,
      Math.random() * Math.PI * 2.0
    );

    particle.setSize(0.9 + Math.random() * 0.1);
  }
}

function renderPointFlowers() {
  const pi2 = Math.PI * 2.0;

  const repeatPosition = function (particle, component, limit) {
    if (
      Math.abs(particle.position[component]) -
        particle.size * 0.5 >
      limit
    ) {
      if (particle.position[component] > 0) {
        particle.position[component] -= limit * 2.0;
      } else {
        particle.position[component] += limit * 2.0;
      }
    }
  };

  const repeatEuler = function (particle, component) {
    particle.euler[component] %= pi2;

    if (particle.euler[component] < 0.0) {
      particle.euler[component] += pi2;
    }
  };

  for (let i = 0; i < pointFlower.numFlowers; i += 1) {
    const particle = pointFlower.particles[i];

    particle.update(timeInfo.delta);

    repeatPosition(particle, 0, pointFlower.area.x);
    repeatPosition(particle, 1, pointFlower.area.y);
    repeatPosition(particle, 2, pointFlower.area.z);

    repeatEuler(particle, 0);
    repeatEuler(particle, 1);
    repeatEuler(particle, 2);

    particle.alpha = 1.0;

    particle.zkey =
      camera.matrix[2] * particle.position[0] +
      camera.matrix[6] * particle.position[1] +
      camera.matrix[10] * particle.position[2] +
      camera.matrix[14];
  }

  pointFlower.particles.sort((particle0, particle1) => {
    return particle0.zkey - particle1.zkey;
  });

  let positionIndex = pointFlower.positionArrayOffset;
  let eulerIndex = pointFlower.eulerArrayOffset;
  let miscIndex = pointFlower.miscArrayOffset;

  for (let i = 0; i < pointFlower.numFlowers; i += 1) {
    const particle = pointFlower.particles[i];

    pointFlower.dataArray[positionIndex] = particle.position[0];
    pointFlower.dataArray[positionIndex + 1] = particle.position[1];
    pointFlower.dataArray[positionIndex + 2] = particle.position[2];
    positionIndex += 3;

    pointFlower.dataArray[eulerIndex] = particle.euler[0];
    pointFlower.dataArray[eulerIndex + 1] = particle.euler[1];
    pointFlower.dataArray[eulerIndex + 2] = particle.euler[2];
    eulerIndex += 3;

    pointFlower.dataArray[miscIndex] = particle.size;
    pointFlower.dataArray[miscIndex + 1] = particle.alpha;
    miscIndex += 2;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const program = pointFlower.program;

  useShader(program);

  gl.uniformMatrix4fv(
    program.uniforms.uProjection,
    false,
    projection.matrix
  );

  gl.uniformMatrix4fv(
    program.uniforms.uModelview,
    false,
    camera.matrix
  );

  gl.uniform3fv(program.uniforms.uResolution, renderSpec.array);
  gl.uniform3fv(program.uniforms.uDOF, Vector3.arrayForm(camera.dof));
  gl.uniform3fv(
    program.uniforms.uFade,
    Vector3.arrayForm(pointFlower.fader)
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(
    program.attributes.aPosition,
    3,
    gl.FLOAT,
    false,
    0,
    pointFlower.positionArrayOffset * Float32Array.BYTES_PER_ELEMENT
  );

  gl.vertexAttribPointer(
    program.attributes.aEuler,
    3,
    gl.FLOAT,
    false,
    0,
    pointFlower.eulerArrayOffset * Float32Array.BYTES_PER_ELEMENT
  );

  gl.vertexAttribPointer(
    program.attributes.aMisc,
    2,
    gl.FLOAT,
    false,
    0,
    pointFlower.miscArrayOffset * Float32Array.BYTES_PER_ELEMENT
  );

  for (let i = 1; i < 2; i += 1) {
    const zPosition = i * -2.0;

    const offsets = [
      [-1.0, -1.0],
      [-1.0, 1.0],
      [1.0, -1.0],
      [1.0, 1.0]
    ];

    for (const [x, y] of offsets) {
      pointFlower.offset[0] = pointFlower.area.x * x;
      pointFlower.offset[1] = pointFlower.area.y * y;
      pointFlower.offset[2] = pointFlower.area.z * zPosition;

      gl.uniform3fv(program.uniforms.uOffset, pointFlower.offset);
      gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers);
    }
  }

  pointFlower.offset[0] = 0.0;
  pointFlower.offset[1] = 0.0;
  pointFlower.offset[2] = 0.0;

  gl.uniform3fv(program.uniforms.uOffset, pointFlower.offset);
  gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  unuseShader(program);

  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
}

function createEffectProgram(
  vertexSource,
  fragmentSource,
  extraUniforms,
  extraAttributes
) {
  const effect = {};
  let uniforms = ['uResolution', 'uSrc', 'uDelta'];
  let attributes = ['aPosition'];

  if (extraUniforms) {
    uniforms = uniforms.concat(extraUniforms);
  }

  if (extraAttributes) {
    attributes = attributes.concat(extraAttributes);
  }

  effect.program = createShader(
    vertexSource,
    fragmentSource,
    uniforms,
    attributes
  );

  if (!effect.program) {
    throw new Error('Không thể tạo effect shader program.');
  }

  effect.dataArray = new Float32Array([
    -1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0,
    1.0,
    1.0,
    1.0
  ]);

  effect.buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, effect.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, effect.dataArray, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return effect;
}

function useEffect(effect, sourceTexture) {
  const program = effect.program;

  useShader(program);
  gl.uniform3fv(program.uniforms.uResolution, renderSpec.array);

  if (sourceTexture !== null) {
    gl.uniform2fv(
      program.uniforms.uDelta,
      sourceTexture.dtxArray
    );

    gl.uniform1i(program.uniforms.uSrc, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture.texture);
  }
}

function drawEffect(effect) {
  gl.bindBuffer(gl.ARRAY_BUFFER, effect.buffer);

  gl.vertexAttribPointer(
    effect.program.attributes.aPosition,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function unuseEffect(effect) {
  unuseShader(effect.program);
}

const effectLib = {};

function createEffectLib() {
  const commonVertexSource =
    document.getElementById('fx_common_vsh').textContent;

  let fragmentSource =
    document.getElementById('bg_fsh').textContent;

  effectLib.sceneBg = createEffectProgram(
    commonVertexSource,
    fragmentSource,
    ['uTimes'],
    null
  );

  fragmentSource =
    document.getElementById('fx_brightbuf_fsh').textContent;

  effectLib.mkBrightBuf = createEffectProgram(
    commonVertexSource,
    fragmentSource,
    null,
    null
  );

  fragmentSource =
    document.getElementById('fx_dirblur_r4_fsh').textContent;

  effectLib.dirBlur = createEffectProgram(
    commonVertexSource,
    fragmentSource,
    ['uBlurDir'],
    null
  );

  const finalVertexSource =
    document.getElementById('pp_final_vsh').textContent;

  fragmentSource =
    document.getElementById('pp_final_fsh').textContent;

  effectLib.finalComp = createEffectProgram(
    finalVertexSource,
    fragmentSource,
    ['uBloom'],
    null
  );
}

function createBackground() {}

function initBackground() {}

function renderBackground() {
  gl.disable(gl.DEPTH_TEST);

  useEffect(effectLib.sceneBg, null);

  gl.uniform2f(
    effectLib.sceneBg.program.uniforms.uTimes,
    timeInfo.elapsed,
    timeInfo.delta
  );

  drawEffect(effectLib.sceneBg);
  unuseEffect(effectLib.sceneBg);

  gl.enable(gl.DEPTH_TEST);
}

function createPostProcess() {}

function initPostProcess() {}

function renderPostProcess() {
  gl.disable(gl.DEPTH_TEST);

  const bindRenderTarget = function (renderTarget, clear) {
    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      renderTarget.frameBuffer
    );

    gl.viewport(
      0,
      0,
      renderTarget.width,
      renderTarget.height
    );

    if (clear) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
  };

  bindRenderTarget(renderSpec.wHalfRT0, true);

  useEffect(effectLib.mkBrightBuf, renderSpec.mainRT);
  drawEffect(effectLib.mkBrightBuf);
  unuseEffect(effectLib.mkBrightBuf);

  for (let i = 0; i < 2; i += 1) {
    const blurPosition = 1.5 + i;
    const blurSize = 2.0 + i;

    bindRenderTarget(renderSpec.wHalfRT1, true);

    useEffect(effectLib.dirBlur, renderSpec.wHalfRT0);

    gl.uniform4f(
      effectLib.dirBlur.program.uniforms.uBlurDir,
      blurPosition,
      0.0,
      blurSize,
      0.0
    );

    drawEffect(effectLib.dirBlur);
    unuseEffect(effectLib.dirBlur);

    bindRenderTarget(renderSpec.wHalfRT0, true);

    useEffect(effectLib.dirBlur, renderSpec.wHalfRT1);

    gl.uniform4f(
      effectLib.dirBlur.program.uniforms.uBlurDir,
      0.0,
      blurPosition,
      0.0,
      blurSize
    );

    drawEffect(effectLib.dirBlur);
    unuseEffect(effectLib.dirBlur);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, renderSpec.width, renderSpec.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  useEffect(effectLib.finalComp, renderSpec.mainRT);

  gl.uniform1i(
    effectLib.finalComp.program.uniforms.uBloom,
    1
  );

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(
    gl.TEXTURE_2D,
    renderSpec.wHalfRT0.texture
  );

  drawEffect(effectLib.finalComp);
  unuseEffect(effectLib.finalComp);

  gl.enable(gl.DEPTH_TEST);
}

function createScene() {
  createEffectLib();
  createBackground();
  createPointFlowers();
  createPostProcess();

  sceneStandBy = true;
}

function initScene() {
  initBackground();
  initPointFlowers();
  initPostProcess();

  camera.position.z =
    pointFlower.area.z + projection.nearfar[0];

  projection.angle =
    (Math.atan2(
      pointFlower.area.y,
      camera.position.z + pointFlower.area.z
    ) *
      180.0) /
    Math.PI *
    2.0;

  Matrix44.loadProjection(
    projection.matrix,
    renderSpec.aspect,
    projection.angle,
    projection.nearfar[0],
    projection.nearfar[1]
  );
}

function renderScene() {
  Matrix44.loadLookAt(
    camera.matrix,
    camera.position,
    camera.lookat,
    camera.up
  );

  gl.enable(gl.DEPTH_TEST);

  gl.bindFramebuffer(
    gl.FRAMEBUFFER,
    renderSpec.mainRT.frameBuffer
  );

  gl.viewport(
    0,
    0,
    renderSpec.mainRT.width,
    renderSpec.mainRT.height
  );

  gl.clearColor(0.005, 0, 0.05, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderBackground();
  renderPointFlowers();
  renderPostProcess();
}

function onResize() {
  const canvas = document.getElementById('sakura');

  makeCanvasFullScreen(canvas);
  setViewports();

  if (sceneStandBy) {
    initScene();
  }
}

function setViewports() {
  renderSpec.setSize(gl.canvas.width, gl.canvas.height);

  gl.clearColor(0.2, 0.2, 0.5, 1.0);
  gl.viewport(0, 0, renderSpec.width, renderSpec.height);

  const setRenderTarget = function (targetName, width, height) {
    const renderTarget = renderSpec[targetName];

    if (renderTarget) {
      deleteRenderTarget(renderTarget);
    }

    renderSpec[targetName] = createRenderTarget(
      width,
      height
    );
  };

  setRenderTarget(
    'mainRT',
    renderSpec.width,
    renderSpec.height
  );

  setRenderTarget(
    'wFullRT0',
    renderSpec.width,
    renderSpec.height
  );

  setRenderTarget(
    'wFullRT1',
    renderSpec.width,
    renderSpec.height
  );

  setRenderTarget(
    'wHalfRT0',
    renderSpec.halfWidth,
    renderSpec.halfHeight
  );

  setRenderTarget(
    'wHalfRT1',
    renderSpec.halfWidth,
    renderSpec.halfHeight
  );
}

function render() {
  renderScene();
}

let animating = true;

function toggleAnimation(element) {
  animating = !animating;

  if (animating) {
    animate();
  }

  if (element) {
    element.innerHTML = animating ? 'Stop' : 'Start';
  }
}

function stepAnimation() {
  if (!animating) {
    animate();
  }
}

function animate() {
  const currentDate = new Date();

  timeInfo.elapsed =
    (currentDate - timeInfo.start) / 1000.0;

  timeInfo.delta =
    (currentDate - timeInfo.prev) / 1000.0;

  timeInfo.prev = currentDate;

  if (animating) {
    window.requestAnimationFrame(animate);
  }

  render();
}

function makeCanvasFullScreen(canvas) {
  const body = document.body;
  const documentElement = document.documentElement;

  const fullWidth = Math.max(
    body.clientWidth,
    body.scrollWidth,
    documentElement.scrollWidth,
    documentElement.clientWidth
  );

  const fullHeight = Math.max(
    body.clientHeight,
    body.scrollHeight,
    documentElement.scrollHeight,
    documentElement.clientHeight
  );

  canvas.width = fullWidth;
  canvas.height = fullHeight;
}

function setRequestAnimationFrame(windowObject) {
  windowObject.requestAnimationFrame =
    windowObject.requestAnimationFrame ||
    windowObject.webkitRequestAnimationFrame ||
    windowObject.mozRequestAnimationFrame ||
    windowObject.msRequestAnimationFrame ||
    windowObject.oRequestAnimationFrame ||
    function (callback) {
      return windowObject.setTimeout(callback, 1000 / 60);
    };
}

function setupThemeToggle() {
  const toggle = document.querySelector('.toggle__theme');
  const card = document.querySelector('.app');

  if (!toggle || !card) {
    return;
  }

  toggle.addEventListener('click', () => {
    const theme = toggle.querySelector('.fas');

    if (!theme) {
      return;
    }

    if (theme.classList.contains('fa-moon')) {
      theme.classList.remove('fa-moon');
      theme.classList.add('fa-sun');
      card.classList.add('dark');
    } else {
      theme.classList.remove('fa-sun');
      theme.classList.add('fa-moon');
      card.classList.remove('dark');
    }
  });
}

function setupPageProtection() {
  document.onselectstart = function () {
    return false;
  };

  if (window.sidebar) {
    document.onmousedown = function () {
      return false;
    };

    document.onclick = function () {
      return true;
    };
  }

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    const isMac = navigator.platform.includes('Mac');

    const blockedDevToolsKey =
      (event.ctrlKey &&
        event.shiftKey &&
        event.keyCode === 73) ||
      (event.ctrlKey &&
        event.shiftKey &&
        event.keyCode === 74) ||
      (event.keyCode === 83 &&
        (isMac ? event.metaKey : event.ctrlKey)) ||
      (event.ctrlKey && event.keyCode === 85) ||
      event.keyCode === 123;

    const blockedCopyKey =
      event.ctrlKey &&
      [67, 86, 85, 117].includes(event.keyCode);

    if (blockedDevToolsKey || blockedCopyKey) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

async function startApplication() {
  try {
    setRequestAnimationFrame(window);

    if (typeof loadShaderSources !== 'function') {
      throw new Error(
        'Không tìm thấy loadShaderSources(). Hãy kiểm tra shader-loader.js.'
      );
    }

    await loadShaderSources();

    const canvas = document.getElementById('sakura');

    if (!canvas) {
      throw new Error(
        'Không tìm thấy canvas có id="sakura".'
      );
    }

    makeCanvasFullScreen(canvas);

    gl =
      canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: true,
        premultipliedAlpha: false
      }) ||
      canvas.getContext('experimental-webgl');

    if (!gl) {
      throw new Error('Trình duyệt không hỗ trợ WebGL.');
    }

    window.addEventListener('resize', onResize);

    setViewports();
    createScene();
    initScene();

    const currentTime = new Date();

    timeInfo.start = currentTime;
    timeInfo.prev = currentTime;
    timeInfo.delta = 0;
    timeInfo.elapsed = 0;

    setupThemeToggle();
    setupPageProtection();

    animate();
  } catch (error) {
    console.error('Lỗi khởi tạo ứng dụng:', error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Không thể khởi tạo ứng dụng.';

    alert(errorMessage);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    startApplication,
    { once: true }
  );
} else {
  startApplication();
}