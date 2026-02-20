

# Correction des `release_order` dupliques

## Probleme

Trois pays de saison 1 partagent le meme `release_order` que des pays de saison 0 :

| release_order | Saison 0 | Saison 1 |
|--------------|----------|----------|
| 2 | FR | BR |
| 3 | EG | CN |
| 5 | JP | IN |

Cela provoque 8 pays FREE au lieu de 5 (le seuil `FREE_THRESHOLD = 5` inclut les doublons).

## Correction

Mettre a jour les `release_order` des 3 pays de saison 1 concernes pour qu'ils aient des valeurs uniques, en les placant apres les 5 pays gratuits :

| Pays | Ancien release_order | Nouveau release_order |
|------|---------------------|----------------------|
| BR (Bresil) | 2 | 6 |
| CN (Chine) | 3 | 7 |
| IN (Inde) | 5 | 8 |

Les pays suivants (ES=8, GR=9, ...) seront decales de +3 pour maintenir l'ordre sequentiel sans collision.

## Impact

- L'onglet PAYS affichera correctement 5 FREE, 45 AGENT, 145 DIRECTOR
- Les scores et tiers seront coherents
- Aucun changement de code necessaire, seulement une mise a jour de donnees dans la table `countries`

## Fichier modifie

| Action | Detail |
|--------|--------|
| UPDATE SQL | Corriger `release_order` pour BR, CN, IN et decaler les pays suivants |

