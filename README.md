# Concours DataGrandEst 2026 — Les rythmes de l’eau

Cinq prototypes initiaux, complétés par trois pistes de récit, d’affiche et de jeu, construits avec **les fichiers fournis pour le concours**. Elles restent séparées pour comparer les propositions sans perdre les premières idées.

| Piste | Page | Interaction principale |
|---|---|---|
| Le pouls de l’eau | `idees/01-pouls/` | Carte animée des rangs saisonniers et épisodes repérés |
| La mémoire de l’eau | `idees/02-memoire/` | Corrélations pluie-débit à 0–8 semaines, stabilité par période |
| 26 ans en 52 semaines | `idees/03-calendrier/` | Calendrier ISO de 53 colonnes synchronisé à la carte |
| L’ADN hydrologique | `idees/04-adn/` | Profils saisonniers et comparaison de quatre stations |
| Deux visages de l’eau | `idees/05-deux-visages/` | Symboles annuels partagés : bas / haut et usages de surveillance |
| La Marne, au fil de l’eau | `idees/06-marne/` | Parcours animé de la source aux stations, avec les valeurs mensuelles de débit et de météo |
| Les battements du Grand Est | `idees/07-pouls-villes/` | Affiche exportable : débits relatifs annuels de huit stations, de 2000 à 2025 | 
| Les dés de l’eau | `idees/08-jeu-de-loie/` | Jeu de dés sur 312 mois, avec événements météo et stations du Grand Est |

Les cinq prototypes initiaux proposent une recherche par rivière, commune ou code, des filtres bassin/département, une fiche station, les sources et limites. Exports : cartes SVG, données station CSV, calendrier PNG, empreintes SVG. L’interface s’adapte au mobile et à l’impression. Aucun serveur métier, compte, clé API ou bibliothèque JS distante.

## Mise en ligne sur GitHub Pages

Dans le dépôt : **Settings → Pages → Deploy from a branch → main → / (root) → Save**. L’accueil sera à l’adresse `https://julienh77.github.io/Concours_dataviz_2026/` une fois Pages activé et le déploiement terminé. Les huit propositions sont accessibles depuis cet accueil.

Le dossier `.nojekyll` est en réalité un fichier vide à la racine et doit être conservé. Les pages sont prêtes à publier ; **aucune compilation, installation Node ou exécution Python n’est nécessaire pour les visiteurs**.

## Organisation

```text
index.html                   Accueil comparatif
idees/                       Les huit pages de proposition
assets/                      JS / CSS des prototypes initiaux et des pistes complémentaires
data/                        Cartes allégées, séries préparées et calculs pré-générés
DONNEES/                     CSV, XLSX, PDF et GeoJSON originaux
scripts/prepare.py           Pipeline statistique reproductible
scripts/pages.py             Génération des pages et aperçus à partir des données
tests/                       Vérifications numériques et d’intégrité
ANALYSE.json                 Audit de couverture et qualité
METHODOLOGIE.md              Calculs, conventions et limites
```

Les originaux font environ 209 Mo. Le fichier des cours d’eau fait environ 98 Mo décimaux, en dessous de 100 MiB, mais au-dessus de la limite de téléchargement via l’interface web GitHub : utiliser Git pour l’envoi initial complet, pas le glisser-déposer de tous les fichiers dans le navigateur. Les visiteurs du site ne chargent jamais ces gros fichiers : ils utilisent les dérivés allégés et une seule série station à la fois.

## Deux pistes complémentaires

La page Marne regroupe par mois les données hebdomadaires de l’année choisie. Le départ est à la source de Balesmes-sur-Marne ; Langres sert de repère géographique proche, car la rivière ne traverse pas la ville et aucune station n’y est fournie. Les haltes sans débit exploitable restent visibles. Les effets météo sont décoratifs et ne constituent pas une prévision.

L’affiche des battements présente huit stations réellement présentes dans le fichier. Chaque médiane annuelle est rapportée à la médiane de sa station ; les débits bruts ne sont donc pas additionnés ni comparés directement entre rivières. Elle s’imprime et s’exporte en SVG. Les valeurs dérivées se recalculent avec `python scripts/prepare_ideas_plus.py` à partir des données d’origine et du catalogue.

## Tester localement

À la racine :

```bash
python -m http.server 8000
```

Ouvrir `http://localhost:8000`. Le double-clic sur un HTML ne permet pas le chargement des JSON par `fetch`.

## Recalculer

```bash
python -m pip install -r requirements.txt
python scripts/prepare.py
python scripts/pages.py
npm test
```

Node 20 ou ultérieur est recommandé pour les tests JavaScript ; le site publié fonctionne dans les navigateurs modernes avec modules ES. `ANALYSE.json` est généré à chaque recalcul.

## Qualité et interprétation

- 266 sites, 370 538 lignes, 1 393 semaines : 2000-01-03 à 2026-09-07.
- 64 260 débits absents ; une valeur négative exclue des calculs ; dix sites sans débit.
- Référence saisonnière 2000–2025, ±2 semaines, minimum 50 mesures. 2026 est partielle.
- Unité de débit suspecte au regard du PDF : aucune conversion arbitraire, visualisations en rangs / rapports. Humidité affichée en valeur source, unité à confirmer.
- La « mémoire » mesure une association, pas un délai causal. Les champs crue/étiage décrivent un usage de surveillance, pas un événement observé.
- Géométries fournies pour le concours, simplifiées uniquement dans les dérivés d’affichage. Aucun enrichissement métier externe.

Voir [METHODOLOGIE.md](METHODOLOGIE.md) pour les formules, limites et critères de fiabilité. Les fichiers originaux ne sont pas modifiés ; leurs SHA-256 figurent dans `DONNEES/manifest.json`.

Voir aussi [VERIFICATIONS.md](VERIFICATIONS.md) pour les tests exécutés et leurs limites. Le rendu dans un navigateur réel reste à valider.

## Premiers épisodes repérés

Sur l’ensemble du réseau, parmi les semaines avec au moins 70 % de sites classables, et en séparant les épisodes d’au moins 26 semaines :

| Type relatif | Semaine ISO | Part du réseau classable |
|---|---|---:|
| Très bas | 2006W05 | 95,5 % |
| Très bas | 2017W04 | 93,6 % |
| Très bas | 2023W09 | 87,6 % |
| Très haut | 2024W41 | 97,0 % |
| Très haut | 2016W24 | 96,1 % |
| Très haut | 2013W45 | 95,4 % |

Il s’agit d’épisodes de rangs saisonniers relatifs : ces étiquettes ne qualifient pas des crues réglementaires, des arrêtés sécheresse ou leur cause.

## Pistes pour le concours

Mon choix provisoire est **Le pouls de l’eau**, pour son accessibilité et sa puissance cartographique. **Le calendrier** est le meilleur candidat pour une composition fixe. **La mémoire** mérite une validation méthodologique plus poussée avant d’en faire le message principal. Ces cinq pages servent à comparer les pistes, pas à présenter cinq sujets concurrents dans une même soumission finale.

