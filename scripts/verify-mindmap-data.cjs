// Dependency-free data regression for the framework mind map.
// node scripts/verify-mindmap-data.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attributes = {};
    this.events = {};
    this.style = {};
    this.className = '';
    this.textContent = '';
    this.clientWidth = 1000;
    this.clientHeight = 600;
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.classList = {
      add: (...names) => { this.className += ' ' + names.join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(x => !names.includes(x)).join(' '); }
    };
  }
  append(...items) { this.children.push(...items); for(const item of items)item.parentNode=this; }
  replaceChildren(...items) { this.children = [...items]; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(name, handler) { this.events[name] = handler; }
  contains(item) { return this===item||this.children.some(child=>child.contains?.(item)); }
  getBoundingClientRect() { return this.rect||{left:230,right:510,top:100,bottom:340,width:280,height:240}; }
  get offsetWidth() { return parseFloat(this.style.width) || 0; }
  get offsetHeight() { return parseFloat(this.style.height) || 0; }
}

const walk = (root, visit) => {
  visit(root);
  for (const child of root.children || []) walk(child, visit);
};
const matching = (root, name) => {
  const found = [];
  walk(root, item => {
    const classes = [item.className, item.attributes?.class].join(' ').split(/\s+/);
    if (classes.includes(name)) found.push(item);
  });
  return found;
};

const documentEvents={},timers=new Map();let timerId=0;
const document = {
  createElement: tag => new Element(tag),
  createElementNS: (_ns, tag) => new Element(tag),
  addEventListener(name,fn) { (documentEvents[name]??=[]).push(fn); },
  body: new Element('body'),
  documentElement: new Element('html'),
  fullscreenElement: null
};
const context = {
  document,
  window: {addEventListener() {}},
  innerWidth: 1440,
  innerHeight: 900,
  requestAnimationFrame: callback => callback(),
  setTimeout(fn){timers.set(++timerId,fn);return timerId},
  clearTimeout(id){timers.delete(id)}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','templates','hover-bridge.js'),'utf8'),context);
const script = fs.readFileSync(path.join(__dirname, '..', 'templates', 'relationship-mindmap.js'), 'utf8');
vm.runInContext(script, context);

const nodes = Array.from({length: 7}, (_, i) => ({id: `f${i+1}`, title: `框架${i+1}`, sourceOrder: i+1}));
const edges = [
  ['f1','f2'], ['f2','f3'], ['f3','f1'], // cycle / cross-link
  ['f4','f5'], ['f5','f6']              // separate component
].map(([from,to],i) => ({from,to,label:'支持',explanation:`关系${i+1}`,source:`来源${i+1}`,evidence:i===2?'inference':'material'}));
const host = new Element('div');
context.window.LFMMindMap.mount(host, {
  language:'zh-CN', title:'示例框架', nodes, edges,
  describe: id => new Element(`description-${id}`)
});

const count = name => matching(host,name).length;
const tools = matching(host,'lfm-mm-tools')[0];
const click = label => {
  const button = tools.children.find(item => item.tag === 'button' && item.textContent === label);
  assert(button, `Missing control: ${label}`);
  button.events.click();
};

assert.equal(count('lfm-mm-node') >= 3, true, 'Each independent component must be represented initially');
click('展开全部');
assert.equal(count('lfm-mm-node'),nodes.length,'Expand all must show every framework, including isolated ones');
assert.equal(count('lfm-mm-wire'),edges.length,'Expand all must show every original edge, including the cycle');
assert.equal(count('lfm-mm-edge-label'),edges.length,'Every edge must retain its label and hover target');
assert.equal(count('is-inference'),2,'The inference wire and its label must be marked');
click('收起');
click('展开全部');
assert.equal(count('lfm-mm-wire'),edges.length,'Collapsing and re-expanding must restore all edges');
console.log('PASS: framework mind map keeps disconnected nodes, cross-links, edge labels and inference after expand/collapse.');
const emit=(type,event={})=>{for(const fn of documentEvents[type]||[])fn(event)};
const node=matching(host,'lfm-mm-node')[0],hover=matching(document.body,'lfm-mm-hover')[0];
node.rect={left:100,right:200,top:100,bottom:160,width:100,height:60};
node.events.pointerenter();assert.equal(hover.attributes['aria-hidden'],'false');
node.events.pointerleave();assert.equal(timers.size,1);
emit('pointermove',{clientX:215,clientY:185,pointerType:'mouse'});
assert.equal(timers.size,0,'Moving diagonally through the corridor must cancel delayed close');
document.activeElement=hover;hover.events.focusin();node.events.pointerleave();
assert.equal(timers.size,0,'Keyboard focus inside explanation must retain it');
document.activeElement=null;emit('keydown',{key:'Escape'});assert.equal(hover.attributes['aria-hidden'],'true');
node.events.focusin();assert.equal(hover.attributes['aria-hidden'],'false');
emit('lfm-panel-change');assert.equal(hover.attributes['aria-hidden'],'true','Changing module must hide body-portaled explanation');
console.log('PASS: pointer corridor, focused explanation, Escape and module-switch cleanup.');
