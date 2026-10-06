"""Contrôles indépendants des exports et cas synthétiques de calcul."""
import sys,json,hashlib,unittest
from pathlib import Path
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from prepare import percentiles,associations,longest_run

class Algorithms(unittest.TestCase):
    def test_zero_and_ties(self):
        q=np.array([0.]*60+[2.]*60+[np.nan]);w=np.ones(121,dtype=int);b=np.ones(121,dtype=bool)
        p=percentiles(q,w,b)
        self.assertEqual(p[0],25);self.assertEqual(p[60],75);self.assertTrue(np.isnan(p[-1]))
    def test_circular_iso(self):
        q=np.arange(120,dtype=float);w=np.array([52]*60+[1]*60)
        p=percentiles(q,w,np.ones(120,dtype=bool))
        self.assertAlmostEqual(p[0],100*.5/120)
    def test_insufficient_reference(self):
        self.assertTrue(np.isnan(percentiles(np.ones(49),np.ones(49,dtype=int),np.ones(49,dtype=bool))).all())
    def test_lag_and_gaps(self):
        rng=np.random.default_rng(19);rain=rng.normal(size=600);flow=np.r_[np.full(3,np.nan),rain[:-3]]
        rain[50:65]=np.nan;flow[250:280]=np.nan;years=np.repeat([2010,2020],300)
        m=associations(rain,flow,years)
        self.assertEqual(m['best'],3);self.assertAlmostEqual(m['correlations'][3],1)
        self.assertEqual(m['counts'][3],552);self.assertTrue(m['reliable'])
    def test_missing_interrupts_run(self):
        self.assertEqual(longest_run([True,True,False,True]),2)

class Exports(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cat=json.loads((ROOT/'data/catalogue.json').read_text());cls.sites=cls.cat['stations'];cls.weeks=cls.cat['weeks']
        cls.matrix=np.frombuffer((ROOT/'data/percentiles.bin').read_bytes(),dtype=np.uint8).reshape(len(cls.weeks),len(cls.sites))
    def test_dimensions_and_dates(self):
        self.assertEqual(len(self.sites),266);self.assertEqual(len(self.weeks),1393)
        self.assertEqual(self.weeks[-1]['date'],'2026-09-07')
        self.assertTrue(any(w['week']==53 for w in self.weeks))
        self.assertTrue(set(np.unique(self.matrix)).issubset(set(range(201))|{255}))
    def test_station_payloads_and_statistics(self):
        all_n=np.zeros(len(self.weeks),dtype=int);all_low=all_n.copy();all_high=all_n.copy()
        for i,s in enumerate(self.sites):
            d=json.loads((ROOT/f'data/stations/{s["id"]}.json').read_text());p=np.array([np.nan if v is None else v for v in d['percentile']]);q=np.array([np.nan if v is None else v for v in d['values']['debit']])
            for vals in d['values'].values():self.assertEqual(len(vals),1393)
            self.assertEqual(np.isfinite(q).sum(),s['n']);self.assertEqual(np.isfinite(p).sum(),s['rank_n'])
            self.assertTrue(np.array_equal(np.isnan(p),self.matrix[:,i]==255))
            valid=np.isfinite(p)
            # Décimales JSON peuvent traverser une limite de quantification d’un epsilon ; erreur <=0,5001.
            self.assertTrue(np.all(np.abs(self.matrix[valid,i]/2-p[valid])<=.5001))
            self.assertTrue(np.array_equal(p<10,(self.matrix[:,i]<20)))
            self.assertTrue(np.array_equal(p>=90,(self.matrix[:,i]>=180)&(self.matrix[:,i]<=200)))
            all_n+=np.isfinite(p);all_low+=p<10;all_high+=p>=90
            for annual in s['annual']:
                m=np.array([w['year']==annual['year'] for w in self.weeks]);self.assertEqual(annual['n'],int((np.isfinite(p)&m).sum()))
        self.assertEqual(all_n.tolist(),[w['n'] for w in self.weeks]);self.assertEqual(all_low.tolist(),[w['low'] for w in self.weeks]);self.assertEqual(all_high.tolist(),[w['high'] for w in self.weeks])
    def test_originals_unchanged(self):
        for file in json.loads((ROOT/'DONNEES/manifest.json').read_text()):
            p=ROOT/file['path'];self.assertEqual(p.stat().st_size,file['bytes']);self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),file['sha256'])
    def test_empirical_ranks_independently(self):
        raw=pd.read_csv(ROOT/'DONNEES/donnees/donnees.csv');weeks=np.array([w['week'] for w in self.weeks]);years=np.array([w['year'] for w in self.weeks])
        for sid,g in raw.groupby('site'):
            q=g.debit.to_numpy();q[q<0]=np.nan;d=json.loads((ROOT/f'data/stations/{sid}.json').read_text())
            candidates=np.flatnonzero(np.isfinite(q))
            for ix in candidates[::max(1,len(candidates)//3)][:4]:
                week=min(weeks[ix],52);distance=np.abs(np.minimum(weeks,52)-week);m=(np.minimum(distance,52-distance)<=2)&(years<=2025)&np.isfinite(q);ref=q[m];p=d['percentile'][ix]
                if len(ref)<50:self.assertIsNone(p)
                else:self.assertAlmostEqual(p,100*((ref<q[ix]).sum()+(ref<=q[ix]).sum())/(2*len(ref)),places=3)
    def test_all_pages_present(self):
        self.assertTrue((ROOT/'index.html').exists())
        for p in ['01-pouls','02-memoire','03-calendrier','04-adn','05-deux-visages']:
            self.assertTrue((ROOT/f'idees/{p}/index.html').exists())
        for name in ['region','departements','rivieres']:self.assertTrue(json.loads((ROOT/f'data/{name}.geojson').read_text())['features'])

if __name__=='__main__':unittest.main(verbosity=2)
