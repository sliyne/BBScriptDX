function getColEditorHtml(options) {
  const entries = Array.isArray(options.entries) ? options.entries : [];
  const error = options.error ? String(options.error) : null;
  const charaFolder = options.charaFolder ? String(options.charaFolder) : "";
  const shorthand = options.shorthand ? String(options.shorthand) : "";
  const initialSpriteName = options.initialSpriteName ? String(options.initialSpriteName) : "";
  const kindNames = ["Hurtbox","Hitbox","ExPoint","ExRect","ExVector","Push","TempCenter","Neck","Abdominal","SPGuard","RLeg","LLeg","Private0","Private1","Private2","Private3","ExtendJon","Unknown","ComboHitbox"];
  const defaultHitboxColors = ["#36d66b","#ff3b4d","#4da6ff","#c84dff","#4dfff3","#ffcc4d","#ff7abf","#a8ff4d","#8b8bff","#d4d4d4","#4da6ff","#c84dff","#4dfff3","#ffcc4d","#ff7abf","#a8ff4d","#8b8bff","#d4d4d4","#f5a623"];
  const hitboxColors = Array.isArray(options.hitboxColors) && options.hitboxColors.length === 19
    ? options.hitboxColors.map((color, index) => /^#[0-9a-f]{6}$/i.test(String(color)) ? String(color) : defaultHitboxColors[index])
    : defaultHitboxColors;
  const payload = JSON.stringify(entries)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const groups = new Map();
  entries.forEach((entry, index) => {
    const name = String(entry.name || "Entry " + index);
    const split = name.indexOf("_");
    const groupName = split >= 0 ? name.slice(0, split) : name;
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push({ entry, index });
  });

  const sidebar = Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base", numeric: true }))
    .map(([groupName, items], groupIndex) => {
      const buttons = items.map(({ entry, index }) =>
        '<button type="button" class="entry-item' + (index === 0 ? " selected" : "") +
        '" data-entry-index="' + index + '" title="' + escapeAttribute(entry.name) + '">' +
        escapeHtml(entry.name) + "</button>"
      ).join("");
      return '<details class="sprite-group"' + (groupIndex === 0 ? " open" : "") + '>' +
        '<summary class="sprite-group-header"><span>' + escapeHtml(groupName) +
        '</span><span class="count">' + items.length + '</span></summary>' + buttons + '</details>';
    })
    .join("");

  const kinds = kindNames.map((name, kind) =>
    '<option value="' + kind + '">' + escapeHtml(name) + ' (' + kind + ')</option>'
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>COL Editor</title>
<style>
:root{color-scheme:light dark}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;color:var(--vscode-editor-foreground);background:var(--vscode-editor-background);font-family:var(--vscode-font-family);font-size:var(--vscode-font-size)}button,input,select{font:inherit}.layout{display:grid;grid-template-columns:260px minmax(320px,1fr) 360px;width:100%;height:100vh}.pane{min-width:0;min-height:0;overflow:hidden;background:var(--vscode-editor-background)}.pane-left,.pane-center{border-right:1px solid var(--vscode-panel-border)}.pane-left,.pane-center,.pane-section{display:flex;flex-direction:column}.pane-right{display:grid;grid-template-rows:1fr 1fr}.pane-section{min-height:0}.pane-right-top{border-bottom:1px solid var(--vscode-panel-border)}.pane-header{flex:0 0 auto;min-height:38px;padding:8px 10px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-sideBar-background)}.header-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.header-actions{display:flex;gap:5px}.selected-box-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--vscode-descriptionForeground);font-weight:400;text-transform:none;letter-spacing:0}.icon-button{width:25px;height:24px;padding:0;border:1px solid var(--vscode-button-border,transparent);border-radius:3px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);cursor:pointer;font-size:17px;line-height:20px}.icon-button:hover{background:var(--vscode-button-hoverBackground)}.icon-button:disabled{opacity:.45;cursor:default}.sprite-search-wrap{padding:7px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-sideBar-background)}.sprite-search{width:100%;padding:5px 7px;border:1px solid var(--vscode-input-border,transparent);color:var(--vscode-input-foreground);background:var(--vscode-input-background)}.entry-item.search-hidden{display:none}.sprite-group.search-empty{display:none}.entry-list{flex:1;min-height:0;overflow:auto}.sprite-group{border-bottom:1px solid var(--vscode-panel-border)}.sprite-group-header{display:flex;justify-content:space-between;padding:8px 10px;font-weight:600;cursor:pointer;background:var(--vscode-sideBarSectionHeader-background,var(--vscode-sideBar-background))}.count{padding:1px 6px;border-radius:9px;color:var(--vscode-badge-foreground);background:var(--vscode-badge-background);font-size:10px}.entry-item{display:block;width:100%;padding:7px 12px 7px 28px;border:0;border-bottom:1px solid var(--vscode-panel-border);background:transparent;color:inherit;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}.entry-item:hover,.box-row:hover{background:var(--vscode-list-hoverBackground)}.entry-item.batch-selected{background:var(--vscode-list-inactiveSelectionBackground);color:var(--vscode-list-inactiveSelectionForeground)}.entry-item.primary-selected{outline:1px solid var(--vscode-focusBorder);outline-offset:-1px}.entry-item.selected,.box-row.selected{color:var(--vscode-list-activeSelectionForeground);background:var(--vscode-list-activeSelectionBackground)}.preview-wrap{position:relative;flex:1;min-height:0;overflow:hidden;cursor:grab}.preview-wrap.dragging{cursor:grabbing}#preview-canvas{display:block;width:100%;height:100%}.preview-message{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--vscode-descriptionForeground);pointer-events:none}.preview-status,.preview-help{position:absolute;bottom:7px;padding:4px 7px;border-radius:3px;color:var(--vscode-descriptionForeground);background:rgba(0,0,0,.42);font-size:10px;pointer-events:none}.preview-status{left:8px}.preview-help{right:8px}.content-area{flex:1;min-height:0;overflow:auto;padding:12px;color:var(--vscode-descriptionForeground)}.empty-message{padding:12px;color:var(--vscode-descriptionForeground)}.editor-title{margin:0 0 12px;color:var(--vscode-editor-foreground);font-size:20px}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field.full{grid-column:1/-1}.data-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 14px}.data-action-button{padding:6px 10px;border:1px solid var(--vscode-button-border,transparent);border-radius:3px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);cursor:pointer}.data-action-button:hover{background:var(--vscode-button-hoverBackground)}.data-action-button:disabled{opacity:.45;cursor:default}.section-label{margin:12px 0 7px;color:var(--vscode-editor-foreground);font-size:11px;font-weight:600;text-transform:uppercase}.field label{display:block;margin-bottom:4px;font-size:11px;font-weight:600;text-transform:uppercase}.field input,.field select{width:100%;padding:5px 7px;border:1px solid var(--vscode-input-border,transparent);color:var(--vscode-input-foreground);background:var(--vscode-input-background)}.hint{margin-top:12px;font-size:11px;color:var(--vscode-descriptionForeground)}.box-row{padding:8px;margin-bottom:6px;border-left:4px solid transparent;background:var(--vscode-sideBar-background);color:var(--vscode-editor-foreground);cursor:pointer}.box-title{font-weight:600}.box-values{margin-top:3px;font-size:11px;color:var(--vscode-descriptionForeground)}.preview-tools{position:relative;display:flex;align-items:center;gap:5px}.preview-button{padding:4px 8px;border:1px solid var(--vscode-button-border,transparent);border-radius:3px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);cursor:pointer}.preview-button:hover{background:var(--vscode-button-hoverBackground)}.image-dropdown{position:absolute;right:32px;top:31px;z-index:45;display:none;width:250px;padding:12px;border:1px solid var(--vscode-panel-border);border-radius:4px;background:var(--vscode-editor-background);box-shadow:0 6px 18px rgba(0,0,0,.35);text-transform:none;letter-spacing:normal}.image-dropdown.open{display:block}.image-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.image-grid label{display:block;margin-bottom:3px;color:var(--vscode-descriptionForeground);font-size:10px}.image-grid input[type="number"]{width:100%;padding:4px 6px}.image-full{grid-column:1/-1}.mirror-row{display:flex;align-items:center;gap:7px;margin-top:10px}.image-actions{display:flex;justify-content:flex-end;margin-top:10px}.image-status{margin-top:9px;color:var(--vscode-descriptionForeground);font-size:10px;word-break:break-word}.context-menu{position:fixed;z-index:50;display:none;min-width:130px;padding:4px;border:1px solid var(--vscode-menu-border,var(--vscode-panel-border));background:var(--vscode-menu-background,var(--vscode-editor-background));box-shadow:0 4px 14px rgba(0,0,0,.35)}.context-menu.open{display:block}.context-menu button{display:block;width:100%;padding:6px 10px;border:0;color:var(--vscode-menu-foreground,var(--vscode-editor-foreground));background:transparent;text-align:left;cursor:pointer}.context-menu button:hover{background:var(--vscode-menu-selectionBackground,var(--vscode-list-hoverBackground))}.modal-backdrop{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}.modal-backdrop.open{display:flex}.modal{width:300px;padding:16px;border:1px solid var(--vscode-panel-border);border-radius:5px;background:var(--vscode-editor-background);box-shadow:0 8px 24px rgba(0,0,0,.4)}.modal h3{margin:0 0 14px}.modal select{width:100%;padding:6px}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.shortcut-modal{width:min(680px,calc(100vw - 32px));max-height:80vh;overflow:auto}.shortcut-grid{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin-top:10px}.shortcut-grid kbd{display:inline-block;min-width:105px;padding:2px 6px;border:1px solid var(--vscode-panel-border);border-bottom-width:2px;border-radius:3px;background:var(--vscode-textCodeBlock-background);font-family:var(--vscode-editor-font-family);font-size:11px}.shortcut-section{grid-column:1/-1;margin-top:8px;font-weight:600;color:var(--vscode-editor-foreground)}.modal-actions button{padding:5px 12px}.toast{position:fixed;right:12px;bottom:12px;z-index:80;display:none;max-width:360px;padding:8px 12px;border-radius:4px;color:var(--vscode-errorForeground);background:var(--vscode-inputValidation-errorBackground);border:1px solid var(--vscode-inputValidation-errorBorder)}.toast.open{display:block}
</style>
</head>
<body>
<div class="layout">
<aside class="pane pane-left"><div class="pane-header">Sprites</div><div class="sprite-search-wrap"><input id="sprite-search" class="sprite-search" type="text" placeholder="Search sprites…" aria-label="Search sprites"></div><div id="entry-list" class="entry-list">${error ? '<div class="empty-message">' + escapeHtml(error) + '</div>' : sidebar}</div></aside>
<main class="pane pane-center"><div class="pane-header header-row"><span>Preview</span><div class="preview-tools"><button id="toggle-image-controls" class="preview-button" type="button">Image ▾</button><button id="reset-view" class="icon-button" title="Reset view">↺</button><div id="image-dropdown" class="image-dropdown"><div class="image-grid"><div><label for="image-x">Image X</label><input id="image-x" type="number" step="any"></div><div><label for="image-y">Image Y</label><input id="image-y" type="number" step="any"></div><div class="image-full"><label for="image-scale">Image Scale</label><input id="image-scale" type="number" min="0.001" step="0.01"></div></div><label class="mirror-row"><input id="image-mirror" type="checkbox"> Mirror Image</label><div class="image-actions"><button id="reset-image" type="button">Reset Image</button></div><div id="image-status" class="image-status"></div></div></div></div><div id="preview-wrap" class="preview-wrap"><canvas id="preview-canvas"></canvas><div id="preview-message" class="preview-message"></div><div id="preview-status" class="preview-status"></div><div class="preview-help">Wheel: zoom · Drag: pan</div></div></main>
<aside class="pane pane-right">
<section class="pane-section pane-right-top"><div class="pane-header header-row"><span>Hitbox Data</span><span id="selected-box-name" class="selected-box-name">No box selected</span></div><div id="data-content" class="content-area"><div class="section-label">Associated Image</div><div class="field full"><input type="text" value="" placeholder="IMAGE.jpg" disabled></div><div class="data-actions"><button class="data-action-button" type="button" disabled>Copy Data</button><button class="data-action-button" type="button" disabled>Paste Data</button></div><div class="empty-message">Select a box to edit its data.</div></div></section>
<section class="pane-section"><div class="pane-header header-row"><span>Boxes</span><div class="header-actions"><button id="add-box" class="icon-button" title="Add box">+</button><button id="remove-box" class="icon-button" title="Remove selected box" disabled>−</button></div></div><div id="boxes-content" class="content-area"></div></section>
</aside>
</div>
<div id="context-menu" class="context-menu"><button data-action="select">Select</button><button data-action="copy">Copy</button><button data-action="paste">Paste</button><button data-action="duplicate">Duplicate</button><button data-action="delete">Delete</button></div>
<div id="sprite-context-menu" class="context-menu"><button data-action="copy">Copy</button><button data-action="paste">Paste</button></div>
<div id="add-modal" class="modal-backdrop"><div class="modal"><h3>Add Box</h3><label for="add-kind">Box type</label><select id="add-kind">${kinds}</select><div class="hint">Kind and group use the same value.</div><div class="modal-actions"><button id="cancel-add">Cancel</button><button id="confirm-add">Add</button></div></div></div>
<div id="shortcut-modal" class="modal-backdrop"><div class="modal shortcut-modal"><h3>COL Editor Keyboard Shortcuts</h3><div class="shortcut-grid"><div class="shortcut-section">Navigation</div><kbd>Alt+Up / Down</kbd><span>Previous / next sprite</span><kbd>Alt+Shift+Up / Down</kbd><span>Extend sprite selection</span><kbd>Alt+Left / Right</kbd><span>Previous / next box</span><kbd>Alt+Home / End</kbd><span>First / last sprite</span><kbd>Alt+Shift+Home / End</kbd><span>First / last box</span><div class="shortcut-section">Box editing</div><kbd>Alt+Insert</kbd><span>Create box</span><kbd>Alt+D</kbd><span>Duplicate selected box</span><kbd>Alt+Delete</kbd><span>Delete selected box</span><kbd>Alt+C / V</kbd><span>Copy / paste box data</span><kbd>Alt+Shift+C / V</kbd><span>Copy / paste all primary sprite boxes</span><kbd>Alt+T</kbd><span>Focus box type</span><kbd>Alt+X / Y / W / H</kbd><span>Focus numeric field</span><div class="shortcut-section">Preview and selection</div><kbd>Alt+R</kbd><span>Reset preview camera</span><kbd>Alt+I</kbd><span>Open image controls</span><kbd>Alt+M</kbd><span>Toggle image mirror</span><kbd>Alt+Shift+R</kbd><span>Reset image transform</span><kbd>Alt+= / -</kbd><span>Zoom in / out</span><kbd>Alt+A</kbd><span>Select all sprites in current dropdown</span><kbd>Alt+Shift+A</kbd><span>Invert selection in current dropdown</span><kbd>Alt+P</kbd><span>Make focused sprite primary</span><kbd>Alt+Escape</kbd><span>Clear batch selection</span><kbd>Alt+L</kbd><span>Reveal primary sprite</span><kbd>Alt+Shift+I</kbd><span>Toggle sprite image visibility</span><kbd>Alt+G</kbd><span>Toggle grid</span><kbd>Alt+Shift+G</kbd><span>Toggle axes</span><kbd>Alt+Shift+L</kbd><span>Toggle box labels</span><kbd>Alt+B</kbd><span>Toggle other sprite boxes</span><kbd>Alt+Shift+B</kbd><span>Select sprites containing current box</span><kbd>Alt+F</kbd><span>Focus sprite search</span><kbd>Alt+Shift+F</kbd><span>Close all dropdowns except current sprite</span><kbd>Escape</kbd><span>Clear search or cancel field edit</span><kbd>Alt+0</kbd><span>Fit current boxes</span><kbd>Alt+/</kbd><span>Open this help</span></div><div class="modal-actions"><button id="close-shortcuts">Close</button></div></div></div>
<div id="toast" class="toast"></div>
<script id="col-data" type="application/json">${payload}</script>
<script>
(function(){
const vscode=acquireVsCodeApi();
const entries=JSON.parse(document.getElementById("col-data").textContent||"[]");
const KIND_NAMES=${JSON.stringify(kindNames)};
let hitboxColors=${JSON.stringify(hitboxColors)};
const list=document.getElementById("entry-list"),canvas=document.getElementById("preview-canvas"),wrap=document.getElementById("preview-wrap"),message=document.getElementById("preview-message"),status=document.getElementById("preview-status"),dataContent=document.getElementById("data-content"),boxesContent=document.getElementById("boxes-content"),removeButton=document.getElementById("remove-box"),menu=document.getElementById("context-menu"),spriteMenu=document.getElementById("sprite-context-menu"),modal=document.getElementById("add-modal"),toast=document.getElementById("toast"),selectedBoxName=document.getElementById("selected-box-name"),imageDropdown=document.getElementById("image-dropdown"),imageStatus=document.getElementById("image-status"),imageXInput=document.getElementById("image-x"),imageYInput=document.getElementById("image-y"),imageScaleInput=document.getElementById("image-scale"),imageMirrorInput=document.getElementById("image-mirror"),shortcutModal=document.getElementById("shortcut-modal"),spriteSearch=document.getElementById("sprite-search");
let selectedEntryIndex=0,selectedEntryIndices=[0],selectionAnchor=0,currentBoxes=[],selectedBox=null,contextBox=null,contextSpriteIndex=null,copiedBoxData=null,copiedSpriteBoxes=null;
const boxCache=new Map();
const restoredState=vscode.getState()||{};
const imageTransforms=restoredState.imageTransforms||{};
let currentCharaFolder=${JSON.stringify(charaFolder)};
const characterShorthand=${JSON.stringify(shorthand)};
const initialSpriteName=${JSON.stringify(initialSpriteName)};
let imageRequestId=0;
let spriteImage=null;
let spriteImageName="";
let spriteImageMessage="";
let imageTransform={x:-2.5,y:198.5,scale:1,mirror:true};
let showSpriteImage=restoredState.showSpriteImage!==false;
let showGrid=restoredState.showGrid!==false;
let showAxes=restoredState.showAxes!==false;
let showLabels=restoredState.showLabels!==false;
let showOtherBoxes=restoredState.showOtherBoxes===true;
let searchOpenGroups=null;
const view={scale:1,originX:0,originY:0,dragging:false,startX:0,startY:0,startOriginX:0,startOriginY:0};
let boxDrag=null;
let hoverRegion=null;
let cycleState={x:NaN,y:NaN,index:-1,boxes:[]};
function currentAssociatedImage(){const entry=entries[selectedEntryIndex];return Array.isArray(entry?.names)&&entry.names.length?entry.names[0]:""}
function transformKey(){return (characterShorthand||"UNKNOWN")+"/"+(currentAssociatedImage()||"NO_IMAGE")}
function loadImageTransform(){const saved=imageTransforms[transformKey()];imageTransform=saved?{x:Number(saved.x)||0,y:Number(saved.y)||0,scale:Math.max(Number(saved.scale)||1,.001),mirror:saved.mirror!==false}:{x:-2.5,y:198.5,scale:1,mirror:true};syncImageControls()}
function syncImageControls(){imageXInput.value=String(imageTransform.x);imageYInput.value=String(imageTransform.y);imageScaleInput.value=String(imageTransform.scale);imageMirrorInput.checked=imageTransform.mirror}
function storeImageTransform(){imageTransforms[transformKey()]={...imageTransform};saveUiState()}
function updateImageStatus(){const root=currentCharaFolder?("Chara: "+currentCharaFolder):"Chara folder not selected";const image=spriteImage?("Image: "+spriteImageName):(spriteImageMessage||("Image: "+(spriteImageName||"None")));imageStatus.textContent=root+" · "+image}
function requestAssociatedImage(){const requestId=++imageRequestId;spriteImage=null;spriteImageName=currentAssociatedImage();spriteImageMessage=currentCharaFolder?"Loading image...":"Select a Chara folder in Workflow > Setup.";updateImageStatus();draw();vscode.postMessage({type:"resolveAssociatedImage",requestId,associatedImage:spriteImageName})}
function drawSpriteImage(c){if(!showSpriteImage||!spriteImage||!spriteImage.complete||!spriteImage.naturalWidth)return;const anchor=w2c(imageTransform.x,imageTransform.y),width=spriteImage.naturalWidth*imageTransform.scale*view.scale,height=spriteImage.naturalHeight*imageTransform.scale*view.scale;c.save();c.translate(anchor.x,anchor.y);c.scale(imageTransform.mirror?-1:1,1);c.drawImage(spriteImage,-width/2,-height,width,height);c.restore()}
function kindName(kind){const value=Number(kind);return KIND_NAMES[value]||("Kind"+value)}
function boxLabel(kind,number,shared){return(shared?"Shared ":"")+kindName(kind)+" #"+number}
function colorForGroup(g){const index=Math.min(Math.max(Number(g)||0,0),18);return hitboxColors[index]||"#d4d4d4"}
function flatten(entry){const out=[],counts=new Map();(Array.isArray(entry.box_groups)?entry.box_groups:[]).forEach(group=>{const groupIndex=Number(group.group_index)||0;(Array.isArray(group.boxes)?group.boxes:[]).forEach((box,sourceIndex)=>{const kind=Number(box.kind)||0,number=(counts.get(kind)||0)+1;counts.set(kind,number);out.push({groupIndex,sourceIndex,kind,number,label:boxLabel(kind,number,false),x:Number(box.x_offset)||0,y:Number(box.y_offset)||0,width:Number(box.width)||0,height:Number(box.height)||0})})});return out}
function norm(b){const left=Math.min(b.x,b.x+b.width),right=Math.max(b.x,b.x+b.width),top=Math.min(b.y,b.y+b.height),bottom=Math.max(b.y,b.y+b.height);return{left,right,top,bottom,width:Math.max(right-left,1),height:Math.max(bottom-top,1)}}
function size(){const r=wrap.getBoundingClientRect(),d=window.devicePixelRatio||1,w=Math.max(Math.floor(r.width),1),h=Math.max(Math.floor(r.height),1);canvas.width=Math.floor(w*d);canvas.height=Math.floor(h*d);canvas.style.width=w+"px";canvas.style.height=h+"px";const c=canvas.getContext("2d");c.setTransform(d,0,0,d,0,0);return{c,w,h}}
function fit(){const s=size();let mx=50,my=50;currentBoxes.forEach(b=>{const r=norm(b);mx=Math.max(mx,Math.abs(r.left),Math.abs(r.right));my=Math.max(my,Math.abs(r.top),Math.abs(r.bottom))});view.scale=Math.max(Math.min(Math.max(s.w-88,1)/(mx*2),Math.max(s.h-88,1)/(my*2)),.01);view.originX=s.w/2;view.originY=s.h*.62}
function w2c(x,y){return{x:view.originX-x*view.scale,y:view.originY+y*view.scale}}function c2w(x,y){return{x:(view.originX-x)/view.scale,y:(y-view.originY)/view.scale}}
function draw(){const s=size(),c=s.c;c.clearRect(0,0,s.w,s.h);const grid=25*view.scale;if(showGrid&&grid>=8){c.save();c.strokeStyle="rgba(127,127,127,.16)";c.beginPath();for(let x=((view.originX%grid)+grid)%grid;x<s.w;x+=grid){c.moveTo(x,0);c.lineTo(x,s.h)}for(let y=((view.originY%grid)+grid)%grid;y<s.h;y+=grid){c.moveTo(0,y);c.lineTo(s.w,y)}c.stroke();c.restore()}drawSpriteImage(c);if(showAxes){c.save();c.strokeStyle="rgba(220,220,220,.6)";c.lineWidth=2;c.beginPath();c.moveTo(view.originX,0);c.lineTo(view.originX,s.h);c.moveTo(0,view.originY);c.lineTo(s.w,view.originY);c.stroke();c.restore()}if(showOtherBoxes){const primary=list.querySelector('[data-entry-index="'+selectedEntryIndex+'"]'),group=primary?.closest('details');if(group){const visible=Array.from(group.querySelectorAll('.entry-item:not(.search-hidden)')).map(button=>Number(button.dataset.entryIndex)).filter(index=>Number.isInteger(index)&&!selectedEntryIndices.includes(index));c.save();c.globalAlpha=.18;for(const entryIndex of visible){for(const b of ensureEntryCache(entryIndex)){const r=norm(b),p=w2c(r.right,r.top),w=r.width*view.scale,h=r.height*view.scale;c.strokeStyle=colorForGroup(b.groupIndex);c.lineWidth=1;c.strokeRect(p.x,p.y,w,h)}}c.restore()}}
const order=currentBoxes.filter(b=>b.kind!==1).concat(currentBoxes.filter(b=>b.kind===1));order.forEach(b=>{const r=norm(b),p=w2c(r.right,r.top),w=r.width*view.scale,h=r.height*view.scale,color=colorForGroup(b.groupIndex),isSelected=selectedBox===b;c.save();c.fillStyle=color+(isSelected?"55":"32");c.strokeStyle=isSelected?"#ffffff":color;c.lineWidth=isSelected?3:2;c.fillRect(p.x,p.y,w,h);c.strokeRect(p.x,p.y,w,h);if(showLabels){c.font="11px "+getComputedStyle(document.body).fontFamily;const lw=c.measureText(b.label).width+6;c.fillStyle="rgba(0,0,0,.75)";c.fillRect(p.x,p.y,lw,17);c.fillStyle=color;c.fillText(b.label,p.x+3,p.y+12)}c.restore()});drawSelectionHandles(c);status.textContent=(entries[selectedEntryIndex]?.name||"")+" · "+currentBoxes.length+" boxes · "+view.scale.toFixed(2)+"×"}
function fmt(v){return Number.isInteger(v)?String(v):Number(v).toFixed(3).replace(/0+$/,"").replace(/\\.$/,"")}
function screenRect(box){const r=norm(box),a=w2c(r.right,r.top),b=w2c(r.left,r.bottom);return{left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)}}
function hitRegion(box,x,y){const r=screenRect(box),t=7,inside=x>=r.left-t&&x<=r.right+t&&y>=r.top-t&&y<=r.bottom+t;if(!inside)return null;const left=Math.abs(x-r.left)<=t,right=Math.abs(x-r.right)<=t,top=Math.abs(y-r.top)<=t,bottom=Math.abs(y-r.bottom)<=t;if(top&&left)return'tl';if(top&&right)return'tr';if(bottom&&left)return'bl';if(bottom&&right)return'br';if(left)return'l';if(right)return'r';if(top)return't';if(bottom)return'b';if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return'inside';return null}
function boxesAtPoint(x,y){const order=currentBoxes.filter(b=>b.kind!==1).concat(currentBoxes.filter(b=>b.kind===1));return order.filter(box=>hitRegion(box,x,y)).reverse()}
function cursorForRegion(region,shift){if(shift&&region)return'move';if(region==='l'||region==='r')return'ew-resize';if(region==='t'||region==='b')return'ns-resize';if(region==='tl'||region==='br')return'nwse-resize';if(region==='tr'||region==='bl')return'nesw-resize';return region?'pointer':'grab'}
function drawSelectionHandles(c){if(!selectedBox)return;const r=screenRect(selectedBox),points=[[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom],[(r.left+r.right)/2,r.top],[(r.left+r.right)/2,r.bottom],[r.left,(r.top+r.bottom)/2],[r.right,(r.top+r.bottom)/2]];c.save();c.fillStyle='#ffffff';c.strokeStyle='#000000';c.lineWidth=1;for(const [x,y] of points){c.fillRect(x-3,y-3,6,6);c.strokeRect(x-3,y-3,6,6)}c.restore()}
function snapDrag(value,ctrl){return ctrl?Number((Math.round(value*10)/10).toFixed(1)):Math.round(value)}
function snapshotMatches(box){return(box.matches||[]).map(match=>({match,kind:match.box.kind,x:match.box.x,y:match.box.y,width:match.box.width,height:match.box.height}))}
function restoreDrag(){if(!boxDrag)return;for(const item of boxDrag.snapshots){Object.assign(item.match.box,{kind:item.kind,groupIndex:item.kind,x:item.x,y:item.y,width:item.width,height:item.height})}Object.assign(selectedBox,boxDrag.selectedStart);renderBoxList();renderHitboxData();draw()}
function applyDrag(world,event){if(!boxDrag||!selectedBox)return;const start=boxDrag.selectedStart,dx=world.x-boxDrag.startWorld.x,dy=world.y-boxDrag.startWorld.y,precision=event.ctrlKey;let left=Math.min(start.x,start.x+start.width),right=Math.max(start.x,start.x+start.width),top=Math.min(start.y,start.y+start.height),bottom=Math.max(start.y,start.y+start.height);const original={left,right,top,bottom};if(boxDrag.move){left+=dx;right+=dx;top+=dy;bottom+=dy}else{const region=boxDrag.region;if(region.includes('l'))right+=dx;if(region.includes('r'))left+=dx;if(region.includes('t'))top+=dy;if(region.includes('b'))bottom+=dy;if(event.altKey){if(region.includes('l'))left=original.left-(right-original.right);if(region.includes('r'))right=original.right-(left-original.left);if(region.includes('t'))bottom=original.bottom-(top-original.top);if(region.includes('b'))top=original.top-(bottom-original.bottom)}}left=snapDrag(left,precision);right=snapDrag(right,precision);top=snapDrag(top,precision);bottom=snapDrag(bottom,precision);if(right<left)[left,right]=[right,left];if(bottom<top)[top,bottom]=[bottom,top];const clean=value=>precision?Number(value.toFixed(1)):Math.round(value);const x=clean(left),y=clean(top),width=clean(Math.max(right-left,precision?.1:1)),height=clean(Math.max(bottom-top,precision?.1:1));Object.assign(selectedBox,{x,y,width,height});for(const item of boxDrag.snapshots){Object.assign(item.match.box,{x,y,width,height})}renderHitboxData();updateSelectedRow();draw()}
function cycleSelectAt(x,y){const hits=boxesAtPoint(x,y);if(!hits.length)return null;const same=Math.hypot(x-cycleState.x,y-cycleState.y)<=5&&hits.length===cycleState.boxes.length&&hits.every((box,index)=>box===cycleState.boxes[index]);cycleState={x,y,boxes:hits,index:same?(cycleState.index+1)%hits.length:0};const box=hits[cycleState.index];selectBox(box);return box}
function scheduleDraw(){
requestAnimationFrame(()=>{
  requestAnimationFrame(()=>{
    draw();
  });
});
}
function renderBoxList(){
if(!currentBoxes.length){boxesContent.innerHTML='<div class="empty-message">No boxes are shared by all selected sprites.</div>';return}
boxesContent.innerHTML=currentBoxes.map((b,i)=>{
  const refs=(b.matches||[]).map(match=>'<div>'+escapeText(entries[match.entryIndex].name)+': '+escapeText(match.box.label)+'</div>').join('');
  return '<div class="box-row'+(selectedBox===b?' selected':'')+'" data-box-index="'+i+'" style="border-left-color:'+colorForGroup(b.groupIndex)+'"><div class="box-title">'+escapeText(b.label)+'</div><div class="box-values">'+refs+'<div>X '+fmt(b.x)+' · Y '+fmt(b.y)+' · W '+fmt(b.width)+' · H '+fmt(b.height)+'</div></div></div>';
}).join("")}
function kindOptions(selected){let out="";for(let i=0;i<=18;i++)out+='<option value="'+i+'"'+(i===selected?' selected':'')+'>'+escapeText(kindName(i))+' ('+i+')</option>';return out}
function escapeText(value){
return String(value)
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#039;");
}
function renderHitboxData(){
removeButton.disabled=!selectedBox;
if(selectedBoxName){
  selectedBoxName.textContent=selectedBox?selectedBox.label+" · "+selectedEntryIndices.length+" sprite"+(selectedEntryIndices.length===1?"":"s"):"No box selected";
}
const entry=entries[selectedEntryIndex]||{names:[]};
const image=Array.isArray(entry.names)&&entry.names.length?entry.names[0]:"";
let html="";
if(selectedBox){
  const b=selectedBox;
  html+='<div class="field-grid">'+
    '<div class="field full"><label>Type</label><select id="field-kind">'+kindOptions(b.kind)+'</select></div>'+
    '<div class="field"><label>X Position</label><input id="field-x" type="number" step="any" value="'+b.x+'"></div>'+
    '<div class="field"><label>Y Position</label><input id="field-y" type="number" step="any" value="'+b.y+'"></div>'+
    '<div class="field"><label>Width</label><input id="field-width" type="number" step="any" value="'+b.width+'"></div>'+
    '<div class="field"><label>Height</label><input id="field-height" type="number" step="any" value="'+b.height+'"></div>'+
    '</div>';
}else{
  html+='<div class="empty-message">Select a box to edit its data.</div>';
}
html+='<div class="section-label">Associated Image</div>'+
  '<div class="field full"><input id="field-image" type="text" value="'+escapeText(image)+'" placeholder="IMAGE.jpg"></div>'+
  '<div class="data-actions">'+
  '<button id="copy-data" class="data-action-button" type="button"'+(selectedBox?'':' disabled')+'>Copy Data</button>'+
  '<button id="paste-data" class="data-action-button" type="button"'+(selectedBox&&copiedBoxData?'':' disabled')+'>Paste Data</button>'+
  '</div>';
dataContent.innerHTML=html;
bindImageField();
const copyButton=document.getElementById('copy-data');
const pasteButton=document.getElementById('paste-data');
if(copyButton)copyButton.addEventListener('click',copySelectedBoxData);
if(pasteButton)pasteButton.addEventListener('click',pasteSelectedBoxData);
if(!selectedBox)return;
const b=selectedBox;
const fields=[['field-x','x'],['field-y','y'],['field-width','width'],['field-height','height']];
fields.forEach(([id,key])=>{
  const input=document.getElementById(id);
  if(!input)return;
  input.addEventListener('input',()=>{
    const n=Number(input.value);
    if(Number.isFinite(n)){
      b[key]=n;
      draw();
      updateSelectedRow();
    }
  });
  input.addEventListener('change',saveSelectedBox);
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'){
      event.preventDefault();
      event.stopPropagation();

      /*
       * Blurring fires the existing change handler.
       * Do not call saveSelectedBox here as well, or
       * Enter submits two overlapping WorkspaceEdits.
       */
      input.blur();
    }
  });
});
const kindField=document.getElementById('field-kind');
if(kindField)kindField.addEventListener('change',e=>preserveSidebarScroll(()=>changeKind(Number(e.target.value))));
}
function bindImageField(){
const input=document.getElementById('field-image');
if(!input)return;
input.addEventListener('input',()=>{const entry=entries[selectedEntryIndex];if(!Array.isArray(entry.names))entry.names=[];if(entry.names.length===0)entry.names.push(input.value);else entry.names[0]=input.value});
input.addEventListener('change',()=>preserveSidebarScroll(()=>{vscode.postMessage({type:'updateAssociatedImage',entryIndex:entries[selectedEntryIndex].originalIndex,imageName:input.value});loadImageTransform();requestAssociatedImage();saveUiState()}));
}
function cloneBoxData(box){
return {
  kind:Number(box.kind)||0,
  x_offset:Number(box.x)||0,
  y_offset:Number(box.y)||0,
  width:Number(box.width)||0,
  height:Number(box.height)||0
};
}
function serializeSpriteBoxes(boxes){
const groups=new Map();
boxes.forEach(box=>{
  const kind=Number(box.kind)||0;
  if(!groups.has(kind))groups.set(kind,[]);
  groups.get(kind).push(cloneBoxData(box));
});
return Array.from(groups.entries())
  .sort((a,b)=>a[0]-b[0])
  .map(([kind,groupBoxes])=>({
    group_index:kind,
    boxes:groupBoxes
  }));
}
function copySelectedBoxData(){
if(!selectedBox)return;
copiedBoxData={kind:selectedBox.kind,x_offset:selectedBox.x,y_offset:selectedBox.y,width:selectedBox.width,height:selectedBox.height};
renderHitboxData();
}
function pasteSelectedBoxData(){
if(!selectedBox||!copiedBoxData)return;
selectedBox.kind=copiedBoxData.kind;selectedBox.groupIndex=copiedBoxData.kind;selectedBox.x=copiedBoxData.x_offset;selectedBox.y=copiedBoxData.y_offset;selectedBox.width=copiedBoxData.width;selectedBox.height=copiedBoxData.height;
for(const match of selectedBox.matches||[]){match.box.kind=copiedBoxData.kind;match.box.groupIndex=copiedBoxData.kind;match.box.x=copiedBoxData.x_offset;match.box.y=copiedBoxData.y_offset;match.box.width=copiedBoxData.width;match.box.height=copiedBoxData.height}
renumber();commitSelectedEntries();refreshAfterBatch((selectedBox.matches||[])[0]?.box)
}
function copySprite(index){
if(!entries[index])return;
const entry=entries[index];
const boxes=boxCache.has(entry.originalIndex)
  ? boxCache.get(entry.originalIndex)
  : flatten(entry);
copiedSpriteBoxes=serializeSpriteBoxes(boxes);
}
function pasteSprite(index){
if(!entries[index]||!copiedSpriteBoxes)return;
const entry=entries[index];
const replacement=[];
copiedSpriteBoxes.forEach(group=>{
  group.boxes.forEach((box,sourceIndex)=>{
    replacement.push({
      groupIndex:Number(group.group_index)||0,
      sourceIndex,
      kind:Number(box.kind)||0,
      number:1,
      label:'',
      x:Number(box.x_offset)||0,
      y:Number(box.y_offset)||0,
      width:Number(box.width)||0,
      height:Number(box.height)||0
    });
  });
});
const previousEntryIndex=selectedEntryIndex;
selectedEntryIndex=index;
currentBoxes=replacement;
renumber();
boxCache.set(entry.originalIndex,currentBoxes);
selectedBox=currentBoxes[0]||null;
vscode.postMessage({
  type:'replaceSpriteBoxes',
  entryIndex:entry.originalIndex,
  boxGroups:copiedSpriteBoxes
});
if(previousEntryIndex!==index){
  selectEntry(index);
}else{
  renderBoxList();
  renderHitboxData();
  fit();
  draw();
  saveUiState();
}
}
function updateSelectedRow(){const row=boxesContent.querySelector('.box-row.selected .box-values');if(row&&selectedBox)row.textContent='X '+fmt(selectedBox.x)+' · Y '+fmt(selectedBox.y)+' · W '+fmt(selectedBox.width)+' · H '+fmt(selectedBox.height)}
function boxKey(box){return [box.kind,box.x,box.y,box.width,box.height].join('|')}
function ensureEntryCache(index){const key=entries[index].originalIndex;if(!boxCache.has(key))boxCache.set(key,flatten(entries[index]));return boxCache.get(key)}
function rebuildSharedBoxes(){
  const primaryBoxes=ensureEntryCache(selectedEntryIndex);
  if(selectedEntryIndices.length===1){
    currentBoxes=primaryBoxes.map(box=>({...box,matches:[{entryIndex:selectedEntryIndex,box}]}));
    renumberShared();
    return;
  }
  const occurrence=new Map();
  currentBoxes=[];
  for(const primaryBox of primaryBoxes){
    const key=boxKey(primaryBox),nth=occurrence.get(key)||0;
    occurrence.set(key,nth+1);
    const matches=[{entryIndex:selectedEntryIndex,box:primaryBox}];
    let shared=true;
    for(const entryIndex of selectedEntryIndices.slice(1)){
      const candidates=ensureEntryCache(entryIndex).filter(box=>boxKey(box)===key);
      if(!candidates[nth]){shared=false;break}
      matches.push({entryIndex,box:candidates[nth]});
    }
    if(shared)currentBoxes.push({...primaryBox,matches});
  }
  renumberShared();
}
function renumberShared(){const counts=new Map();currentBoxes.forEach(box=>{const n=(counts.get(box.kind)||0)+1;counts.set(box.kind,n);box.number=n;box.label=boxLabel(box.kind,n,selectedEntryIndices.length>1)})}
function serializeEntryBoxes(index){const groups=new Map();ensureEntryCache(index).forEach(box=>{const kind=Number(box.kind)||0;if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push({kind,x_offset:box.x,y_offset:box.y,width:box.width,height:box.height})});return Array.from(groups.entries()).sort((a,b)=>a[0]-b[0]).map(([kind,boxes])=>({group_index:kind,boxes}))}
function commitSelectedEntries(){vscode.postMessage({type:'replaceEntriesBoxes',entries:selectedEntryIndices.map(index=>({entryIndex:entries[index].originalIndex,boxGroups:serializeEntryBoxes(index)}))});saveUiState()}
function refreshAfterBatch(preferred){rebuildSharedBoxes();selectedBox=preferred?currentBoxes.find(box=>box.matches?.some(match=>match.box===preferred))||null:null;renderSpriteSelection();renderBoxList();renderHitboxData();draw();saveUiState()}
function renderSpriteSelection(){list.querySelectorAll('.entry-item').forEach(button=>{const index=Number(button.dataset.entryIndex);button.classList.toggle('selected',index===selectedEntryIndex);button.classList.toggle('batch-selected',selectedEntryIndices.includes(index));button.classList.toggle('primary-selected',index===selectedEntryIndex)})}
function saveUiState(){
const entry=entries[selectedEntryIndex];
if(!entry)return;
const openGroups=Array.from(document.querySelectorAll('.sprite-group[open]')).map(group=>group.querySelector('summary span')?.textContent||'');
vscode.setState({
  entryOriginalIndex:entry.originalIndex,
  selectedOriginalIndices:selectedEntryIndices.map(index=>entries[index].originalIndex),
  groupIndex:selectedBox?selectedBox.groupIndex:null,
  boxIndex:selectedBox?selectedBox.sourceIndex:null,
  openGroups,
  listScrollTop:list.scrollTop,
  imageTransforms,
  showSpriteImage,
  showGrid,
  showAxes,
  showLabels,
  showOtherBoxes
});
}
function selectBox(box){selectedBox=box||null;renderBoxList();renderHitboxData();draw();saveUiState()}
function preserveSidebarScroll(action){
const scrollTop=list.scrollTop;
action();
requestAnimationFrame(()=>{
  list.scrollTop=scrollTop;
});
}
function saveSelectedBox(){if(!selectedBox)return;for(const match of selectedBox.matches||[]){match.box.x=selectedBox.x;match.box.y=selectedBox.y;match.box.width=selectedBox.width;match.box.height=selectedBox.height}commitSelectedEntries()}
function changeKind(kind){if(!selectedBox||kind===selectedBox.kind)return;selectedBox.kind=kind;selectedBox.groupIndex=kind;for(const match of selectedBox.matches||[]){match.box.kind=kind;match.box.groupIndex=kind}commitSelectedEntries();refreshAfterBatch((selectedBox.matches||[])[0]?.box)}
function renumber(){selectedEntryIndices.forEach(index=>{const counts=new Map();ensureEntryCache(index).forEach(box=>{const n=(counts.get(box.kind)||0)+1;counts.set(box.kind,n);box.number=n;box.label=boxLabel(box.kind,n,false);box.groupIndex=box.kind})});renumberShared()}
function selectEntry(index,event,restoreSelection){
if(!entries[index])return;
if(restoreSelection&&selectedEntryIndices.length){selectedEntryIndex=selectedEntryIndices[0]}
else if(event&&event.shiftKey){const a=Math.min(selectionAnchor,index),b=Math.max(selectionAnchor,index);selectedEntryIndices=[];for(let i=a;i<=b;i++)selectedEntryIndices.push(i)}
else if(event&&(event.ctrlKey||event.metaKey)){if(selectedEntryIndices.includes(index)){if(selectedEntryIndices.length>1)selectedEntryIndices=selectedEntryIndices.filter(value=>value!==index)}else selectedEntryIndices.push(index);selectionAnchor=index}
else if(!restoreSelection){selectedEntryIndices=[index];selectionAnchor=index}
selectedEntryIndex=selectedEntryIndices[0];
selectedEntryIndices.forEach(ensureEntryCache);
rebuildSharedBoxes();
selectedBox=currentBoxes[0]||null;
renderSpriteSelection();
const button=list.querySelector('[data-entry-index="'+selectedEntryIndex+'"]');if(button){const details=button.closest('details');if(details)details.open=true}
renderBoxList();renderHitboxData();message.style.display=currentBoxes.length?'none':'block';message.textContent=selectedEntryIndices.length>1?'No boxes are shared by all selected sprites.':'No boxes in '+entries[selectedEntryIndex].name;loadImageTransform();requestAssociatedImage();fit();draw();saveUiState()
}
function selectEntryByName(entryName){
const target=String(entryName||'').toLowerCase();
const index=entries.findIndex(entry=>String(entry.name||'').toLowerCase()===target);
if(index<0)return false;
selectEntry(index);
requestAnimationFrame(()=>{
  const button=list.querySelector('[data-entry-index="'+index+'"]');
  if(button)button.scrollIntoView({block:'center'});
});
return true;
}
function deleteBox(box){if(!box)return;for(const match of box.matches||[]){const boxes=ensureEntryCache(match.entryIndex);const i=boxes.indexOf(match.box);if(i>=0)boxes.splice(i,1)}commitSelectedEntries();refreshAfterBatch(null)}
function duplicateBox(box){if(!box)return;for(const match of box.matches||[]){const boxes=ensureEntryCache(match.entryIndex),i=boxes.indexOf(match.box),clone={...match.box};boxes.splice(i+1,0,clone)}renumber();commitSelectedEntries();refreshAfterBatch(null)}
list.addEventListener('click',e=>{const b=e.target.closest('.entry-item');if(b)selectEntry(Number(b.dataset.entryIndex),e)});
list.addEventListener('contextmenu',e=>{
  const button=e.target.closest('.entry-item');
  if(!button)return;
  e.preventDefault();
  contextSpriteIndex=Number(button.dataset.entryIndex);
  spriteMenu.style.left=e.clientX+'px';
  spriteMenu.style.top=e.clientY+'px';
  spriteMenu.classList.add('open');
});
spriteMenu.addEventListener('click',e=>{
  const action=e.target.dataset.action;
  if(!action||contextSpriteIndex===null)return;
  spriteMenu.classList.remove('open');
  if(action==='copy')copySprite(contextSpriteIndex);
  if(action==='paste')pasteSprite(contextSpriteIndex);
});
boxesContent.addEventListener('click',e=>{const row=e.target.closest('.box-row');if(row)selectBox(currentBoxes[Number(row.dataset.boxIndex)])});
boxesContent.addEventListener('contextmenu',e=>{
  const row=e.target.closest('.box-row');
  if(!row)return;
  e.preventDefault();
  contextBox=currentBoxes[Number(row.dataset.boxIndex)];
  menu.style.left=e.clientX+'px';
  menu.style.top=e.clientY+'px';
  menu.classList.add('open');
});
menu.addEventListener('click',e=>{
  const action=e.target.dataset.action;
  if(!action)return;
  menu.classList.remove('open');
  if(action==='select')selectBox(contextBox);
  if(action==='copy'){
    selectBox(contextBox);
    copySelectedBoxData();
  }
  if(action==='paste'){
    selectBox(contextBox);
    pasteSelectedBoxData();
  }
  if(action==='delete')deleteBox(contextBox);
  if(action==='duplicate')duplicateBox(contextBox);
});
document.addEventListener('click',e=>{
  if(!menu.contains(e.target))menu.classList.remove('open');
  if(!spriteMenu.contains(e.target))spriteMenu.classList.remove('open');
});
function isTypingTarget(target){return target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement}
function revealPrimarySprite(){const button=list.querySelector('[data-entry-index="'+selectedEntryIndex+'"]');if(button)button.scrollIntoView({block:'center'})}
function navigateSprite(delta,extend){const target=Math.min(Math.max(selectedEntryIndex+delta,0),entries.length-1);if(target===selectedEntryIndex&&!extend)return;selectEntry(target,extend?{shiftKey:true}:null);revealPrimarySprite()}
function navigateBox(delta){if(!currentBoxes.length)return;const current=Math.max(currentBoxes.indexOf(selectedBox),0),next=(current+delta+currentBoxes.length)%currentBoxes.length;selectBox(currentBoxes[next]);const row=boxesContent.querySelector('[data-box-index="'+next+'"]');if(row)row.scrollIntoView({block:'nearest'})}
function selectBoundarySprite(last){if(!entries.length)return;selectEntry(last?entries.length-1:0,null);revealPrimarySprite()}
function selectBoundaryBox(last){if(!currentBoxes.length)return;selectBox(currentBoxes[last?currentBoxes.length-1:0])}
function focusField(id){const field=document.getElementById(id);if(field){field.focus();if(typeof field.select==='function')field.select()}}
function zoomAtCenter(factor){const r=wrap.getBoundingClientRect(),px=r.width/2,py=r.height/2,before=c2w(px,py);view.scale=Math.min(Math.max(view.scale*factor,.01),100);view.originX=px+before.x*view.scale;view.originY=py-before.y*view.scale;draw()}
function resetImageTransform(){imageTransform={x:-2.5,y:198.5,scale:1,mirror:true};syncImageControls();storeImageTransform();draw()}
function selectAllInCurrentGroup(){const primary=list.querySelector('[data-entry-index="'+selectedEntryIndex+'"]');const group=primary?.closest('details');if(!group)return;selectedEntryIndices=Array.from(group.querySelectorAll('.entry-item')).map(button=>Number(button.dataset.entryIndex)).filter(Number.isInteger);if(!selectedEntryIndices.length)return;selectedEntryIndex=selectedEntryIndices[0];selectionAnchor=selectedEntryIndex;selectedEntryIndices.forEach(ensureEntryCache);rebuildSharedBoxes();selectedBox=currentBoxes[0]||null;renderSpriteSelection();renderBoxList();renderHitboxData();loadImageTransform();requestAssociatedImage();fit();draw();saveUiState()}
function clearBatchSelection(){if(selectedEntryIndices.length<=1)return;selectedEntryIndices=[selectedEntryIndex];selectionAnchor=selectedEntryIndex;rebuildSharedBoxes();selectedBox=currentBoxes[0]||null;renderSpriteSelection();renderBoxList();renderHitboxData();fit();draw();saveUiState()}
function invertCurrentGroupSelection(){const primary=list.querySelector('[data-entry-index="'+selectedEntryIndex+'"]');const group=primary?.closest('details');if(!group)return;const groupIndices=Array.from(group.querySelectorAll('.entry-item')).map(button=>Number(button.dataset.entryIndex)).filter(Number.isInteger);const inverted=groupIndices.filter(index=>!selectedEntryIndices.includes(index));selectedEntryIndices=inverted.length?inverted:[selectedEntryIndex];if(!selectedEntryIndices.includes(selectedEntryIndex))selectedEntryIndex=selectedEntryIndices[0];selectionAnchor=selectedEntryIndex;selectedEntryIndices.forEach(ensureEntryCache);rebuildSharedBoxes();selectedBox=currentBoxes[0]||null;renderSpriteSelection();renderBoxList();renderHitboxData();loadImageTransform();requestAssociatedImage();fit();draw();saveUiState()}
function makeFocusedSpritePrimary(){const active=document.activeElement?.closest?.('.entry-item');let target=active?Number(active.dataset.entryIndex):selectedEntryIndex;if(!selectedEntryIndices.includes(target))target=selectedEntryIndex;selectedEntryIndices=[target,...selectedEntryIndices.filter(index=>index!==target)];selectedEntryIndex=target;selectionAnchor=target;rebuildSharedBoxes();selectedBox=currentBoxes[0]||null;renderSpriteSelection();renderBoxList();renderHitboxData();loadImageTransform();requestAssociatedImage();fit();draw();saveUiState();revealPrimarySprite()}
function toggleDisplaySetting(key){if(key==='image')showSpriteImage=!showSpriteImage;if(key==='grid')showGrid=!showGrid;if(key==='axes')showAxes=!showAxes;if(key==='labels')showLabels=!showLabels;saveUiState();draw()}
function applySpriteSearch(){
const query=spriteSearch.value.trim().toLowerCase();
const groups=Array.from(list.querySelectorAll('.sprite-group'));
if(query&&searchOpenGroups===null){
  searchOpenGroups=new Set(groups.filter(group=>group.open).map(group=>group.querySelector('summary span')?.textContent||''));
}
list.querySelectorAll('.entry-item').forEach(button=>button.classList.toggle('search-hidden',Boolean(query)&&!button.textContent.toLowerCase().includes(query)));
groups.forEach(group=>{
  const hasVisible=Boolean(group.querySelector('.entry-item:not(.search-hidden)'));
  group.classList.toggle('search-empty',Boolean(query)&&!hasVisible);
  if(query)group.open=hasVisible;
});
if(!query&&searchOpenGroups!==null){
  groups.forEach(group=>{const name=group.querySelector('summary span')?.textContent||'';group.open=searchOpenGroups.has(name)});
  searchOpenGroups=null;
}
}
function filteredSpriteButtons(){return Array.from(list.querySelectorAll('.entry-item:not(.search-hidden)'))}
function navigateSearchResults(delta){const buttons=filteredSpriteButtons();if(!buttons.length)return;const activeIndex=buttons.findIndex(button=>Number(button.dataset.entryIndex)===selectedEntryIndex);const next=buttons[(Math.max(activeIndex,0)+delta+buttons.length)%buttons.length];selectEntry(Number(next.dataset.entryIndex),null);next.scrollIntoView({block:'nearest'});spriteSearch.focus()}
function cancelFieldEdit(target){if(!(target instanceof HTMLInputElement||target instanceof HTMLSelectElement))return false;if(target.dataset.editStart===undefined)return false;const original=target.dataset.editStart;if(target instanceof HTMLInputElement&&target.type==='checkbox')target.checked=original==='true';else target.value=original;target.dispatchEvent(new Event('input',{bubbles:true}));target.blur();delete target.dataset.editStart;return true}
function selectSpritesContainingCurrentBox(){if(!selectedBox)return;const key=boxKey(selectedBox),indices=[];entries.forEach((entry,index)=>{if(ensureEntryCache(index).some(box=>boxKey(box)===key))indices.push(index)});if(!indices.length)return;selectedEntryIndex=indices.includes(selectedEntryIndex)?selectedEntryIndex:indices[0];selectedEntryIndices=[selectedEntryIndex,...indices.filter(index=>index!==selectedEntryIndex)];selectionAnchor=selectedEntryIndex;rebuildSharedBoxes();selectedBox=currentBoxes.find(box=>boxKey(box)===key)||currentBoxes[0]||null;renderSpriteSelection();renderBoxList();renderHitboxData();loadImageTransform();requestAssociatedImage();fit();draw();saveUiState();revealPrimarySprite()}
function closeOtherDropdowns(){
const primary=list.querySelector('[data-entry-index="'+selectedEntryIndex+'"]');
const current=primary?.closest('details')||null;
list.querySelectorAll('.sprite-group').forEach(group=>{group.open=group===current});
if(current)current.open=true;
saveUiState();
revealPrimarySprite();
}
function adjustFocusedNumber(event){const input=event.target;if(!(input instanceof HTMLInputElement)||input.type!=='number')return false;if(!(event.shiftKey||event.ctrlKey))return false;const amount=event.shiftKey?10:.1;const direction=event.key==='ArrowUp'?1:event.key==='ArrowDown'?-1:0;if(!direction)return false;event.preventDefault();const value=Number(input.value)||0;input.value=String(Math.round((value+amount*direction)*1000)/1000);input.dispatchEvent(new Event('input',{bubbles:true}));return true}
document.addEventListener('focusin',event=>{const target=event.target;if(target instanceof HTMLInputElement||target instanceof HTMLSelectElement){target.dataset.editStart=target instanceof HTMLInputElement&&target.type==='checkbox'?String(target.checked):target.value}});
spriteSearch.addEventListener('input',applySpriteSearch);
spriteSearch.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();spriteSearch.value='';applySpriteSearch();list.focus();return}if(event.key==='ArrowDown'){event.preventDefault();navigateSearchResults(1);return}if(event.key==='ArrowUp'){event.preventDefault();navigateSearchResults(-1);return}if(event.key==='Enter'){event.preventDefault();const first=filteredSpriteButtons()[0];if(first)selectEntry(Number(first.dataset.entryIndex),null)}});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&boxDrag){event.preventDefault();restoreDrag();boxDrag=null;return}
  if(shortcutModal.classList.contains('open')&&event.key==='Escape'){event.preventDefault();shortcutModal.classList.remove('open');return}
  if(modal.classList.contains('open')&&event.key==='Escape'){event.preventDefault();modal.classList.remove('open');return}
  if(event.key==='Escape'&&cancelFieldEdit(event.target)){event.preventDefault();return}
  if(adjustFocusedNumber(event))return;
  if(!event.altKey)return;
  const key=event.key.toLowerCase();
  const typing=isTypingTarget(event.target);
  const handled=()=>{event.preventDefault();event.stopPropagation()};
  if(key==='/'){handled();shortcutModal.classList.add('open');return}
  if(key==='escape'){handled();clearBatchSelection();return}
  if(typing&&!['x','y','w','h','t','i','m','r'].includes(key))return;
  if(key==='arrowup'){handled();navigateSprite(-1,event.shiftKey);return}
  if(key==='arrowdown'){handled();navigateSprite(1,event.shiftKey);return}
  if(key==='arrowleft'&&!event.shiftKey){handled();navigateBox(-1);return}
  if(key==='arrowright'&&!event.shiftKey){handled();navigateBox(1);return}
  if(key==='home'){handled();event.shiftKey?selectBoundaryBox(false):selectBoundarySprite(false);return}
  if(key==='end'){handled();event.shiftKey?selectBoundaryBox(true):selectBoundarySprite(true);return}
  if(key==='insert'){handled();document.getElementById('add-box').click();return}
  if(key==='delete'){handled();deleteBox(selectedBox);return}
  if(key==='d'){handled();duplicateBox(selectedBox);return}
  if(key==='c'){handled();event.shiftKey?copySprite(selectedEntryIndex):copySelectedBoxData();return}
  if(key==='v'){handled();event.shiftKey?pasteSprite(selectedEntryIndex):pasteSelectedBoxData();return}
  if(key==='t'){handled();focusField('field-kind');return}
  if(key==='x'){handled();focusField('field-x');return}
  if(key==='y'){handled();focusField('field-y');return}
  if(key==='w'){handled();focusField('field-width');return}
  if(key==='h'){handled();focusField('field-height');return}
  if(key==='r'){handled();event.shiftKey?resetImageTransform():(fit(),draw());return}
  if(key==='i'){handled();event.shiftKey?toggleDisplaySetting('image'):imageDropdown.classList.toggle('open');return}
  if(key==='m'){handled();imageTransform.mirror=!imageTransform.mirror;syncImageControls();storeImageTransform();draw();return}
  if(key==='='||key==='+'){handled();zoomAtCenter(1.15);return}
  if(key==='-'){handled();zoomAtCenter(1/1.15);return}
  if(key==='a'){handled();event.shiftKey?invertCurrentGroupSelection():selectAllInCurrentGroup();return}
  if(key==='b'){handled();event.shiftKey?selectSpritesContainingCurrentBox():(showOtherBoxes=!showOtherBoxes,saveUiState(),draw());return}
  if(key==='f'){handled();event.shiftKey?closeOtherDropdowns():(spriteSearch.focus(),spriteSearch.select());return}
  if(key==='p'){handled();makeFocusedSpritePrimary();return}
  if(key==='g'){handled();event.shiftKey?toggleDisplaySetting('axes'):toggleDisplaySetting('grid');return}
  if(key==='l'){handled();event.shiftKey?toggleDisplaySetting('labels'):revealPrimarySprite();return}
  if(key==='0'){handled();fit();draw();return}
});
shortcutModal.addEventListener('click',event=>{if(event.target===shortcutModal)shortcutModal.classList.remove('open')});
document.getElementById('close-shortcuts').addEventListener('click',()=>shortcutModal.classList.remove('open'));
document.getElementById('toggle-image-controls').addEventListener('click',event=>{event.stopPropagation();imageDropdown.classList.toggle('open')});
imageDropdown.addEventListener('click',event=>event.stopPropagation());
document.addEventListener('click',()=>imageDropdown.classList.remove('open'));
function bindImageNumber(input,key){input.addEventListener('input',()=>{const value=Number(input.value);if(!Number.isFinite(value)||(key==='scale'&&value<=0))return;imageTransform[key]=value;storeImageTransform();draw()})}
bindImageNumber(imageXInput,'x');bindImageNumber(imageYInput,'y');bindImageNumber(imageScaleInput,'scale');
imageMirrorInput.addEventListener('change',()=>{imageTransform.mirror=imageMirrorInput.checked;storeImageTransform();draw()});
document.getElementById('reset-image').addEventListener('click',resetImageTransform);
document.getElementById('add-box').addEventListener('click',()=>modal.classList.add('open'));document.getElementById('cancel-add').addEventListener('click',()=>modal.classList.remove('open'));document.getElementById('confirm-add').addEventListener('click',()=>{const kind=Number(document.getElementById('add-kind').value);for(const index of selectedEntryIndices)ensureEntryCache(index).push({groupIndex:kind,sourceIndex:0,kind,number:1,label:'',x:0,y:0,width:100,height:100});renumber();modal.classList.remove('open');commitSelectedEntries();refreshAfterBatch(null)});removeButton.addEventListener('click',()=>deleteBox(selectedBox));
wrap.addEventListener('wheel',e=>{e.preventDefault();const r=wrap.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,before=c2w(px,py),factor=Math.exp(-e.deltaY*.0015);view.scale=Math.min(Math.max(view.scale*factor,.01),100);view.originX=px+before.x*view.scale;view.originY=py-before.y*view.scale;draw()},{passive:false});wrap.addEventListener('pointermove',event=>{
const rect=wrap.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
if(boxDrag){applyDrag(c2w(x,y),event);return}
if(view.dragging){view.originX=view.startOriginX+event.clientX-view.startX;view.originY=view.startOriginY+event.clientY-view.startY;draw();return}
const hits=boxesAtPoint(x,y),box=hits[0]||null;hoverRegion=box?hitRegion(box,x,y):null;wrap.style.cursor=cursorForRegion(hoverRegion,event.shiftKey)
});
wrap.addEventListener('pointerdown',event=>{
if(event.button!==0&&event.button!==1)return;
const rect=wrap.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,world=c2w(x,y),hits=boxesAtPoint(x,y),top=hits[0]||null,region=top?hitRegion(top,x,y):null;
if(event.button===0&&top){
  const chosen=cycleSelectAt(x,y)||top;
  const chosenRegion=hitRegion(chosen,x,y);
  if(event.shiftKey||chosenRegion!=='inside'){
    boxDrag={pointerId:event.pointerId,region:chosenRegion,startWorld:world,move:event.shiftKey,snapshots:snapshotMatches(chosen),selectedStart:{x:chosen.x,y:chosen.y,width:chosen.width,height:chosen.height}};
    wrap.setPointerCapture(event.pointerId);event.preventDefault();
  }
  return;
}
view.dragging=true;view.startX=event.clientX;view.startY=event.clientY;view.startOriginX=view.originX;view.startOriginY=view.originY;wrap.classList.add('dragging');wrap.setPointerCapture(event.pointerId)
});
function finishPointer(event,cancel){
if(boxDrag&&boxDrag.pointerId===event.pointerId){if(cancel)restoreDrag();else{renumber();commitSelectedEntries();renderBoxList();renderHitboxData()}boxDrag=null;if(wrap.hasPointerCapture(event.pointerId))wrap.releasePointerCapture(event.pointerId);wrap.style.cursor='default';return}
if(view.dragging){view.dragging=false;wrap.classList.remove('dragging');if(wrap.hasPointerCapture(event.pointerId))wrap.releasePointerCapture(event.pointerId)}
}
wrap.addEventListener('pointerup',event=>finishPointer(event,false));
wrap.addEventListener('pointercancel',event=>finishPointer(event,true));
document.getElementById('reset-view').addEventListener('click',()=>{fit();scheduleDraw()});window.addEventListener('resize',scheduleDraw);window.addEventListener('message',e=>{const data=e.data||{};if(data.type==='hitboxColorsChanged'){if(Array.isArray(data.colors)&&data.colors.length===19){hitboxColors=data.colors;renderBoxList();draw()}return}if(data.type==='selectEntryByName'){selectEntryByName(data.entryName);return}if(data.type==='editError'){toast.textContent=data.message;toast.classList.add('open');setTimeout(()=>toast.classList.remove('open'),4000);return}if(data.type==='charaFolderChanged'){currentCharaFolder=data.charaFolder||'';requestAssociatedImage();return}if(data.type==='imageResolved'){if(Number(data.requestId)!==imageRequestId)return;if(data.associatedImage!==currentAssociatedImage())return;spriteImageMessage=data.message||'';if(!data.found||!data.imageUri){spriteImage=null;updateImageStatus();draw();return}const image=new Image();const acceptedRequest=imageRequestId;image.onload=()=>{if(acceptedRequest!==imageRequestId||data.associatedImage!==currentAssociatedImage())return;spriteImage=image;spriteImageName=data.associatedImage;updateImageStatus();draw()};image.onerror=()=>{if(acceptedRequest!==imageRequestId)return;spriteImage=null;spriteImageMessage='Could not load resolved image.';updateImageStatus();draw()};image.src=data.imageUri}});
document.querySelectorAll('.sprite-group').forEach(group=>group.addEventListener('toggle',saveUiState));
if(entries.length){
  if(Array.isArray(restoredState.openGroups)){
    document.querySelectorAll('.sprite-group').forEach(group=>{
      const name=group.querySelector('summary span')?.textContent||'';
      group.open=restoredState.openGroups.includes(name);
    });
  }
  const requestedIndex=initialSpriteName
    ? entries.findIndex(entry=>String(entry.name||'').toLowerCase()===initialSpriteName.toLowerCase())
    : -1;
  const restoredIndex=entries.findIndex(entry=>entry.originalIndex===restoredState.entryOriginalIndex);
  const startupIndex=requestedIndex>=0?requestedIndex:(restoredIndex>=0?restoredIndex:0);
  if(requestedIndex<0&&Array.isArray(restoredState.selectedOriginalIndices)){
    selectedEntryIndices=restoredState.selectedOriginalIndices.map(original=>entries.findIndex(entry=>entry.originalIndex===original)).filter(index=>index>=0);
    if(!selectedEntryIndices.length)selectedEntryIndices=[startupIndex];
    selectedEntryIndex=selectedEntryIndices[0];
  }
  selectEntry(startupIndex,null,requestedIndex>=0?null:(restoredIndex>=0?restoredState:null));
  if(requestedIndex>=0){
    requestAnimationFrame(()=>{
      const button=list.querySelector('[data-entry-index="'+requestedIndex+'"]');
      if(button)button.scrollIntoView({block:'center'});
    });
  }
  requestAnimationFrame(()=>{
    if(Number.isFinite(Number(restoredState.listScrollTop))){
      list.scrollTop=Number(restoredState.listScrollTop);
    }
  });
}else{message.textContent=${JSON.stringify(error ? "Could not load COL JSON: " + error : "No sprites found.")};dataContent.innerHTML='<div class="empty-message">No box data available.</div>';boxesContent.innerHTML='<div class="empty-message">No boxes available.</div>'}
})();
</script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

module.exports = { getColEditorHtml };
