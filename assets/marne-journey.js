const DATA_URL = new URL('../data/ideas-plus.json', import.meta.url);
const DEPT_URL = new URL('../data/departements.geojson', import.meta.url);
const SVG_NS = 'http://www.w3.org/2000/svg';
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_PER_MONTH = 16;
const HOLD_SECONDS = 7;
let selectedYear = 2024;
const STOPS = [
  { city:'Langres', at:.6, fact:'À quelques kilomètres de la source, Langres veille sur près de 8 km de fortifications.', tag:'CITÉ FORTIFIÉE' },
  { city:'Chaumont', at:null, anchor:'H5031020', fact:'Son viaduc ferroviaire de pierre, mis en service en 1857, est l’un des grands repères de la ville.', tag:'VILLE DU VIADUC' },
  { city:'Joinville', at:null, anchor:'H5071020', fact:'La vallée s’ouvre sur le Château du Grand Jardin, demeure Renaissance de Claude de Lorraine.', tag:'PATRIMOINE RENAISSANCE' },
  { city:'Saint-Dizier', at:null, anchor:'H5071010', fact:'La ville est une terre historique de métallurgie et de fonte d’art.', tag:'FONTE D’ART' },
  { city:'Vitry-le-François', at:62.28, fact:'La ville, reconstruite au XVIᵉ siècle, porte le nom de son fondateur François Ier.', tag:'VILLE ROYALE' },
  { city:'Châlons-en-Champagne', at:null, anchor:'H5201010', fact:'La Marne traverse une ville au patrimoine marqué par ses édifices médiévaux et ses canaux.', tag:'VILLE D’EAU' },
  { city:'Épernay', at:89.82, fact:'L’avenue de Champagne est au cœur du paysage culturel inscrit à l’UNESCO depuis 2015.', tag:'PAYSAGE UNESCO' }
];
const $ = id => document.getElementById(id);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const fmt = (x, digits=0, suffix='') => Number.isFinite(x) ? `${x.toLocaleString('fr-FR',{maximumFractionDigits:digits})}${suffix}` : '—';

let data, route=[], cumulative=[], routeLength=0, stations=[], stops=[], progress=0, speed=1;
let playing=false, holdingUntil=0, lastFrame=0, elapsed=0, zoom=1.0, activeStop=-1, lastWeatherKey='';
const map = $('living-map');

