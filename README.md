# Encore

Un site de recommandations musicales, pensé comme un carnet personnel : une reco à la fois, une cover qui se retourne au scroll, et le lecteur à portée de clic.

**Démo :** https://encore.jdelrosso-contact.workers.dev/

## Fonctionnalités

**Côté visiteur**
- Une seule reco affichée à la fois : la cover au centre se retourne en 3D au scroll et devient une carte avec la description et les lecteurs.
- Fond qui s'adapte aux couleurs de la cover, avec une transition douce.
- Lecteurs intégrés Spotify, Deezer et Apple Music, chargés uniquement au clic.
- Menu burger avec la liste de toutes les recos et une recherche sur le titre et l'artiste, sans tenir compte des accents.
- Bouton aléatoire avec animation, flèches du clavier pour naviguer, compteur de position.
- Liens partageables : `/?reco=ID` ouvre directement une reco.
- Thème sombre forcé, palette sable et charbon.

**Côté admin** (`/admin`, aucun lien sur le site)
- Connexion par email et mot de passe.
- Ajout, modification et suppression de recos depuis une modale.
- Upload de la cover, avec nettoyage de l'ancienne image lors d'un remplacement ou d'une suppression.
- Recherche dans la liste des recos.

## Stack

| Rôle | Outil |
|---|---|
| Front | Vue 3, Vite, Vue Router, Pinia |
| UI | Nuxt UI (sans Nuxt) et Tailwind CSS v4 |
| Back | Supabase (Postgres, Auth, Storage) |
| Hébergement | Cloudflare (Workers, assets statiques) |

Il n'y a pas de serveur à maintenir : le front parle directement à Supabase, et les droits d'écriture sont verrouillés par les règles RLS de la base.

## Installation

Prérequis : **Node.js 22.12 ou plus** (ou 20.19 ou plus) et un projet Supabase.

```bash
git clone https://github.com/jdel-ros/Reco.git
cd Reco/reco-V1
npm install
```

Crée un fichier `.env.local` à la racine de `reco-V1` :

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_KEY=ta_cle_publique
```

L'URL s'arrête à `.supabase.co`, sans `/` ni `/rest/v1`. N'utilise que la clé publique (`anon` ou `publishable`), jamais la clé `service_role`.

```bash
npm run dev
```

Le site tourne sur `http://localhost:5173`.

## Configuration Supabase

Dans le **SQL Editor**, remplace `ton-email@exemple.com` par l'email de ton compte admin, puis exécute :

```sql
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  cover_url text,
  description text,
  type text not null default 'track' check (type in ('track','album','playlist')),
  spotify_url text,
  deezer_url text,
  apple_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.recommendations enable row level security;

create policy "Lecture publique"
  on public.recommendations for select
  using (true);

create policy "Admin ecriture"
  on public.recommendations for all
  to authenticated
  using ((select auth.jwt() ->> 'email') = 'ton-email@exemple.com')
  with check ((select auth.jwt() ->> 'email') = 'ton-email@exemple.com');

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true);

create policy "Covers lecture publique"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "Covers admin ecriture"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'covers' and (select auth.jwt() ->> 'email') = 'ton-email@exemple.com')
  with check (bucket_id = 'covers' and (select auth.jwt() ->> 'email') = 'ton-email@exemple.com');
```

Ensuite :
1. **Authentication > Users** : crée ton utilisateur admin, avec l'auto-confirmation cochée.
2. **Authentication > Sign In / Providers** : désactive **Allow new users to sign up**, pour que personne d'autre ne puisse créer de compte.

## Utiliser l'admin

Va sur `/admin` et connecte-toi. Pour chaque reco, renseigne le titre, l'artiste, la description, le type, la cover et les liens des plateformes (tous optionnels, seuls les boutons des liens renseignés s'affichent).

Pour que le lecteur s'intègre, colle le lien **complet** de la page :
- **Spotify** : `https://open.spotify.com/track/ID` (les liens avec `intl-fr` ou `?si=` fonctionnent aussi)
- **Deezer** : `https://www.deezer.com/fr/track/ID`. Les liens courts `link.deezer.com/s/...` ne sont pas intégrables : ouvre-les dans le navigateur et copie l'adresse finale. Le bouton les ouvre quand même dans un nouvel onglet.
- **Apple Music** : `https://music.apple.com/...`

## Structure

```
reco-V1/
├── public/                 favicon
├── src/
│   ├── assets/main.css     thème Tailwind, palette et variables
│   ├── components/         RecoModal, FloatInput, FloatTextarea
│   ├── lib/                supabase.js, covers.js, palette.js
│   ├── router/             routes et garde d'authentification
│   ├── stores/auth.js      état de connexion (Pinia)
│   └── views/              HomeView, AdminLoginView, AdminDashboardView
├── wrangler.jsonc          configuration Cloudflare
└── vite.config.js
```

## Déploiement (Cloudflare)

Le site est déployé depuis GitHub : chaque `git push` sur `main` relance le build.

Réglages du projet Cloudflare :
- **Chemin d'accès** : `reco-V1`
- **Commande de build** : `npm run build`
- **Commande de déploiement** : `npx wrangler deploy`
- **Variables de build** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` et `NODE_VERSION=22`

Le fichier `wrangler.jsonc` sert le dossier `dist` et renvoie `index.html` pour les routes inconnues, ce qui permet de recharger `/admin` ou un lien `?reco=` sans erreur 404.

Les recos ajoutées depuis l'admin n'ont pas besoin de nouveau build : elles sont lues directement dans Supabase.

## Sécurité

- Les clés présentes dans le front sont publiques par conception. Seules les règles RLS protègent l'écriture, donc ne les supprime pas.
- `.env.local` est ignoré par Git et ne doit jamais être commité.
- Le routeur ne fait que rediriger vers la page de connexion. Le vrai verrou est côté base de données.
