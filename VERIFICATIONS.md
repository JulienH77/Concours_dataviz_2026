# Vérifications de la version initiale

Le 6 octobre 2026 :

- Les 4 tests JavaScript et 10 tests Python passent : débits nuls, ex æquo, absences, frontières de classes, calendrier ISO, décalage synthétique de trois semaines avec trous, intégrité des originaux et cohérence de toutes les séries générées.
- Les 7 fichiers reçus sont identiques octet pour octet à ceux de l’archive d’origine, vérification SHA-256.
- Les 266 sites sont dans le cadre initial de la carte, y compris le nord des Ardennes.
- Les liens locaux des six pages et la syntaxe JavaScript sont vérifiés.
- Les cinq interfaces ont été exécutées dans un DOM simulé (jsdom) avec un véritable contexte de dessin Canvas : chargement, choix de station, filtres avec et sans résultats, retour à la sélection complète, boutons propres à chaque idée et exports CSV/SVG/PNG.

**Limite de vérification :** le rendu réel dans un navigateur n’a pas pu être testé dans cet environnement. Les vérifications DOM ne mesurent pas la lisibilité visuelle, les chevauchements, le défilement mobile ni la fluidité réelle de l’animation. Ces points doivent être revus une fois le site publié.

## Refaire les contrôles

Les tests de base n’ont pas besoin de dépendances Node : `npm test` (Python et `requirements.txt` requis).

Pour les tests d’interfaces simulées facultatifs, installer les dépendances de test localement :

```bash
npm install --no-save jsdom @napi-rs/canvas
npm run test:ui
```

Node 24 recommandé pour ces tests facultatifs. Ces deux bibliothèques ne sont ni chargées ni nécessaires sur le site publié. Le script de test ne modifie pas les fichiers du projet et ne contacte aucun service externe.
