# Rôle `support` — changements Supabase nécessaires

> ⚠️ Ce document décrit les changements à faire **côté Supabase**. Rien n'a été exécuté.
> Le travail front-end (branche `claude/sweet-rubin-ab2twa`) est terminé et fonctionnel,
> mais un compte `support` ne sera réellement utilisable qu'une fois ces étapes faites.

## Contexte

Le front-end gère désormais un rôle `support` qui :
- accède à toutes les pages et fonctions **admin** (planning, interventions, statuts, logements, prestataires, coordination) ;
- ne voit **aucun chiffre financier** (marge, gain total, prix prestataire, prix client, blanchisserie) ;
- est **créé manuellement** uniquement (pas d'auto-inscription, comme `admin`).

Le masquage financier est **front-end uniquement**. Voir la section « Sécurité » plus bas.

---

## 1. Ajouter `support` à l'enum / contrainte du champ `role`

La colonne `profiles.role` doit accepter la valeur `'support'`.

**Si `role` est un type enum PostgreSQL** (ex. `user_role`) :
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'support';
```
> Note : `ADD VALUE` ne peut pas être exécuté dans un bloc transactionnel avec d'autres
> commandes, et la nouvelle valeur n'est pas utilisable dans la même transaction.

**Si `role` est une colonne `text` avec une contrainte `CHECK`** :
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'support', 'client', 'prestataire'));
```

> ❓ À vérifier : le type réel de `profiles.role` (enum vs text+check) avant d'appliquer.
> Vérifier aussi la fonction RPC `get_user_role` si elle contraint/valide les rôles.

---

## 2. Accès RLS opérationnels pour `support`

Objectif : `support` doit avoir **les mêmes accès opérationnels que `admin`** sur les
tables, à l'exception (idéalement) des colonnes financières (voir Sécurité).

Pour chaque policy actuellement réservée à `admin`, ajouter `support`. Exemple générique
(à adapter au nommage réel des policies) :

```sql
-- Avant (exemple) :
-- USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' )

-- Après : autoriser admin ET support
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'support') )
```

Tables concernées (à recouper avec les policies existantes) :
- `interventions` — SELECT / INSERT / UPDATE / DELETE (planning, statuts, attribution)
- `logements` — SELECT / INSERT / UPDATE
- `profiles` — SELECT des clients et prestataires (coordination)
- toute table liée au planning / aux missions

> ⚠️ Si une policy admin utilise un helper du type `is_admin()`, créer/adapter un helper
> `is_staff()` qui renvoie vrai pour `admin` OU `support`, et l'utiliser dans les policies
> opérationnelles — plus maintenable que dupliquer la condition partout.

---

## 3. Confidentialité des chiffres financiers (RLS / vues)

Le masquage actuel est **front-end uniquement** : les colonnes financières
(`prix_prestataire_ht`, `prix_client_ttc`, `prix_blanchisserie`, et toute marge/gain
calculée) sont toujours renvoyées par l'API si la RLS les autorise. Un compte `support`
techniquement averti pourrait les lire via les requêtes réseau.

Si la confidentialité des montants est **critique**, prévoir l'une de ces options
(décision métier, hors périmètre front) :
- **Vues dédiées** sans les colonnes de prix, exposées au rôle `support`, le front
  `support` lisant ces vues plutôt que les tables brutes ;
- **Column-level privileges** / RLS masquant les colonnes financières pour `support` ;
- accepter le masquage front-only comme suffisant (si le risque est jugé acceptable).

> Tel quel (sans cette étape), l'UI ne montre aucun chiffre à support, mais la donnée
> reste accessible via l'API. À trancher.

---

## 4. Création manuelle des comptes `support`

Comme `admin`, aucun parcours d'auto-inscription (le `signUp` front rejette `admin` et
`support`). Créer un compte support manuellement :

1. **Créer l'utilisateur** (Dashboard Supabase → Authentication → Add user, ou Admin API).
2. **Créer / mettre à jour la ligne `profiles`** correspondante avec `role = 'support'` :
   ```sql
   UPDATE profiles SET role = 'support' WHERE id = '<user-uuid>';
   -- ou INSERT si le trigger de création de profil ne s'en charge pas
   ```
3. Vérifier que le trigger éventuel `handle_new_user` (qui copie `role` depuis les
   metadata d'inscription) n'écrase pas la valeur — pour un compte créé manuellement,
   fixer `role` directement en base.

---

## Checklist de validation après application

- [ ] `profiles.role` accepte `'support'` (insert de test OK)
- [ ] Un compte `support` peut lire/écrire les interventions, logements, planning
- [ ] Un compte `support` ne peut PAS faire ce qui est réservé à `admin` au-delà de l'opérationnel (si distinction voulue)
- [ ] (Si confidentialité critique) les colonnes financières ne sont pas renvoyées à `support`
- [ ] Aucun parcours d'auto-inscription ne permet de créer un `support`
