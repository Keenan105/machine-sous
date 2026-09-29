# Prompt à copier-coller dans ChatGPT — fond et décor de COCO BOUM!

> Copie tout ce qui est sous la ligne dans ChatGPT (avec la génération d'images activée).
> Demande les images **une par une** et valide la première avant de faire les autres.
> Quand tu as les images, mets-les dans `coco-boum/img/` avec **exactement** les noms de fichiers indiqués : je les brancherai dans le jeu.

---

Tu es directeur artistique pour un jeu de casino en ligne en style **dessin animé**. Le jeu s'appelle **COCO BOUM! — La poule qui pond de la dynamite** : une poule blanche un peu folle, Coco, pond des œufs sur une grille de ferme, et certains œufs contiennent de la dynamite. J'ai besoin de toi pour **le fond et le décor**, en couches séparées pour faire un effet de profondeur (parallaxe).

## Style (le même pour toutes les images)
- Dessin animé cartoon, esprit cartoons des années 40–50 modernisés, **100 % original** (aucun personnage, logo ou marque existants).
- **Contours bruns très foncés et épais** (#2a1608), aplats de couleurs vives, ombrage simple en 2 tons maximum, petits reflets blancs.
- Formes rondes et gonflées, un peu de travers, qui ont l'air vivantes (collines qui « respirent », nuages bouffis, grange un peu penchée).
- Palette : ciel #3fb4ff → #b8ecff, herbe #6cc644 et #9be36b, rouge grange #e0452b, jaune #ffd23f, bois #c98a4b et #8a5528, crème #fff4dc.
- **Aucun texte** dans les images de décor.

## Contrainte importante : la zone du jeu
Au **centre** de l'écran se trouve la grille du jeu (un grand panneau en bois d'environ 50 % de la largeur et 75 % de la hauteur). Le décor doit rester **calme et moins détaillé au centre** pour ne pas gêner la lecture, et mettre les éléments intéressants **sur les côtés et en bas**. À gauche de la grille se trouve Coco et son Panier ; à droite, des boutons en bois.

## Formats
- PNG, **1920×1080** pour ordinateur ; refais ensuite chaque image en **1080×1920** pour téléphone (dans ce cas, garde le centre libre sur la hauteur de 30 % à 75 %).
- Les couches marquées « transparent » doivent avoir un **fond transparent**.

## Les images à créer

### 1. Décor du jeu normal (ferme en plein jour)
- `bg-sky.png` : ciel dégradé bleu, soleil souriant en haut à droite avec des rayons en éventail, quelques oiseaux au loin. (fond plein)
- `bg-far.png` (transparent) : collines lointaines vert clair, une grange rouge minuscule à l'horizon, un moulin à vent à gauche (les pales sur une image séparée : `bg-mill-blades.png`, transparent, centrées, pour que je les fasse tourner).
- `bg-mid.png` (transparent) : collines plus proches, champ de maïs sur la droite, une mare avec un canard à gauche, un chemin de terre qui serpente.
- `bg-front.png` (transparent) : premier plan en bas de l'image : herbe haute, clôture en bois, bottes de foin, fleurs, un épouvantail rigolo dans le coin droit, un seau renversé.
- `bg-clouds.png` (transparent) : 4 nuages cartoon bouffis séparés, bien espacés, que je ferai défiler.

### 2. Un décor par bonus (même composition, ambiance différente)
Pour chacun : `sky`, `far`, `mid` et `front`, avec le nom du bonus dans le fichier (exemple : `bg-chicks-sky.png`).
- **Poussins en Folie** (`chicks`) : fin d'après-midi orange et jaune, des dizaines de poussins à lunettes de soleil qui descendent en parachute dans le ciel.
- **Nid Collant** (`sticky`) : ciel rose bonbon et lilas, nids de paille géants posés sur les collines, œufs géants, petites bulles de miel collantes.
- **Pluie de Dynamite** (`dynamite`) : nuit rouge et violette, grosses explosions cartoon au loin (champignons de fumée), cratères fumants dans les champs, étincelles.
- **La Grange en Folie** (`grange`) : coucher de soleil violet et orange, la grange fait la fête : guirlandes de lampions, feux d'artifice, animaux qui dansent en silhouette.
- **Super Grange** (`super`) : nuit étoilée bleu foncé, grange dorée qui brille, pluie d'œufs d'or, aurores dorées dans le ciel.

### 3. Le cadre de la grille
- `frame.png` (transparent, 1400×1200) : un grand cadre en **planches de bois clouées**, avec des poteaux de clôture aux 4 coins, du foin qui dépasse, un nid avec un œuf posé sur le coin en haut à droite, et une petite pancarte vide en haut au centre. L'intérieur du cadre est **vide et transparent** (c'est là que vont les symboles), avec une bordure intérieure nette.
- `cell.png` (512×512) : une case de la grille : une planchette crème légèrement texturée, coins arrondis, très sobre.

### 4. Petits éléments animés (transparent, 512×512 chacun)
- `deco-butterfly.png` : papillon cartoon (ailes ouvertes).
- `deco-bee.png` : abeille rigolote.
- `deco-worm.png` : ver de terre qui sort d'un trou et fait coucou.
- `deco-feather.png` : plume blanche de poule, pour les pluies de plumes.

## Pour chaque image, donne-moi aussi
- 2 lignes de description du mouvement que tu imagines (exemple : « les nuages défilent lentement vers la droite, le soleil tourne sur lui-même en 40 secondes ») ;
- les couleurs principales utilisées (codes hexadécimaux).

## Ordre de travail
Commence par `bg-sky.png` et `bg-front.png` du jeu normal, puis attends ma validation du style avant de continuer.
