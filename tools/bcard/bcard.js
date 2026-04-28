// bcard.js — BCARD Generator v6

// ══════════════════════════════════════════════════════════
// 0. ADVANCED TOOLING
// ══════════════════════════════════════════════════════════
if (typeof window.registerAdvancedSlots === 'function') window.registerAdvancedSlots([]);
window.onAdvancedApply = () => renderBothSides();

// ══════════════════════════════════════════════════════════
// 1. STATE
// ══════════════════════════════════════════════════════════
let CARD_W = 1050, CARD_H = 600, SCALE = 0.5;
let currentSide = 'front';
let editMode = false, isTextEditing = false;
let selectedEl = null, selectedId = null;
let multiSelected = []; // array of element IDs for multi-select

// Interaction
let isDragging = false, isResizing = false, isRotating = false;
let dragStartX = 0, dragStartY = 0, dragStartElX = 0, dragStartElY = 0;
let dragStartW = 0, dragStartH = 0, resizeDir = '';
let rotateCenter = {x:0,y:0}, rotateStart = 0, rotateStartDeg = 0;

let zCounter = 10;
let fieldCounters = {email:0, phone:0, website:0, address:0, social:0};

let availableFonts = [
  {label:'DM Sans',          value:"'DM Sans', sans-serif"},
  {label:'Inter',            value:"'Inter', sans-serif"},
  {label:'Georgia',          value:"Georgia, serif"},
  {label:'Courier New',      value:"'Courier New', monospace"},
  {label:'Playfair Display', value:"'Playfair Display', serif"},
  {label:'Roboto',           value:"'Roboto', sans-serif"},
  {label:'Montserrat',       value:"'Montserrat', sans-serif"},
  {label:'Raleway',          value:"'Raleway', sans-serif"},
  {label:'Oswald',           value:"'Oswald', sans-serif"},
  {label:'Lato',             value:"'Lato', sans-serif"},
];
const customFontsStore = {};

const bgState = {
  front: {mode:'color', color1:'#1a1a2e', color1Wcgr:null, image:null, overlayColor:'#000000', overlayOp:0.3, overlayWcgr:null, wcgr:null},
  back:  {mode:'color', color1:'#0f3460', color1Wcgr:null, image:null, overlayColor:'#000000', overlayOp:0.3, overlayWcgr:null, wcgr:null},
};
const textColors = {front:'#ffffff', back:'#ffffff'};

// IDs for the virtual background-image elements that live in the elements array
const BG_EL_ID = {front:'bg-img-front', back:'bg-img-back'};

let logoLocked = true, logoNativeW = 0, logoNativeH = 0, logoFileName = '';
let extraImages = [];
const elements = {front:[], back:[]};
const FRONT_TEXT_IDS = ['el-name','el-title','el-org','el-tagline'];
const LOGO_ID = 'el-logo';

let panelSide = 'left';

// ── UNDO HISTORY ──
const MAX_HISTORY = 50;
let history = [];
let historyIdx = -1;

// ── SHAPES ──
const SHAPES = [
  {id:'rect',     label:'Rect',    isRect:true},
  {id:'square',   label:'Square',  isSquare:true},
  {id:'circle',   label:'Circle',  isCircle:true},
  {id:'ellipse',  label:'Ellipse', isEllipse:true},
  {id:'triangle', label:'Tri',     path:'M12 2 L22 22 L2 22 Z'},
  {id:'diamond',  label:'Diam.',   path:'M12 2 L22 12 L12 22 L2 12 Z'},
  {id:'pentagon', label:'Pent.',   path:'M12 2 L22 9.5 L18 21 L6 21 L2 9.5 Z'},
  {id:'hexagon',  label:'Hex',     path:'M5 2 L19 2 L24 12 L19 22 L5 22 L0 12 Z'},
  {id:'star',     label:'Star',    path:'M12 1 L14.8 9.2 L23 9.3 L16.6 14.5 L18.9 22.6 L12 17.8 L5.1 22.6 L7.4 14.5 L1 9.3 L9.2 9.2 Z'},
  {id:'arrow',    label:'Arrow',   path:'M2 9 H15 V5 L23 12 L15 19 V15 H2 Z'},
  {id:'heart',    label:'Heart',   path:'M12 20 C12 20 2 13 2 7 C2 4 4 2 7 2 C9.5 2 11 3.5 12 5 C13 3.5 14.5 2 17 2 C20 2 22 4 22 7 C22 13 12 20 12 20 Z'},
  {id:'parallelogram',label:'Para',path:'M4 2 L22 2 L20 22 L2 22 Z'},
];

// ══════════════════════════════════════════════════════════
// 2. INIT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildFontSelects();
  buildShapePicker();
  initPanelTabs();
  updateCardSize();
  initDefaultElements();
  loadSidePanelValues();
  renderBothSides();
  bindStageEvents();
  bindKeyboard();
  updateSideLabels();
  refreshLayers();

  let advEnabled = false;
  try { advEnabled = localStorage.getItem('advancedTooling') === 'true'; } catch(e) {}
  const advBtn = document.getElementById('advanced-open-button');
  if (advBtn) advBtn.style.display = advEnabled ? '' : 'none';
  // Show wcgr buttons when Advanced Tooling is on
  if (advEnabled) {
    document.querySelectorAll('.adv-only').forEach(el => el.style.display = '');
  }

  // Close shape picker on outside click
  document.addEventListener('mousedown', e => {
    const w = document.getElementById('shape-picker-wrap');
    if (w && !w.contains(e.target)) closeShapePicker();
  });

  // Push initial snapshot
  pushHistory();
});

function initDefaultElements() {
  const defs = [
    {id:'el-name',    x:.038,y:.55,w:.60,h:.14, fs:.058,fw:'700',key:'f-name'},
    {id:'el-title',   x:.038,y:.70,w:.60,h:.08, fs:.033,fw:'400',key:'f-title'},
    {id:'el-org',     x:.038,y:.79,w:.60,h:.08, fs:.028,fw:'500',key:'f-org'},
    {id:'el-tagline', x:.038,y:.89,w:.75,h:.065,fs:.022,fw:'300',key:'f-tagline'},
  ];
  defs.forEach(d => elements.front.push(makeTextEl({
    id:d.id, side:'front',
    x:d.x*CARD_W, y:d.y*CARD_H, w:d.w*CARD_W, h:d.h*CARD_H,
    fontSize:Math.round(d.fs*CARD_H), fontWeight:d.fw, key:d.key,
  })));
}

// ── Element factories ──
function makeTextEl(o) {
  return Object.assign({
    id:'el-'+Date.now()+Math.random().toString(36).slice(2,5),
    side:currentSide, type:'text',
    x:50,y:50,w:300,h:70, rotate:0,opacity:1,zIndex:zCounter++,
    text:'',fontSize:28,fontWeight:'400',fontStyle:'normal',
    textDecoration:'none',color:'',textAlign:'left',
    letterSpacing:0,lineHeight:1.35,fontFamily:'',
    scaleX:1,scaleY:1, visible:true, colorWcgr:null,
  }, o);
}
function makeImageEl(o) {
  return Object.assign({
    id:'img-'+Date.now()+Math.random().toString(36).slice(2,5),
    side:currentSide, type:'image',
    x:20,y:20,w:150,h:150, rotate:0,opacity:1,zIndex:zCounter++,
    src:'',clipShapeId:null,scaleX:1,scaleY:1, visible:true,
  }, o);
}
function makeShapeEl(shapeId, o) {
  return Object.assign({
    id:'shp-'+Date.now()+Math.random().toString(36).slice(2,5),
    side:currentSide, type:'shape',
    x:80,y:80,w:200,h:200, rotate:0,opacity:1,zIndex:zCounter++,
    shapeId, fill:'#2d9cdb', fillWcgr:null,
    stroke:'rgba(0,0,0,0)', strokeW:0,
    scaleX:1,scaleY:1, visible:true,
    subtractShape:null, mergedShapes:null,
  }, o);
}

// ══════════════════════════════════════════════════════════
// 3. UNDO / REDO
// ══════════════════════════════════════════════════════════
function snapshot() {
  return JSON.stringify({
    elements: {front:[...elements.front],back:[...elements.back]},
    bgState, textColors, CARD_W, CARD_H,
    fieldCounters, extraImages,
  });
}

function pushHistory() {
  // Trim forward history if we branched
  if (historyIdx < history.length - 1) history = history.slice(0, historyIdx + 1);
  history.push(snapshot());
  if (history.length > MAX_HISTORY) history.shift();
  historyIdx = history.length - 1;
  updateUndoUI();
}

function undo() {
  if (historyIdx <= 0) return;
  historyIdx--;
  restoreSnapshot(history[historyIdx]);
  updateUndoUI();
}

function redo() {
  if (historyIdx >= history.length - 1) return;
  historyIdx++;
  restoreSnapshot(history[historyIdx]);
  updateUndoUI();
}

function restoreSnapshot(snap) {
  const data = JSON.parse(snap);
  // Clear DOM
  ['front','back'].forEach(side => {
    elements[side].forEach(el => { const d=document.getElementById(`dom-${el.id}`);if(d)d.remove(); });
    elements[side] = data.elements[side] || [];
  });
  Object.assign(bgState.front, data.bgState?.front || {});
  Object.assign(bgState.back,  data.bgState?.back  || {});
  Object.assign(textColors, data.textColors || {});
  CARD_W = data.CARD_W || CARD_W;
  CARD_H = data.CARD_H || CARD_H;
  deselectElement();
  loadSidePanelValues();
  renderBothSides();
  refreshLayers();
}

function updateUndoUI() {
  const u = document.getElementById('undo-btn');
  const r = document.getElementById('redo-btn');
  if (u) u.classList.toggle('can-undo', historyIdx > 0);
  if (r) r.classList.toggle('can-undo', historyIdx < history.length - 1);
}

