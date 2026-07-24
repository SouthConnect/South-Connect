#!/usr/bin/env tsx
/**
 * Vérification basique des secrets avant commit/push.
 *
 * Objectif :
 * - Empêcher d'ajouter au commit des fichiers sensibles (.env, etc.)
 * - Détecter quelques variables critiques (DATABASE_URL, SUPABASE_KEY, JWT_SECRET, etc.)
 *
 * Utilisation manuelle :
 *   npm run check:secrets
 *
 * Intégration recommandée :
 *   - Ajouter ce script dans un hook git (pre-commit ou pre-push)
 *   - Exemple de hook pre-push :
 *       #!/usr/bin/env sh
 *       npm run check:secrets
 */

import { execSync, execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import * as path from 'path';

function getRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

function getStagedFiles(diffFilter?: string): string[] {
  const filterFlag = diffFilter ? ` --diff-filter=${diffFilter}` : '';
  const output = execSync(`git diff --cached --name-only${filterFlag}`, { encoding: 'utf8' }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n').filter(Boolean);
}

const ZERO_SHA = '0000000000000000000000000000000000000000';

/**
 * En pre-push, git n'appelle PAS le hook avec des fichiers "indexés" — il écrit sur
 * stdin les refs poussées (`<local ref> <local sha> <remote ref> <remote sha>`).
 * `git diff --cached` (l'index) est vide à ce stade dans l'immense majorité des cas,
 * puisque les commits ont déjà été créés : se fier uniquement à l'index rendait ce
 * hook quasiment silencieux en pratique. On lit donc stdin quand disponible pour
 * calculer le vrai diff des commits en train d'être poussés.
 *
 * Retourne `null` si on n'est pas dans un contexte pre-push (pas de stdin exploitable,
 * ex: exécution manuelle via `npm run check:secrets`) — l'appelant doit alors se
 * rabattre sur l'index (comportement pre-commit).
 */
// stdin ne peut être lu qu'une fois : mémorisé pour que les appels successifs
// (fichiers modifiés, puis fichiers supprimés) réutilisent la même lecture.
let cachedStdin: string | null | undefined;

function readStdinOnce(): string | null {
  if (cachedStdin !== undefined) return cachedStdin;
  if (process.stdin.isTTY) {
    cachedStdin = null;
    return cachedStdin;
  }
  try {
    cachedStdin = readFileSync(0, 'utf8');
  } catch {
    cachedStdin = null;
  }
  return cachedStdin;
}

function getPushedFiles(diffFilter?: string): { files: string[]; localSha: string } | null {
  const raw = readStdinOnce();
  if (raw === null) return null;

  const refLines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s+/))
    .filter((parts) => parts.length === 4);

  if (refLines.length === 0) return null;

  const filterFlag = diffFilter ? ` --diff-filter=${diffFilter}` : '';
  const files = new Set<string>();
  let lastLocalSha = '';

  for (const [, localSha, , remoteSha] of refLines) {
    if (!localSha || localSha === ZERO_SHA) continue; // suppression de branche : rien à pousser
    lastLocalSha = localSha;

    try {
      let output: string;
      if (!remoteSha || remoteSha === ZERO_SHA) {
        // Nouvelle branche côté remote : tout l'arbre du commit local compte comme "nouveau"
        output = diffFilter
          ? ''
          : execSync(`git ls-tree -r --name-only ${localSha}`, { encoding: 'utf8' });
      } else {
        output = execSync(`git diff --name-only${filterFlag} ${remoteSha} ${localSha}`, {
          encoding: 'utf8',
        });
      }
      output
        .trim()
        .split('\n')
        .filter(Boolean)
        .forEach((f) => files.add(f));
    } catch {
      // sha inconnu localement ou autre souci : on ignore cette ref plutôt que de planter
      continue;
    }
  }

  return { files: Array.from(files), localSha: lastLocalSha };
}

/**
 * Combine le contexte pre-push (stdin) et l'index (pre-commit / usage manuel).
 * `readRef` indique où lire le contenu des fichiers : un SHA de commit (mode
 * push — on lit le contenu exact poussé, pas celui du disque), `':'` pour lire
 * l'index (mode staged), ou `null` pour se rabattre sur le disque.
 */
function getFilesToCheck(diffFilter?: string): { files: string[]; readRef: string | null } {
  const pushed = getPushedFiles(diffFilter);
  if (pushed !== null) return { files: pushed.files, readRef: pushed.localSha || null };
  return { files: getStagedFiles(diffFilter), readRef: ':' };
}

