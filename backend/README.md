# TaskFlow - Backend API (Node.js + Express + TypeScript)

API REST pour l'application de gestion de tâches **TaskFlow**, conçue selon l'architecture hybride définie dans le cahier des charges fonctionnel et technique.

---

## 🛠️ Stack Technique

- **Runtime** : Node.js (>= 18)
- **Framework** : Express.js
- **Langage** : TypeScript
- **Authentification** : JWT (JSON Web Tokens) & hachage de mot de passe avec Bcrypt
- **Déploiement Cloud** : Railway

---

## 🚀 Endpoints de l'API

### Authentification (`/api/auth`)
| Méthode | Route | Description | Accès |
|---|---|---|---|
| `POST` | `/api/auth/register` | Inscription d'un utilisateur | Public |
| `POST` | `/api/auth/login` | Connexion utilisateur (renvoie le token JWT) | Public |
| `GET` | `/api/auth/me` | Profil de l'utilisateur connecté | Privé (Bearer Token) |

### Gestion des Tâches (`/api/tasks`)
| Méthode | Route | Description | Accès |
|---|---|---|---|
| `GET` | `/api/tasks` | Liste des tâches de l'utilisateur connecté | Privé |
| `GET` | `/api/tasks/:id` | Détail d'une tâche précise | Privé |
| `POST` | `/api/tasks` | Créer une nouvelle tâche | Privé |
| `PUT` | `/api/tasks/:id` | Mettre à jour une tâche | Privé |
| `DELETE` | `/api/tasks/:id` | Supprimer une tâche | Privé |

### Diagnostic & Santé
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/` | Informations et statut du serveur |
| `GET` | `/api/health` | Diagnostic de l'API et de la connexion au service de données |

---

## ⚙️ Variables d'environnement

Copiez `.env.example` vers `.env` :

```bash
PORT=5000
JWT_SECRET=votre_cle_secrete_jwt
JWT_EXPIRES_IN=24h
GATEWAY_URL=https://votre-tunnel.trycloudflare.com
GATEWAY_SECRET=taskflow_shared_secret_2026
FRONTEND_URL=*
```

---

## 💻 Démarrage en local

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement (avec rechargement automatique)
npm run dev

# Compilation TypeScript
npm run build

# Démarrage en production
npm start
```
