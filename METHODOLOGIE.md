# Cinq lectures de l’eau — méthodologie V1

## Sources et conservation

Seuls les fichiers du concours DataGrandEst 2026 sont utilisés. Ils sont conservés octet pour octet dans `DONNEES/` ; `DONNEES/manifest.json` contient leurs tailles et SHA-256. Le CSV sert au calcul ; le XLSX est conservé comme version alternative. Le PDF constitue la documentation des variables. Aucune donnée métier externe ni fond de carte externe n’est ajouté.

Les fichiers web de `data/` sont des dérivés reproductibles. Les géométries sont simplifiées par Douglas–Peucker à 0,002 degré, sans modification des originaux. Cette tolérance sert à l’affichage, pas aux mesures géographiques. Les coordonnées de stations sont reprises telles quelles. La carte est en Mercator, sans tuiles externes.

## Contrôles de qualité

370 538 lignes, 266 sites, 1 393 semaines, du lundi 03/01/2000 au lundi 07/09/2026 inclus. Le PDF contient une discordance de jour/date sur la fin de période : les dates du CSV font foi pour les vues. 2026 est partielle ; « 26 ans » désigne les 26 années complètes 2000–2025.

Les clés site/date sont uniques ; les semaines sont espacées de sept jours et leur numérotation ISO est vérifiée. Les métadonnées par site sont constantes. 64 260 débits manquent, soit environ 17,34 %. Dix stations ne possèdent aucun débit. Une valeur négative est exclue des calculs. Les zéros restent des observations valides et les ex æquo sont traités par rang médian.

L’échelle des débits bruts semble incompatible avec l’unité m³/s annoncée dans le PDF, notamment pour de petites rivières. Cela ne suffit pas à prouver une unité alternative : **aucune division automatique par 1 000 n’est appliquée**. Une clarification auprès de l’organisateur sera nécessaire avant d’afficher des débits en unité physique. L’humidité du sol est conservée en valeur source, avec une unité explicitement à confirmer. Les rangs et rapports de débit sont indépendants d’un facteur de conversion constant propre au site ; ils ne corrigent pas une éventuelle rupture d’unité dans le temps.

## 1 — Le pouls de l’eau

Pour un site et une semaine ISO w, la référence est constituée des débits disponibles des années ISO 2000–2025 dans une fenêtre de cinq semaines : w ± 2. La distance est circulaire autour d’une année de 52 semaines ; W53 est rapprochée de W52 uniquement pour construire cette fenêtre. Les observations W53 restent des dates distinctes et appartiennent à la référence quand elles sont dans la fenêtre.

Une référence nécessite au moins 50 observations. Les observations proviennent donc de plusieurs années, avec un nombre variable selon les absences. La période évaluée 2000–2025 appartient elle-même à la référence : il ne s’agit pas d’une prédiction ou d’une validation indépendante. 2026 est comparée à cette référence fixée.

Le rang d’un débit q est : `100 × (nombre de valeurs < q + nombre de valeurs ≤ q) / (2 × nombre de valeurs de référence)`.