// ══════════════════════════════════════════════════════════
// 4. PANEL TABS
// ══════════════════════════════════════════════════════════
function initPanelTabs() {
  document.querySelectorAll('.panel-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.panel-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.panel-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
  if (tabId === 'layers') refreshLayers();
  if (tabId === 'elements') refreshPropsPane();
}

function switchToPropsTab() {
  switchTab('elements');
}

function togglePanelSide() {
  const shell = document.getElementById('bcard-shell');
  panelSide = panelSide === 'left' ? 'right' : 'left';
  shell.classList.toggle('panel-right', panelSide === 'right');
}

// ══════════════════════════════════════════════════════════
// 5. SIDE PANEL VALUES
// ══════════════════════════════════════════════════════════
function saveSidePanelValues(side) {
  const bg = bgState[side];
  bg.color1       = document.getElementById('bg-color1')?.value ?? bg.color1;
  bg.overlayOp    = parseFloat(document.getElementById('bg-overlay')?.value) ?? bg.overlayOp;
  bg.overlayColor = document.getElementById('bg-overlay-color')?.value ?? bg.overlayColor;
  textColors[side]= document.getElementById('text-color')?.value ?? textColors[side];
}

function loadSidePanelValues() {
  const bg = bgState[currentSide];
  const set = (id,v) => { const e=document.getElementById(id);if(e) e.value=v; };
  set('bg-color1', bg.color1);
  set('bg-overlay', bg.overlayOp);
  set('bg-overlay-color', bg.overlayColor);
  set('text-color', textColors[currentSide]);
  const h1=document.getElementById('bg-hex1'); if(h1) h1.textContent=bg.color1;
  const th=document.getElementById('text-hex'); if(th) th.textContent=textColors[currentSide];
  ['color','image'].forEach(mode => {
    const tab=document.querySelector(`.bc-mode-tab[data-mode="${mode}"]`);
    if(tab) tab.classList.toggle('active', bg.mode===mode);
    const panel=document.getElementById(`bg-${mode}-panel`);
    if(panel) panel.style.display = bg.mode===mode ? 'block':'none';
  });
  updateSideLabels();
  const fl = document.getElementById('flip-label');
  if (fl) fl.textContent = currentSide === 'front' ? 'Back' : 'Front';
}

function updateSideLabels() {
  const lbl = currentSide==='front' ? '(Front)' : '(Back)';
  const e1=document.getElementById('bg-side-label'); if(e1) e1.textContent=lbl;
  const e2=document.getElementById('tc-side-label'); if(e2) e2.textContent=lbl;
}

function onBgColorChange() {
  const bg=bgState[currentSide];
  bg.color1=document.getElementById('bg-color1')?.value??bg.color1;
  const h1=document.getElementById('bg-hex1');if(h1)h1.textContent=bg.color1;
  renderCurrentSide();
}

function onTextColorChange() {
  textColors[currentSide]=document.getElementById('text-color')?.value??'#ffffff';
  const th=document.getElementById('text-hex');if(th)th.textContent=textColors[currentSide];
  renderCurrentSide();
}

// ══════════════════════════════════════════════════════════
// 6. RENDERING
// ══════════════════════════════════════════════════════════
function updateCard() {
  FRONT_TEXT_IDS.forEach(id => {
    const el=elements.front.find(e=>e.id===id);if(!el)return;
    const inp=document.getElementById(el.key);if(inp)el.text=inp.value;
  });
  renderBothSides();
}

function renderBothSides() { renderSide('front'); renderSide('back'); }
function renderCurrentSide() { renderSide(currentSide); }

function renderSide(side) {
  const face=document.getElementById(`card-${side}`);if(!face)return;
  applyBackground(face,side);
  elements[side].forEach(el => { if(el.visible!==false) renderElement(el); else hideElement(el); });
}

function hideElement(elData) {
  const d=document.getElementById(`dom-${elData.id}`);
  if(d) d.style.display='none';
}

// ── Background image element factory ──
function makeBgImageEl(side, src) {
  return {
    id: BG_EL_ID[side],
    side, type:'bgimage',
    x:0, y:0, w:CARD_W, h:CARD_H,
    rotate:0, opacity:1, zIndex:1,
    src, scaleX:1, scaleY:1, visible:true,
    // overlay stored separately in bgState
  };
}

function applyBackground(face, side) {
  const bg = bgState[side];

  // WCGR gradient on background (from advanced tooling)
  if (bg.wcgr) {
    const type = bg.wcgr.type || 'linear';
    if (type === 'linear' && window.wcgrToCSS) {
      face.style.backgroundImage = window.wcgrToCSS(bg.wcgr);
      face.style.backgroundSize = ''; face.style.backgroundPosition = '';
      face.style.backgroundColor = '';
    } else if (window.wcgrRenderToCanvas) {
      const oc = window.wcgrRenderToCanvas(bg.wcgr, CARD_W, CARD_H);
      face.style.backgroundImage = `url(${oc.toDataURL()})`;
      face.style.backgroundSize = '100% 100%'; face.style.backgroundPosition = '0 0';
      face.style.backgroundColor = '';
    } else if (window.wcgrToCSS) {
      face.style.backgroundImage = window.wcgrToCSS(bg.wcgr);
      face.style.backgroundSize = ''; face.style.backgroundPosition = '';
      face.style.backgroundColor = '';
    }
    return;
  }

  // Solid color (or WCGR applied to the color slot)
  if (bg.mode === 'color') {
    if (bg.color1Wcgr && window.wcgrRenderToCanvas) {
      const oc = window.wcgrRenderToCanvas(bg.color1Wcgr, CARD_W, CARD_H);
      face.style.backgroundImage = `url(${oc.toDataURL()})`;
      face.style.backgroundSize = '100% 100%'; face.style.backgroundPosition = '0 0';
      face.style.backgroundColor = '';
    } else {
      face.style.backgroundImage = 'none';
      face.style.backgroundColor = bg.color1;
      face.style.backgroundSize = ''; face.style.backgroundPosition = '';
    }
  } else if (bg.mode === 'image') {
    // Background image is now rendered as a bgimage element, not as CSS background
    // The face itself just shows the base color underneath
    face.style.backgroundImage = 'none';
    face.style.backgroundColor = bg.color1;
    face.style.backgroundSize = ''; face.style.backgroundPosition = '';
  }
}

function renderElement(elData) {
  const face=document.getElementById(`card-${elData.side}`);if(!face)return;
  let domEl=document.getElementById(`dom-${elData.id}`);
  if(!domEl){
    domEl=document.createElement('div');
    domEl.id=`dom-${elData.id}`;
    domEl.className='card-el';
    face.appendChild(domEl);
    bindElementEvents(domEl,elData);
  } else if(domEl.parentElement!==face) face.appendChild(domEl);

  // Respect visibility — hidden elements should not be shown
  if(elData.visible===false){
    domEl.style.display='none';
    return;
  }
  domEl.style.display='';
  const s=SCALE,sx=elData.scaleX??1,sy=elData.scaleY??1;
  domEl.style.left  =(elData.x*s)+'px';
  domEl.style.top   =(elData.y*s)+'px';
  domEl.style.width =(elData.w*s)+'px';
  domEl.style.height=(elData.h*s)+'px';
  domEl.style.transform=`rotate(${elData.rotate||0}deg) scale(${sx},${sy})`;
  domEl.style.opacity=elData.opacity??1;
  domEl.style.zIndex=elData.zIndex;
  domEl.style.position='absolute';
  domEl.style.overflow='visible';

  if(elData.type==='text')     renderTextEl(domEl,elData);
  else if(elData.type==='image')   renderImageEl(domEl,elData);
  else if(elData.type==='shape')   renderShapeEl(domEl,elData);
  else if(elData.type==='bgimage') renderBgImageEl(domEl,elData);

  const isSel = selectedId===elData.id;
  const isMulti = multiSelected.includes(elData.id);
  domEl.classList.toggle('edit-hover', editMode && !isTextEditing);
  domEl.classList.remove('selected','multi-selected');
  if(isSel) domEl.classList.add('selected');
  else if(isMulti) domEl.classList.add('multi-selected');

  if(isSel && !isTextEditing) drawHandles(domEl,elData);
}

function renderTextEl(domEl,el) {
  domEl.classList.add('card-el-text');
  domEl.classList.remove('card-el-image','card-el-shape');
  const ff=document.getElementById('font-family')?.value||"'DM Sans',sans-serif";
  const tc=textColors[el.side]||'#ffffff';
  Object.assign(domEl.style,{
    fontFamily:el.fontFamily||ff,
    fontSize:((el.fontSize||28)*SCALE)+'px',
    fontWeight:el.fontWeight||'400',
    fontStyle:el.fontStyle||'normal',
    textDecoration:el.textDecoration||'none',
    color:el.color||tc,
    textAlign:el.textAlign||'left',
    letterSpacing:(el.letterSpacing||0)+'em',
    lineHeight:String(el.lineHeight||1.35),
    padding:'2px',
    cursor:editMode?(isTextEditing&&selectedId===el.id?'text':'move'):'default',
    background:'none',
    whiteSpace:'pre-wrap',wordBreak:'break-word',
  });
  if(domEl.getAttribute('contenteditable')!=='true') domEl.textContent=el.text||'';
}

function renderImageEl(domEl,el) {
  domEl.classList.add('card-el-image');
  domEl.classList.remove('card-el-text','card-el-shape');
  domEl.style.cursor=editMode?'move':'default';
  domEl.style.overflow='visible';
  if(!domEl.querySelector('img')){
    domEl.innerHTML='';
    const img=document.createElement('img');
    img.draggable=false;
    img.style.cssText='width:100%;height:100%;display:block;pointer-events:none;';
    domEl.appendChild(img);
  }
  const img=domEl.querySelector('img');
  img.src=el.src||'';
  img.style.objectFit='fill'; // free distort
  // Apply clip shape if set
  if(el.clipShapeId){
    domEl.style.clipPath=getClipPath(el.clipShapeId);
    img.style.objectFit='cover';
  } else {
    domEl.style.clipPath='none';
  }
}

function renderBgImageEl(domEl, el) {
  domEl.classList.add('card-el-image');
  domEl.classList.remove('card-el-text','card-el-shape');
  // Bg image elements fill the full card, z=1, not rotatable via handle (overlay handles it)
  domEl.style.cursor = editMode ? 'move' : 'default';
  domEl.style.overflow = 'visible';
  domEl.style.zIndex = 1;

  if (!domEl.querySelector('.bgimg-img')) {
    domEl.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'bgimg-img';
    img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none;object-fit:cover;';
    domEl.appendChild(img);
    // Overlay div
    const ov = document.createElement('div');
    ov.className = 'bgimg-overlay';
    ov.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    domEl.appendChild(ov);
  }

  const img = domEl.querySelector('.bgimg-img');
  const ov  = domEl.querySelector('.bgimg-overlay');
  img.src = el.src || '';

  const bg = bgState[el.side];
  // Apply overlay
  if (bg.overlayWcgr && window.wcgrRenderToCanvas) {
    const oc2 = window.wcgrRenderToCanvas(bg.overlayWcgr, Math.round(el.w*SCALE), Math.round(el.h*SCALE));
    ov.style.backgroundImage = `url(${oc2.toDataURL()})`;
    ov.style.backgroundSize = '100% 100%';
    ov.style.opacity = bg.overlayOp;
  } else {
    ov.style.backgroundImage = 'none';
    ov.style.backgroundColor = bg.overlayColor || '#000';
    ov.style.opacity = bg.overlayOp ?? 0.3;
  }
}

// ── WCGR color resolver: returns fill value (color string or pattern URL) ──
// For SVG fills, wcgr is applied via a dataURL background on the wrapper div
function resolveColor(color, wcgr, domEl, pw, ph) {
  // If wcgr is set, we'll handle it via a pattern — for SVG return the plain color
  // The wcgr is applied as a div background overlay with mix-blend-mode
  if (wcgr) {
    // Render wcgr into wrapper div's ::before, applied via data-wcgr-fill attribute
    if (window.wcgrRenderToCanvas) {
      const oc = window.wcgrRenderToCanvas(wcgr, Math.max(1,Math.round(pw)), Math.max(1,Math.round(ph)));
      domEl.dataset.wcgrFill = oc.toDataURL();
    }
    return 'transparent'; // SVG shape transparent; div background shows the wcgr
  }
  domEl.dataset.wcgrFill = '';
  return color || '#2d9cdb';
}

function renderShapeEl(domEl, el) {
  domEl.classList.add('card-el-shape');
  domEl.classList.remove('card-el-text','card-el-image');
  domEl.style.cursor = editMode ? 'move' : 'default';
  domEl.style.overflow = 'visible';
  domEl.style.position = 'absolute';

  const shape = SHAPES.find(s=>s.id===el.shapeId) || SHAPES[0];
  const fill   = el.fillWcgr ? 'transparent' : (el.fill || '#2d9cdb');
  const stroke = el.stroke || 'rgba(0,0,0,0)';
  const sw     = el.strokeW || 0;

  // Apply wcgr fill as element background if set
  if (el.fillWcgr && window.wcgrRenderToCanvas) {
    const oc = window.wcgrRenderToCanvas(el.fillWcgr, Math.max(1,Math.round(el.w*SCALE)), Math.max(1,Math.round(el.h*SCALE)));
    domEl.style.backgroundImage = `url(${oc.toDataURL()})`;
    domEl.style.backgroundSize  = '100% 100%';
  } else {
    domEl.style.backgroundImage = 'none';
  }

  function shapeInner(sh, fillVal, strokeVal, swVal) {
    const vb = '0 0 24 24';
    if (sh.isCircle)  return `<circle cx="12" cy="12" r="12" fill="${fillVal}" stroke="${strokeVal}" stroke-width="${swVal}" vector-effect="non-scaling-stroke"/>`;
    if (sh.isEllipse) return `<ellipse cx="12" cy="12" rx="12" ry="12" fill="${fillVal}" stroke="${strokeVal}" stroke-width="${swVal}" vector-effect="non-scaling-stroke"/>`;
    if (sh.isRect||sh.isSquare) return `<rect x="0" y="0" width="24" height="24" fill="${fillVal}" stroke="${strokeVal}" stroke-width="${swVal}" vector-effect="non-scaling-stroke"/>`;
    return `<path d="${sh.path}" fill="${fillVal}" stroke="${strokeVal}" stroke-width="${swVal}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  }

  let svgContent = '';
  if (el.subtractShape) {
    const sub = el.subtractShape;
    const cutShape = SHAPES.find(s=>s.id===sub.shapeId) || SHAPES[0];
    const cx=sub.relX*24, cy=sub.relY*24, cw=sub.relW*24, ch=sub.relH*24;
    const uid = `sub-${el.id.replace(/[^a-z0-9]/g,'')}`;
    svgContent=`<defs><mask id="${uid}"><rect x="0" y="0" width="24" height="24" fill="white"/>
      <g transform="translate(${cx},${cy}) scale(${cw/24},${ch/24})">${shapeInner(cutShape,'black','none','0')}</g>
    </mask></defs><g mask="url(#${uid})">${shapeInner(shape, fill, stroke, sw)}</g>`;
  } else if (el.mergedShapes) {
    svgContent = el.mergedShapes.map(ms=>{
      const cs = SHAPES.find(s=>s.id===ms.shapeId)||SHAPES[0];
      return `<g transform="translate(${ms.relX*24},${ms.relY*24}) scale(${ms.relW},${ms.relH})">${shapeInner(cs,fill,stroke,sw)}</g>`;
    }).join('');
  } else {
    svgContent = shapeInner(shape, fill, stroke, sw);
  }

  domEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" preserveAspectRatio="none" style="display:block;position:absolute;inset:0;overflow:visible;">${svgContent}</svg>`;
}

function getClipPath(shapeId) {
  const map={
    circle:'circle(50% at 50% 50%)',
    ellipse:'ellipse(50% 35% at 50% 50%)',
    square:'polygon(8% 8%,92% 8%,92% 92%,8% 92%)',
    rect:'polygon(4% 4%,96% 4%,96% 96%,4% 96%)',
    triangle:'polygon(50% 8%,93% 92%,7% 92%)',
    diamond:'polygon(50% 5%,95% 50%,50% 95%,5% 50%)',
    pentagon:'polygon(50% 5%,95% 39%,77% 91%,23% 91%,5% 39%)',
    hexagon:'polygon(25% 7%,75% 7%,100% 50%,75% 93%,25% 93%,0% 50%)',
    star:'polygon(50% 4%,61% 35%,95% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,5% 35%,39% 35%)',
    arrow:'polygon(8% 38%,67% 38%,67% 20%,95% 50%,67% 80%,67% 62%,8% 62%)',
    heart:'polygon(50% 85%,14% 50%,9% 30%,20% 14%,35% 12%,50% 25%,65% 12%,80% 14%,91% 30%,86% 50%)',
    parallelogram:'polygon(17% 5%,100% 5%,83% 95%,0% 95%)',
  };
  return map[shapeId]||'none';
}

// ══════════════════════════════════════════════════════════
// 7. LAYERS PANEL
// ══════════════════════════════════════════════════════════
function refreshLayers() {
  const list=document.getElementById('layers-list');if(!list)return;
  list.innerHTML='';

  ['front','back'].forEach(side=>{
    const sideEls=elements[side].slice().sort((a,b)=>b.zIndex-a.zIndex);
    if(sideEls.length===0) return;

    const header=document.createElement('div');
    header.style.cssText='font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--bc-muted);padding:6px 4px 3px;margin-top:4px;border-bottom:1px solid var(--bc-border);';
    header.textContent=(side==='front'?'▶ Front':'◀ Back')+` (${sideEls.length})`;
    list.appendChild(header);

    sideEls.forEach(el=>{
      const item=document.createElement('div');
      item.className='layer-item'+(el.id===selectedId?' active':'')+(multiSelected.includes(el.id)?' multi-selected':'');
      item.dataset.elId=el.id;

      const isBg = el.type==='bgimage';
      const icon = el.type==='text'?'️': isBg?'': el.type==='image'?'':'▲';
      const name = el.type==='text' ? (el.text||'Text').slice(0,18) :
                   isBg             ? ' Background Image' :
                   el.type==='image'? (extraImages.find(i=>i.id===el.id)?.name||'Image').slice(0,18) :
                   (el.shapeId||'Shape');
      const otherSide=side==='front'?'back':'front';
      const moveLabel=side==='front'?'→ Back':'← Front';
      const canMove = !isBg; // background images don't move sides

      item.innerHTML=`
        <span class="layer-drag-handle" title="Drag to reorder">⣿</span>
        <span class="layer-icon">${icon}</span>
        <span class="layer-name" title="${name}">${name}</span>
        ${canMove?`<button class="layer-move-btn" style="font-size:9px;padding:2px 5px;border:1px solid var(--bc-border);border-radius:3px;background:var(--bc-bg);color:var(--bc-muted);cursor:pointer;flex-shrink:0;white-space:nowrap;">${moveLabel}</button>`:'<span style="width:40px;flex-shrink:0"></span>'}
        <button class="layer-vis-btn" title="${el.visible===false?'Show':'Hide'}">
          ${el.visible===false?'X':'👁'}
        </button>
      `;

      item.addEventListener('click', e=>{
        if(e.target.classList.contains('layer-vis-btn')||
           e.target.classList.contains('layer-drag-handle')||
           e.target.classList.contains('layer-move-btn')) return;
        if(!editMode) toggleEditMode();
        if(el.side!==currentSide) flipCard();
        selectElement(el.id);
      });

      if(canMove){
        item.querySelector('.layer-move-btn').addEventListener('click',()=>{
          moveElementToSide(el.id, otherSide);
        });
      }

      item.querySelector('.layer-vis-btn').addEventListener('click',()=>{
        el.visible=el.visible===false?true:false;
        renderBothSides();
        refreshLayers();
        pushHistory();
      });

      setupLayerDrag(item, el);
      list.appendChild(item);
    });
  });
}

function setupLayerDrag(item, el) {
  const handle = item.querySelector('.layer-drag-handle');
  let dragEl = null;

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    dragEl = item;
    item.style.opacity = '.5';

    const onMove = ev => {
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.layer-item');
      document.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drag-over'));
      if(target && target !== dragEl) target.classList.add('drag-over');
    };
    const onUp = ev => {
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.layer-item');
      if(target && target !== dragEl) {
        const targetId = target.dataset.elId;
        const targetEl = findElement(targetId);
        if(targetEl){
          // Swap z-indices
          const tmp = el.zIndex;
          el.zIndex = targetEl.zIndex;
          targetEl.zIndex = tmp;
          renderBothSides();
          refreshLayers();
          pushHistory();
        }
      }
      item.style.opacity='';
      document.querySelectorAll('.layer-item').forEach(i=>i.classList.remove('drag-over'));
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  });
}

// Move an element from one side to the other
function moveElementToSide(id, toSide) {
  const fromSide = toSide === 'front' ? 'back' : 'front';
  const idx = elements[fromSide].findIndex(e=>e.id===id);
  if(idx===-1) return;
  const el = elements[fromSide].splice(idx, 1)[0];
  el.side = toSide;
  elements[toSide].push(el);
  // Move DOM element to correct face
  const domEl = document.getElementById(`dom-${el.id}`);
  const newFace = document.getElementById(`card-${toSide}`);
  if(domEl && newFace) newFace.appendChild(domEl);
  // If currently selected, deselect since side changed
  if(selectedId===id){
    deselectElement();
  }
  renderBothSides();
  refreshLayers();
  pushHistory();
}

// ══════════════════════════════════════════════════════════
// 8. SHAPE PICKER
// ══════════════════════════════════════════════════════════
function buildShapePicker() {
  const menu=document.getElementById('shape-picker-menu');if(!menu)return;
  SHAPES.forEach(sh=>{
    const btn=document.createElement('button');
    btn.className='shape-pick-btn';btn.title=sh.label;
    let svgInner='';
    if(sh.isCircle) svgInner=`<circle cx="12" cy="12" r="10" fill="#2d9cdb"/>`;
    else if(sh.isEllipse) svgInner=`<ellipse cx="12" cy="12" rx="10" ry="7" fill="#2d9cdb"/>`;
    else if(sh.isRect||sh.isSquare) svgInner=`<rect x="1" y="1" width="22" height="22" rx="1" fill="#2d9cdb"/>`;
    else svgInner=`<path d="${sh.path}" fill="#2d9cdb"/>`;
    btn.innerHTML=`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${svgInner}</svg>${sh.label}`;
    btn.addEventListener('click',()=>{addShapeElement(sh.id);closeShapePicker();});
    menu.appendChild(btn);
  });
}

function toggleShapePicker(){document.getElementById('shape-picker-menu')?.classList.toggle('open');}
function closeShapePicker(){document.getElementById('shape-picker-menu')?.classList.remove('open');}

function addShapeElement(shapeId){
  pushHistory();
  const el=makeShapeEl(shapeId);
  elements[currentSide].push(el);
  if(!editMode)toggleEditMode();
  renderElement(el);selectElement(el.id);
  refreshLayers();
}

// ══════════════════════════════════════════════════════════
// 9. MULTI-SELECT & CLIP
// ══════════════════════════════════════════════════════════
function addToMultiSelect(id) {
  if(!multiSelected.includes(id)) multiSelected.push(id);
  updateClipBar();
  renderBothSides();
}

function clearMultiSelect() {
  multiSelected=[];
  updateClipBar();
  renderBothSides();
}

function updateClipBar() {
  const bar  = document.getElementById('clip-bar');
  const hint = document.getElementById('multisel-hint');
  const els  = multiSelected.map(id=>findElement(id)).filter(Boolean);
  const images  = els.filter(e=>e.type==='image');
  const shapes  = els.filter(e=>e.type==='shape');
  const hasImage   = images.length > 0;
  const hasShape   = shapes.length > 0;
  const showClip   = els.length === 2 && hasImage && hasShape;
  const showSub    = shapes.length === 2 && els.length === 2;
  const showMerge  = shapes.length >= 2 && !hasImage;
  const showAny    = showClip || showSub || showMerge;

  if (bar) {
    bar.classList.toggle('show', showAny);
    const clipBtn   = bar.querySelector('#clip-action-btn');
    const subBtn    = bar.querySelector('#subtract-action-btn');
    const mergeBtn  = bar.querySelector('#merge-action-btn');
    if (clipBtn)  clipBtn.style.display  = showClip  ? '' : 'none';
    if (subBtn)   subBtn.style.display   = showSub   ? '' : 'none';
    if (mergeBtn) mergeBtn.style.display = showMerge ? '' : 'none';
  }
  if (hint) hint.style.display = multiSelected.length > 0 ? 'block' : 'none';
}

function clipImageToShape() {
  const els=multiSelected.map(id=>findElement(id)).filter(Boolean);
  const imgEl=els.find(e=>e.type==='image');
  const shapeEl=els.find(e=>e.type==='shape');
  if(!imgEl||!shapeEl) return;

  pushHistory();
  imgEl.clipShapeId=shapeEl.shapeId;
  // Size image to match shape
  imgEl.x=shapeEl.x; imgEl.y=shapeEl.y;
  imgEl.w=shapeEl.w; imgEl.h=shapeEl.h;

  // Remove the shape element
  ['front','back'].forEach(side=>{
    elements[side]=elements[side].filter(e=>e.id!==shapeEl.id);
    const d=document.getElementById(`dom-${shapeEl.id}`);if(d)d.remove();
  });

  clearMultiSelect();
  selectedId=null;selectedEl=null;
  selectElement(imgEl.id);
  renderBothSides();
  refreshLayers();
}

// Boolean subtract: top shape cuts a hole in the bottom shape
// Uses SVG clipPath with the top shape's geometry applied to the bottom shape
function subtractShapes() {
  const els=multiSelected.map(id=>findElement(id)).filter(Boolean);
  const shapes=els.filter(e=>e.type==='shape');
  if(shapes.length!==2) return;

  // Determine top (higher zIndex) and bottom
  const top   =shapes[0].zIndex>shapes[1].zIndex?shapes[0]:shapes[1];
  const bottom=shapes[0].zIndex>shapes[1].zIndex?shapes[1]:shapes[0];

  pushHistory();

  // Mark bottom shape as "has subtract" — render using SVG clipPath
  bottom.subtractShape={
    shapeId:top.shapeId,
    // Store the top shape's position relative to the bottom shape (in bottom-shape's local %, 0–1)
    relX:(top.x-bottom.x)/bottom.w,
    relY:(top.y-bottom.y)/bottom.h,
    relW:top.w/bottom.w,
    relH:top.h/bottom.h,
  };

  // Remove the top (cutter) shape
  ['front','back'].forEach(side=>{
    elements[side]=elements[side].filter(e=>e.id!==top.id);
    const d=document.getElementById(`dom-${top.id}`);if(d)d.remove();
  });

  clearMultiSelect();
  selectedId=null;selectedEl=null;
  selectElement(bottom.id);
  renderBothSides();
  refreshLayers();
}

// Merge 2+ shapes into one element — each child keeps its relative position/size
function mergeShapes() {
  const shapes = multiSelected.map(id=>findElement(id)).filter(e=>e&&e.type==='shape');
  if (shapes.length < 2) return;
  pushHistory();

  // Bounding box of all shapes
  const minX = Math.min(...shapes.map(s=>s.x));
  const minY = Math.min(...shapes.map(s=>s.y));
  const maxX = Math.max(...shapes.map(s=>s.x+s.w));
  const maxY = Math.max(...shapes.map(s=>s.y+s.h));
  const bw = maxX - minX, bh = maxY - minY;

  // Use the top-most shape's style for the merged element
  const topShape = shapes.reduce((a,b)=>a.zIndex>b.zIndex?a:b);
  const side = topShape.side;

  const merged = makeShapeEl(topShape.shapeId, {
    side, x:minX, y:minY, w:bw, h:bh,
    fill: topShape.fill, fillWcgr: topShape.fillWcgr||null,
    stroke: topShape.stroke, strokeW: topShape.strokeW,
    mergedShapes: shapes.map(s=>({
      shapeId: s.shapeId,
      relX: (s.x - minX) / bw,
      relY: (s.y - minY) / bh,
      relW: s.w / bw,
      relH: s.h / bh,
    })),
    subtractShape: null,
  });

  // Remove all source shapes
  shapes.forEach(s=>{
    ['front','back'].forEach(sd=>{
      elements[sd] = elements[sd].filter(e=>e.id!==s.id);
    });
    const d = document.getElementById(`dom-${s.id}`); if(d) d.remove();
  });

  elements[side].push(merged);
  clearMultiSelect();
  renderElement(merged);
  selectElement(merged.id);
  refreshLayers();
}

// ══════════════════════════════════════════════════════════
// 10. ELEMENT EVENTS
// ══════════════════════════════════════════════════════════
function bindElementEvents(domEl,elData){
  domEl.addEventListener('mousedown',e=>{
    if(!editMode)return;
    if(isTextEditing&&selectedId===elData.id)return;
    e.stopPropagation();

    // Ctrl/Cmd+click = multi-select
    if((e.ctrlKey||e.metaKey)){
      if(multiSelected.includes(elData.id)){
        multiSelected=multiSelected.filter(i=>i!==elData.id);
      } else {
        if(selectedId&&!multiSelected.includes(selectedId)) multiSelected.push(selectedId);
        addToMultiSelect(elData.id);
      }
      renderBothSides();
      return;
    }

    clearMultiSelect();

    if(e.detail===2&&elData.type==='text'){selectElement(elData.id);enterTextEdit(domEl,elData);return;}
    selectElement(elData.id);
    startDragEl(e,elData);
  });
  domEl.addEventListener('blur',()=>{
    if(elData.type==='text'&&domEl.getAttribute('contenteditable')==='true') exitTextEdit(domEl,elData);
  });
}

function enterTextEdit(domEl,elData){
  isTextEditing=true;clearHandles();
  domEl.setAttribute('contenteditable','true');
  domEl.style.cursor='text';domEl.focus();
  const range=document.createRange();range.selectNodeContents(domEl);range.collapse(false);
  const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
}

function exitTextEdit(domEl,elData){
  if(!isTextEditing)return;
  isTextEditing=false;
  elData.text=domEl.textContent;
  // Mark as user-edited so syncContactElements doesn't overwrite manual changes
  if(elData.id.startsWith('ct-')) elData._userEdited=true;
  domEl.removeAttribute('contenteditable');domEl.style.cursor='move';
  if(elData.key){const inp=document.getElementById(elData.key);if(inp)inp.value=elData.text;}
  renderElement(elData);
  refreshLayers();
  pushHistory();
}

function startDragEl(e,elData){
  if(isResizing||isRotating)return;
  isDragging=true;
  dragStartX=e.clientX;dragStartY=e.clientY;
  dragStartElX=elData.x;dragStartElY=elData.y;
  const onMove=ev=>{
    if(!isDragging)return;
    elData.x=dragStartElX+(ev.clientX-dragStartX)/SCALE;
    elData.y=dragStartElY+(ev.clientY-dragStartY)/SCALE;
    renderElement(elData);syncPropsPanel(elData);
  };
  const onUp=()=>{
    isDragging=false;
    document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
    pushHistory();
  };
  document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
}

// ══════════════════════════════════════════════════════════
// 11. SELECTION & HANDLES
// ══════════════════════════════════════════════════════════
function selectElement(id){
  if(selectedEl&&isTextEditing){const d=document.getElementById(`dom-${selectedEl.id}`);if(d)exitTextEdit(d,selectedEl);}
  clearHandles();selectedId=id;
  const elData=findElement(id);if(!elData){deselectElement();return;}
  selectedEl=elData;

  document.getElementById('sel-actions').style.display='';
  document.getElementById('text-toolbar').style.display=elData.type==='text'?'flex':'none';

  // Switch to props tab
  switchToPropsTab();
  syncPropsPanel(elData);
  renderSide(elData.side);
  refreshLayers();
}

function deselectElement(){
  if(selectedEl&&isTextEditing){const d=document.getElementById(`dom-${selectedEl.id}`);if(d)exitTextEdit(d,selectedEl);}
  if(selectedEl){const d=document.getElementById(`dom-${selectedEl.id}`);if(d)d.classList.remove('selected');}
  clearHandles();selectedId=null;selectedEl=null;isTextEditing=false;
  document.getElementById('sel-actions').style.display='none';
  document.getElementById('text-toolbar').style.display='none';
  refreshPropsPane();
  refreshLayers();
}

function refreshPropsPane(){
  const noSel=document.getElementById('no-selection-msg');
  const content=document.getElementById('props-content');
  if(noSel) noSel.style.display=selectedEl?'none':'block';
  if(content) content.style.display=selectedEl?'block':'none';
  if(selectedEl) syncPropsPanel(selectedEl);
}

function clearHandles(){document.querySelectorAll('.resize-handle,.rotate-handle,.rotate-line').forEach(h=>h.remove());}

const CORNER_DIRS=['nw','ne','se','sw'];
const EDGE_DIRS  =['n','s','e','w'];

function drawHandles(domEl,elData){
  clearHandles();
  [...CORNER_DIRS,...EDGE_DIRS].forEach(dir=>{
    const h=document.createElement('div');
    h.className=`resize-handle ${dir}`;
    h.addEventListener('mousedown',e=>{e.stopPropagation();startResize(e,elData,dir);});
    domEl.appendChild(h);
  });
  const line=document.createElement('div');line.className='rotate-line';domEl.appendChild(line);
  const rot=document.createElement('div');rot.className='rotate-handle';rot.textContent='↻';
  rot.addEventListener('mousedown',e=>{e.stopPropagation();startRotate(e,elData,domEl);});
  domEl.appendChild(rot);
}

// ══════════════════════════════════════════════════════════
// 12. RESIZE — edge=free, corner=proportional; SHIFT inverts
// ══════════════════════════════════════════════════════════
function startResize(e,elData,dir){
  isResizing=true;
  dragStartX=e.clientX;dragStartY=e.clientY;
  dragStartElX=elData.x;dragStartElY=elData.y;
  dragStartW=elData.w;dragStartH=elData.h;
  const isCornerHandle=CORNER_DIRS.includes(dir);
  const aspect=dragStartH/Math.max(dragStartW,1);

  const onMove=ev=>{
    if(!isResizing)return;
    const dx=(ev.clientX-dragStartX)/SCALE;
    const dy=(ev.clientY-dragStartY)/SCALE;
    const MIN=10;
    let nx=dragStartElX,ny=dragStartElY,nw=dragStartW,nh=dragStartH;
    // SHIFT inverts the constraint mode
    const proportional = isCornerHandle ? !ev.shiftKey : ev.shiftKey;

    if(proportional){
      // Proportional resize
      if(CORNER_DIRS.includes(dir)){
        const mag=Math.abs(dx)>Math.abs(dy)?Math.abs(dx):Math.abs(dy);
        const sign=dir.includes('e')?(dx>=0?1:-1):(dx<=0?1:-1);
        nw=Math.max(MIN,dragStartW+mag*sign);
        nh=nw*aspect;
        if(dir.includes('w')){nx=dragStartElX+(dragStartW-nw);}
        if(dir.includes('n')){ny=dragStartElY+(dragStartH-nh);}
      } else {
        // edge + shift = proportional
        let delta=0;
        if(dir==='e')delta=dx; else if(dir==='w')delta=-dx;
        else if(dir==='s')delta=dy; else if(dir==='n')delta=-dy;
        nw=Math.max(MIN,dragStartW+delta);nh=nw*aspect;
        if(dir==='w')nx=dragStartElX+(dragStartW-nw);
        if(dir==='n')ny=dragStartElY+(dragStartH-nh);
      }
    } else {
      // Free distort
      if(dir.includes('e'))nw=Math.max(MIN,dragStartW+dx);
      if(dir.includes('s'))nh=Math.max(MIN,dragStartH+dy);
      if(dir.includes('w')){nx=dragStartElX+dx;nw=Math.max(MIN,dragStartW-dx);}
      if(dir.includes('n')){ny=dragStartElY+dy;nh=Math.max(MIN,dragStartH-dy);}
    }
    elData.x=nx;elData.y=ny;elData.w=nw;elData.h=nh;
    renderElement(elData);syncPropsPanel(elData);
  };
  const onUp=()=>{
    isResizing=false;
    document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
    pushHistory();
  };
  document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
}

// ══════════════════════════════════════════════════════════
// 13. ROTATE
// ══════════════════════════════════════════════════════════
function startRotate(e,elData,domEl){
  isRotating=true;
  const rect=domEl.getBoundingClientRect();
  rotateCenter={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  rotateStart=Math.atan2(e.clientY-rotateCenter.y,e.clientX-rotateCenter.x)*180/Math.PI;
  rotateStartDeg=elData.rotate||0;
  const onMove=ev=>{
    if(!isRotating)return;
    let a=Math.atan2(ev.clientY-rotateCenter.y,ev.clientX-rotateCenter.x)*180/Math.PI;
    elData.rotate=rotateStartDeg+(a-rotateStart);
    if(ev.shiftKey)elData.rotate=Math.round(elData.rotate/15)*15;
    renderElement(elData);syncPropsPanel(elData);
  };
  const onUp=()=>{
    isRotating=false;
    document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
    pushHistory();
  };
  document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
}

// ══════════════════════════════════════════════════════════
// 14. STAGE EVENTS
// ══════════════════════════════════════════════════════════
function bindStageEvents(){
  document.getElementById('card-stage').addEventListener('mousedown',e=>{
    if(['card-front','card-back','card-stage'].includes(e.target.id)||e.target.classList.contains('side-pill')){
      if(!e.ctrlKey&&!e.metaKey){clearMultiSelect();deselectElement();}
    }
  });
}

// ══════════════════════════════════════════════════════════
// 15. EDIT MODE / FLIP / DELETE / ORDER
// ══════════════════════════════════════════════════════════
function toggleEditMode(){
  editMode=!editMode;
  const btn=document.getElementById('edit-mode-btn');
  btn.classList.toggle('active',editMode);
  btn.textContent=editMode?'✏ Editing':'✏ Edit';
  if(!editMode){deselectElement();clearMultiSelect();}
  renderBothSides();
}

function flipCard(){
  saveSidePanelValues(currentSide);deselectElement();clearMultiSelect();
  currentSide=currentSide==='front'?'back':'front';
  document.getElementById('card-front').style.display=currentSide==='front'?'block':'none';
  document.getElementById('card-back').style.display =currentSide==='back' ?'block':'none';
  loadSidePanelValues();
  refreshLayers();
}

function deleteSelected(){
  if(!selectedEl)return;
  pushHistory();
  const {side,id}=selectedEl;
  elements[side]=elements[side].filter(e=>e.id!==id);
  const d=document.getElementById(`dom-${id}`);if(d)d.remove();
  extraImages=extraImages.filter(i=>i.id!==id);
  renderExtraImagesList();deselectElement();refreshLayers();
}

function bringForward(){if(selectedEl){selectedEl.zIndex=++zCounter;renderElement(selectedEl);refreshLayers();pushHistory();}}
function sendBackward(){if(selectedEl&&selectedEl.zIndex>1){selectedEl.zIndex=Math.max(1,selectedEl.zIndex-2);renderElement(selectedEl);refreshLayers();pushHistory();}}

// ══════════════════════════════════════════════════════════
// 16. TEXT FORMAT TOOLBAR
// ══════════════════════════════════════════════════════════
function applyFormat(prop,value){
  const domEl=selectedEl?document.getElementById(`dom-${selectedEl.id}`):null;
  if(!domEl||selectedEl.type!=='text')return;
  const sel=window.getSelection();
  const hasSel=sel&&!sel.isCollapsed&&domEl.contains(sel.anchorNode);
  if(hasSel){
    switch(prop){
      case 'color':         document.execCommand('foreColor',false,value);break;
      case 'fontFamily':    document.execCommand('fontName', false,value);break;
      case 'fontWeight':    document.execCommand('bold',     false);break;
      case 'fontStyle':     document.execCommand('italic',   false);break;
      case 'textDecoration':document.execCommand('underline',false);break;
      case 'fontSize': wrapSpan(sel,{fontSize:value+'px'});break;
      case 'letterSpacing':wrapSpan(sel,{letterSpacing:value+'em'});break;
    }
    selectedEl.richHTML=domEl.innerHTML;
  } else {
    if(prop==='fontFamily')     selectedEl.fontFamily    =value;
    if(prop==='fontSize')       selectedEl.fontSize      =parseInt(value)||selectedEl.fontSize;
    if(prop==='fontWeight')     selectedEl.fontWeight    =selectedEl.fontWeight==='bold'?'400':'bold';
    if(prop==='fontStyle')      selectedEl.fontStyle     =selectedEl.fontStyle==='italic'?'normal':'italic';
    if(prop==='textDecoration') selectedEl.textDecoration=selectedEl.textDecoration==='underline'?'none':'underline';
    if(prop==='color')          selectedEl.color         =value;
    if(prop==='textAlign')      selectedEl.textAlign     =value;
    if(prop==='letterSpacing')  selectedEl.letterSpacing =parseFloat(value)||0;
    renderElement(selectedEl);syncPropsPanel(selectedEl);
  }
}

function wrapSpan(sel,styles){
  if(!sel.rangeCount)return;
  try{const r=sel.getRangeAt(0);const sp=document.createElement('span');Object.assign(sp.style,styles);r.surroundContents(sp);sel.removeAllRanges();}catch(e){}
}

// ══════════════════════════════════════════════════════════
// 17. PROPS PANEL
// ══════════════════════════════════════════════════════════
function syncPropsPanel(el){
  if(!el)return;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  const chk=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=v;};
  set('prop-x',Math.round(el.x));set('prop-y',Math.round(el.y));
  set('prop-w',Math.round(el.w));set('prop-h',Math.round(el.h));
  set('prop-r',Math.round(el.rotate||0));
  set('prop-opacity',(el.opacity??1).toFixed(2));
  chk('prop-mirror-x',(el.scaleX??1)<0);
  chk('prop-mirror-y',(el.scaleY??1)<0);

  const isBgImg = el.type==='bgimage';
  const labels={text:'✏ Text',image:'🖼 Image',shape:'▲ Shape',bgimage:' Background Image'};
  const lbl=document.getElementById('props-type-label');if(lbl)lbl.textContent=labels[el.type]||'Element';

  const showShape = el.type==='shape';
  const showText  = el.type==='text';
  const showBgImg = el.type==='bgimage';

  document.getElementById('props-shape').style.display  = showShape ? 'block':'none';
  document.getElementById('props-text').style.display   = showText  ? 'block':'none';
  document.getElementById('props-bgimg').style.display  = showBgImg ? 'block':'none';

  if(showShape){
    set('prop-shape-fill',   el.fill||'#2d9cdb');
    set('prop-shape-stroke', el.stroke||'rgba(0,0,0,0)');
    set('prop-shape-stroke-w', el.strokeW||0);
    const wbadge = document.getElementById('prop-shape-fill-wcgr');
    if(wbadge) wbadge.textContent = el.fillWcgr ? 'Gradient applied' : '';
  }
  if(showText){
    set('prop-fontsize',   el.fontSize||28);
    set('prop-fontfamily', el.fontFamily||'');
    set('prop-color',      el.color||'#ffffff');
    set('prop-spacing',    el.letterSpacing??0);
    set('prop-lineheight', el.lineHeight||1.35);
    set('prop-textalign',  el.textAlign||'left');
    chk('prop-mirror-x-t',(el.scaleX??1)<0);
    chk('prop-mirror-y-t',(el.scaleY??1)<0);
    const wbadge = document.getElementById('prop-text-color-wcgr');
    if(wbadge) wbadge.textContent = el.colorWcgr ? 'Gradient applied' : '';
  }
  if(showBgImg){
    const bg = bgState[el.side];
    set('prop-bg-overlay-op', bg.overlayOp??0.3);
    set('prop-bg-overlay-color', bg.overlayColor||'#000000');
    const wbadge = document.getElementById('prop-bg-overlay-wcgr');
    if(wbadge) wbadge.textContent = bg.overlayWcgr ? 'Gradient applied' : '';
  }

  const noSel=document.getElementById('no-selection-msg');
  const content=document.getElementById('props-content');
  if(noSel) noSel.style.display='none';
  if(content) content.style.display='block';
}

function applyPropTransform(){
  if(!selectedEl)return;
  const g=id=>parseFloat(document.getElementById(id)?.value)||0;
  const gc=id=>document.getElementById(id)?.checked??false;
  selectedEl.x=g('prop-x');selectedEl.y=g('prop-y');
  selectedEl.w=Math.max(1,g('prop-w'));selectedEl.h=Math.max(1,g('prop-h'));
  selectedEl.rotate=g('prop-r');
  selectedEl.opacity=parseFloat(document.getElementById('prop-opacity')?.value)??1;
  selectedEl.scaleX=gc('prop-mirror-x')?-1:1;
  selectedEl.scaleY=gc('prop-mirror-y')?-1:1;
  renderElement(selectedEl);
}

function applyShapeProps(){
  if(!selectedEl||selectedEl.type!=='shape')return;
  selectedEl.fill   = document.getElementById('prop-shape-fill')?.value || '#2d9cdb';
  // Changing solid fill manually clears the wcgr fill
  selectedEl.fillWcgr = null;
  document.getElementById('prop-shape-fill-wcgr').textContent = '';
  selectedEl.stroke = document.getElementById('prop-shape-stroke')?.value || 'rgba(0,0,0,0)';
  selectedEl.strokeW= parseFloat(document.getElementById('prop-shape-stroke-w')?.value)||0;
  renderElement(selectedEl);
}

function applyTextProps(toggle){
  if(!selectedEl||selectedEl.type!=='text')return;
  if(toggle==='bold')      selectedEl.fontWeight    =selectedEl.fontWeight==='bold'?'400':'bold';
  if(toggle==='italic')    selectedEl.fontStyle     =selectedEl.fontStyle==='italic'?'normal':'italic';
  if(toggle==='underline') selectedEl.textDecoration=selectedEl.textDecoration==='underline'?'none':'underline';
  if(!toggle){
    const g=id=>parseFloat(document.getElementById(id)?.value);
    selectedEl.fontSize     =g('prop-fontsize')||28;
    selectedEl.fontFamily   =document.getElementById('prop-fontfamily')?.value||'';
    selectedEl.color        =document.getElementById('prop-color')?.value||'';
    selectedEl.letterSpacing=g('prop-spacing')||0;
    selectedEl.lineHeight   =g('prop-lineheight')||1.35;
    selectedEl.textAlign    =document.getElementById('prop-textalign')?.value||'left';
    selectedEl.scaleX       =document.getElementById('prop-mirror-x-t')?.checked?-1:1;
    selectedEl.scaleY       =document.getElementById('prop-mirror-y-t')?.checked?-1:1;
    const mx=document.getElementById('prop-mirror-x');if(mx)mx.checked=selectedEl.scaleX<0;
    const my=document.getElementById('prop-mirror-y');if(my)my.checked=selectedEl.scaleY<0;
  }
  renderElement(selectedEl);syncPropsPanel(selectedEl);
}

function mirrorSync(axis){
  if(!selectedEl)return;
  const t=document.getElementById(`prop-mirror-${axis}-t`);
  const m=document.getElementById(`prop-mirror-${axis}`);
  if(t&&m)m.checked=t.checked;
  applyPropTransform();
}

function applyBgImgProps(){
  if(!selectedEl||selectedEl.type!=='bgimage')return;
  const bg=bgState[selectedEl.side];
  bg.overlayOp    = parseFloat(document.getElementById('prop-bg-overlay-op')?.value)??0.3;
  bg.overlayColor = document.getElementById('prop-bg-overlay-color')?.value||'#000000';
  renderElement(selectedEl);
}

// ── WCGR color assignment (Advanced Tooling gated) ──
// slotType: 'shape-fill' | 'text-color' | 'bg-overlay' | 'bg-color'
function openWcgrPicker(slotType) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.wcgr,application/json';
  inp.onchange = () => {
    const file = inp.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        applyWcgrToSlot(slotType, data);
      } catch { alert('Invalid .wcgr file.'); }
    };
    reader.readAsText(file);
  };
  inp.click();
}

