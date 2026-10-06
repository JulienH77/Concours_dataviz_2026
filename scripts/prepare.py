"""Prépare les cinq expériences, uniquement à partir des fichiers du concours."""
from pathlib import Path
import json, hashlib, math
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from scipy.cluster.vq import kmeans2

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data'
VARIABLES = ['debit', 'pluie', 'humidite', 'temp', 'neige']
BASINS = {'A':'Rhin et Moselle','B':'Meuse','F':'Seine aval et Marne','H':'Seine amont','U':'Saône'}

def clean(value):
    if isinstance(value, np.bool_): return bool(value)
    if isinstance(value, dict): return {str(k):clean(v) for k,v in value.items()}
    if isinstance(value, (list,tuple,np.ndarray)): return [clean(v) for v in value]
    if isinstance(value, (np.integer,)): return int(value)
    if isinstance(value, (float,np.floating)): return round(float(value),4) if np.isfinite(value) else None
    return value

def write(path, obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(clean(obj), ensure_ascii=False, separators=(',',':'), allow_nan=False),encoding='utf-8')

def week_distance(a,b):
    # W53 rejoint W52 pour la référence uniquement ; toutes les dates restent distinctes.
    d=np.abs(np.minimum(a,52)-min(b,52))
    return np.minimum(d,52-d)

def seasonal(values,weeks,baseline):
    med=np.full(53,np.nan)
    for w in range(1,54):
        ref=values[baseline & (week_distance(weeks,w)<=2) & np.isfinite(values)]
        if len(ref)>=50: med[w-1]=np.median(ref)
    return med

def percentiles(values,weeks,baseline):
    result=np.full(len(values),np.nan)
    for w in range(1,54):
        ref=np.sort(values[baseline & (week_distance(weeks,w)<=2) & np.isfinite(values)])
        if len(ref)<50: continue
        ix=np.flatnonzero((weeks==w)&np.isfinite(values))
        # Rang médian des ex aequo, y compris pour les débits nuls.
        result[ix]=100*(np.searchsorted(ref,values[ix],'left')+np.searchsorted(ref,values[ix],'right'))/(2*len(ref))
    return result

def longest_run(mask):
    best=run=0
    for v in mask:
        run=run+1 if v else 0
        best=max(best,run)
    return best

def associations(rain, flow, years):
    correlations=[]; counts=[]; halves=[[],[]]
    for lag in range(9):
        a=rain[:-lag] if lag else rain
        b=flow[lag:] if lag else flow
        y=years[lag:] if lag else years
        ok=np.isfinite(a)&np.isfinite(b)
        n=int(ok.sum()); counts.append(n)
        def corr(m,min_n):
            if m.sum()<min_n or np.std(a[m])==0 or np.std(b[m])==0: return np.nan
            return float(spearmanr(a[m],b[m]).statistic)
        correlations.append(corr(ok,260))
        halves[0].append(corr(ok&(y<=2012),104))
        halves[1].append(corr(ok&(y>=2013),104))
    arr=np.array(correlations)
    best=int(np.nanargmax(arr)) if np.isfinite(arr).any() else None
    peaks=[int(np.nanargmax(h)) if np.isfinite(h).any() else None for h in halves]
    close=[i for i,v in enumerate(arr) if best is not None and np.isfinite(v) and arr[best]-v<=.03]
    reliable=best is not None and arr[best]>=.2 and all(p is not None and abs(p-best)<=1 for p in peaks) and max(close)-min(close)<=2
    return dict(correlations=correlations,counts=counts,best=best,peaks=peaks,halves=halves,close=close,reliable=reliable)

def simplify_line(points,tolerance=.002):
    if len(points)<=2:return points
    p=np.asarray(points,dtype=float)[:,:2]; a=p[0]; b=p[-1]; v=b-a
    if np.dot(v,v)==0: distances=np.linalg.norm(p-a,axis=1)
    else:
        t=np.clip(((p-a)@v)/np.dot(v,v),0,1)
        distances=np.linalg.norm(p-(a+t[:,None]*v),axis=1)
    k=int(distances.argmax())
    if distances[k]<=tolerance:return [points[0][:2],points[-1][:2]]
    return simplify_line(points[:k+1],tolerance)[:-1]+simplify_line(points[k:],tolerance)