function add(tag, attrs={}, parent) {
  const el = document.createElementNS(SVG_NS,tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
  parent.append(el); return el;
}
function xy(lon,lat) { return [lon*74.2, -lat*111.1]; }
function distance(a,b) { const x=(b[0]-a[0])*Math.cos(48*Math.PI/180); return Math.hypot(x,b[1]-a[1]); }
function lineD(points) { return points.map((p,i)=>{const [x,y]=xy(p[0],p[1]);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`}).join(' '); }
function geoPath(geometry) {
  if (!geometry) return '';
  const type=geometry.type, c=geometry.coordinates;
  const lines=type==='LineString'?[c]:type==='MultiLineString'?c:type==='Polygon'?c:type==='MultiPolygon'?c.flat():[];
  return lines.map(line=>lineD(line)).join(' ');
}
function initRoute() {
  route=data.journeyGeometry;
  cumulative=[0]; for(let i=1;i<route.length;i++) cumulative.push(cumulative[i-1]+distance(route[i-1],route[i]));
  routeLength=cumulative.at(-1)||1;
}
function atPosition(t) {
  const d=clamp(t,0,100)/100*routeLength;
  let lo=0,hi=cumulative.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<d)lo=mid+1;else hi=mid;}
  const i=Math.max(1,lo), a=cumulative[i-1], b=cumulative[i], f=b===a?0:(d-a)/(b-a);
  const p=route[i-1],q=route[i];
  return {lon:p[0]+(q[0]-p[0])*f,lat:p[1]+(q[1]-p[1])*f,idx:i,f};
}
function routeProgressNear(lon,lat) {
  let best=Infinity,bestT=0;
  for(let i=0;i<route.length;i++) {const p=route[i],d=(p[0]-lon)**2+(p[1]-lat)**2;if(d<best){best=d;bestT=cumulative[i]/routeLength*100;}}
  return bestT;
}
function buildStations() {
  stations=data.journeyIds.map((id,i)=>{
    const item=data.stations[id], progressValue=data.journeyProgress[i+1] ?? (i===0?0:100);
    return {id,item,at:progressValue,point:atPosition(progressValue)};
  });
  stops=STOPS.map(s=>({...s,at:s.at??routeProgressNear(data.stations[s.anchor].lon,data.stations[s.anchor].lat)})).sort((a,b)=>a.at-b.at);
}
function drawMap() {
  const under=$('river-underlay'), rivers=$('river-streams'), stationLayer=$('station-points'), cityLayer=$('city-points');
  for(const f of data.departements?.features||[]){const d=geoPath(f.geometry);if(d)add('path',{d,class:'department-shape'},$('departments'));}
  for(const line of data.marneGeometry) {
    const d=lineD(line);
    add('path',{d,class:'river-soft'},under);
    add('path',{d,class:'river-thread'},rivers);
  }
  const main=add('path',{d:lineD(route),class:'journey-river'},rivers);
  main.id='journey-river';
  stations.forEach(({id,item,at,point})=>{
    const [x,y]=xy(point.lon,point.lat);
    const g=add('g',{class:'station-dot',transform:`translate(${x} ${y})`,'data-station':id},stationLayer);
    add('circle',{r:3.2,class:'station-core'},g);add('circle',{r:6.5,class:'station-ring'},g);
    const label=add('text',{x:x+1.2,y:y-1.5,class:'station-label'},stationLayer);
    label.textContent=item.town||item.name.replace(/^La Marne à /,'');
  });
  const cityLabels=[
    ['Langres',5.3324,47.8583],['Chaumont',5.139,48.111],['Joinville',5.141,48.443],['Saint-Dizier',4.95,48.637],
    ['Vitry-le-François',4.585,48.725],['Châlons',4.36,48.956],['Épernay',3.96,49.04]
  ];
  cityLabels.forEach(([name,lon,lat])=>{const [x,y]=xy(lon,lat);add('circle',{cx:x,cy:y,r:1.15,class:'town-dot'},cityLayer);const t=add('text',{x:x+2.2,y:y-.5,class:'town-label'},cityLayer);t.textContent=name;});
  [['HAUTE-MARNE',5.2,48.28],['MARNE',4.65,49.0],['AUBE',4.15,48.33]].forEach(([name,lon,lat])=>{const [x,y]=xy(lon,lat);const t=add('text',{x,y,class:'department-label'},cityLayer);t.textContent=name;});
  stops.forEach((s,i)=>{const p=atPosition(s.at),[x,y]=xy(p.lon,p.lat),g=add('g',{class:'halt-pin',transform:`translate(${x} ${y})`},cityLayer);add('circle',{r:2.4,class:'halt-core'},g);add('circle',{r:5.4,class:'halt-ring'},g);});
  $('destination-label').textContent='Sortie du Grand Est';
}
function monthIndex() { return Math.floor(elapsed/DAYS_PER_MONTH)%12; }
function currentYear() { return Math.min(2026, selectedYear + Math.floor(elapsed/(DAYS_PER_MONTH*12))); }
function metricAt(s,month,year) {
  const yr=clamp(year,2000,2026), index=(yr-2000)*12+month;
  const v=s.item.m?.[index];
  return v?{temp:v[0],rain:v[1],snow:v[2],flow:v[3],soil:v[4]}:null;
}
function nearestStation(t) {
  let best=stations[0];
  for(const station of stations) if(Math.abs(station.at-t)<Math.abs(best.at-t))best=station;
  return best;
}
function weatherClass(value,kind) {
  if(!Number.isFinite(value)||value<=0)return 0;
  return kind==='rain'?clamp(Math.ceil(value/7),2,14):kind==='snow'?clamp(Math.ceil(value/4),2,12):clamp(Math.ceil(value/20),1,7);
}
function renderWeather() {
  const layer=$('weather-field');layer.replaceChildren();
  const m=monthIndex(),year=currentYear();
  let current=nearestStation(progress),currentM=metricAt(current,m,year);
  let wet=0,snowy=0;
  stations.forEach((s,si)=>{
    const values=metricAt(s,m,year); if(!values)return;
    const [x,y]=xy(s.point.lon,s.point.lat);
    const rainN=weatherClass(values.rain,'rain'),snowN=weatherClass(values.snow,'snow'),soilN=weatherClass(values.soil,'soil');
    if(rainN){wet+=rainN;add('circle',{cx:x,cy:y,r:7+rainN*1.2,class:'weather-cloud'},layer);for(let i=0;i<rainN;i++){const dx=((i*29+si*13)%31)-15,dy=((i*17+si*19)%25)-12;add('line',{x1:x+dx,y1:y+dy-4,x2:x+dx-2,y2:y+dy+3,class:'rain-drop',style:`--lag:${(i%7)*-.22}s`},layer);}}
    if(snowN){snowy+=snowN;for(let i=0;i<snowN;i++){const dx=((i*23+si*11)%35)-17,dy=((i*31+si*5)%29)-14;const f=add('text',{x:x+dx,y:y+dy,class:'snow-fall',style:`--lag:${(i%6)*-.45}s`},layer);f.textContent='✳';}}
    if(soilN){add('ellipse',{cx:x,cy:y+7,rx:5+soilN*2,ry:1.2+soilN*.35,class:'soil-haze'},layer);}
  });
  if(!currentM) { $('weather-station').textContent=`Station voisine · ${current.item.town||current.item.name}`;$('weather-summary').textContent='Pas de mesure renseignée pour ce mois à la station la plus proche.';$('temp-value').textContent=$('rain-value').textContent=$('snow-value').textContent=$('soil-value').textContent=$('flow-value').textContent='—';$('weather-foot').textContent='Une valeur absente reste une absence, jamais un zéro.';return; }
  $('weather-station').textContent=`Station voisine · ${current.item.town||current.item.name}`;
  $('temp-value').textContent=fmt(currentM.temp,1,' °C');$('rain-value').textContent=fmt(currentM.rain,0,' mm');$('snow-value').textContent=fmt(currentM.snow,0,' mm');$('soil-value').textContent=fmt(currentM.soil,0);$('flow-value').textContent=fmt(currentM.flow,0);
  $('weather-foot').textContent=`${current.item.name} · ${current.item.coverage?Math.round(current.item.coverage*100)+' % de couverture':'couverture à vérifier'}`;
  const notes=[]; if(wet>0)notes.push('la pluie ride les berges');if(snowy>0)notes.push('la neige s’invite sur les stations');if(currentM.soil>20)notes.push('l’humidité du sol laisse monter une brume légère');
  $('weather-summary').textContent=notes.length?`${notes[0].slice(0,1).toUpperCase()+notes[0].slice(1)}${notes.length>1?`, ${notes.slice(1).join(', ')}`:''}.`:'Le paysage respire sous un ciel calme.';
}
function updateCard(forceHide=false) {
  const card=$('town-card');
  if(forceHide||activeStop<0){card.hidden=true;return;}
  const stop=stops[activeStop];if(!stop){card.hidden=true;return;}
  $('town-index').textContent=`HALTE ${String(activeStop+1).padStart(2,'0')} · ${stop.tag}`;
  $('town-name').textContent=stop.city;$('town-note').textContent=stop.fact;card.hidden=false;
}
function render() {
  const month=monthIndex(),year=currentYear();
  $('month-name').textContent=MONTHS[month];$('year-name').textContent=year;
  $('season-mark').textContent=['HIVER','HIVER','PRINTEMPS','PRINTEMPS','PRINTEMPS','ÉTÉ','ÉTÉ','ÉTÉ','AUTOMNE','AUTOMNE','AUTOMNE','HIVER'][month];
  const pos=atPosition(progress),[x,y]=xy(pos.lon,pos.lat),ahead=atPosition(Math.min(100,progress+.12)),[ax,ay]=xy(ahead.lon,ahead.lat);
  const angle=Math.atan2(ay-y,ax-x)*180/Math.PI+90;$('traveller').style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;
  const width=map.clientWidth,height=map.clientHeight,pxPerKm=30*zoom,boatY=window.innerWidth<=620?.48:.52;
  const vbW=width/pxPerKm,vbH=height/pxPerKm;
  map.setAttribute('viewBox',`${x-vbW/2} ${y-vbH*boatY} ${vbW} ${vbH}`);
  $('map-ground').setAttribute('x',x-vbW*2);$('map-ground').setAttribute('y',y-vbH*2);$('map-ground').setAttribute('width',vbW*4);$('map-ground').setAttribute('height',vbH*4);
  $('map-texture').setAttribute('x',x-vbW*2);$('map-texture').setAttribute('y',y-vbH*2);$('map-texture').setAttribute('width',vbW*4);$('map-texture').setAttribute('height',vbH*4);
  $('journey-range').value=Math.round(progress*10);$('journey-percent').textContent=`${Math.round(progress)} %`;
  $('place-label').textContent=progress<1?'La source · Balesmes-sur-Marne':progress>99?'La Marne quitte le Grand Est':`La Marne · ${Math.round(routeLength*progress/100)} km`;
  $('distance-label').textContent=`${Math.round(routeLength*progress/100)} km parcourus`;
  const nearest=nearestStation(progress);$('console-caption')?.remove();
  $('journey-caption').textContent=holdingUntil>performance.now()&&activeStop>=0?`Halte à ${stops[activeStop].city}`:progress>=99.9?'La Marne quitte le Grand Est':'Le bateau suit le courant';
  $('console-hint').textContent=holdingUntil>performance.now()?'La rivière continue de vivre pendant la halte':playing?'Le voyage avance, le calendrier aussi':'Choisissez un point ou lancez la dérive';
  $('journey-toggle').classList.toggle('is-playing',playing);$('journey-toggle').setAttribute('aria-label',playing?'Mettre le voyage en pause':'Lancer le voyage');$('journey-toggle').querySelector('.toggle-icon').textContent=playing?'Ⅱ':'▶';
  const weatherKey=`${monthIndex()}-${year}-${nearestStation(progress).id}`;
  if(weatherKey!==lastWeatherKey){renderWeather();lastWeatherKey=weatherKey;}
}
function frame(now) {
  if(lastFrame){const dt=Math.min(80,now-lastFrame)/1000;if(playing){elapsed+=dt*speed;const waiting=now<holdingUntil;if(!waiting){if(activeStop>=0){activeStop=-1;updateCard(true);}const before=progress;progress=Math.min(100,progress+dt*.55*speed);for(let i=0;i<stops.length;i++){const s=stops[i];if(before<s.at&&progress>=s.at){progress=s.at;activeStop=i;holdingUntil=now+HOLD_SECONDS*1000;updateCard();break;}}if(progress>=100){playing=false;holdingUntil=0;updateCard(true);}}}}
  lastFrame=now;render();requestAnimationFrame(frame);
}
function jumpTo(value) { progress=clamp(value,0,100);holdingUntil=0;activeStop=-1;playing=false;manual=true;updateCard(true);render(); }
async function start() {
  try { const [response,deptResponse]=await Promise.all([fetch(DATA_URL),fetch(DEPT_URL)]); if(!response.ok||!deptResponse.ok)throw new Error('Données introuvables'); [data,data.departements]=await Promise.all([response.json(),deptResponse.json()]); }
  catch(error){console.error(error);$('weather-summary').textContent='Les données de la rivière n’ont pas pu être chargées.';return;}
  initRoute();buildStations();drawMap();
  for(let y=2000;y<=2026;y++){const option=document.createElement('option');option.value=y;option.textContent=y;$('year-select').append(option);}
  $('year-select').value=selectedYear;
  $('year-select').addEventListener('change',e=>{selectedYear=Number(e.currentTarget.value);elapsed=0;lastWeatherKey='';render();});
  for(const id of ['zoom-in','zoom-out','journey-toggle','restart','speed-button','journey-range'])$(id).addEventListener(id==='journey-range'?'input':'click',e=>{
    if(id==='zoom-in')zoom=clamp(zoom*1.18,.65,2.2);
    if(id==='zoom-out')zoom=clamp(zoom/1.18,.65,2.2);
    if(id==='journey-toggle'){playing=!playing;if(playing){if(progress>=100){progress=0;elapsed=0;}holdingUntil=0;}}
    if(id==='restart'){playing=false;progress=0;elapsed=0;activeStop=-1;holdingUntil=0;lastWeatherKey='';updateCard(true);}
    if(id==='speed-button'){speed=speed===1?2:speed===2?4:1;e.currentTarget.textContent=`×${speed}`;}
    if(id==='journey-range')jumpTo(Number(e.currentTarget.value)/10);
  });
  window.addEventListener('resize',render);
  const startStop=stops[0];activeStop=0;updateCard();
  requestAnimationFrame(frame);
}
start();
