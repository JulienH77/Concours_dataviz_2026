const DATA_URL='../../data/jeu-eau.json';
const REGION_URL='../../data/region.geojson';
const MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DICE=[{pips:[5]},{pips:[1,9]},{pips:[1,5,9]},{pips:[1,3,7,9]},{pips:[1,3,5,7,9]},{pips:[1,3,4,6,7,9]}];
const EVENTS={
 crue:{title:'Pluie remarquable',icon:'🌧',short:'PLUIE',className:'rain-event',effect:1,effectText:'+1 mois au prochain lancer',story:'La pluie dépasse le seuil du 85e percentile pour ce mois de l’année à cette station. L’eau pousse le pion : au prochain lancer, tu avanceras d’un mois supplémentaire.'},
 neige:{title:'Épisode neigeux',icon:'❄',short:'NEIGE',className:'snow-event',effect:-1,effectText:'−1 mois au prochain lancer',story:'Le cumul de neige dépasse le seuil saisonnier de cette station. Le froid ralentit la goutte : au prochain lancer, elle avancera d’un mois de moins.'},
 etiage:{title:'Débit bas et sol sec',icon:'◒',short:'ÉTIAGE',className:'low-event',effect:-2,effectText:'−2 mois au prochain lancer',story:'Le débit et l’humidité du sol sont tous deux sous leur 15e percentile pour ce mois de l’année. La rivière s’amenuise : le prochain lancer fera perdre deux mois de progression.'},
 sol:{title:'Sol très humide',icon:'◉',short:'SOL HUMIDE',className:'soil-event',effect:1,effectText:'+1 mois au prochain lancer',story:'L’humidité du sol dépasse son 85e percentile saisonnier. Une partie de cette eau rejoint le voyage : tu gagneras un mois au prochain lancer.'}
};
const $=id=>document.getElementById(id);
let data,region,position=0,turn=0,busy=false,mapPoints=[];
const fmt=(v,d=1,s='')=>Number.isFinite(v)?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d}).format(v)+s:'—';
function monthName(i){return MONTHS[i%12][0].toUpperCase()+MONTHS[i%12].slice(1)+' '+(2000+Math.floor(i/12));}
function monthShort(i){return MONTHS[i%12].slice(0,3)+'. '+(2000+Math.floor(i/12));}
function project(lon,lat){return{x:70+(lon-3.3)/5.4*860,y:38+(50.6-lat)/3.5*520};}
function geoPaths(g){const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polys.map(poly=>poly.map(ring=>ring.map((c,i)=>{const p=project(c[0],c[1]);return(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ')+' Z').join(' ')).join(' ');}
function weatherSvg(p,v){let out='',rain=v[1],snow=v[2],soil=v[4];
 if(Number.isFinite(rain)&&rain>55)for(let i=0,n=Math.min(24,Math.max(6,Math.round(rain/8)));i<n;i++){const dx=i*37%96-48,dy=i*29%65-58;out+='<path class="rain-drop" style="--delay:-'+(i%9)*.14+'s" d="M'+(p.x+dx)+' '+(p.y+dy)+'l-4 12"/>';}
 if(Number.isFinite(snow)&&snow>1)for(let i=0,n=Math.min(18,Math.max(5,Math.ceil(snow)));i<n;i++){const dx=i*31%105-52,dy=i*23%68-62;out+='<circle class="snow-flake" style="--delay:-'+(i%7)*.3+'s" cx="'+(p.x+dx)+'" cy="'+(p.y+dy)+'" r="'+(2+i%3)+'"/>';}
 if(Number.isFinite(soil)&&soil>.9)out+='<ellipse class="mist-cloud" cx="'+p.x+'" cy="'+(p.y+28)+'" rx="52" ry="15"/><ellipse class="mist-cloud mist-two" cx="'+(p.x+24)+'" cy="'+(p.y+18)+'" rx="38" ry="11"/>';
 return '<g class="weather-effects">'+out+'</g>';
}
function renderMap(){
 const stops=data.stations;mapPoints=stops.map(s=>project(s.lon,s.lat));
 const boundary=region.features.map(f=>'<path class="region-shape" d="'+geoPaths(f.geometry)+'"/>').join('');
 const clip=region.features.map(f=>'<path d="'+geoPaths(f.geometry)+'"/>').join('');
 const links=mapPoints.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' ');
 const marne=mapPoints.slice(2,10).map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' ');
 let relief='',forest='';
 for(let i=0;i<24;i++){const x=95+i*173%810,y=75+i*97%430,r=32+i*13%65;relief+='<ellipse class="contour contour-'+(i%3)+'" cx="'+x+'" cy="'+y+'" rx="'+r+'" ry="'+r*.36+'"/>';}
 mapPoints.forEach((p,i)=>{forest+='<g class="forest" transform="translate('+(p.x+(i%2?-68:66))+' '+(p.y+(i%3-1)*26)+')"><path d="M0 11 8 -5 16 11Z"/><path d="M5 18 13 0 21 18Z"/></g>';});
 const markers=stops.map((s,i)=>{const p=mapPoints[i],active=i===position%stops.length;return '<g class="station-marker '+(active?'active':'')+'" transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')"><circle class="marker-halo" r="'+(active?20:13)+'"/><circle class="marker-core" r="'+(active?12:8)+'"/><text class="marker-number" text-anchor="middle" y="4">'+String(i+1).padStart(2,'0')+'</text></g>';}).join('');
 const p=mapPoints[position%stops.length];
 const token='<g class="water-token" transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')"><ellipse cx="0" cy="16" rx="24" ry="7" fill="#1e443b" opacity=".13"/><path class="token-hull" d="M-21 4Q0 13 21 4L13 16Q0 21-13 16Z"/><path class="token-sail" d="M-2 -23V2L-18 0Z"/><path class="token-sail token-sail-light" d="M2 -20V2L17 0Z"/><circle class="token-head" cx="0" cy="-27" r="5"/><path class="token-person" d="M-6 -20Q0 -25 6 -20L8 -8H-8Z"/></g>';
 const v=stops[position%stops.length].monthly[position];
 $('map').innerHTML='<defs><clipPath id="region-clip">'+clip+'</clipPath><linearGradient id="river-gradient"><stop stop-color="#5aa9ae"/><stop offset="1" stop-color="#4b8e97"/></linearGradient></defs><g class="landscape">'+relief+boundary+'<g clip-path="url(#region-clip)">'+forest+'</g><path class="game-route" d="'+links+'"/><path class="marne-river" d="'+marne+'"/></g><g class="basin-label"><text x="180" y="430">MOSELLE</text><text x="530" y="245">LA MARNE</text><text x="790" y="200">ILL</text></g>'+markers+token+weatherSvg(p,v);
 const s=stops[position%stops.length];$('map-location').innerHTML='<span>ÉTAPE '+String(position%13+1).padStart(2,'0')+' · '+s.river.toUpperCase()+'</span><strong>'+s.town+'</strong>';
}
function renderRibbon(){$('station-ribbon').innerHTML=data.stations.map((s,i)=>'<div class="ribbon-stop '+(i===position%13?'is-active':'')+'"><i>'+String(i+1).padStart(2,'0')+'</i><span>'+s.town+'</span></div>').join('');}
function thresholdText(code,s,m){const l=s.limits[m],v=s.monthly[position];if(code==='crue')return'Pluie : '+fmt(v[1],0)+' mm · seuil saisonnier '+fmt(l[0],0)+' mm';if(code==='neige')return'Neige : '+fmt(v[2],1)+' · seuil saisonnier '+fmt(l[1],1);if(code==='etiage')return'Débit '+fmt(v[3],0)+' · humidité '+fmt(v[4],2)+' ; seuils : 15e percentile';if(code==='sol')return'Indice d’humidité '+fmt(v[4],2)+' · seuil saisonnier '+fmt(l[4],2);return'';}
function updateStory(s,v,code){const m=position%12,y=2000+Math.floor(position/12),event=code&&EVENTS[code];$('story-tag').textContent=event?event.short+' · '+s.town.toUpperCase():'ÉTAPE '+String(position%13+1).padStart(2,'0')+' · '+s.river.toUpperCase();
 if(position===0){$('story-text').textContent='Le voyage commence dans les Vosges, au bord de la Moselle. Les dés feront défiler les mois ; les observations de chaque station formeront le carnet de cette traversée du Grand Est.';}
 else if(event){$('story-text').textContent=event.story+' '+thresholdText(code,s,m)+'.';}
 else{let detail='Aucun des seuils choisis ne se déclenche ici.';if(Number.isFinite(v[3])&&Number.isFinite(v[1]))detail='Le mois apporte '+fmt(v[1],0)+' mm de pluie ; le débit mesuré est de '+fmt(v[3],0)+' dans la série source.';else if(!Number.isFinite(v[3])||!Number.isFinite(v[1]))detail='Une partie des mesures manque à cette station : le jeu la laisse visible plutôt que de la remplacer.';if(Number.isFinite(v[2])&&v[2]>0)detail+=' La série indique aussi '+fmt(v[2],1)+' de neige.';$('story-text').textContent='Nous voici à '+s.town+', sur '+s.river+'. '+MONTHS[m][0].toUpperCase()+MONTHS[m].slice(1)+' '+y+' devient une page du carnet : '+detail;}
}
function renderChart(s){const vals=s.monthly,flows=vals.map(v=>v[3]),rains=vals.map(v=>v[1]),good=flows.filter(Number.isFinite),wet=rains.filter(Number.isFinite),maxFlow=Math.max(1,...good),maxRain=Math.max(1,...wet),x=i=>16+i/311*928,fy=v=>22+(1-v/maxFlow)*70,ry=v=>159-Math.min(1,v/maxRain)*35;
 let line='',segment=[];flows.forEach((v,i)=>{if(Number.isFinite(v))segment.push((segment.length?'L':'M')+x(i).toFixed(1)+','+fy(v).toFixed(1));else if(segment.length){line+=segment.join(' ')+' ';segment=[];}});if(segment.length)line+=segment.join(' ');
 const bars=rains.map((v,i)=>Number.isFinite(v)?'<rect class="rain-bar '+(i===position?'is-current':'')+'" x="'+(x(i)-.75)+'" y="'+ry(v)+'" width="1.5" height="'+(159-ry(v))+'"/>':'').join('');
 let grids='';for(let i=0;i<6;i++){const xx=x(i*60);grids+='<line class="year-grid" x1="'+xx+'" x2="'+xx+'" y1="12" y2="162"/>';}
 const xx=x(position),flow=flows[position];$('history-chart').innerHTML='<path class="chart-fill" d="'+line+' L944 94 L16 94Z"/><g>'+grids+'</g><path class="flow-line" d="'+line+'"/><g>'+bars+'</g><line class="current-month" x1="'+xx+'" x2="'+xx+'" y1="11" y2="163"/><circle class="current-flow" cx="'+xx+'" cy="'+(Number.isFinite(flow)?fy(flow):94)+'" r="4"/><text class="chart-caption" x="18" y="18">DÉBIT · ÉCHELLE STATION</text><text class="chart-caption rain-caption" x="18" y="151">PLUIE</text>';
 $('history-chart').setAttribute('aria-label','Historique mensuel de la pluie et du débit à '+s.name+', de 2000 à 2025. Mois sélectionné : '+monthName(position)+'.');$('chart-explain').textContent=s.name+' · le trait montre le débit (échelle propre à la station) et les barres la pluie (échelle séparée). Le curseur indique '+monthShort(position)+'.';
}
function setDie(el,value){el.classList.toggle('rolling',busy);el.innerHTML=value?DICE[value-1].pips.map(n=>'<i class="pip p'+n+'"></i>').join(''):'';el.setAttribute('aria-label',value?'Dé '+value:'Dé prêt');}
function addJournal(before,after,sum,effect){const s=data.stations[after%13],code=data.events[after],li=document.createElement('li');li.innerHTML='<span class="journal-icon '+(code?EVENTS[code].className:'')+'">'+(code?EVENTS[code].icon:'↗')+'</span><span><b>'+monthShort(after)+' · '+s.town+'</b><small>'+sum+' aux dés'+(effect?' · effet '+(effect>0?'+':'')+effect:'')+'</small></span><i>'+(after-before)+' mois</i>';const list=$('journal');if(list.querySelector('.journal-empty'))list.innerHTML='';list.prepend(li);while(list.children.length>4)list.lastElementChild.remove();}
function render(){const s=data.stations[position%13],v=s.monthly[position],code=data.events[position],event=code&&EVENTS[code],m=position%12,y=2000+Math.floor(position/12);
 $('top-date').textContent=MONTHS[m].toUpperCase()+' '+y;$('month-title').textContent=monthName(position);$('data-period').textContent=monthShort(position);$('station-name').textContent=s.town;$('station-subtitle').textContent=s.river+' · département '+s.dept;
 $('temp').textContent=fmt(v[0],1,' °C');$('rain').textContent=fmt(v[1],0,' mm');$('snow').textContent=fmt(v[2],1);$('flow').textContent=fmt(v[3],0);$('soil').textContent=fmt(v[4],2);
 const banner=$('event-banner');banner.className='event-banner '+(event?event.className:'');$('event-title').textContent=event?event.title:'Eau calme';$('event-description').textContent=event?thresholdText(code,s,m):'Aucun seuil événementiel franchi pour cette case.';$('event-next').textContent=event?event.effectText:'';
 $('dice-instruction').textContent=position===311?'Arrivée ! Tu as traversé les 312 mois de janvier 2000 à décembre 2025.':event?event.effectText+'. Lance les dés quand tu es prêt.':'Lance deux dés : leur somme fait avancer le voyage de 2 à 12 mois.';
 $('turn-number').textContent=String(turn+1).padStart(2,'0');$('year-count').textContent='Cycle '+(Math.floor(position/13)+1)+' / 24';$('year-progress').style.width=(position/311*100)+'%';$('route-stop').textContent=String(position%13+1).padStart(2,'0');$('journal-total').textContent=turn?turn+' lancer'+(turn>1?'s':''):'Départ';$('roll-button').disabled=busy||position>=311;$('roll-label').textContent=position>=311?'Voyage terminé':'Lancer les dés';
 updateStory(s,v,code);renderRibbon();renderMap();renderChart(s);
}
async function roll(){if(busy||position>=311)return;busy=true;const a=1+Math.floor(Math.random()*6),b=1+Math.floor(Math.random()*6),sum=a+b;setDie($('die-one'),a);setDie($('die-two'),b);$('dice-total').textContent=sum;render();await new Promise(r=>setTimeout(r,720));const before=position,effect=EVENTS[data.events[position]]?.effect||0,advance=Math.max(1,sum+effect);position=Math.min(311,position+advance);turn++;addJournal(before,position,sum,effect);busy=false;setDie($('die-one'),a);setDie($('die-two'),b);render();}
async function init(){try{const r=await Promise.all([fetch(DATA_URL),fetch(REGION_URL)]);if(!r[0].ok||!r[1].ok)throw new Error('Données indisponibles');data=await r[0].json();region=await r[1].json();if(data.period.months!==312||data.period.end!=='2025-12')throw new Error('Période incomplète');render();setDie($('die-one'),0);setDie($('die-two'),0);}catch(e){console.error(e);$('story-text').textContent='Impossible de charger le plateau et ses données. Vérifie que les fichiers du site sont bien publiés.';$('roll-button').disabled=true;}}
$('roll-button').addEventListener('click',roll);
$('new-game').addEventListener('click',()=>{position=0;turn=0;busy=false;$('journal').innerHTML='<li class="journal-empty">Tes étapes apparaîtront ici après le premier lancer.</li>';$('dice-total').textContent='—';setDie($('die-one'),0);setDie($('die-two'),0);render();});
const dialog=$('rules-dialog');$('rules-open').addEventListener('click',()=>dialog.showModal());$('rules-open-bottom').addEventListener('click',()=>dialog.showModal());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
init();
