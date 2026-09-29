# Prompt à copier-coller dans ChatGPT — animations de COCO BOUM!

> Copie tout ce qui se trouve sous la ligne dans ChatGPT. Demande-lui les éléments **un par un**
> (« commence par le n° 1 »), sinon il fera tout en vitesse. Tu peux lui renvoyer ses images en lui disant
> « même style, maintenant le n° X » pour garder le même dessin d'un élément à l'autre.

---

Tu es directeur artistique et animateur 2D pour une machine à sous en ligne (casino type Stake). Le jeu s'appelle **COCO BOUM! — La poule qui pond de la dynamite**. J'ai déjà le moteur du jeu (HTML/CSS/JavaScript). J'ai besoin de toi pour **toutes les images et animations**.

## Style obligatoire (le même pour tout)
- **Dessin animé cartoon** façon cartoons américains des années 40–50 modernisés (esprit Looney Tunes / Cuphead, mais 100 % original : aucun personnage, logo ou marque existants).
- Contours noirs épais (couleur #2a1608), couleurs vives et saturées, ombrage en aplats (2 tons maximum), petit reflet blanc sur les volumes.
- Personnages avec de grands yeux expressifs, **squash & stretch** marqué dans toutes les animations, rebonds exagérés.
- Palette : ciel bleu #5ec8ff, herbe #7ed957, rouge grange #e0452b, jaune poussin #ffd23f, crème œuf #fff4dc, orange renard #ff8a1f.
- Onomatopées de BD en police très grasse et arrondie : « BOUM! », « CRAC! », « POP! », « COT COT! ».

## Formats à livrer
- Symboles : **PNG ou WebP carré 512×512, fond transparent**, sujet centré avec 8 % de marge.
- Animations : **feuille de sprites (sprite sheet)** PNG transparente, cases de 512×512 alignées sur une ligne, **12 images par seconde**, en indiquant le nombre d'images. Si tu ne peux pas produire de sprite sheet, donne les images clés (début, milieu, fin) et décris précisément le mouvement pour que je l'anime en CSS.
- Décors : 1920×1080 (paysage) et 1080×1920 (mobile).
- Pour chaque élément, donne aussi le **code CSS @keyframes** qui correspond à l'animation (durées en millisecondes, courbes d'accélération).

## Le jeu (pour que tu comprennes ce que tu dessines)
- Grille de **7 colonnes × 6 lignes**, posée dans un cadre en planches de bois clouées, comme une clôture de ferme.
- On gagne avec des **grappes de 5 symboles identiques ou plus** qui se touchent. Les grappes explosent, les symboles au-dessus tombent et de nouveaux arrivent du haut (dégringolade).
- **Coco**, une poule blanche un peu folle avec une crête rouge, est la mascotte. Elle pond des **œufs** sur la grille.
- Un **œuf** se fêle à chaque fois qu'une grappe gagnante explose à côté de lui (1 à 3 coups). Quand il éclot, il donne :
  1. un **multiplicateur** (×2 à ×500) qui s'envole dans le **Panier** de Coco ;
  2. un **Poussin Wild** (joker) ;
  3. un bâton de **dynamite** qui explose en 3×3 (et fêle les œufs voisins : réaction en chaîne).
- Il y a **5 bonus** (tours gratuits), achetables à 10×, 20×, 50×, 100× et 200× la mise :
  1. **Poussins en Folie** (10×) : des Poussins Wild sautent sur la grille à chaque tour.
  2. **Nid Collant** (20×) : les œufs restent collés dans des nids de paille d'un tour à l'autre.
  3. **Pluie de Dynamite** (50×) : Coco lance des bâtons de dynamite sur la grille au début de chaque tour.
  4. **La Grange en Folie** (100×, ou 4 Granges) : le Panier ne se vide plus et multiplie chaque gain.
  5. **Super Grange** (200×, ou 5 Granges) : œufs dorés en pagaille, multiplicateurs ×5 minimum.

## Liste de tout ce qu'il faut créer

### A. Symboles (image fixe + animation de victoire en boucle de 1 s + animation d'explosion « POP » de 0,4 s)
1. **Maïs** : épi jaune avec petite frimousse souriante, feuilles vertes.
2. **Carotte** : carotte orange joyeuse, fanes vertes.
3. **Pomme** : pomme rouge brillante, feuille, clin d'œil.
4. **Mouton** : tête de mouton toute ronde en laine, air endormi.
5. **Cochon** : tête de cochon rose, gros groin, joues rouges.
6. **Vache** : tête de vache blanche à taches noires, museau rose, cloche.
7. **Renard** (meilleur symbole) : renard rusé, sourire en coin, sourcil levé.
8. **Poussin Wild** : poussin jaune qui sort d'une coquille, lunettes de soleil, bandeau « WILD ». Animation d'apparition : la coquille saute, le poussin fait « TADAA ».
9. **Grange (bonus)** : grange rouge aux portes blanches en X, étoiles autour, bandeau « BONUS ». Animation : les portes s'ouvrent et une lumière dorée sort.

