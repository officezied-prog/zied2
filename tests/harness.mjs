/* =========================================================================
   TEST HARNESS — loads the real labsa.html in a Node VM behind a minimal
   DOM shim, so the algorithm tests run against the SHIPPING source rather
   than a copy that can drift out of sync with it.

   Only the app's pure functions are exercised (pixel buffers in, buffers
   or rectangles out). The shim exists purely so the surrounding UI code
   can evaluate without a browser; nothing in the tests depends on it.
   ========================================================================= */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fakeEl(id){
  const el = {
    id, value:'', textContent:'', innerHTML:'', src:'', placeholder:'',
    disabled:false, width:0, height:0, style:{}, dataset:{}, className:'',
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    appendChild(){}, removeChild(){}, setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){}, click(){}, focus(){},
    querySelector(){ return fakeEl('q'); }, querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {width:300,height:600,left:0,top:0}; },
    getContext(){ return fakeCtx(); }, toDataURL(){ return 'data:,'; },
    insertAdjacentHTML(){}, closest(){ return null; }, remove(){}
  };
  return el;
}
function fakeCtx(){
  return {
    drawImage(){}, save(){}, restore(){}, translate(){}, rotate(){}, scale(){},
    clearRect(){}, fillRect(){}, beginPath(){}, arc(){}, fill(){}, filter:'',
    globalAlpha:1, globalCompositeOperation:'source-over', shadowBlur:0,
    shadowColor:'', shadowOffsetX:0, shadowOffsetY:0,
    getImageData(x,y,w,h){ return { data:new Uint8ClampedArray(w*h*4), width:w, height:h }; },
    putImageData(){}, createImageData(w,h){ return { data:new Uint8ClampedArray(w*h*4), width:w, height:h }; }
  };
}

export function loadApp(file = 'labsa.html'){
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  // Take every <script> that has no src — the app ships its logic inline.
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if(!scripts.length) throw new Error('no inline <script> found in ' + file);

  const store = new Map();
  const sandbox = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
    Uint8ClampedArray, Uint8Array, Uint32Array, Int32Array, Float32Array, Float64Array, Map, Set,
    Promise, isNaN, parseInt, parseFloat, Intl,
    ImageData: class ImageData {
      constructor(data, w, h){ this.data = data; this.width = w; this.height = h; }
    },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: k => { store.delete(k); },
      clear: () => store.clear()
    },
    document: {
      documentElement: fakeEl('html'),
      body: fakeEl('body'),
      head: { appendChild(){} },
      getElementById: id => fakeEl(id),
      createElement: tag => fakeEl(tag),
      querySelector: () => fakeEl('q'),
      querySelectorAll: () => [],
      addEventListener(){}
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.addEventListener = () => {};
  sandbox.Image = class { set src(v){ this._src = v; } get src(){ return this._src; } };
  sandbox.FileReader = class { readAsDataURL(){} };
  sandbox.__store = store;

  vm.createContext(sandbox);
  /* `const`/`let` at script top level live in the global LEXICAL scope,
     not on the global object, so they are invisible as sandbox.X. This
     evaluates an expression inside the app's own scope instead. */
  sandbox.__eval = expr => vm.runInContext(expr, sandbox);
  for(const src of scripts){
    // `import(...)` inside the model loader is syntactically fine but must
    // never actually run under the harness; the tests never call it.
    vm.runInContext(src, sandbox, { filename: file });
  }
  return sandbox;
}

/* ---- synthetic image builders (pure, no canvas) ---- */
export function makeImage(w, h, fn){
  const data = new Uint8ClampedArray(w * h * 4);
  for(let y = 0; y < h; y++){
    for(let x = 0; x < w; x++){
      const [r, g, b, a = 255] = fn(x, y);
      const i = (y * w + x) * 4;
      data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = a;
    }
  }
  return { data, w, h };
}
/** A solid rectangle of `fg` on a field of `bg`. */
export function rectOnField(w, h, box, fg, bg){
  return makeImage(w, h, (x, y) =>
    (x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) ? fg : bg);
}
export function alphaAt(data, w, x, y){ return data[(y * w + x) * 4 + 3]; }
export function rgbAt(data, w, x, y){
  const i = (y * w + x) * 4;
  return [data[i], data[i+1], data[i+2]];
}
