#/bin/bash
set -e

SOURCE_DIR='../three.js'
DEST_DIR='./libraries/three'

cp ${SOURCE_DIR}/build/* ${DEST_DIR}/
cp ${SOURCE_DIR}/examples/js/controls/OrbitControls.js ${DEST_DIR}/three-orbit-controls.js
cp ${SOURCE_DIR}/examples/js/shaders/{Convolution,Copy,Focus,Film}Shader.js ${DEST_DIR}/shaders/
cp ${SOURCE_DIR}/examples/js/lights/RectAreaLightUniformsLib.js ${DEST_DIR}/shaders/three-rect-area-light-uniforms.js
cp ${SOURCE_DIR}/examples/js/postprocessing/{Bloom,Film,Mask,Render,Shader}Pass.js ${DEST_DIR}/postprocessing/
cp ${SOURCE_DIR}/examples/js/postprocessing/EffectComposer.js ${DEST_DIR}/postprocessing/
cp ${SOURCE_DIR}/examples/js/loaders/GLTFLoader.js ${DEST_DIR}/three-gltf-loader.js
cp ${SOURCE_DIR}/examples/js/loaders/OBJLoader.js ${DEST_DIR}/three-obj-loader.js
cp ${SOURCE_DIR}/examples/js/loaders/MTLLoader.js ${DEST_DIR}/three-mtl-loader.js
cp ${SOURCE_DIR}/examples/js/vr/WebVR.js ${DEST_DIR}/three-webvr.js

# DRACO stuff
# cp ${SOURCE_DIR}/examples/js/loaders/DRACOLoader.js ${DEST_DIR}/three-draco-loader.js
# cp -r ${SOURCE_DIR}/examples/js/libs/draco/* ${DEST_DIR}/draco/