function clearWcgrSlot(slotType) {
  applyWcgrToSlot(slotType, null);
}

function applyWcgrToSlot(slotType, data) {
  if (slotType === 'shape-fill') {
    if (!selectedEl || selectedEl.type !== 'shape') return;
    selectedEl.fillWcgr = data;
    renderElement(selectedEl);
    const b = document.getElementById('prop-shape-fill-wcgr');
    if(b) b.textContent = data ? 'Gradient applied' : '';
  } else if (slotType === 'text-color') {
    if (!selectedEl || selectedEl.type !== 'text') return;
    selectedEl.colorWcgr = data;
    // For text wcgr, apply as background-clip:text trick via inline style
    const domEl = document.getElementById(`dom-${selectedEl.id}`);
    if (domEl && data && window.wcgrRenderToCanvas) {
      const oc = window.wcgrRenderToCanvas(data, Math.max(1,Math.round(selectedEl.w*SCALE)), Math.max(1,Math.round(selectedEl.h*SCALE)));
      domEl.style.backgroundImage = `url(${oc.toDataURL()})`;
      domEl.style.webkitBackgroundClip = 'text';
      domEl.style.backgroundClip = 'text';
      domEl.style.webkitTextFillColor = 'transparent';
      domEl.style.color = 'transparent';
    } else if (domEl && !data) {
      domEl.style.backgroundImage = '';
      domEl.style.webkitBackgroundClip = '';
      domEl.style.backgroundClip = '';
      domEl.style.webkitTextFillColor = '';
      domEl.style.color = selectedEl.color || textColors[selectedEl.side] || '#fff';
    }
    const b = document.getElementById('prop-text-color-wcgr');
    if(b) b.textContent = data ? 'Gradient applied' : '';
  } else if (slotType === 'bg-overlay') {
    const side = selectedEl?.type==='bgimage' ? selectedEl.side : currentSide;
    bgState[side].overlayWcgr = data;
    renderCurrentSide();
    const b = document.getElementById('prop-bg-overlay-wcgr');
    if(b) b.textContent = data ? '🌈 Gradient applied' : '';
  } else if (slotType === 'bg-color') {
    bgState[currentSide].color1Wcgr = data;
    renderCurrentSide();
  }
}