/** Lit le contenu d'un fichier tel qu'il existe à `ref` (commit ou index), avec repli sur le disque. */
function readFileAtRef(root: string, file: string, ref: string | null): string | null {
  if (ref) {
    try {
      return execFileSync('git', ['show', `${ref}:${file}`], {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 20,
        cwd: root,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      // Fichier binaire, absent à cette ref (ex: symlink), etc. — on retente depuis le disque.
    }
  }
  try {
    return readFileSync(path.join(root, file), 'utf8');
  } catch {
    return null;
  }
}

const PROTECTED_INFRA_FILES = [
  'D-fund/frontend/vercel.json',
  'D-fund/railway.toml',
  'D-fund/frontend/next.config.js',
  'D-fund/frontend/middleware.ts',
  'D-fund/prisma/schema.prisma',
  'D-fund/backend/src/main.ts',
];

function checkDeletedInfraFiles(deletedFiles: string[]): string[] {
  return deletedFiles
    .filter((f) => PROTECTED_INFRA_FILES.includes(f))
    .map((f) => `Suppression d'un fichier d'infrastructure protégé : ${f}\n    Confirmez explicitement cette suppression avec l'utilisateur avant de pusher.`);
}

function isEnvFile(filePath: string): boolean {
  const base = path.basename(filePath);
  return (
    base === '.env' ||
    base.startsWith('.env.') ||
    base.startsWith('.env_') ||
    base.endsWith('.env') ||
    base.match(/^\.?env(\..*)?$/) !== null
  );
}

function isTextFile(filePath: string): boolean {
  // Filtre simple basé sur l'extension
  const ext = path.extname(filePath).toLowerCase();
  const textExts = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.md',
    '.yml',
    '.yaml',
    '.sh',
    '.env',
    '.env.local',
  ];
  return textExts.includes(ext) || ext === '';
}

function containsSensitivePattern(content: string): { match: string; line: string } | null {
  const patterns = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'JWT_SECRET',
    'ACCESS_KEY_ID',
    'SECRET_ACCESS_KEY',
    'PRIVATE_KEY',
    'BEGIN RSA PRIVATE KEY',
    'PASSWORD=',
    'PASSWORD =',
    'PASSWORD:',
  ];

  // Connection string with an embedded credential, e.g. postgresql://user:pass@host
  const CREDENTIAL_URL = /:\/\/[^:\s'"/@]+:[^@\s'"]+@/;

  const isPlaceholderLine = (line: string): boolean => {
    const lower = line.toLowerCase();
    // Tolère clairement les valeurs d'exemple, mais uniquement sur la ligne
    // concernée — un "exemple" mentionné ailleurs dans le fichier ne doit pas
    // exempter tout le document (c'est ce qui a laissé passer un vrai mot de
    // passe Supabase pendant des mois).
    return (
      lower.includes('example') ||
      lower.includes('changeme') ||
      lower.includes('change-me') ||
      lower.includes('change-in-production') ||
      lower.includes('your-') ||
      lower.includes('xxx') ||
      /\[.*\]/.test(line) ||
      // Référence à une variable d'env/shell (${VAR} ou $VAR), pas une valeur en dur —
      // couvre aussi bien le TypeScript/JS que la syntaxe bash sans accolades.
      /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/.test(line)
    );
  };

  const lines = content.split('\n');
  for (const line of lines) {
    if (isPlaceholderLine(line)) continue;

    if (CREDENTIAL_URL.test(line)) {
      return { match: 'credential embarqué dans une URL', line: line.trim() };
    }

    for (const pat of patterns) {
      if (line.includes(pat)) {
        return { match: pat, line: line.trim() };
      }
    }
  }

  return null;
}

function main() {
  try {
    const root = getRepoRoot();
    const { files: filesToCheck, readRef } = getFilesToCheck();

    if (filesToCheck.length === 0) {
      console.log('Aucun fichier à vérifier (rien d’indexé, rien à pousser).');
      process.exit(0);
    }

    const problems: string[] = [];

    // Vérifier les suppressions de fichiers d'infrastructure protégés
    const deletedFiles = getFilesToCheck('D').files;
    problems.push(...checkDeletedInfraFiles(deletedFiles));

    for (const file of filesToCheck) {
      // 1) Bloquer explicitement les fichiers d'environnement
      if (isEnvFile(file)) {
        problems.push(`Fichier d'environnement détecté dans le commit: ${file}`);
        continue;
      }

      // 2) Scanner uniquement quelques types de fichiers texte
      if (!isTextFile(file)) {
        continue;
      }

      // Lit le contenu exact de la ref poussée/indexée plutôt que le disque, pour
      // ne pas dépendre de l'état du répertoire de travail au moment du check.
      const content = readFileAtRef(root, file, readRef);
      if (content === null) {
        // Fichier binaire / supprimé / non lisible à cette ref, on ignore
        continue;
      }

      const found = containsSensitivePattern(content);
      if (found) {
        problems.push(
          `Mot-clé sensible "${found.match}" trouvé dans ${file}\n    Ligne: ${found.line}`,
        );
      }
    }

    if (problems.length > 0) {
      console.error('\nBlocage du commit/push : des éléments sensibles ont été détectés.\n');
      for (const p of problems) {
        console.error(`- ${p}`);
      }
      console.error(
        '\nCorrigez / supprimez ces données sensibles (ou remplacez-les par des variables d’environnement) puis relancez la commande.',
      );
      process.exit(1);
    }

    console.log(`Vérification des secrets : OK (${filesToCheck.length} fichier(s) vérifié(s), rien de sensible détecté).`);
    process.exit(0);
  } catch (error: any) {
    console.error('Erreur lors de la vérification des secrets:', error.message || error);
    // En cas d’erreur technique, on préfère BLOQUER plutôt que laisser passer un secret.
    process.exit(1);
  }
}

main();