def simplify_geometry(g):
    t=g['type'];c=g['coordinates']
    if t=='LineString':c=simplify_line(c)
    elif t in ['MultiLineString','Polygon']:c=[simplify_line(r) for r in c]
    elif t=='MultiPolygon':c=[[simplify_line(r) for r in poly] for poly in c]
    return {'type':t,'coordinates':c}

def main():
    OUT.mkdir(exist_ok=True); (OUT/'stations').mkdir(exist_ok=True)
    frame=pd.read_csv(ROOT/'DONNEES/donnees/donnees.csv',dtype={'site':str,'dept':str,'commune':str},parse_dates=['date'])
    assert not frame.duplicated(['site','date']).any(),'Doublons site/date'
    dates=pd.DatetimeIndex(sorted(frame.date.unique()))
    assert np.all(np.diff(dates.values)==np.timedelta64(7,'D')),'Série hebdomadaire discontinue'
    assert (dates.weekday==0).all(),'Dates non lundi'
    expected=frame.date.dt.strftime('%G')+'W'+frame.date.dt.strftime('%V')
    assert (expected==frame.semaine).all(),'Incohérence des semaines ISO'
    weeks=dates.isocalendar().week.to_numpy(dtype=int); years=dates.isocalendar().year.to_numpy(dtype=int)
    baseline=years<=2025
    negative=int((frame.debit<0).sum());missing=int(frame.debit.isna().sum())
    frame.loc[frame.debit<0,'debit']=np.nan
    meta_cols=['libelle_site','libelle_cours_eau','libelle_commune','commune','dept','libelle_dept','lat','lon','etiage','crue']
    assert frame.groupby('site')[meta_cols].nunique().max().max()==1,'Métadonnées variables'
    stations=[]; ranks=[]; seasonal_profiles=[]; cluster_ids=[]; reports=[]
    for sid,g in frame.groupby('site',sort=True):
        row=g.iloc[0];g=g.set_index('date').reindex(dates)
        raw={v:g[v].to_numpy(dtype=float) for v in VARIABLES}
        q=raw['debit'];p=percentiles(q,weeks,baseline); ranks.append(p)
        seasonal_q=seasonal(q,weeks,baseline)
        qmed=np.nanmedian(q[baseline]) if np.isfinite(q[baseline]).any() else np.nan
        profile=seasonal_q/qmed if qmed>0 else np.full(53,np.nan)
        qr=np.log1p(q)-seasonal(np.log1p(q),weeks,baseline)[weeks-1]
        rr=raw['pluie']-seasonal(raw['pluie'],weeks,baseline)[weeks-1]
        memory=associations(rr,qr,years)
        annual=[]
        for year in sorted(set(years)):
            m=years==year; good=m&np.isfinite(p);n=int(good.sum())
            annual.append(dict(year=int(year),n=n,total=int(m.sum()),low=int((good&(p<10)).sum()),high=int((good&(p>=90)).sum()),low_run=longest_run(m&(p<10)),high_run=longest_run(m&(p>=90))))
        # Indicateurs par site : aucune somme de débits entre stations.
        s=dict(id=sid,name=row.libelle_site,river=row.libelle_cours_eau if isinstance(row.libelle_cours_eau,str) else 'Cours d’eau non renseigné',town=row.libelle_commune,dept=row.dept,department=row.libelle_dept,lat=row.lat,lon=row.lon,basin=sid[0],etiage=int(row.etiage),crue=int(row.crue),n=int(np.isfinite(q).sum()),rank_n=int(np.isfinite(p).sum()),coverage=float(np.isfinite(q).mean()),memory=memory,profile=profile,annual=annual,cluster=None)
        if s['n']>=520 and np.isfinite(profile[:52]).all() and qmed>0:
            seasonal_profiles.append(np.log1p(profile[:52]));cluster_ids.append(len(stations))
        write(OUT/'stations'/f'{sid}.json',dict(id=sid,values=raw,percentile=p))
        stations.append(s)
    if len(cluster_ids)>=4:
        _,labels=kmeans2(np.array(seasonal_profiles),4,minit='++',seed=2026,iter=60)
        for i,label in zip(cluster_ids,labels):stations[i]['cluster']=int(label)
    matrix=np.array(ranks).T
    # Binary little format: one byte per date then per station, 255 = absent.
    encoded=np.full(matrix.shape,255,dtype=np.uint8)
    good=np.isfinite(matrix);encoded[good]=np.floor(matrix[good]*2).astype(np.uint8)
    (OUT/'percentiles.bin').write_bytes(encoded.tobytes())
    weekly=[]
    for i,date in enumerate(dates):
        row=matrix[i];valid=np.isfinite(row); n=int(valid.sum())
        weekly.append(dict(date=str(date.date()),iso=f'{years[i]}W{weeks[i]:02d}',year=int(years[i]),week=int(weeks[i]),n=n,median=float(np.nanmedian(row)) if n else np.nan,low=int((row<10).sum()),high=int((row>=90).sum())))
    eligible=[i for i,w in enumerate(weekly) if w['n']>=int(len(stations)*.7)]
    events=[]
    for kind in ['low','high']:
        order=sorted(eligible,key=lambda i:weekly[i][kind]/weekly[i]['n'],reverse=True)
        picked=[]
        for i in order:
            if all(abs(i-j)>=26 for j in picked):picked.append(i)
            if len(picked)==3:break
        events += [dict(kind=kind,index=i,share=weekly[i][kind]/weekly[i]['n']) for i in picked]
    report=dict(rows=len(frame),sites=len(stations),weeks=len(dates),start=str(dates[0].date()),end=str(dates[-1].date()),missing_flow=missing,negative_flow=negative,no_flow=[s['id'] for s in stations if s['n']==0],rank_no_reference=[s['id'] for s in stations if s['rank_n']==0],memory_reliable=sum(s['memory']['reliable'] for s in stations),unit_note='Le PDF annonce m³/s, mais l’échelle des débits bruts est suspecte. Aucune conversion automatique. Les graphiques utilisent des rangs et rapports sans unité. Humidité : unité reprise du PDF, à confirmer.',reference='2000–2025, semaine ISO ±2, W53 associée à W52 pour la distance saisonnière, minimum 50 observations par référence.')
    write(OUT/'catalogue.json',dict(stations=stations,weeks=weekly,events=events,audit=report,basins=BASINS))
    write(ROOT/'ANALYSE.json',report)
    for name in ['region','departements']:
        geo=json.loads((ROOT/f'DONNEES/{name}-grand-est.geojson').read_text())
        features=geo.get('features',[geo])
        write(OUT/f'{name}.geojson',dict(type='FeatureCollection',features=[dict(type='Feature',properties=f['properties'],geometry=simplify_geometry(f['geometry'])) for f in features]))
    rivers=json.loads((ROOT/'DONNEES/cours-eau-region_1791104972648.geojson').read_text())
    write(OUT/'rivieres.geojson',dict(type='FeatureCollection',features=[dict(type='Feature',properties={},geometry=simplify_geometry(f['geometry'])) for f in rivers['features']]))
    manifest=[]
    for path in sorted((ROOT/'DONNEES').rglob('*')):
        if path.is_file() and path.name != 'manifest.json':manifest.append(dict(path=str(path.relative_to(ROOT)),bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    write(ROOT/'DONNEES/manifest.json',manifest)
    print(json.dumps(clean(report),ensure_ascii=False,indent=2))
    print('Moments repérés:',[(e['kind'],weekly[e['index']]['iso'],round(e['share']*100,1)) for e in events])

if __name__=='__main__':main()