// ══════════════════════════════════════════════════════════
// 18. FONTS
// ══════════════════════════════════════════════════════════
function buildFontSelects(){
  ['font-family','tb-font','prop-fontfamily'].forEach(id=>{
    const sel=document.getElementById(id);if(!sel)return;
    while(sel.options.length>(id==='font-family'?0:1))sel.remove(id==='font-family'?0:1);
    availableFonts.forEach(f=>{const o=document.createElement('option');o.value=f.value;o.textContent=f.label;sel.appendChild(o);});
  });
}
function addFontToSelects(label,value){
  if(availableFonts.some(f=>f.value===value))return;
  availableFonts.push({label,value});
  ['font-family','tb-font','prop-fontfamily'].forEach(id=>{
    const sel=document.getElementById(id);if(!sel||[...sel.options].some(o=>o.value===value))return;
    const o=document.createElement('option');o.value=value;o.textContent=label;sel.appendChild(o);
  });
}
function loadGoogleFont(){
  const url=document.getElementById('google-font-url')?.value?.trim();if(!url)return;
  const m=url.match(/family=([^:&]+)/);if(!m){alert('Could not parse font.');return;}
  const name=decodeURIComponent(m[1].replace(/\+/g,' ').split(':')[0]);
  const link=document.createElement('link');link.rel='stylesheet';link.href=url;document.head.appendChild(link);
  const cv=`'${name}',sans-serif`;addFontToSelects(name+' (Google)',cv);
  const sel=document.getElementById('font-family');if(sel)sel.value=cv;updateCard();
}
function loadCustomFont(file){
  if(!file)return;
  const name=file.name.replace(/\.[^.]+$/,'');
  const reader=new FileReader();
  reader.onload=e=>{
    const src=e.target.result;customFontsStore[name]=src;injectFontFace(name,src);
    const cv=`"${name}",sans-serif`;addFontToSelects(name+' (custom)',cv);
    const sel=document.getElementById('font-family');if(sel)sel.value=cv;updateCard();
  };
  reader.readAsDataURL(file);
}
function injectFontFace(name,src){
  let s=document.getElementById(`ff-${name}`);
  if(!s){s=document.createElement('style');s.id=`ff-${name}`;document.head.appendChild(s);}
  s.textContent=`@font-face{font-family:"${name}";src:url("${src}");}`;
}

