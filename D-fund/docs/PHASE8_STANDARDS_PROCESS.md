# Phase 8 — Standards & process

##   Conventions de nommage

### Fichiers
- **Backend** : `kebab-case.ts` (ex: `auth.service.ts`)
- **Frontend** : `PascalCase.tsx` pour composants (ex: `UserCard.tsx`)
- **Types** : `PascalCase.ts` (ex: `User.types.ts`)

### Variables & Functions
- **camelCase** : `getUserById`, `userId`
- **Constants** : `UPPER_SNAKE_CASE` : `MAX_FILE_SIZE`

### Classes & Interfaces
- **PascalCase** : `UserService`, `CreateUserDto`

### Database
- **snake_case** pour tables : `bto_c_profiles`
- **camelCase** pour champs Prisma : `userId`, `createdAt`

---

##   Structure repo

```
D-fund/
├── backend/
│   ├── src/
│   │   ├── modules/          # Modules métier
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── dto/
│   │   │   │   └── guards/
│   │   │   └── ...
│   │   ├── common/           # Utilitaires partagés
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   └── interceptors/
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── test/                 # Tests
│   └── package.json
│
├── app/                      # Frontend
│   ├── app/                  # Pages Next.js
│   ├── components/           # Composants React
│   ├── lib/                  # Utilitaires
│   ├── hooks/                # Custom hooks
│   └── types/                # Types TypeScript
│
├── docs/                     # Documentation
├── scripts/                  # Scripts utilitaires
└── README.md
```

---

##   Règles de commit

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage (pas de changement de code)
- `refactor` : Refactoring
- `test` : Ajout/modification de tests
- `chore` : Tâches de maintenance

### Exemples
```
feat(auth): add JWT authentication
fix(opportunities): correct status update bug
docs(readme): update installation instructions
refactor(users): simplify profile creation
```

---

## 👀 Règles de review

### Avant de merger
1.   Code review par au moins 1 personne
2.   Tests passent (si disponibles)
3.   Pas de conflits
4.   Linter passe
5.   Documentation mise à jour si nécessaire

### Checklist review
- [ ] Code respecte les conventions
- [ ] Pas de code commenté/debug
- [ ] Gestion d'erreurs appropriée
- [ ] Pas de secrets dans le code
- [ ] Performance acceptable
- [ ] Sécurité vérifiée

---

##   Documentation minimale obligatoire

### Pour chaque module backend
1. **README.md** dans le module (optionnel mais recommandé)
2. **DTOs documentés** avec JSDoc si complexe
3. **Endpoints documentés** (Swagger/OpenAPI - futur)

### Pour chaque feature frontend
1. **Composant documenté** avec PropTypes ou TypeScript
2. **Hooks documentés** si logique complexe

### Documentation globale
1.   **README.md** principal
2.   **ARCHITECTURE.md**
3.   **SUPABASE_SETUP.md**
4.   **ROADMAP_VALIDATION.md**
5.   **API_DOCUMENTATION.md** (futur - Swagger)

---


##   Actions requises

1. **Configurer ESLint/Prettier** pour backend et frontend
2. **Créer les templates** de PR et commit
3. **Configurer pre-commit hooks** (optionnel)

