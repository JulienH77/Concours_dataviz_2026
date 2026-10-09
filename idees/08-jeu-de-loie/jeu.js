const CATALOGUE_URL='../../data/catalogue.json';
const STATION_BASE='../../data/stations/';
const TOTAL_CASES=115;
const ROUTE_POINTS=[[699.7,78.1],[699.7,189.8],[603.6,246.4],[507.5,301.3],[602.9,356.5],[507.6,411.8],[410,469.6],[410,580.8],[313.9,637],[313.9,747.9],[409.3,692],[408.5,802.5],[313.2,858.4],[313.9,971.5],[410,916.6],[410,1027],[410.7,1138],[506.1,1193.2],[506.1,1083.1],[602.2,1137.6],[698.2,1082.1],[602.9,1027.4],[506.1,971.5],[506.1,861.4],[506.1,747],[506.1,636],[505.3,525.5],[603.6,467],[602.1,581.5],[602.9,692],[602.9,802],[602.1,916.6],[698.2,972.2],[700.5,860.3],[698.2,746.9],[698.2,637],[699.7,522.6],[699.7,412.5],[699.7,300.6],[795.8,246.4],[795.7,356.1],[891.9,300.6],[990.9,357],[1086.2,412.7],[1184.5,469.6],[1279.8,525.5],[1376.7,581.5],[1281.3,634.6],[1185.3,579.4],[1086.9,524.4],[988.6,469.1],[894.1,413.6],[795,467.5],[798,581.1],[894.1,524.8],[988.6,580.4],[1087.7,636.5],[1183,693.4],[1279.8,749.4],[1378.1,690.6],[1473.4,636.6],[1570.2,580.5],[1668.5,637.5],[1763.8,581.5],[1763.1,691],[1667,747.5],[1572.5,693],[1473.4,746.5],[1572.5,803.9],[1666.3,859.5],[1667.1,970.4],[1572.5,914.8],[1472.7,859.9],[1376.6,805.4],[1280.6,858.9],[1183.7,803.9],[1088.4,747.9],[988.6,692],[893.3,636],[798,692],[798,802.9],[893.3,748],[988.6,803.9],[894.1,858.4],[796.5,916.2],[798,1027.4],[798,1139],[798,1250],[893.3,1305.1],[988.6,1250],[893.3,1195],[988.6,1139],[893.3,1083.1],[892.6,972.6],[989.4,914.4],[1088.4,858.9],[1183.7,914],[1087.7,972.6],[988.6,1028.1],[1088.4,1082.1],[1183.8,1137.2],[1183.8,1028.1],[1280.5,1082],[1280.5,973],[1377.4,914],[1473.4,971.9],[1570.2,1028.6],[1569.5,1139],[1475.7,1084.1],[1376.6,1027.7],[1376.6,1137.6],[1475.6,1195],[1569.6,1250.9],[1475.6,1305.9],[1570.3,1361.5]];

const CHECKPOINTS={
  7:{name:'Reims',station:'H6412010'},
  23:{name:'Troyes',station:'H0800012'},
  30:{name:'Châlons-en-Champagne',station:'H5201010'},
  34:{name:'Saint-Dizier',station:'H5071040'},
  49:{name:'Metz',station:'A8431010'},
  70:{name:'Strasbourg',station:'A2280030'},
  76:{name:'Nancy',station:'A6921010'},
  81:{name:'Bar-le-Duc',station:'H5122350'},
  91:{name:'Langres',station:'H5011020'},
  93:{name:'Chaumont',station:'H5031020'},
  95:{name:'Neufchâteau',station:'B1100000'},
  100:{name:'Vittel',station:'B1222010'},
  103:{name:'Épinal',station:'A4430640'},
  107:{name:'Colmar',station:'A1610030'},
  113:{name:'Mulhouse',station:'A1160030'}
};

