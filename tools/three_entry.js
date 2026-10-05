// Entrada de Three.js para el juego: el núcleo más los complementos que usamos, en un objeto global THREE
// (el juego no usa módulos ES). Se empaqueta con `npm run vendor:three` en vendor/three.min.js.
import * as T from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sky } from 'three/addons/objects/Sky.js';

const THREE = Object.assign({}, T, { mergeGeometries, mergeVertices, GLTFLoader, RoundedBoxGeometry, Sky });
globalThis.THREE = THREE;