// ══════════════════════════════════════════════════════════
// 19. CARD SIZE
// ══════════════════════════════════════════════════════════
function updateCardSize(){
  CARD_W=parseInt(document.getElementById('card-w')?.value)||1050;
  CARD_H=parseInt(document.getElementById('card-h')?.value)||600;
  const scroll=document.getElementById('canvas-scroll');
  const maxW=scroll?Math.min(scroll.clientWidth-32,720):640;
  SCALE=Math.min(maxW/CARD_W,.7);
  const stage=document.getElementById('card-stage');
  if(stage){stage.style.width=Math.round(CARD_W*SCALE)+'px';stage.style.height=Math.round(CARD_H*SCALE)+'px';}
  const hint=document.getElementById('scale-hint');
  if(hint)hint.textContent=`Preview ${Math.round(SCALE*100)}% — actual: ${CARD_W}×${CARD_H}px`;
  renderBothSides();
}
function resetCardSize(){document.getElementById('card-w').value=1050;document.getElementById('card-h').value=600;updateCardSize();}
window.addEventListener('resize',()=>updateCardSize());

// ══════════════════════════════════════════════════════════
// 20. LOGO
// ══════════════════════════════════════════════════════════
function loadLogo(file){
  if(!file)return;
  logoFileName=file.name;
  const reader=new FileReader();
  reader.onload=e=>{
    const src=e.target.result;const img=new Image();
    img.onload=()=>{
      logoNativeW=img.naturalWidth;logoNativeH=img.naturalHeight;
      const tH=parseInt(document.getElementById('logo-h').value)||80;
      const tW=logoLocked?Math.round(logoNativeW*tH/logoNativeH):(parseInt(document.getElementById('logo-w').value)||80);
      document.getElementById('logo-w').value=tW;document.getElementById('logo-h').value=tH;
      let logoEl=elements.front.find(e=>e.id===LOGO_ID);
      if(!logoEl){logoEl=makeImageEl({id:LOGO_ID,side:'front',x:30,y:30,w:tW,h:tH,src});elements.front.push(logoEl);}
      else{logoEl.src=src;logoEl.w=tW;logoEl.h=tH;}
      showBadge('logo-loaded-badge',file.name);
      renderBothSides();refreshLayers();pushHistory();
    };img.src=src;
  };reader.readAsDataURL(file);
}
function showBadge(containerId,name){
  const c=document.getElementById(containerId);if(!c)return;
  c.innerHTML=`<span class="file-badge">✓ ${name}</span>`;
}
function updateLogoSize(){
  const logoEl=elements.front.find(e=>e.id===LOGO_ID);if(!logoEl)return;
  const wI=document.getElementById('logo-w'),hI=document.getElementById('logo-h');
  const w=parseInt(wI.value)||80,h=parseInt(hI.value)||40;
  if(logoLocked&&logoNativeW&&logoNativeH){
    if(document.activeElement===wI){const nh=Math.round(logoNativeH*w/logoNativeW);hI.value=nh;logoEl.w=w;logoEl.h=nh;}
    else{const nw=Math.round(logoNativeW*h/logoNativeH);wI.value=nw;logoEl.w=nw;logoEl.h=h;}
  }else{logoEl.w=w;logoEl.h=h;}
  renderElement(logoEl);
}
function toggleLogoLock(){
  logoLocked=!logoLocked;
  const btn=document.getElementById('logo-lock-btn');
  btn.textContent=logoLocked?'🔒':'🔓';btn.classList.toggle('active',logoLocked);
}
function removeLogo(){
  elements.front=elements.front.filter(e=>e.id!==LOGO_ID);
  const d=document.getElementById(`dom-${LOGO_ID}`);if(d)d.remove();
  if(selectedId===LOGO_ID)deselectElement();
  logoFileName='';
  const b=document.getElementById('logo-loaded-badge');if(b)b.innerHTML='';
  refreshLayers();pushHistory();
}