const CITY_LINES={
  'Châlons-en-Champagne':['CHÂLONS','EN CHAMP.'],
  'Saint-Dizier':['SAINT','DIZIER'],
  'Bar-le-Duc':['BAR-LE','DUC'],
  'Neufchâteau':['NEUFCHÂTEAU']
};
const DICE_PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const EVENT_META={
  highwater:{icon:'🌊',title:'Hautes eaux combinées',className:'high',kicker:'PLUIE + SOL + DÉBIT',description:'Pluie forte, sol humide et débit élevé se répondent pendant la même semaine.'},
  rain:{icon:'🌧',title:'Pluie remarquable',className:'rain',kicker:'PRÉCIPITATIONS EXCEPTIONNELLES',description:'La pluie de cette semaine se situe tout en haut de la distribution saisonnière locale.'},
  snow:{icon:'❄',title:'Neige remarquable',className:'snow',kicker:'ÉPISODE NEIGEUX',description:'La valeur de neige est exceptionnellement élevée pour cette période à cette station.'},
  soil:{icon:'◉',title:'Sol très humide',className:'soil',kicker:'SOL SATURÉ',description:'L’humidité du sol atteint un niveau rare pour cette saison à cette station.'},
  dry:{icon:'◔',title:'Basses eaux et sol sec',className:'dry',kicker:'ÉPISODE TRÈS SEC',description:'Le rang de débit est très bas alors que le sol est lui aussi inhabituellement sec.'},
  highflow:{icon:'↟',title:'Débit très haut',className:'high',kicker:'HAUTES EAUX RELATIVES',description:'Le débit se situe parmi les valeurs saisonnières les plus élevées de cette station.'}
};
const EFFECTS={
  explorer:{
    highwater:{kind:'gate',threshold:9,title:'Route difficile',text:'Fais 9 ou plus pour repartir.',badge:'9+'},
    rain:{kind:'gate',threshold:8,title:'Pluie sur la route',text:'Fais 8 ou plus pour repartir.',badge:'8+'},
    snow:{kind:'snowGate',threshold:8,title:'Chaussée enneigée',text:'Fais un double ou 8+ pour repartir.',badge:'≡'},
    soil:{kind:'skip',title:'Sol saturé',text:'Le prochain tour est perdu.',badge:'−1T'},
    dry:{kind:'modifier',modifier:-2,title:'Basses eaux',text:'−2 cases au prochain déplacement.',badge:'−2'},
    highflow:{kind:'gate',threshold:8,title:'Hautes eaux',text:'Fais 8 ou plus pour repartir.',badge:'8+'}
  },
  expert:{
    highwater:{kind:'gate',threshold:10,title:'Route difficile',text:'Fais 10 ou plus pour repartir.',badge:'10+'},
    rain:{kind:'gate',threshold:11,title:'Pluie intense',text:'Fais 11 ou plus pour repartir.',badge:'11+'},
    snow:{kind:'double',title:'Neige bloquante',text:'Seul un double permet de repartir.',badge:'◈'},
    soil:{kind:'skip',title:'Sol saturé',text:'Le prochain tour est perdu.',badge:'−1T'},
    dry:{kind:'modifier',modifier:-3,title:'Basses eaux',text:'−3 cases au prochain déplacement.',badge:'−3'},
    highflow:{kind:'gate',threshold:10,title:'Hautes eaux',text:'Fais 10 ou plus pour repartir.',badge:'10+'}
  }
};

const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fmt=(v,d=1,s='')=>Number.isFinite(v)?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d}).format(v)+s:'—';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let catalogue=null;
const stationCache=new Map();
const percentileCache=new Map();
const cellStations=[];
const state={caseIndex:0,turn:1,busy:false,difficulty:'explorer',analysis:null,effect:null,history:[],eventsSeen:0,blocked:0,lastDice:null};

