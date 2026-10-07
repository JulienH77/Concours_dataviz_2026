"""Construit les pages statiques. Aucun téléchargement et aucune API externe."""
from pathlib import Path
import json,html,math
ROOT=Path(__file__).resolve().parents[1]
IDEAS=[
('01-pouls','Le pouls de l’eau','Une carte animée des débits relatifs, semaine après semaine. Repère les épisodes où une grande partie des stations présente des débits très bas ou très hauts.','Carte animée · narration'),
('02-memoire','La mémoire de l’eau','Entre pluie locale et débit, quel décalage présente la plus forte association ? Compare les résultats et leur stabilité dans le temps.','Carte analytique · associations'),
('03-calendrier','26 ans en 52 semaines','Un calendrier où chaque case raconte une semaine. Compare les années, les stations et les bassins sans perdre les données absentes.','Calendrier · carte synchronisée'),
('04-adn','L’ADN hydrologique','Chaque station possède un rythme saisonnier. Découvre les empreintes des cours d’eau et compare jusqu’à quatre profils à la même échelle.','Empreintes · comparaison'),
('05-deux-visages','Deux visages de l’eau','Les semaines très basses et très hautes cohabitent-elles dans une même année ? Deux moitiés de symbole pour lire ces deux faces.','Carte annuelle · contrastes')]

MARK='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C12 11 5 16 5 22a11 11 0 0 0 22 0C27 16 20 11 16 3Z" fill="#137d85"/><path d="M7 22c4-6 10 6 18 0" stroke="#fffefa" stroke-width="2" fill="none"/></svg>'
def chrome(title,depth,body,script=''):
    prefix='../'*depth
    return f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f5f3ec"><meta name="description" content="Sept propositions de datavisualisation de l’eau dans le Grand Est, à partir des données du concours DataGrandEst 2026."><title>{html.escape(title)} · DataGrandEst 2026</title><link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="{prefix}assets/style.css"></head><body><div class="shell"><header class="topbar"><a class="brand" href="{prefix}index.html">{MARK} Les rythmes de l’eau</a><div class="toplinks"><a href="{prefix}METHODOLOGIE.md">Méthodologie</a><a href="https://github.com/JulienH77/Concours_dataviz_2026" target="_blank" rel="noopener">GitHub ↗</a></div></header>{body}<footer class="footer"><span>Concours DataGrandEst 2026 · Projet de Julien · Données du concours, Météo-France / Hub’Eau / BD Topage</span><a href="{prefix}DONNEES/Me_Lire_1791105003994.pdf" target="_blank" rel="noopener">Sources et document fourni ↗</a></footer></div>{f'<script type="module" src="{prefix}{script}"></script>' if script else ''}</body></html>'''

