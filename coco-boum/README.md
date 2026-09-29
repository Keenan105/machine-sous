# 🐔💥 COCO BOUM! — La poule qui pond de la dynamite

Nouvelle machine à sous au style dessin animé, **jouable** avec des dessins provisoires (SVG) et des sons synthétisés.
Les images finales se commandent avec le prompt `PROMPT_CHATGPT.md`.

**Lancer :** depuis la racine du dépôt, `lancer.bat` (Windows) ou `./lancer.command` (Mac/Linux), puis ouvrir http://localhost:8000/coco-boum/.
**Tester :** `coco.bonus()`, `coco.super()` ou `coco.eggs()` dans la console du navigateur. Barre d'espace = lancer ; cliquer pendant un tour l'accélère.

## Fichiers
- `engine.js` : moteur mathématique, sans affichage. Chaque mise est calculée en entier puis rejouée par l'interface.
- `game.js` : interface, animations, sons.
- `art.js` : dessins cartoon provisoires (à remplacer par les images finales).
- `simulate.js` : mesure du RTP avec le même moteur.

## Le concept
- Grille **7×6**, gains par **grappes de 5+ symboles** qui se touchent, avec dégringolades. Les symboles tombent colonne par colonne et font un petit rebond.
- **Coco**, une poule complètement folle, traverse parfois la grille et **pond des œufs** (≈ 1 mise sur 8).
- Chaque grappe qui explose à côté d'un œuf le **fêle** (1 à 3 coups). À l'éclosion, surprise :
  - 🥚 **Multiplicateur** ×2 à ×100 (jusqu'à ×500 en bonus) qui va dans le **Panier** et multiplie le gain de la mise ;
  - 🐤 **Poussin Wild** (joker) ;
  - 🧨 **Dynamite** : explosion 3×3, qui fêle les œufs voisins (**réaction en chaîne**).
- **Double Chance** (mise ×1,25) : bonus plus fréquent.
- Gain max : **×10 000** la mise.

## Les 5 bonus
| Prix | Bonus | Tours | Particularité | Obtention |
|---|---|---|---|---|
| 10× | Poussins en Folie | 5 | 1 à 2 Poussins Wild par tour | achat |
| 20× | Nid Collant | 6 | les œufs restent d'un tour à l'autre (jusqu'à 12) | achat |
| 50× | Pluie de Dynamite | 8 | 1 à 3 dynamites au début de chaque tour | achat |
| 100× | La Grange en Folie | 10 | Panier persistant | 4 Granges ou achat |
| 200× | Super Grange | 10 | Panier persistant, œufs en pagaille, ×5 minimum | 5+ Granges ou achat |

Pendant tous les bonus, 3 Granges rajoutent 5 tours. Chaque bonus a un réglage `pay` (dans `BONUSES`, engine.js) calé pour que son achat rende ≈ 96 %.

## Mathématiques (simulation)
| Mesure | Valeur |
|---|---|
| RTP jeu normal | ≈ 96 % (± 1 %, jeu très volatil) |
| RTP Double Chance | ≈ 96 % |
| RTP de chaque bonus acheté | ≈ 96 % |
| Fréquence de gain | ≈ 27 % |
| Bonus naturel | ≈ 1 mise sur 300 (1 sur 185 en Double Chance) |

Mesurer : `node simulate.js 1000000 1`, `node simulate.js 1000000 1 --ante`, `node simulate.js --buy chicks|sticky|dynamite|grange|super 30000`.
`payScale` règle le jeu de base, `fsPayScale` tous les bonus, `pay` chaque bonus.

Crédits fictifs uniquement. Avant une vraie publication : résultats tirés par le serveur du casino (RGS), RTP vérifié sur des centaines de millions de tours puis certifié. L'achat de bonus est interdit dans certains pays.
