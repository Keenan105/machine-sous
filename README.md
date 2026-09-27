# ⚡ STORMBOUND — La Tempête des Anciens

Prototype jouable d'une machine à sous au thème de tempête fantastique (HTML/CSS/JS, sans dépendance).

**Lancer :** ouvrir `index.html` dans un navigateur, puis cliquer sur SPIN (ou appuyer sur Espace).

## Mécaniques
- **Grille 6×5, gains partout :** 8 symboles identiques ou plus. Les gagnants explosent et d'autres tombent en cascade.
- **Météo évolutive :** Pluie → Vent → Orage → Supercellule → Stormbound, avec des multiplicateurs de ×1 à ×3. Le visuel (pluie, vent, arbres, éclairs, cyclone, ciel déchaîné) et le son (pluie, vent, grondement, tonnerre) suivent le niveau.
- **Storm Charge :** ⚡ = +7, cascade = +3. Aux paliers 25/50/75, un événement aléatoire : Éclair, Rafale, Pluie torrentielle ou Œil du cyclone.
- **Eye of the Storm :** à 100, silence puis BOOM. L'œil pose des Storm Wilds collants pendant 3 cascades.
- **Gardien de la Tempête 🐉 :** il frappe une zone à chaque tour. Après 3 frappes, la zone devient une *zone de tempête* (plus de ⚡, plus de premiums, des Wilds).

Crédits fictifs uniquement. Pour tester depuis la console : `stormbound.state.charge = 99`.
