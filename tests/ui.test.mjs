import {JSDOM} from 'jsdom';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
const project=new URL('../',import.meta.url).pathname;
const pages=['01-pouls','02-memoire','03-calendrier','04-adn','05-deux-visages'];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const allErrors=[];
for(const [i,slug] of pages.entries()){
 const dom=new JSDOM(await fs.readFile(`${project}/idees/${slug}/index.html`,'utf8'),{url:`http://localhost:8000/idees/${slug}/`,pretendToBeVisual:true});
 const win=dom.window;
 for(const key of ['window','document','location','history','XMLSerializer','innerWidth','innerHeight'])globalThis[key]=key==='window'?win:win[key];
 win.addEventListener('error',event=>allErrors.push(event.error?.message||event.message));
 Object.defineProperty(win.HTMLElement.prototype,'innerText',{get(){return this.textContent}});
 win.HTMLCanvasElement.prototype.getContext=function(){this.c??=createCanvas(this.width,this.height);return this.c.getContext('2d')};
 win.HTMLCanvasElement.prototype.toBlob=function(callback){callback(new Blob([this.c.toBuffer('image/png')],{type:'image/png'}))};
 win.Element.prototype.getBoundingClientRect=function(){return {width:this.tagName==='CANVAS'?850:760,height:this.tagName==='CANVAS'?480:590,left:0,top:0}};
 const exports=[];globalThis.URL.createObjectURL=blob=>{exports.push(blob);return 'blob:test'};globalThis.URL.revokeObjectURL=()=>{};
 win.HTMLAnchorElement.prototype.click=function(){};
 globalThis.fetch=async url=>{const p=url instanceof URL?url.pathname:new URL(url).pathname;const data=await fs.readFile(p);return {ok:true,json:async()=>JSON.parse(data.toString()),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}};
 await import(`../assets/app.js?qa=${i}`);
 for(let j=0;j<100&&!win.document.querySelector('#map');j++)await delay(10);
 const doc=win.document,$=id=>doc.getElementById(id),change=node=>node.dispatchEvent(new win.Event('change',{bubbles:true}));
 assert.ok($('map'),`${slug} charge la carte`);assert.equal(doc.querySelectorAll('#points [data-station]').length,266);
 await delay(20);assert.ok(!$('right-content').textContent.includes('indisponible'));
 $('station').value='30';change($('station'));await delay(10);assert.equal(doc.querySelectorAll('.selected').length,1);
 $('basin').value='B';change($('basin'));assert.ok(doc.querySelectorAll('#points [data-station]').length<266);
 $('basin').value='';change($('basin'));
 $('search').value='aucune_station_xyz';$('search').dispatchEvent(new win.Event('input'));assert.equal(doc.querySelectorAll('#points [data-station]').length,0);
 $('search').value='';$('search').dispatchEvent(new win.Event('input'));assert.equal(doc.querySelectorAll('#points [data-station]').length,266);
 if(i===0){
  const before=$('date-label').textContent;$('next').click();assert.notEqual($('date-label').textContent,before);
  $('speed').value='300';$('play').click();assert.equal($('play').textContent,'Pause');await delay(350);$('play').click();assert.equal($('play').textContent,'Lire');
  $('goto').value='2026';change($('goto'));assert.ok($('date-label').textContent.startsWith('2026'));
  doc.querySelector('[data-event]').click();
 }
 if(i===1){assert.ok($('correlation').querySelector('svg'));$('year').value='2000';change($('year'));await delay(15);assert.ok($('series').textContent.includes('2000'))}
 if(i===2){assert.ok($('heat').c);$('scope').value='filtered';change($('scope'));$('heatdate').value='100';change($('heatdate'));assert.ok($('heatinfo').textContent.includes('2001'));$('heat-export').click()}
 if(i===3){assert.ok($('profile-curve').querySelector('svg'));$('station').value='1';change($('station'));if(!$('add-compare').disabled)$('add-compare').click();assert.ok($('extra').textContent.includes('Comparer'));$('profile-export').click()}
 if(i===4){$('year').value='2026';change($('year'));assert.ok($('left-content').textContent.includes('année partielle'));$('role').value='both';change($('role'));assert.ok(doc.querySelectorAll('#points g').length>0)}
 $('export-map').click();await delay(5);assert.ok(exports.some(b=>b.type==='image/svg+xml'));
 const maps=await Promise.all(exports.filter(b=>b.type==='image/svg+xml').map(b=>b.text()));assert.ok(maps.some(map=>map.includes('DataGrandEst 2026')));
 $('export-csv').click();await delay(20);assert.ok(exports.some(b=>b.type.includes('text/csv')));
 const csv=await exports.find(b=>b.type.includes('text/csv')).text();assert.equal(csv.trim().split('\n').length,1394);
 console.log(slug+': chargement, filtres, station, contrôles propres à la vue et exports OK');
 dom.window.close();
}
assert.deepEqual(allErrors,[]);
console.log('5 pages vérifiées dans un DOM simulé. Cette vérification ne couvre pas le rendu navigateur.');