def main():
    cat=json.loads((ROOT/'data/catalogue.json').read_text());a=cat['audit']; colors=['#ce673c','#d99861','#e4d4a6','#aed1c5','#559aa9','#225b9e']
    region=json.loads((ROOT/'data/region.geojson').read_text())
    def project(lon,lat):return (65+(lon-3.3)*125,550-(math.log(math.tan(math.pi/4+lat*math.pi/360))-math.log(math.tan(math.pi/4+47.4*math.pi/360)))*125*180/math.pi)
    def poly(g):
        rings=g['coordinates'] if g['type']=='Polygon' else [r for p in g['coordinates'] for r in p]
        return ' '.join(' '.join(('M' if i==0 else 'L')+f'{project(*p)[0]:.1f},{project(*p)[1]:.1f}' for i,p in enumerate(r))+' Z' for r in rings)
    t=cat['events'][0]['index'];ranks=(ROOT/'data/percentiles.bin').read_bytes();n=len(cat['stations']);
    mapart='<svg viewBox="0 0 760 590" aria-hidden="true">'+''.join(f'<path d="{poly(f["geometry"])}" fill="#e3ebe0" stroke="#9db5a6" stroke-width="2"/>' for f in region['features'])
    for i,s in enumerate(cat['stations']):
        x,y=project(s['lon'],s['lat']);v=ranks[t*n+i]/2;c='#a2acae' if v>100 else colors[0 if v<10 else 1 if v<25 else 2 if v<50 else 3 if v<75 else 4 if v<90 else 5];mapart+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{c}" stroke="#fffefa" stroke-width="1"/>'
    mapart+='</svg>'
    heat='<svg viewBox="0 0 500 180" aria-hidden="true">'
    for row,y in enumerate(range(2000,2026,2)):
        cells=[(i,w) for i,w in enumerate(cat['weeks']) if w['year']==y]
        for i,w in cells:
            v=w['median'];c='#a2acae' if v is None else colors[0 if v<10 else 1 if v<25 else 2 if v<50 else 3 if v<75 else 4 if v<90 else 5]
            heat+=f'<rect x="{10+(w["week"]-1)*9}" y="{row*13+5}" width="8" height="11" fill="{c}"/>'
    heat+='</svg>'
    memo='<svg viewBox="0 0 500 180" aria-hidden="true"><line x1="20" x2="480" y1="135" y2="135" stroke="#b5cabc"/>'
    example=next(s for s in cat['stations'] if s['memory']['reliable'])
    for i,r in enumerate(example['memory']['correlations']):memo+=f'<rect x="{35+i*50}" y="{135-max(0,r)*170}" width="30" height="{max(0,r)*170}" rx="3" fill="{colors[4] if i else colors[0]}"/>'
    memo+='</svg>'
    profiles=[s for s in cat['stations'] if s['cluster'] is not None][:4]
    dna='<svg viewBox="0 0 500 180" aria-hidden="true">'
    for j,s in enumerate(profiles):
        x=65+j*120;p=[]
        for i,v in enumerate(s['profile'][:52]):
            angle=i/52*math.pi*2-math.pi/2;r=20+min(v,3)*16;p.append(('M' if i==0 else 'L')+f'{x+math.cos(angle)*r:.1f},{90+math.sin(angle)*r:.1f}')
        dna+=f'<circle cx="{x}" cy="90" r="36" stroke="#a6bbb1" fill="none" stroke-dasharray="3 3"/><path d="{" ".join(p)}Z" fill="#137d85" fill-opacity=".12" stroke="#137d85" stroke-width="2"/>'
    dna+='</svg>'
    faces='<svg viewBox="0 0 500 180" aria-hidden="true">'
    for j,s in enumerate(cat['stations'][:36]):
        annual=next(x for x in s['annual'] if x['year']==2022);x=40+(j%12)*38;y=40+(j//12)*50
        for half,c in [(1,'#ce673c'),(0,'#225b9e')]:
            opacity=.1+min(.9,(annual['low'] if half else annual['high'])/max(1,annual['n'])*3)
            faces+=f'<path d="M{x-15} {y} A15 15 0 0 {half} {x+15} {y} Z" fill="{c}" fill-opacity="{opacity}"/>'
    faces+='</svg>'
    arts=[mapart,memo,heat,dna,faces]
    body=f'''<main><section class="hero"><div><div class="eyebrow">DataGrandEst 2026 · Eau dans le Grand Est</div><h1>Une région.<br>266 sentinelles.<br><em style="color:#137d85">Cinq façons de lire l’eau.</em></h1><p>Des débits, de la pluie et des saisons. Explore cinq pistes sur les mêmes données, puis choisis l’histoire qui mérite d’être racontée.</p><div class="stats"><div class="stat"><strong>{a['sites']}</strong><span>sites hydrométriques</span></div><div class="stat"><strong>2000–2026</strong><span>26 ans + une année partielle</span></div><div class="stat"><strong>370 538</strong><span>lignes de données fournies</span></div></div></div><div class="hero-art">{mapart}</div></section><div class="section-head"><h2>Choisir une piste à explorer</h2><span class="eyebrow">Cinq prototypes fonctionnels</span></div><section class="cards" aria-label="Les cinq idées">'''
    for i,(slug,title,desc,kind) in enumerate(IDEAS):body+=f'''<a class="idea-card" href="idees/{slug}/"><div class="card-art">{arts[i]}</div><div class="card-body"><div class="eyebrow">Piste 0{i+1}</div><h2>{title}</h2><p>{desc}</p><div class="card-footer"><span>{kind}</span><strong>Explorer →</strong></div></div></a>'''
    body+='''</section><div class="section-head"><h2>Deux nouvelles pistes à comparer</h2><span class="eyebrow">Prototypes complémentaires</span></div><section class="cards" aria-label="Deux nouvelles idées">'''
    extras=[
      ('06-marne','La Marne, au fil de l’eau','Une feuille dérive de la source vers l’aval. À chaque station, les débits et la météo du mois racontent une étape.','Récit cartographique · animation','<svg viewBox="0 0 500 180" aria-hidden="true"><path d="M62 145C124 128 115 76 190 92S283 136 320 84 388 55 436 28" fill="none" stroke="#75a8a0" stroke-width="7" stroke-linecap="round"/><path d="M62 145C124 128 115 76 190 92S283 136 320 84 388 55 436 28" fill="none" stroke="#fffefa" stroke-width="2" stroke-dasharray="3 8"/><circle cx="62" cy="145" r="9" fill="#d99562"/><path d="M212 76c8-14 23-15 32-14-1 14-8 25-20 25-8 0-14-5-12-11Z" fill="#77975c"/></svg>'),
      ('07-pouls-villes','Les battements du Grand Est','Une affiche des débits sur 26 ans, mesurés dans huit stations associées aux villes et à leurs rivières.','Affiche · export SVG','<svg viewBox="0 0 500 180" aria-hidden="true"><path d="M18 98h68l20-2 13-39 16 80 18-38h48l19-2 12-34 16 63 17-28h65l20-1 15-47 16 86 18-37h80" fill="none" stroke="#287c83" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 98h480" stroke="#b4c6bc" stroke-width="1" stroke-dasharray="4 7"/></svg>')]
    for i,(slug,title,desc,kind,art) in enumerate(extras,6):body+=f'''<a class="idea-card" href="idees/{slug}/"><div class="card-art">{art}</div><div class="card-body"><div class="eyebrow">Piste {i}</div><h2>{title}</h2><p>{desc}</p><div class="card-footer"><span>{kind}</span><strong>Explorer →</strong></div></div></a>'''
    body+='''</section><div class="note"><strong>Des comparaisons locales, des conclusions prudentes.</strong><br>Les débits sont comparés à l’historique saisonnier de chaque station. Les absences de mesure restent visibles. La météo est interpolée localement ; les barrages et lacs ne figurent pas dans ces données. Ces prototypes décrivent des observations et des associations, pas une causalité climatique ni une alerte réglementaire.</div></main>'''
    (ROOT/'index.html').write_text(chrome('Les rythmes de l’eau',0,body),encoding='utf-8')
    for slug,title,_,_ in IDEAS:
        (ROOT/f'idees/{slug}/index.html').write_text(chrome(title,2,'<main id="app"><div class="loading"><div class="spinner"></div><br>Chargement des données du concours…</div></main>','assets/app.js'),encoding='utf-8')
    (ROOT/'assets/favicon.svg').write_text(MARK.replace('aria-hidden="true"','xmlns="http://www.w3.org/2000/svg"'),encoding='utf-8')
    print('Accueil, cinq prototypes initiaux et liens vers deux pistes complémentaires générés.')

if __name__=='__main__':main()
