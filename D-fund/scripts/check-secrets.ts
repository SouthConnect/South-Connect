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

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import * as path from 'path';

function getRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

function getStagedFiles(): string[] {
  const output = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n').filter(Boolean);
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
  ];

  const lower = content.toLowerCase();
  if (lower.includes('example') || lower.includes('changeme') || lower.includes('change-me')) {
    // On tolère clairement les valeurs d'exemple
    return null;
  }

  const lines = content.split('\n');
  for (const line of lines) {
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
    const stagedFiles = getStagedFiles();

    if (stagedFiles.length === 0) {
      console.log('Aucun fichier indexé pour le commit. Rien à vérifier.');
      process.exit(0);
    }

    const problems: string[] = [];

    for (const file of stagedFiles) {
      // 1) Bloquer explicitement les fichiers d'environnement
      if (isEnvFile(file)) {
        problems.push(`Fichier d'environnement détecté dans le commit: ${file}`);
        continue;
      }

      // 2) Scanner uniquement quelques types de fichiers texte
      if (!isTextFile(file)) {
        continue;
      }

      const absPath = path.join(root, file);
      let content: string;
      try {
        content = readFileSync(absPath, 'utf8');
      } catch {
        // Fichier binaire / non lisible, on ignore
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

    console.log('Vérification des secrets : OK (aucun élément sensible détecté dans les fichiers indexés).');
    process.exit(0);
  } catch (error: any) {
    console.error('Erreur lors de la vérification des secrets:', error.message || error);
    // En cas d’erreur technique, on préfère BLOQUER plutôt que laisser passer un secret.
    process.exit(1);
  }
}

main();

