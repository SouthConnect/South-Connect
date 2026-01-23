#!/usr/bin/env node

/**
 * Script de nettoyage - Supprime les anciens fichiers/dossiers à la racine
 * qui ont été déplacés dans frontend/
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('🧹 Nettoyage des anciens fichiers...\n');

// Fonction pour supprimer récursivement un dossier
function deleteDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteDir(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
    return true;
  }
  return false;
}

// Fonction pour supprimer un fichier
function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

let deleted = 0;

// Supprimer les dossiers
const dirsToDelete = ['app', 'components'];
dirsToDelete.forEach((dir) => {
  const dirPath = path.join(rootDir, dir);
  if (deleteDir(dirPath)) {
    console.log(`✅ Supprimé: ${dir}/`);
    deleted++;
  }
});

// Supprimer les fichiers
const filesToDelete = [
  'next.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  '.eslintrc.json',
  'package-lock.json',
];

filesToDelete.forEach((file) => {
  const filePath = path.join(rootDir, file);
  if (deleteFile(filePath)) {
    console.log(`✅ Supprimé: ${file}`);
    deleted++;
  }
});

// Vérifier tsconfig.json
const tsconfigPath = path.join(rootDir, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  const content = fs.readFileSync(tsconfigPath, 'utf8');
  if (content.includes('"name": "next"') || content.includes('"next"')) {
    if (deleteFile(tsconfigPath)) {
      console.log('✅ Supprimé: tsconfig.json (Next.js)');
      deleted++;
    }
  } else {
    console.log('ℹ️  Conservé: tsconfig.json (fichier partagé)');
  }
}

console.log(`\n✅ Nettoyage terminé ! ${deleted} élément(s) supprimé(s).\n`);

console.log('📁 Structure actuelle :');
console.log('  ✅ backend/     - API NestJS');
console.log('  ✅ frontend/    - Frontend Next.js');
console.log('  ✅ prisma/      - Schéma partagé');
console.log('  ✅ scripts/     - Scripts utilitaires\n');
