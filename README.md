# ⚡ STORMBOUND — La Tempête des Anciens

> 🆕 Nouvelle machine en préparation : **[COCO BOUM!](coco-boum/)**, la poule qui pond de la dynamite (style dessin animé).

Prototype jouable d'une machine à sous au thème de tempête fantastique (HTML/CSS/JS, sans dépendance).

**Lancer en local (lien http) :** sous Windows, double-cliquer sur `lancer.bat` ; la machine s'ouvre sur http://localhost:8000/ (fermer la fenêtre noire pour l'arrêter). Sur Mac ou Linux : `./lancer.command`. On peut aussi ouvrir `index.html` directement.
**Tester le bonus :** bouton BONUS, ou `stormbound.bonus()` dans la console du navigateur.

## Architecture
- `engine.js` : moteur mathématique sans affichage. `spin(mise, rng)` calcule le résultat complet d'une mise (tour de base, cascades, événements et tours gratuits) et renvoie la liste des étapes. **Chaque mise est indépendante**, aucun état ne passe d'une mise à l'autre.
- `game.js` : interface, décor animé et son. La page ne calcule aucun gain : elle rejoue les étapes du moteur.
- `simulate.js` : mesure le RTP avec le même moteur : `node simulate.js 1000000 42`.

## Mathématiques (réglages actuels, `CONFIG` dans engine.js)
| Mesure | Valeur (simulation 4 M de mises) |
|---|---|
| RTP | ≈ 96 % (± 0,5 %) |
| Fréquence de gain | ≈ 27,8 % (1 tour sur 3,6) |
| Répartition du RTP | ≈ 58 % jeu de base, ≈ 38 % bonus |
| Eye of the Storm | ≈ 1 mise sur 240, gain moyen ≈ ×90 |
| Gain max | plafonné à ×5000 la mise |

### Achat de bonus (boutons BONUS, SUPER, MYSTÈRE et EXPANSIF)
| Achat | Prix | Contenu | RTP (simulation) |
|---|---|---|---|
| Eye of the Storm | 20× la mise | 6 tours gratuits, 1 Storm Wild, départ sous la Pluie | ≈ 95,8 % |
| Super Eye of the Storm | 32× la mise | 6 tours gratuits, 1–2 Storm Wilds (26 % de chance d'en avoir 2), Gardien actif | ≈ 95,6 % |
| Gain Mystère | 50× la mise | 6 tours gratuits, 1–2 Storm Wilds ; chaque tour 3 à 5 cases cachées se révèlent en un même symbole de valeur | ≈ 95,6 % |
| Symboles Expansifs | 100× la mise | 6 tours gratuits, 1–2 Storm Wilds, Gardien ; chaque tour une colonne entière d'un même symbole de valeur | ≈ 95,8 % |

Le bonus gagné naturellement (4 ⚡) reste de 8 tours gratuits.

Mesure : `node simulate.js --buy eye 100000`. Les prix sont dans `BONUS_BUYS` (engine.js). Attention, l'achat de bonus est interdit dans certains pays (Royaume-Uni par exemple) : à vérifier selon le casino.

`payScale` multiplie toute la table des gains, et le RTP lui est proportionnel : c'est le bouton pour recaler le RTP.

## Mécaniques
- **Grille 6×5, gains partout :** 8 symboles identiques ou plus (dont au moins 4 vrais symboles), avec des cascades.
- **Météo :** chaque tour repart de la Pluie, et chaque cascade gagnante fait monter la tempête et le multiplicateur (×1 → ×1,5 → ×2 → ×3 → ×5).
- **Storm Charge :** chaque ⚡ vaut un quart de la jauge. À 2 ⚡ et à 3 ⚡, un événement (Éclair, Rafale, Pluie torrentielle, Œil du cyclone). À 4 ⚡, l'Eye of the Storm.
- **Eye of the Storm :** 8 tours gratuits avec des Storm Wilds collants. La tempête persiste d'un tour gratuit à l'autre, et 4 nouveaux ⚡ ajoutent 3 tours.
- **Gardien 🐉 :** il devient Wild et frappe la grille. En bonus, il frappe à chaque tour. Après 3 frappes, la zone devient une *zone de tempête*.

## Avant une publication réelle (Stake ou autre)
- Les résultats doivent venir du serveur du casino (RGS) avec un aléa certifié, jamais de `Math.random` ou `crypto` dans le navigateur.
- Le RTP doit être vérifié sur beaucoup plus de tours (centaines de millions), ou calculé à partir des tables de résultats pré-calculés du fournisseur, puis certifié.
- Les symboles emoji sont des marqueurs à remplacer par de vrais visuels.

Crédits fictifs uniquement.