Classes : [0,10[, [10,25[, [25,50[, [50,75[, [75,90[, [90,100]. Elles signifient « très bas » à « très haut » relativement à la station et à la saison. **Elles ne désignent ni des crues constatées, ni des seuils d’alerte sécheresse.**

Le fichier binaire de la carte contient un octet par station et semaine, dans l’ordre du catalogue : `floor(2 × rang)`, 255 pour absent. La précision est donc de 0,5 point, arrondie vers le bas. Ce choix conserve exactement les frontières des six classes. Les statistiques et séries propres aux stations utilisent les rangs non quantifiés, arrondis à quatre décimales dans les JSON.

Les épisodes mis en avant sont les trois plus fortes proportions de sites très bas et les trois plus fortes proportions de sites très hauts, parmi les semaines dont au moins 70 % des 266 sites sont classables. Deux sélections du même type doivent être espacées d’au moins 26 semaines. Ce critère choisit des épisodes contrastés, sans attribution historique externe. Le dénominateur est toujours affiché. Le réseau n’est pas spatialement uniforme et les sites peuvent être dépendants ou situés sur le même cours d’eau.

## 2 — La mémoire de l’eau

La « mémoire » est une métaphore pour un **décalage d’association statistique**, pas une mesure du temps de réponse physique d’un bassin. À la fréquence hebdomadaire, un pic au décalage zéro peut englober une réponse de quelques heures à quelques jours.

On enlève la médiane saisonnière 2000–2025 à la pluie et à `log(1 + débit)` avec la même fenêtre circulaire. Cette transformation vise à réduire les associations dues au cycle annuel commun ; elle ne supprime pas tous les facteurs de confusion. Le choix log(1 + débit) dépend de l’échelle brute, même si Spearman est insensible à une transformation monotone seule. L’incertitude sur l’unité limite donc aussi cette analyse exploratoire.

La corrélation de Spearman associe l’anomalie de pluie locale de t à l’anomalie de débit de t + k, pour k = 0 à 8. On utilise uniquement les paires disponibles, au moins 260 pour l’ensemble de la période. Les trous ne sont ni interpolés ni supprimés de la grille temporelle : un décalage k correspond toujours à k vraies semaines.

On compare également 2000–2012 et 2013–2026 avec au moins 104 paires par sous-période. Un pic est marqué « cohérent » si :

- le maximum global est ≥0,20 ;
- les deux maxima de sous-période sont à ±1 semaine du maximum global ;
- les décalages dont le coefficient est à moins de 0,03 du maximum global couvrent un intervalle d’au plus deux semaines.

Ce diagnostic est **heuristique**, pas une significativité statistique ni un intervalle de confiance. Tous les coefficients, nombres de paires et résultats de sous-périodes restent consultables, même si le site est grisé. Une série constante ne reçoit pas de coefficient. Le plus grand coefficient est le « meilleur » décalage ; des maxima proches invitent à éviter une lecture trop précise.

Limites : autocorrélation, évolution de la couverture, pluie locale au lieu d’une pluie moyenne de bassin, barrages/lacs absents, neige, prélèvements et autres facteurs non modélisés. Il n’est pas permis de lire cette corrélation comme une preuve de causalité.

## 3 — Le calendrier

Une case correspond à une vraie semaine ISO, avec 53 colonnes pour représenter les années qui contiennent W53. Les semaines inexistantes et futures sont hachurées ; les observations sans rang sont grises. La ligne 2026 est incomplète.

Au choix : rang d’un site, ou médiane des rangs disponibles des sites filtrés. Chaque site pèse autant ; aucune addition de débit entre stations. L’agrégat représente le réseau observé et non la quantité d’eau dans la région. Le nombre de sites classables est indiqué au survol. Les filtres de bassin utilisent uniquement le premier caractère du code site, selon le PDF : A Rhin/Moselle, B Meuse, F Seine aval/Marne, H Seine amont, U Saône.

## 4 — Les empreintes saisonnières

Pour chaque site, le débit médian saisonnier dans la fenêtre ±2 semaines est divisé par la médiane des débits disponibles de 2000–2025. Il en résulte un rapport sans unité, qui conserve l’amplitude saisonnière relative. Une médiane nulle ne permet pas ce calcul.

Les profils circulaires utilisent les 52 premières semaines dans le sens horaire. La représentation radiale utilise `rayon = rayon central + échelle × min(rapport, 3)` : il y a un décalage de rayon pour rendre les faibles rapports lisibles, et un plafonnement à 3. Le cercle pointillé indique le rapport 1, un second cercle le rapport 2. **La courbe cartésienne conserve les rapports réels, sans plafonnement**, et les comparaisons utilisent la même échelle verticale.

Quatre groupes exploratoires sont produits par k-means sur les 52 composantes `log(1 + rapport)`. Ils incluent uniquement les sites avec au moins 520 mesures, une médiane positive et un profil complet. Initialisation k-means++, 60 itérations, graine 2026. Les groupes sont des familles statistiques numérotées, pas une classification hydrologique validée. Leur nombre est un choix de visualisation, pas un nombre naturel démontré par les données.

## 5 — Les deux visages

Pour une année ISO et un site, la moitié supérieure orange représente la proportion des semaines classables dont le rang est <10 ; la moitié inférieure bleue celle dont le rang est ≥90. Le dénominateur est le nombre de semaines classables, pas systématiquement 52. Une année avec moins de 26 semaines classables est grisée. L’intensité sature à 25 %, avec une teinte légère pour 0 % ; la taille des symboles reste fixe.

Les plus longues séquences sont comptées dans l’année choisie et ne franchissent pas les limites d’année ; les observations absentes interrompent les séquences. Comparer 2026 partielle aux années complètes exige de tenir compte de la saison couverte. Les champs `crue` et `etiage` indiquent l’usage de surveillance du site, jamais un événement survenu cette semaine.

## Reproduire

Python 3.12 recommandé : installer `requirements.txt`, exécuter `python scripts/prepare.py`, puis `python scripts/pages.py`. Les calculs durent quelques dizaines de secondes selon la machine. `npm test` exécute les contrôles de données et les tests JS sans installer de dépendances Node. `python -m http.server 8000` lance les six pages statiques.

Le site n’utilise aucune base distante, aucun compte visiteur, aucune clé et aucun suivi d’audience. Les prototypes sont destinés à être comparés avant de sélectionner et approfondir une seule histoire pour le concours.
