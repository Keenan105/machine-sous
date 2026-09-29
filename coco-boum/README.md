# 🐔💥 COCO BOUM! — La poule qui pond de la dynamite

Nouvelle machine à sous au style dessin animé. Pour l'instant : le **moteur mathématique** complet et calé, et le **prompt pour les animations** (`PROMPT_CHATGPT.md`). L'interface viendra ensuite avec les images.

## Le concept
- Grille **7×6**, gains par **grappes de 5+ symboles** qui se touchent, avec dégringolades.
- **Coco**, une poule complètement folle, traverse parfois la grille et **pond des œufs** (≈ 1 mise sur 8).
- Chaque grappe qui explose à côté d'un œuf le **fêle** (1 à 3 coups). À l'éclosion, surprise :
  - 🥚 **Multiplicateur** ×2 à ×100 (jusqu'à ×500 en bonus) qui va dans le **Panier** et multiplie le gain du tour ;
  - 🐤 **Poussin Wild** (joker) ;
  - 🧨 **Dynamite** : explosion 3×3, qui fêle les œufs voisins (**réaction en chaîne**).
- 4 **Granges** = **La Grange en Folie** : 10 tours gratuits, le **Panier ne se vide jamais** et multiplie chaque gain. 3 Granges = +5 tours.
- **Double Chance** (mise ×1,25) : bonus environ 1,5× plus fréquent.
- Gain max : **×10 000** la mise.

## Mathématiques (réglages `CONFIG` dans engine.js)
| Mesure | Valeur (simulation) |
|---|---|
| RTP | ≈ 96 % (± 1 %, jeu très volatil) |
| Fréquence de gain | ≈ 27 % |
| Répartition | ≈ 60 % jeu de base, ≈ 36 % bonus |
| Grange en Folie | ≈ 1 mise sur 257, gain moyen ≈ ×93 |
| Double Chance | RTP ≈ 96 %, bonus ≈ 1 mise sur 167 |

| Achat de bonus | Prix | RTP (simulation) |
|---|---|---|
| La Grange en Folie | 100× la mise | ≈ 96 % |
| Super Grange (œufs plus nombreux, multiplicateurs ×5 minimum) | 370× la mise | ≈ 96 % |

Mesurer : `node simulate.js 1000000 1`, `node simulate.js 1000000 1 --ante`, `node simulate.js --buy grange|super 20000`.
`payScale` règle le jeu de base, `fsPayScale` le bonus.

Crédits fictifs uniquement. Avant une vraie publication : résultats tirés par le serveur du casino (RGS), RTP vérifié sur des centaines de millions de tours puis certifié.