// ══════════════════════════════════════════════════════════
// 21. BACKGROUND
// ══════════════════════════════════════════════════════════
function setBgMode(mode,btn){
  const bg=bgState[currentSide];
  const prevMode=bg.mode;
  bg.mode=mode;
  ['color','image'].forEach(m=>{
    const t=document.querySelector(`.bc-mode-tab[data-mode="${m}"]`);if(t)t.classList.toggle('active',m===mode);
    const p=document.getElementById(`bg-${m}-panel`);if(p)p.style.display=m===mode?'block':'none';
  });
  // If switching away from image, remove the bgimage element
  if(prevMode==='image' && mode!=='image'){
    removeBgImageEl(currentSide);
  }
  // If switching to image and we have a stored image, restore the element
  if(mode==='image' && bg.image){
    ensureBgImageEl(currentSide, bg.image);
  }
  renderCurrentSide();
  refreshLayers();
}
function loadBgImage(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const src=e.target.result;
    bgState[currentSide].image=src;
    bgState[currentSide].mode='image';
    // Create or update the bgimage element
    ensureBgImageEl(currentSide, src);
    loadSidePanelValues();
    renderCurrentSide();
    refreshLayers();
    pushHistory();
  };
  reader.readAsDataURL(file);
}

function ensureBgImageEl(side, src) {
  const id = BG_EL_ID[side];
  let el = elements[side].find(e=>e.id===id);
  if (!el) {
    el = makeBgImageEl(side, src);
    elements[side].unshift(el); // push to start (lowest z visually)
  } else {
    el.src = src;
    el.w = CARD_W; el.h = CARD_H; // ensure full size
  }
}