### B. Les œufs (le cœur du jeu)
10. **Œuf intact** : œuf crème tacheté, légère lueur dorée, petit balancement en boucle.
11. **Œuf fêlé 1 fois** puis **fêlé 2 fois** (fissures de plus en plus grandes, l'œuf transpire, yeux inquiets qui sortent par la fissure).
12. **Animation « CRAC! »** : l'œuf tremble, se fissure, onomatopée « CRAC! » (0,5 s).
13. **Éclosion multiplicateur** : la coquille éclate en deux, un médaillon doré en étoile avec « ×N » jaillit (fais un médaillon vierge + des versions pour ×2, ×5, ×10, ×25, ×50, ×100, ×250, ×500, de plus en plus spectaculaires). Le médaillon s'envole ensuite en arc vers le Panier.
14. **Éclosion poussin** : nuage de fumée « POF! », le Poussin Wild apparaît en rebondissant.
15. **Éclosion dynamite** : un bâton de dynamite rouge avec une mèche qui crépite (0,6 s), puis grosse explosion cartoon « BOUM! » en champignon avec plumes, étoiles et fumée (0,8 s), le tout couvrant 3×3 cases.

### C. Coco la poule (mascotte, à gauche de la grille, grande taille ≈ 800×1000)
16. **Repos** en boucle : respire, cligne des yeux, tourne la tête.
17. **Gain** : saute de joie, ailes en l'air, « COT COT! ».
18. **Ponte** : Coco traverse le haut de la grille en courant (vue de profil), les pattes en roue de dessin animé, et pond 2 à 4 œufs qui tombent dans la grille.
19. **Stress** : quand une dynamite s'allume, elle se cache les yeux avec ses ailes.
20. **Méga gain** : elle danse avec des lunettes de soleil et des pièces qui pleuvent.

### D. Interface
21. **Logo « COCO BOUM! »** : lettres gonflées jaunes et rouges, contour noir épais, une dynamite allumée à la place du « i » ou en décor, Coco qui dépasse du logo.
22. **Le Panier** : panier en osier rempli d'œufs dorés, affichant « ×N » ; animation quand un multiplicateur arrive dedans (le panier rebondit, étincelles).
23. **Bouton SPIN** : gros bouton rond en forme d'œuf avec une flèche circulaire, états normal / survol / appuyé / désactivé.
24. **Boutons** : + / − mise, Auto, Turbo, Son, Acheter le bonus (panneaux en bois cartoon).
25. **Cadre de grille** : planches de bois clouées, poteaux de clôture aux coins, un peu de foin qui dépasse.

### E. Décors
26. **Décor jeu de base** : ferme en plein jour, collines vertes, soleil souriant, nuages qui défilent, grange au loin, moulin à vent qui tourne (couches séparées pour un effet de parallaxe).
27. **Décor tours gratuits** : la même ferme au coucher de soleil orange et violet, lampions, feu d'artifice, ambiance fête.

### E bis. Les 5 bonus (pour chacun : une icône 512×512, un décor de ciel, un écran d'introduction)
27a. **Poussins en Folie** : ciel orange de fin d'après-midi, une armée de poussins à lunettes qui sautent en parachute.
27b. **Nid Collant** : ciel rose bonbon, nids de paille avec des œufs, animation d'un œuf qui se « colle » dans son nid (petit « SPLOUCH »).
27c. **Pluie de Dynamite** : nuit rouge, Coco en casque de chantier lance des bâtons de dynamite qui tombent en tournoyant sur la grille.
27d. **La Grange en Folie** : coucher de soleil violet et orange, la grange fait la fête (lampions, feux d'artifice).
27e. **Super Grange** : nuit étoilée bleu foncé et or, grange dorée, œufs d'or qui brillent.
27f. **Écran d'achat des bonus** : 5 panneaux en bois côte à côte avec un prix cloué (10×, 20×, 50×, 100×, 200×), du plus simple au plus luxueux.

### F. Grands moments
28. **Déclenchement du bonus** : les Granges brillent, zoom, les portes d'une géante grange s'ouvrent sur l'écran, texte « LA GRANGE EN FOLIE! — 10 TOURS GRATUITS ».
29. **Relance** : « +5 TOURS! » qui tombe comme une enclume.
30. **Écrans de gros gains** (texte + animation, de plus en plus fous) : « GROS GAIN! » (×20), « MÉGA GAIN! » (×50), « ÉNORME! » (×100), « COCO-LOSSAL! » (×500), et **« BOUM MAXIMUM ×10 000 »**. Pluie de pièces, de plumes et d'œufs dorés, compteur qui défile.
31. **Fin du bonus** : panneau en bois « TOTAL GAGNÉ » avec Coco qui salue.

## Ordre de travail
Commence par : n° 21 (logo), puis n° 16 (Coco au repos) et le n° 10 (œuf), pour valider le style avec moi avant de faire le reste. Après chaque élément, attends ma validation.
