const DATA_URL = '../../data/jeu-eau.json';
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DICE = ['⚀','⚁','⚂','⚃','⚄','⚅'];
const EVENT = {
  crue:{name:'Pluies remarquables',icon:'🌧️',klass:'event-flood',effect:-2,rule:'La case est détrempée : −2 mois au prochain lancer.'},
  neige:{name:'Épisode neigeux',icon:'❄️',klass:'event-snow',effect:-1,rule:'La neige ralentit le pion : −1 mois au prochain lancer.'},
  etiage:{name:'Petit débit et sol sec',icon:'☀️',klass:'event-low',effect:1,rule:'Le niveau est bas : +1 mois au prochain lancer.'},
  sol:{name:'Sol très humide',icon:'🌿',klass:'event-soil',effect:1,rule:'Le sol relâche son eau : +1 mois au prochain lancer.'}
};
const $=id=>document.getElementById(id);
let data, position=0, pending=0, busy=false, visited=new Set([0]);

function fmt(v,digits=1,suffix='') { return Number.isFinite(v) ? `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:digits}).format(v)}${suffix}` : '—'; }
function monthLabel(i){return `${MONTHS[i%12]} ${2000+Math.floor(i/12)}`;}
function point(s){return {x:68+(s.lon-4.5)*135,y:60+(49.7-s.lat)*190};}
function drawMap(){
  const svg=$('station-map'), pts=data.stations.map(s=>point(s));
  // A soft regional silhouette anchors the measured station locations without implying a river trace.
  svg.innerHTML=`<path class="region-shape" d="M175 44 266 53 335 37 411 62 449 119 465 178 445 241 461 300 422 360 386 418 319 452 260 434 215 458 152 424 112 378 95 317 73 269 88 211 71 154 114 97Z"/><path class="route" d="${pts.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')} L${pts[0].x},${pts[0].y}"/>`+
    pts.map((p,i)=>`<g><circle class="station-node ${i===position%pts.length?'is-current':''}" cx="${p.x}" cy="${p.y}" r="${i===position%pts.length?8:5}"/><text class="station-text" x="${p.x+8}" y="${p.y+3}">${data.stations[i].town}</text>${i===position%pts.length?`<text class="player-boat" x="${p.x-9}" y="${p.y-12}">⛵</text>`:''}</g>`).join('');
  $('map-caption').textContent=`Étape ${position%pts.length+1} sur ${pts.length} · ${data.stations[position%pts.length].town}`;
}
function weather(){
  const station=data.stations[position%data.stations.length], vals=station.monthly[position], rain=vals[1], snow=vals[2], soil=vals[4], layer=$('weather-layer'), p=point(station), cx=p.x/560*100, cy=p.y/520*100;
  let items=[];
  if(Number.isFinite(snow)&&snow>1){const n=Math.min(38,Math.ceil(snow/2));for(let i=0;i<n;i++)items.push(`<i class="particle" style="--x:${cx-12+Math.random()*24}%;--y:${cy-12+Math.random()*10}%;--size:${7+Math.random()*9}px;--opacity:${Math.min(.9,.3+snow/35)};--duration:${3+Math.random()*4}s;--delay:-${Math.random()*7}s">❄</i>`);}
  else if(Number.isFinite(rain)&&rain>55){const n=Math.min(42,Math.ceil(rain/5));for(let i=0;i<n;i++)items.push(`<i class="particle" style="--x:${cx-12+Math.random()*24}%;--y:${cy-12+Math.random()*10}%;--size:${8+Math.random()*5}px;--opacity:${Math.min(.85,.22+rain/260)};--duration:${.7+Math.random()*1.2}s;--delay:-${Math.random()*3}s">╱</i>`);}
  if(Number.isFinite(soil)&&soil>.9)for(let i=0;i<5;i++)items.push(`<i class="particle mist" style="--x:${cx-12+i*5}%;--y:${cy+2+(i%2)*5}%;--size:${24+i*3}px;--opacity:${Math.min(.55,.2+soil/3)}">☁</i>`);
  layer.innerHTML=items.join('');
}
function render(){
  const station=data.stations[position%data.stations.length], [temp,rain,snow,flow,soil]=station.monthly[position], eventCode=data.events[position], event=eventCode&&EVENT[eventCode];
  $('position').textContent=`${position+1} / 312`;$('month-title').textContent=monthLabel(position);$('station-name').textContent=station.name;$('station-meta').textContent=`${station.river} · ${station.town} (${station.dept})`;
  $('temp').textContent=fmt(temp,1,'°');$('rain').textContent=fmt(rain,0);$('snow').textContent=fmt(snow,1);$('flow').textContent=fmt(flow,0);$('soil').textContent=fmt(soil,2);
  const note=$('event-note');note.className='weather-note';
  if(event){$('current-icon').textContent=event.icon;note.classList.add(event.klass);note.textContent=`${event.name} · ${event.rule}`;pending=event.effect;$('rule-status').textContent=event.rule;}
  else{$('current-icon').textContent=(Number.isFinite(snow)&&snow>1)?'❄️':(Number.isFinite(rain)&&rain>55)?'🌧️':'🌱';note.textContent='Pas d’événement remarquable repéré pour cette station et ce mois.';pending=0;$('rule-status').textContent='Aucun effet en attente';}
  $('turn-hint').textContent=pending?`Le prochain lancer sera modifié par l’événement de cette case.`:'Additionne les deux dés : tu avances de 2 à 12 mois.';
  document.querySelectorAll('.month-cell').forEach((cell,i)=>{cell.classList.toggle('is-current',i===position);cell.classList.toggle('is-visited',visited.has(i));});drawMap();weather();
  $('roll-button').disabled=position>=311||busy;
}
function makeBoard(){
  const board=$('board');
  for(let year=0;year<26;year++){
    const row=document.createElement('div');row.className='year-row';
    const label=document.createElement('span');label.className='year-label';label.textContent=String(2000+year);row.append(label);
    const months=document.createElement('div');months.className='month-grid';
    for(let m=0;m<12;m++){const i=year*12+m,code=data.events[i],b=document.createElement('button');b.type='button';b.className='month-cell';if(code)b.dataset.event=code;b.title=`${monthLabel(i)} · ${code?EVENT[code].name:'pas d’événement remarquable'}`;b.setAttribute('aria-label',`Aller à ${monthLabel(i)}${code?`, ${EVENT[code].name}`:''}`);b.addEventListener('click',()=>{position=i;visited.add(i);pending=0;render();});months.append(b);}
    row.append(months);board.append(row);
  }
}
async function roll(){
  if(busy||position>=311)return;busy=true;const button=$('roll-button');button.disabled=true;
  const one=1+Math.floor(Math.random()*6),two=1+Math.floor(Math.random()*6), total=one+two;
  $('die-one').classList.add('shake');$('die-two').classList.add('shake');$('die-one').textContent=DICE[one-1];$('die-two').textContent=DICE[two-1];$('roll-total').textContent=total;
  await new Promise(resolve=>setTimeout(resolve,420));$('die-one').classList.remove('shake');$('die-two').classList.remove('shake');
  const effect=pending;pending=0;const move=Math.max(1,total+effect);const before=position;position=Math.min(311,position+move);visited.add(position);busy=false;render();
  $('event-note').textContent=`${total} aux dés${effect?` · effet ${effect>0?'+':''}${effect}`:''} → ${position-before} mois parcourus, arrivée en ${monthLabel(position)}.`;
}
async function start(){
  try{const response=await fetch(DATA_URL);if(!response.ok)throw new Error('data');data=await response.json();if(data.period.months!==312||data.stations.some(s=>s.monthly.length!==312))throw new Error('period');makeBoard();render();}
  catch(error){$('station-name').textContent='Données indisponibles';$('event-note').textContent='Recharge la page pour réessayer.';console.error(error);}
}
$('roll-button').addEventListener('click',roll);$('reset-button').addEventListener('click',()=>{position=0;pending=0;busy=false;visited=new Set([0]);$('die-one').textContent=DICE[0];$('die-two').textContent=DICE[0];$('roll-total').textContent='2';$('event-note').textContent='Les dés sont prêts. À toi de jouer.';render();});
start();