function removeBgImageEl(side) {
  const id = BG_EL_ID[side];
  elements[side] = elements[side].filter(e=>e.id!==id);
  const d = document.getElementById(`dom-${id}`); if(d) d.remove();
  bgState[side].image = null;
}
function loadAdvWcgr(side,file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{const data=JSON.parse(e.target.result);bgState[side].wcgr=data;
      const prev=document.getElementById(`adv-${side}-preview`);if(prev&&window.wcgrToCSS)prev.style.background=window.wcgrToCSS(data);
      const status=document.getElementById(`adv-${side}-status`);if(status){status.textContent='Loaded';status.classList.add('loaded');}
      renderSide(side);}catch{alert('Invalid .wcgr file.');}
  };reader.readAsText(file);
}
function clearAdvWcgr(side){
  bgState[side].wcgr=null;
  const p=document.getElementById(`adv-${side}-preview`);if(p)p.style.background='';
  const s=document.getElementById(`adv-${side}-status`);if(s){s.textContent='Not loaded';s.classList.remove('loaded');}
  renderSide(side);
}

// ══════════════════════════════════════════════════════════
// 22. DYNAMIC CONTACT FIELDS
// ══════════════════════════════════════════════════════════
function addField(type,suppressSync){
  const id=fieldCounters[type]++;
  const c=document.getElementById(`${type}-container`);if(!c)return;
  const icons={email:'📧',phone:'📞',website:'🌐',address:'📍',social:'🔗'};
  let inner='';
  if(type==='email')   inner=`<input type="email" id="email-val-${id}" placeholder="name@example.com" oninput="syncContactElements()"><input type="text" id="email-lbl-${id}" placeholder="Label (Work, Personal…)" oninput="syncContactElements()">`;
  if(type==='phone')   inner=`<input type="tel"   id="phone-val-${id}" placeholder="+1 (555) 000-0000" oninput="syncContactElements()"><input type="text" id="phone-lbl-${id}" placeholder="Label (Mobile, Office…)" oninput="syncContactElements()">`;
  if(type==='website') inner=`<input type="url"   id="website-val-${id}" placeholder="https://example.com" oninput="syncContactElements()"><input type="text" id="website-lbl-${id}" placeholder="Label (Portfolio…)" oninput="syncContactElements()">`;
  if(type==='address') inner=`<input type="text" id="addr-street-${id}" placeholder="Street" oninput="syncContactElements()"><input type="text" id="addr-city-${id}" placeholder="City" oninput="syncContactElements()"><input type="text" id="addr-state-${id}" placeholder="State/Province" oninput="syncContactElements()"><input type="text" id="addr-zip-${id}" placeholder="ZIP" oninput="syncContactElements()"><input type="text" id="addr-country-${id}" placeholder="Country" oninput="syncContactElements()"><input type="text" id="addr-lbl-${id}" placeholder="Label (Office, Home…)" oninput="syncContactElements()">`;
  if(type==='social')  inner=`<input type="text" id="social-lbl-${id}" list="social-platforms" placeholder="Platform (LinkedIn, GitHub…)" oninput="syncContactElements()"><input type="text" id="social-val-${id}" placeholder="Handle or URL" oninput="syncContactElements()">`;
  c.insertAdjacentHTML('beforeend',`<div class="dyn-group" id="dfield-${type}-${id}"><div class="dyn-header"><span class="dyn-label">${icons[type]} ${type} ${id+1}</span><button class="dyn-remove" onclick="removeField('${type}',${id})">✕</button></div>${inner}</div>`);
  if(!suppressSync)syncContactElements();
}
function removeField(type,id){document.getElementById(`dfield-${type}-${id}`)?.remove();syncContactElements();}

function syncContactElements(){
  // Build list of {valueText, labelText, valueId, labelId} for each filled field
  const items=[];

  const col=(type,vi,li,def,i)=>{
    if(!document.getElementById(`dfield-${type}-${i}`))return;
    const v=document.getElementById(vi)?.value?.trim();
    const l=document.getElementById(li)?.value?.trim()||def;
    if(v) items.push({
      valueId:`ct-val-${type}-${i}`,
      labelId:`ct-lbl-${type}-${i}`,
      value:v,
      label:l,
    });
  };
  for(let i=0;i<fieldCounters.email;i++)   col('email',  `email-val-${i}`,  `email-lbl-${i}`,  'Email',  i);
  for(let i=0;i<fieldCounters.phone;i++)   col('phone',  `phone-val-${i}`,  `phone-lbl-${i}`,  'Phone',  i);
  for(let i=0;i<fieldCounters.website;i++) col('website',`website-val-${i}`,`website-lbl-${i}`,'Website',i);
  for(let i=0;i<fieldCounters.social;i++)  col('social', `social-val-${i}`, `social-lbl-${i}`, 'Link',   i);
  for(let i=0;i<fieldCounters.address;i++){
    if(!document.getElementById(`dfield-address-${i}`))continue;
    const parts=['street','city','state','zip','country'].map(p=>document.getElementById(`addr-${p}-${i}`)?.value?.trim()).filter(Boolean);
    const l=document.getElementById(`addr-lbl-${i}`)?.value?.trim()||'Address';
    if(parts.length) items.push({
      valueId:`ct-val-addr-${i}`,
      labelId:`ct-lbl-addr-${i}`,
      value:parts.join(', '),
      label:l,
    });
  }

  const allNewIds=new Set([...items.map(it=>it.valueId),...items.map(it=>it.labelId)]);

  // Remove stale contact elements
  elements.back=elements.back.filter(e=>{
    if(e.id.startsWith('ct-')&&!allNewIds.has(e.id)){
      const d=document.getElementById(`dom-${e.id}`);if(d)d.remove();return false;
    }
    return true;
  });

  const yStart=40, rowH=90;
  items.forEach((item,i)=>{
    const yBase=yStart+i*rowH;

    // --- LABEL element (small, uppercase, bold) ---
    let lblEl=elements.back.find(e=>e.id===item.labelId);
    if(!lblEl){
      lblEl=makeTextEl({
        id:item.labelId, side:'back',
        x:40, y:yBase,
        w:CARD_W*.85, h:28,
        fontSize:16, fontWeight:'700', letterSpacing:0.08, color:'',
        textAlign:'left', lineHeight:1.2,
      });
      elements.back.push(lblEl);
    }
    // Update label text — but don't overwrite if user has manually edited it on the card
    // (detect by checking if they differ AND the label input has changed)
    const expectedLabel=item.label.toUpperCase();
    if(!lblEl._userEdited) lblEl.text=expectedLabel;
    const lDom=document.getElementById(`dom-${lblEl.id}`);
    if(!lDom||lDom.getAttribute('contenteditable')!=='true') renderElement(lblEl);

    // --- VALUE element (normal size) ---
    let valEl=elements.back.find(e=>e.id===item.valueId);
    if(!valEl){
      valEl=makeTextEl({
        id:item.valueId, side:'back',
        x:40, y:yBase+28,
        w:CARD_W*.85, h:55,
        fontSize:24, fontWeight:'400', lineHeight:1.35, color:'',
      });
      elements.back.push(valEl);
    }
    if(!valEl._userEdited) valEl.text=item.value;
    const vDom=document.getElementById(`dom-${valEl.id}`);
    if(!vDom||vDom.getAttribute('contenteditable')!=='true') renderElement(valEl);
  });

  refreshLayers();
}

// ══════════════════════════════════════════════════════════
// 23. EXTRA IMAGES
// ══════════════════════════════════════════════════════════
function addExtraImages(files){
  if(!files||!files.length)return;
  Array.from(files).forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const el=makeImageEl({src:e.target.result,side:currentSide});
      elements[currentSide].push(el);
      extraImages.push({id:el.id,name:file.name,src:e.target.result});
      renderElement(el);renderExtraImagesList();refreshLayers();pushHistory();
    };reader.readAsDataURL(file);
  });
}
function renderExtraImagesList(){
  const list=document.getElementById('extra-images-list');if(!list)return;list.innerHTML='';
  extraImages.forEach(img=>{
    const w=document.createElement('div');w.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px;';
    const thumb=document.createElement('div');thumb.className='extra-img-thumb';thumb.title='Click to select';
    thumb.innerHTML=`<img src="${img.src}" alt="" style="width:50px;height:50px;object-fit:cover;border-radius:4px;border:1px solid var(--bc-border)"><button class="dyn-remove" style="position:absolute;top:0;right:0" onclick="removeExtraImage('${img.id}')">✕</button>`;
    thumb.style.position='relative';
    thumb.querySelector('img').addEventListener('click',()=>{const el=findElement(img.id);if(el){if(!editMode)toggleEditMode();selectElement(el.id);}});
    const badge=document.createElement('span');badge.className='file-badge';
    badge.style.cssText='max-width:60px;font-size:8px;padding:1px 4px;';badge.textContent='✓ '+img.name;
    w.appendChild(thumb);w.appendChild(badge);list.appendChild(w);
  });
}
function removeExtraImage(id){
  extraImages=extraImages.filter(i=>i.id!==id);
  ['front','back'].forEach(side=>{elements[side]=elements[side].filter(e=>{if(e.id===id){const d=document.getElementById(`dom-${id}`);if(d)d.remove();return false;}return true;});});
  if(selectedId===id)deselectElement();
  renderExtraImagesList();refreshLayers();
}

// Layout presets removed — will be revisited under Templates
function applyLayout(layout,btn){ /* stub — removed */ }

function moveSelectedToOtherSide(){
  if(!selectedEl) return;
  const toSide = selectedEl.side==='front'?'back':'front';
  moveElementToSide(selectedEl.id, toSide);
}

// ══════════════════════════════════════════════════════════
// 25. ADD TEXT
// ══════════════════════════════════════════════════════════
function addTextElement(){
  pushHistory();
  const el=makeTextEl({text:'Double-click to edit',side:currentSide});
  elements[currentSide].push(el);
  if(!editMode)toggleEditMode();
  renderElement(el);selectElement(el.id);refreshLayers();
}
window.addTextElement=addTextElement;