function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function dateObj(iso){return new Date(iso+'T00:00:00Z');}
function dateShort(iso){return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(dateObj(iso)).replace('.','');}
function dateLong(iso){return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(dateObj(iso));}
function cap(s){return s?s[0].toUpperCase()+s.slice(1):s;}
function caseSlice(caseIndex){
  const n=catalogue.weeks.length;
  const start=Math.floor(caseIndex*n/TOTAL_CASES);
  const end=Math.floor((caseIndex+1)*n/TOTAL_CASES)-1;
  return{start,end,count:end-start+1,weeks:catalogue.weeks.slice(start,end+1)};
}
function periodTitle(caseIndex){
  const {start,end}=caseSlice(caseIndex),a=dateObj(catalogue.weeks[start].date),b=dateObj(catalogue.weeks[end].date);
  const ma=new Intl.DateTimeFormat('fr-FR',{month:'long',timeZone:'UTC'}).format(a);
  const mb=new Intl.DateTimeFormat('fr-FR',{month:'long',timeZone:'UTC'}).format(b);
  const ya=a.getUTCFullYear(),yb=b.getUTCFullYear();
  return ya===yb?`${cap(ma)} → ${mb} ${yb}`:`${cap(ma)} ${ya} → ${mb} ${yb}`;
}
function pointGeo([x,y]){
  return{lon:.00302610351*x-.000180358619*y+2.80025183,lat:-.0000299983853*x-.00198724347*y+50.2984014};
}
function distanceKm(a,b){
  const mean=(a.lat+b.lat)*Math.PI/360;
  const dx=(a.lon-b.lon)*Math.cos(mean),dy=a.lat-b.lat;
  return Math.hypot(dx,dy)*111.2;
}
function stationQuality(s){return (s.rank_n||0)>=1000&&(s.coverage||0)>=.82&&!catalogue.audit.no_flow.includes(s.id);}
function assignStations(){
  const good=catalogue.stations.filter(stationQuality);
  const byId=new Map(catalogue.stations.map(s=>[s.id,s]));
  for(let i=0;i<TOTAL_CASES;i++){
    const cp=CHECKPOINTS[i+1];
    if(cp&&byId.has(cp.station)){cellStations[i]=byId.get(cp.station);continue;}
    const geo=pointGeo(ROUTE_POINTS[i]);
    let best=null,bestScore=Infinity;
    for(const s of good){
      const d=distanceKm(geo,{lat:s.lat,lon:s.lon});
      const score=d+(1-(s.coverage||0))*18;
      if(score<bestScore){best=s;bestScore=score;}
    }
    cellStations[i]=best;
  }
}
function polygonPoints(x,y){return[[x-29,y-52],[x+29,y-52],[x+59,y],[x+29,y+52],[x-29,y+52],[x-59,y]].map(p=>p.join(',')).join(' ');}
function labelLines(name){if(CITY_LINES[name])return CITY_LINES[name];if(name.length>12&&name.includes('-')){const p=name.split('-');return[p.slice(0,Math.ceil(p.length/2)).join('-').toUpperCase(),p.slice(Math.ceil(p.length/2)).join('-').toUpperCase()];}return[name.toUpperCase()];}
function buildBoard(){
  const routePoints=ROUTE_POINTS.map(p=>p.join(',')).join(' ');
  $('route-layer').innerHTML=`<polyline class="route-base" points="${routePoints}"/><polyline id="route-progress" class="route-progress" points="${ROUTE_POINTS[0].join(',')}"/>`;
  $('cells-layer').innerHTML=ROUTE_POINTS.map(([x,y],i)=>{
    const num=i+1,cp=CHECKPOINTS[num],classes=['hex-cell'];if(cp)classes.push('city');if(num===115)classes.push('finish');
    return `<g class="${classes.join(' ')}" id="cell-${i}" data-case="${i}" tabindex="0" aria-label="Case ${num}${cp?', '+esc(cp.name):''}"><polygon points="${polygonPoints(x,y)}"/><text class="hex-number" x="${x}" y="${cp?y-31:y+4}">${num}</text></g>`;
  }).join('');
  let labels='';
  for(const [num,cp] of Object.entries(CHECKPOINTS)){
    const i=Number(num)-1,[x,y]=ROUTE_POINTS[i],lines=labelLines(cp.name),small=cp.name.length>14?' small':'';
    labels+=`<text class="city-name${small}" x="${x}" y="${y-(lines.length-1)*5}">${lines.map((l,k)=>`<tspan x="${x}" dy="${k?11:0}">${esc(l)}</tspan>`).join('')}</text>`;
  }
  const [sx,sy]=ROUTE_POINTS[0],[ex,ey]=ROUTE_POINTS[114];
  labels+=`<g class="terminal-badge" transform="translate(${sx} ${sy-5})"><circle r="22"/><text y="2">A</text></g><g class="terminal-badge" transform="translate(${ex} ${ey+4})"><circle r="22"/><text y="2">B</text></g>`;
  $('labels-layer').innerHTML=labels;
  $('pawn-layer').innerHTML=`<g class="pawn-group" id="pawn" transform="translate(${sx} ${sy})"><circle class="pawn-glow" r="39"/><circle class="pawn-ring" r="19"/><path class="pawn-drop" d="M0-13C-8-3-12 3-12 9a12 12 0 0 0 24 0C12 3 8-3 0-13Z"/><ellipse class="pawn-shine" cx="-4" cy="3" rx="3" ry="6"/></g>`;
  attachBoardTooltip();
  syncBoard();
}
function attachBoardTooltip(){
  const tip=$('board-tooltip'),wrap=$('board-wrap');
  const show=(el,evt)=>{
    const i=Number(el.dataset.case),slice=caseSlice(i),station=cellStations[i],cp=CHECKPOINTS[i+1];
    tip.innerHTML=`<b>Case ${i+1}${cp?' · '+esc(cp.name):''}</b><small>${dateShort(catalogue.weeks[slice.start].date)} → ${dateShort(catalogue.weeks[slice.end].date)} · ${slice.count} semaines<br>${esc(station?.river||'')} · ${esc(station?.town||'')}</small>`;
    const r=wrap.getBoundingClientRect();let x=(evt?.clientX??r.left+r.width/2)-r.left+7,y=(evt?.clientY??r.top+r.height/2)-r.top+7;
    x=Math.min(x,r.width-235);y=Math.min(y,r.height-75);tip.style.left=Math.max(4,x)+'px';tip.style.top=Math.max(4,y)+'px';tip.classList.add('show');
  };
  wrap.addEventListener('pointermove',e=>{const el=e.target.closest?.('.hex-cell');if(el)show(el,e);else tip.classList.remove('show');});
  wrap.addEventListener('pointerleave',()=>tip.classList.remove('show'));
  wrap.addEventListener('focusin',e=>{const el=e.target.closest?.('.hex-cell');if(el)show(el);});
  wrap.addEventListener('focusout',()=>tip.classList.remove('show'));
}
function syncBoard(moving=false){
  document.querySelectorAll('.hex-cell').forEach((el,i)=>{el.classList.toggle('done',i<state.caseIndex);el.classList.toggle('current',i===state.caseIndex);});
  $('route-progress').setAttribute('points',ROUTE_POINTS.slice(0,state.caseIndex+1).map(p=>p.join(',')).join(' '));
  const [x,y]=ROUTE_POINTS[state.caseIndex];$('pawn').setAttribute('transform',`translate(${x} ${y})`);
  renderPeriodHeader();
  if(!moving)renderLocation();
}
function renderPeriodHeader(){
  const slice=caseSlice(state.caseIndex),first=catalogue.weeks[slice.start],last=catalogue.weeks[slice.end],progress=state.caseIndex/(TOTAL_CASES-1)*100;
  $('timeline-fill').style.width=progress+'%';$('timeline-dot').style.left=progress+'%';$('timeline-now').textContent=`${dateShort(first.date)} → ${dateShort(last.date)}`;
  $('case-number').textContent=String(state.caseIndex+1).padStart(2,'0');$('case-chip').textContent='CASE '+String(state.caseIndex+1).padStart(2,'0');$('turn-number').textContent=String(state.turn).padStart(2,'0');$('weeks-crossed').textContent=last?String(slice.end+1):'0';$('period-title').textContent=periodTitle(state.caseIndex);
  $('slice-start').textContent=dateShort(first.date);$('slice-end').textContent=dateShort(last.date);$('slice-count').textContent=`${slice.count} semaines`;
}
function renderLocation(){
  const station=cellStations[state.caseIndex],cp=CHECKPOINTS[state.caseIndex+1];
  $('zone-label').textContent=cp?`ÉTAPE · ${cp.name.toUpperCase()}`:`CASE LOCALE · DÉPARTEMENT ${station?.dept||'—'}`;
  $('location-title').textContent=cp?cp.name:(station?.town||'Station locale');
  $('station-title').textContent=station?`${station.name} · couverture ${Math.round((station.coverage||0)*100)} %`:'Station indisponible';
  $('board-place').innerHTML=`<b>${cp?esc(cp.name):'Case '+(state.caseIndex+1)}</b> · ${esc(station?.river||'secteur hydrologique')}`;
}
async function loadStation(id){
  if(stationCache.has(id))return stationCache.get(id);
  const p=fetch(STATION_BASE+encodeURIComponent(id)+'.json').then(r=>{if(!r.ok)throw new Error('Station '+id+' indisponible');return r.json();});
  stationCache.set(id,p);return p;
}
function circularWeekDistance(a,b){a=Math.min(a,52);b=Math.min(b,52);const d=Math.abs(a-b);return Math.min(d,52-d);}
function seasonalPercentile(station,key,index){
  const cacheKey=`${station.id}|${key}|${index}`;if(percentileCache.has(cacheKey))return percentileCache.get(cacheKey);
  const values=station.values[key],v=values?.[index];if(!Number.isFinite(v)){percentileCache.set(cacheKey,null);return null;}
  const target=catalogue.weeks[index].week;let lt=0,eq=0,n=0;
  for(let i=0;i<catalogue.weeks.length;i++){
    const w=catalogue.weeks[i];if(w.year>2025||circularWeekDistance(w.week,target)>2)continue;
    const x=values[i];if(!Number.isFinite(x))continue;n++;if(x<v)lt++;else if(x===v)eq++;
  }
  const p=n?100*(lt+.5*eq)/n:null;percentileCache.set(cacheKey,p);return p;
}
function weekMetrics(station,index){
  const v=station.values;
  return{index,date:catalogue.weeks[index],temp:v.temp[index],rain:v.pluie[index],snow:v.neige[index],flow:v.debit[index],soil:v.humidite[index],flowP:Number.isFinite(station.percentile[index])?station.percentile[index]:null,rainP:seasonalPercentile(station,'pluie',index),snowP:seasonalPercentile(station,'neige',index),soilP:seasonalPercentile(station,'humidite',index),tempP:seasonalPercentile(station,'temp',index)};
}
function candidateEvents(m){
  const out=[];
  if(Number.isFinite(m.flowP)&&Number.isFinite(m.rainP)&&Number.isFinite(m.soilP)&&m.flowP>=90&&m.rainP>=90&&m.soilP>=88){const s=(m.flowP+m.rainP+m.soilP)/3;out.push({type:'highwater',severity:s,priority:s+7,m});}
  if(Number.isFinite(m.rainP)&&m.rainP>=97)out.push({type:'rain',severity:m.rainP,priority:m.rainP,m});
  if(Number.isFinite(m.snow)&&m.snow>0&&Number.isFinite(m.snowP)&&m.snowP>=97)out.push({type:'snow',severity:m.snowP,priority:m.snowP+.2,m});
  if(Number.isFinite(m.soilP)&&m.soilP>=98)out.push({type:'soil',severity:m.soilP,priority:m.soilP,m});
  if(Number.isFinite(m.flowP)&&Number.isFinite(m.soilP)&&m.flowP<=6&&m.soilP<=12)out.push({type:'dry',severity:(100-m.flowP+100-m.soilP)/2,priority:(100-m.flowP+100-m.soilP)/2+3,m});
  if(Number.isFinite(m.flowP)&&m.flowP>=98)out.push({type:'highflow',severity:m.flowP,priority:m.flowP,m});
  return out;
}
async function analyseCase(caseIndex){
  const meta=cellStations[caseIndex],station=await loadStation(meta.id),slice=caseSlice(caseIndex),all=[],metrics=[];
  for(let i=slice.start;i<=slice.end;i++){
    const m=weekMetrics(station,i);metrics.push(m);all.push(...candidateEvents(m));
  }
  all.sort((a,b)=>(b.priority??b.severity)-(a.priority??a.severity));
  const event=all[0]||null,rep=event?event.m:metrics[Math.floor(metrics.length/2)];
  return{stationMeta:meta,station,slice,metrics,event,rep};
}
function makeEffect(type){if(!type)return null;const e=EFFECTS[state.difficulty][type];return e?{...e,type}:null;}
function eventSentence(a){
  const e=a.event,m=e?.m;if(!e)return`Aucun seuil remarquable n’est franchi dans cette fenêtre de ${a.slice.count} semaines. La case reste libre.`;
  if(e.type==='rain')return`${fmt(m.rain,1,' mm')} de pluie cette semaine, au ${fmt(m.rainP,1,'e percentile')} saisonnier local.`;
  if(e.type==='snow')return`Valeur neige ${fmt(m.snow,1)}, au ${fmt(m.snowP,1,'e percentile')} saisonnier local.`;
  if(e.type==='soil')return`Indice d’humidité ${fmt(m.soil,2)}, au ${fmt(m.soilP,1,'e percentile')} saisonnier local.`;
  if(e.type==='highflow')return`Le rang saisonnier du débit atteint ${fmt(m.flowP,1,'/100')} cette semaine.`;
  if(e.type==='dry')return`Rang de débit ${fmt(m.flowP,1,'/100')} et humidité au ${fmt(m.soilP,1,'e percentile')} : deux signaux bas simultanés.`;
  return`Pluie ${fmt(m.rain,1,' mm')} · humidité P${fmt(m.soilP,0)} · débit P${fmt(m.flowP,0)} : trois signaux élevés la même semaine.`;
}
function renderAnalysis(a,flash=false){
  const event=a.event,meta=event?EVENT_META[event.type]:null,card=$('event-card');card.className='event-card '+(meta?meta.className:'calm');if(flash){card.classList.add('flash');setTimeout(()=>card.classList.remove('flash'),480);}
  $('event-symbol').textContent=meta?meta.icon:'≈';$('event-kicker').textContent=meta?meta.kicker:'AUCUN PHÉNOMÈNE DOMINANT';$('event-title').textContent=meta?meta.title:'Eau calme';$('event-text').textContent=eventSentence(a);$('event-score').textContent=event?Math.min(100,event.severity).toFixed(0)+'/100':'—';
  const m=a.rep;$('event-date').textContent=cap(dateLong(m.date.date));$('iso-week').textContent=m.date.iso;$('metric-temp').textContent=fmt(m.temp,1,' °C');$('metric-rain').textContent=fmt(m.rain,1,' mm');$('metric-snow').textContent=fmt(m.snow,1);$('metric-flow').textContent=fmt(m.flow,0);$('metric-soil').textContent=fmt(m.soil,2);
  renderSliceChart(a);renderWeather(event);renderEffect();
}
function renderEffect(){
  const box=$('effect-card');if(!state.effect){box.hidden=true;return;}box.hidden=false;$('effect-title').textContent=state.effect.title;$('effect-text').textContent=state.effect.text;$('effect-badge').textContent=state.effect.badge;
}
function renderWeather(event){
  if(!event){$('weather-layer').innerHTML='';return;}const [x,y]=ROUTE_POINTS[state.caseIndex];let s='';
  if(event.type==='rain'||event.type==='highwater'||event.type==='highflow')for(let i=0;i<18;i++){const dx=(i*31)%150-75,dy=(i*47)%100-70;s+=`<path class="weather-rain" style="--delay:-${(i%7)*.12}s" d="M${x+dx} ${y+dy}l-8 24"/>`;}
  if(event.type==='snow')for(let i=0;i<15;i++){const dx=(i*37)%150-75,dy=(i*41)%100-70;s+=`<circle class="weather-snow" style="--delay:-${(i%6)*.28}s" cx="${x+dx}" cy="${y+dy}" r="${3+i%3}"/>`;}
  if(event.type==='soil'||event.type==='highwater')s+=`<ellipse class="weather-mist" cx="${x}" cy="${y+38}" rx="82" ry="25"/><ellipse class="weather-mist" cx="${x+30}" cy="${y+15}" rx="58" ry="18"/>`;
  if(event.type==='dry')s+=`<path class="weather-dry" d="M${x-45} ${y+32}l18-12 16 13 18-18 25 14 19-10"/>`;
  $('weather-layer').innerHTML=s;
}
function renderSliceChart(a){
  const W=660,H=170,left=22,right=640,top=18,bottom=142,arr=a.metrics,n=arr.length,maxRain=Math.max(1,...arr.map(m=>Number.isFinite(m.rain)?m.rain:0)),x=i=>left+(right-left)*(i/(Math.max(1,n-1))),rainY=v=>bottom-(Number.isFinite(v)?v/maxRain:0)*70,flowY=p=>top+(100-(Number.isFinite(p)?p:50))/100*100;
  let grid='';for(const p of [0,25,50,75,100]){const yy=flowY(p);grid+=`<line class="chart-grid" x1="${left}" y1="${yy}" x2="${right}" y2="${yy}"/>`;}
  const bars=arr.map((m,i)=>{const xx=x(i),yy=rainY(m.rain);return`<rect class="rain-bar" x="${xx-7}" y="${yy}" width="14" height="${bottom-yy}" rx="2"/>`;}).join('');
  let d='';arr.forEach((m,i)=>{if(Number.isFinite(m.flowP))d+=(d?'L':'M')+x(i).toFixed(1)+','+flowY(m.flowP).toFixed(1)+' ';});
  const dots=arr.map((m,i)=>Number.isFinite(m.flowP)?`<circle class="chart-dot" cx="${x(i)}" cy="${flowY(m.flowP)}" r="2.8"/>`:'').join('');
  let hi='';if(a.event){const k=arr.findIndex(m=>m.index===a.event.m.index),xx=x(k);hi=`<rect class="chart-highlight" x="${xx-11}" y="${top}" width="22" height="${bottom-top}" rx="4"/><circle class="chart-event-dot" cx="${xx}" cy="${flowY(a.event.m.flowP)}" r="5"/>`;}
  $('slice-chart').innerHTML=`${grid}${hi}${bars}<path class="flow-line" d="${d}"/>${dots}<text class="chart-label" x="${left}" y="12">RANG DÉBIT 100</text><text class="chart-label" x="${left}" y="158">PLUIE · max ${fmt(maxRain,0,' mm')}</text>`;
}
function setDie(el,value){el.innerHTML=value?DICE_PIPS[value].map(n=>`<i class="pip p${n}"></i>`).join(''):'';el.setAttribute('aria-label',value?`Dé ${value}`:'Dé prêt');}
function randomD6(){if(globalThis.crypto?.getRandomValues){const a=new Uint8Array(1);do{crypto.getRandomValues(a);}while(a[0]>=252);return a[0]%6+1;}return Math.floor(Math.random()*6)+1;}
async function animateDice(a,b){
  const d1=$('die-one'),d2=$('die-two');d1.classList.add('rolling');d2.classList.add('rolling');let ticks=0;
  const timer=setInterval(()=>{setDie(d1,randomD6());setDie(d2,randomD6());ticks++;},75);await sleep(650);clearInterval(timer);d1.classList.remove('rolling');d2.classList.remove('rolling');setDie(d1,a);setDie(d2,b);$('dice-total').textContent=a+b;return ticks;
}
function effectAllowsRoll(effect,a,b){
  const total=a+b;if(!effect)return{ok:true,steps:total,consume:false};
  if(effect.kind==='gate')return{ok:total>=effect.threshold,steps:total,consume:total>=effect.threshold};
  if(effect.kind==='double')return{ok:a===b,steps:total,consume:a===b};
  if(effect.kind==='snowGate'){const ok=a===b||total>=effect.threshold;return{ok,steps:total,consume:ok};}
  if(effect.kind==='modifier')return{ok:true,steps:Math.max(1,total+effect.modifier),consume:true};
  return{ok:true,steps:total,consume:true};
}
function addJournal(entry){state.history.unshift(entry);state.history=state.history.slice(0,6);renderJournal();}
function renderJournal(){
  const ol=$('journal');if(!state.history.length){ol.innerHTML='<li class="journal-empty">Le premier lancer ouvrira ton carnet de route.</li>';return;}
  ol.innerHTML=state.history.map(h=>`<li><span class="journal-icon ${h.blocked?'blocked':h.event?'event':''}">${h.blocked?'×':h.event?EVENT_META[h.event]?.icon||'!':'→'}</span><div><b>${esc(h.title)}</b><small>${esc(h.detail)}</small></div><span class="journal-step">${esc(h.step)}</span></li>`).join('');
}
function renderGameControls(){
  $('turn-number').textContent=String(state.turn).padStart(2,'0');$('event-count').textContent=`${state.eventsSeen} événement${state.eventsSeen>1?'s':''}`;
  const finished=state.caseIndex>=TOTAL_CASES-1;if(state.effect?.kind==='skip'){$('roll-label').textContent='Passer le tour';$('dice-help').textContent='Le sol saturé immobilise le pion : ce tour est perdu.';}else if(state.effect){$('roll-label').textContent='Tenter de repartir';$('dice-help').textContent=state.effect.text;}else{$('roll-label').textContent=finished?'Voyage terminé':'Lancer les dés';$('dice-help').textContent='Lance deux dés. Leur somme indique le nombre de cases parcourues.';}
  $('roll-button').disabled=state.busy||finished;$('difficulty').disabled=state.busy;$('new-game').disabled=state.busy;
}
async function movePawn(steps){
  const start=state.caseIndex,target=Math.min(TOTAL_CASES-1,start+steps);
  for(let i=start+1;i<=target;i++){state.caseIndex=i;syncBoard(true);await sleep(matchMedia('(prefers-reduced-motion: reduce)').matches?5:145);}
  renderLocation();return target-start;
}
async function processSkip(){
  if(state.busy)return;state.busy=true;renderGameControls();const played=state.turn;state.turn++;state.effect=null;state.blocked++;addJournal({blocked:true,title:`Tour ${played} · immobilisé`,detail:'Sol saturé : aucun lancer.',step:'0 case'});renderEffect();state.busy=false;renderGameControls();
}
async function roll(){
  if(state.busy||state.caseIndex>=TOTAL_CASES-1)return;if(state.effect?.kind==='skip'){await processSkip();return;}
  state.busy=true;renderGameControls();const played=state.turn,a=randomD6(),b=randomD6(),total=a+b;state.lastDice=[a,b];await animateDice(a,b);
  const effectBefore=state.effect?{...state.effect}:null,result=effectAllowsRoll(effectBefore,a,b);
  if(!result.ok){state.blocked++;state.turn++;addJournal({blocked:true,title:`Tour ${played} · ${a} + ${b} = ${total}`,detail:`${effectBefore.title} : condition non remplie.`,step:'bloqué'});state.busy=false;renderGameControls();return;}
  if(result.consume)state.effect=null;
  const from=state.caseIndex,moved=await movePawn(result.steps);state.turn++;
  try{
    state.analysis=await analyseCase(state.caseIndex);if(state.analysis.event&&state.caseIndex<TOTAL_CASES-1){state.eventsSeen++;state.effect=makeEffect(state.analysis.event.type);}else state.effect=null;
    const cp=CHECKPOINTS[state.caseIndex+1],ev=state.analysis.event?.type;addJournal({blocked:false,event:ev,title:`Tour ${played} · ${a} + ${b} = ${total}`,detail:`Case ${state.caseIndex+1}${cp?' · '+cp.name:''}${effectBefore?.kind==='modifier'?` · malus ${effectBefore.modifier}`:''}`,step:`+${moved}`});renderAnalysis(state.analysis,true);
  }catch(err){console.error(err);addJournal({blocked:false,title:`Tour ${played} · arrivée case ${state.caseIndex+1}`,detail:'Données de station indisponibles.',step:`+${moved}`});}
  state.busy=false;syncBoard();renderGameControls();
  if(state.caseIndex>=TOTAL_CASES-1)showFinish();
}
async function analyseLanding(applyEffect=false){
  try{state.analysis=await analyseCase(state.caseIndex);state.effect=applyEffect&&state.analysis.event?makeEffect(state.analysis.event.type):null;renderAnalysis(state.analysis);}catch(err){console.error(err);$('event-title').textContent='Données indisponibles';$('event-text').textContent='Impossible de charger la station associée à cette case.';}finally{renderGameControls();}
}
function showFinish(){
  $('finish-turns').textContent=state.turn-1;$('finish-events').textContent=state.eventsSeen;$('finish-blocks').textContent=state.blocked;$('finish-copy').textContent=`Du 3 janvier 2000 au 7 septembre 2026, le pion a rejoint B en ${state.turn-1} tours et rencontré ${state.eventsSeen} phénomène${state.eventsSeen>1?'s':''} remarquable${state.eventsSeen>1?'s':''}.`;$('finish-dialog').showModal();
}
async function resetGame(){
  if(state.busy)return;state.caseIndex=0;state.turn=1;state.analysis=null;state.effect=null;state.history=[];state.eventsSeen=0;state.blocked=0;state.lastDice=null;setDie($('die-one'),null);setDie($('die-two'),null);$('dice-total').textContent='—';renderJournal();syncBoard();renderWeather(null);renderGameControls();await analyseLanding(false);
}
async function init(){
  try{
    const r=await fetch(CATALOGUE_URL);if(!r.ok)throw new Error('Catalogue indisponible');catalogue=await r.json();if(catalogue.weeks?.length!==1393)throw new Error(`Nombre de semaines inattendu : ${catalogue.weeks?.length}`);assignStations();buildBoard();setDie($('die-one'),null);setDie($('die-two'),null);renderJournal();renderGameControls();await analyseLanding(false);
  }catch(err){console.error(err);$('event-title').textContent='Impossible de charger le jeu';$('event-text').textContent='Vérifie que data/catalogue.json et data/stations sont publiés avec la page.';$('roll-button').disabled=true;}
}

$('roll-button').addEventListener('click',roll);
$('new-game').addEventListener('click',resetGame);
$('difficulty').addEventListener('change',e=>{state.difficulty=e.target.value;if(state.effect)state.effect=makeEffect(state.effect.type);renderEffect();renderGameControls();});
const rules=$('rules-dialog');$('rules-open').addEventListener('click',()=>rules.showModal());$('rules-open-bottom').addEventListener('click',()=>rules.showModal());rules.addEventListener('click',e=>{if(e.target===rules)rules.close();});
$('finish-restart').addEventListener('click',async()=>{$('finish-dialog').close();await resetGame();});
$('finish-dialog').addEventListener('click',e=>{if(e.target===$('finish-dialog'))$('finish-dialog').close();});
init();