// ══════════════════════════════════════════════════════════
// 26. HELPERS
// ══════════════════════════════════════════════════════════
function findElement(id){return elements.front.find(e=>e.id===id)||elements.back.find(e=>e.id===id);}
function hexToRgba(hex,a){const c=hex.replace('#','');const f=c.length===3?c.split('').map(x=>x+x).join(''):c;const n=parseInt(f,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// ══════════════════════════════════════════════════════════
// 27. KEYBOARD
// ══════════════════════════════════════════════════════════
function bindKeyboard(){
  document.addEventListener('keydown',e=>{
    const active=document.activeElement;
    const inInput=['INPUT','TEXTAREA','SELECT'].includes(active.tagName);
    const inEdit=active.getAttribute('contenteditable')==='true';

    // Ctrl+Z / Ctrl+Y
    if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undo();return;}
    if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){e.preventDefault();redo();return;}

    if(e.key==='Escape'){if(inEdit){active.blur();return;}deselectElement();clearMultiSelect();return;}
    if(!editMode)return;
    if((e.key==='Delete'||e.key==='Backspace')&&selectedEl&&!inInput&&!inEdit){e.preventDefault();deleteSelected();return;}
    if(selectedEl&&!inInput&&!inEdit){
      const n=e.shiftKey?10:1;
      if(e.key==='ArrowLeft') selectedEl.x-=n;
      if(e.key==='ArrowRight')selectedEl.x+=n;
      if(e.key==='ArrowUp')   selectedEl.y-=n;
      if(e.key==='ArrowDown') selectedEl.y+=n;
      if(e.key.startsWith('Arrow')){e.preventDefault();renderElement(selectedEl);syncPropsPanel(selectedEl);}
    }
  });
}

// ══════════════════════════════════════════════════════════
// 28. EXPORT PNG
// ══════════════════════════════════════════════════════════
async function exportPNG(){
  if(typeof html2canvas==='undefined'){alert('html2canvas not loaded.');return;}
  deselectElement();clearMultiSelect();
  const stage=document.getElementById('card-stage');
  const savedScale=SCALE;SCALE=1;
  stage.style.width=CARD_W+'px';stage.style.height=CARD_H+'px';
  const capture=async(faceId,filename)=>{
    const face=document.getElementById(faceId);const wasHidden=face.style.display==='none';
    face.style.display='block';renderSide(faceId.replace('card-',''));await sleep(150);
    const canvas=await html2canvas(face,{scale:1,useCORS:true,allowTaint:true,backgroundColor:null,width:CARD_W,height:CARD_H,logging:false});
    if(wasHidden)face.style.display='none';
    const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=filename;a.click();
  };
  try{await capture('card-front','bcard-front.png');await sleep(400);await capture('card-back','bcard-back.png');}
  finally{SCALE=savedScale;stage.style.width=Math.round(CARD_W*SCALE)+'px';stage.style.height=Math.round(CARD_H*SCALE)+'px';renderBothSides();}
}

// ══════════════════════════════════════════════════════════
// 29. EXPORT PDF
// ══════════════════════════════════════════════════════════
async function exportPDF(){
  if(typeof html2canvas==='undefined'||typeof jspdf==='undefined'){alert('PDF libraries not loaded.');return;}
  deselectElement();clearMultiSelect();
  const{jsPDF}=jspdf;const doc=new jsPDF({orientation:'landscape',unit:'in',format:[3.5,2]});
  const stage=document.getElementById('card-stage');const savedScale=SCALE;SCALE=1;
  stage.style.width=CARD_W+'px';stage.style.height=CARD_H+'px';
  const getURL=async faceId=>{
    const face=document.getElementById(faceId);const wasHidden=face.style.display==='none';
    face.style.display='block';renderSide(faceId.replace('card-',''));await sleep(150);
    const canvas=await html2canvas(face,{scale:1,useCORS:true,allowTaint:true,backgroundColor:null,width:CARD_W,height:CARD_H,logging:false});
    if(wasHidden)face.style.display='none';return canvas.toDataURL('image/jpeg',.98);
  };
  try{doc.addImage(await getURL('card-front'),'JPEG',0,0,3.5,2);await sleep(200);doc.addPage([3.5,2],'landscape');doc.addImage(await getURL('card-back'),'JPEG',0,0,3.5,2);doc.save('bcard.pdf');}
  finally{SCALE=savedScale;stage.style.width=Math.round(CARD_W*SCALE)+'px';stage.style.height=Math.round(CARD_H*SCALE)+'px';renderBothSides();}
}

// ══════════════════════════════════════════════════════════
// 30. VCF
// ══════════════════════════════════════════════════════════
function exportVCF(){
  const name=document.getElementById('f-name')?.value||'';
  const title=document.getElementById('f-title')?.value||'';
  const org=document.getElementById('f-org')?.value||'';
  let vcf=`BEGIN:VCARD\nVERSION:3.0\nFN:${name}\n`;
  if(org)vcf+=`ORG:${org}\n`;if(title)vcf+=`TITLE:${title}\n`;
  for(let i=0;i<fieldCounters.email;i++){if(!document.getElementById(`dfield-email-${i}`))continue;const v=document.getElementById(`email-val-${i}`)?.value?.trim();const l=(document.getElementById(`email-lbl-${i}`)?.value?.trim()||'WORK').toUpperCase();if(v)vcf+=`EMAIL;TYPE=${l}:${v}\n`;}
  for(let i=0;i<fieldCounters.phone;i++){if(!document.getElementById(`dfield-phone-${i}`))continue;const v=document.getElementById(`phone-val-${i}`)?.value?.trim();const l=(document.getElementById(`phone-lbl-${i}`)?.value?.trim()||'WORK').toUpperCase();if(v)vcf+=`TEL;TYPE=${l}:${v}\n`;}
  for(let i=0;i<fieldCounters.website;i++){if(!document.getElementById(`dfield-website-${i}`))continue;const v=document.getElementById(`website-val-${i}`)?.value?.trim();if(v)vcf+=`URL:${v}\n`;}
  for(let i=0;i<fieldCounters.address;i++){if(!document.getElementById(`dfield-address-${i}`))continue;const s=document.getElementById(`addr-street-${i}`)?.value?.trim()||'';const c=document.getElementById(`addr-city-${i}`)?.value?.trim()||'';const st=document.getElementById(`addr-state-${i}`)?.value?.trim()||'';const z=document.getElementById(`addr-zip-${i}`)?.value?.trim()||'';const co=document.getElementById(`addr-country-${i}`)?.value?.trim()||'';const lb=(document.getElementById(`addr-lbl-${i}`)?.value?.trim()||'WORK').toUpperCase();if(s||c)vcf+=`ADR;TYPE=${lb}:;;${s};${c};${st};${z};${co}\n`;}
  for(let i=0;i<fieldCounters.social;i++){if(!document.getElementById(`dfield-social-${i}`))continue;const v=document.getElementById(`social-val-${i}`)?.value?.trim();const l=document.getElementById(`social-lbl-${i}`)?.value?.trim();if(v)vcf+=`URL:${v}\n`;if(l&&v)vcf+=`X-SOCIALPROFILE;type=${l.toLowerCase()}:${v}\n`;}
  vcf+='END:VCARD';
  const blob=new Blob([vcf],{type:'text/vcard;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${name||'contact'}.vcf`;a.click();URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════════════════
// 31. SAVE / LOAD .bcard
// ══════════════════════════════════════════════════════════
function saveBcard(){
  saveSidePanelValues(currentSide);
  const data={
    version:6,CARD_W,CARD_H,currentSide,bgState,textColors,logoFileName,
    elements:{front:JSON.parse(JSON.stringify(elements.front)),back:JSON.parse(JSON.stringify(elements.back))},
    extraImages,fieldCounters,customFonts:customFontsStore,
    extraFonts:availableFonts.filter(f=>f.label.includes('(Google)')||f.label.includes('(custom)')),
    formValues:collectFormValues(),
  };
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='business-card.bcard';a.click();URL.revokeObjectURL(a.href);
}

function collectFormValues(){
  const ids=['f-name','f-title','f-org','f-tagline','font-family','card-w','card-h','logo-w','logo-h','google-font-url'];
  const vals={};ids.forEach(id=>{const e=document.getElementById(id);if(e)vals[id]=e.value;});
  const dyn=[];
  ['email','phone','website','address','social'].forEach(type=>{
    for(let i=0;i<fieldCounters[type];i++){const g=document.getElementById(`dfield-${type}-${i}`);if(!g)continue;g.querySelectorAll('input').forEach(inp=>{if(inp.id)dyn.push({id:inp.id,value:inp.value});});}
  });
  vals._dynamic=dyn;return vals;
}

function loadBcard(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);if(!data.version)throw new Error('Invalid');
      CARD_W=data.CARD_W||1050;CARD_H=data.CARD_H||600;
      document.getElementById('card-w').value=CARD_W;document.getElementById('card-h').value=CARD_H;
      ['front','back'].forEach(side=>{elements[side].forEach(el=>{const d=document.getElementById(`dom-${el.id}`);if(d)d.remove();});elements[side]=[];});
      if(data.bgState){Object.assign(bgState.front,data.bgState.front||{});Object.assign(bgState.back,data.bgState.back||{});}
      if(data.textColors)Object.assign(textColors,data.textColors);
      if(data.elements?.front)elements.front=data.elements.front;
      if(data.elements?.back) elements.back =data.elements.back;
      ['front','back'].forEach(side=>elements[side].forEach(el=>{
        el.scaleX        = el.scaleX        ?? 1;
        el.scaleY        = el.scaleY        ?? 1;
        el.letterSpacing = el.letterSpacing ?? 0;
        el.lineHeight    = el.lineHeight    ?? 1.35;
        el.visible       = el.visible       ?? true;
        el.clipShapeId   = el.clipShapeId   ?? null;
        el.subtractShape = el.subtractShape ?? null;
        el.mergedShapes  = el.mergedShapes  ?? null;
        el.fillWcgr      = el.fillWcgr      ?? null;
        el.colorWcgr     = el.colorWcgr     ?? null;
      }));
      // Restore bgimage elements if background images were saved
      ['front','back'].forEach(side=>{
        const bg = bgState[side];
        if(bg.mode==='image' && bg.image && !elements[side].find(e=>e.id===BG_EL_ID[side])){
          ensureBgImageEl(side, bg.image);
        }
      });
      extraImages=data.extraImages||[];renderExtraImagesList();
      if(data.logoFileName){logoFileName=data.logoFileName;showBadge('logo-loaded-badge',data.logoFileName);}
      if(data.customFonts)Object.entries(data.customFonts).forEach(([n,src])=>{customFontsStore[n]=src;injectFontFace(n,src);addFontToSelects(n+' (custom)',`"${n}",sans-serif`);});
      if(data.extraFonts)data.extraFonts.forEach(f=>addFontToSelects(f.label,f.value));
      if(data.fieldCounters){
        ['email','phone','website','address','social'].forEach(t=>{const c=document.getElementById(`${t}-container`);if(c)c.innerHTML='';fieldCounters[t]=0;});
        ['email','phone','website','address','social'].forEach(type=>{const count=data.fieldCounters[type]||0;for(let i=0;i<count;i++)addField(type,true);});
      }
      if(data.formValues){
        Object.entries(data.formValues).forEach(([id,val])=>{if(id==='_dynamic')return;const el=document.getElementById(id);if(el)el.value=val;});
        (data.formValues._dynamic||[]).forEach(({id,value})=>{const el=document.getElementById(id);if(el)el.value=value;});
      }
      updateCardSize();loadSidePanelValues();renderBothSides();refreshLayers();
      history=[];historyIdx=-1;pushHistory();
      alert('Card loaded!');
    }catch(err){alert('Could not load .bcard file.');console.error(err);}
  };reader.readAsText(file);
}