#!/usr/bin/env node
/**
 * Script de génération des clés JWT pour Supabase
 * Usage: node generate-keys.js
 */

const crypto = require('crypto');

// Fonction pour générer un secret aléatoire
function generateSecret() {
  return crypto.randomBytes(32).toString('base64');
}

// Fonction pour créer un JWT simple (sans dépendance)
function createJWT(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${header}.${body}`);
  const signature = hmac.digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

console.log('\n🔐 Génération des clés pour HenrardVisuals Supabase\n');
console.log('='.repeat(60));

// 1. JWT Secret
const jwtSecret = generateSecret();
console.log('\n1️⃣  JWT_SECRET:');
console.log(jwtSecret);

// 2. Postgres Password
const postgresPassword = generateSecret();
console.log('\n2️⃣  POSTGRES_PASSWORD:');
console.log(postgresPassword);

// 3. Anon Key (JWT avec role anon, expire dans 10 ans)
const now = Math.floor(Date.now() / 1000);
const tenYears = 10 * 365 * 24 * 60 * 60;

const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: now,
  exp: now + tenYears
};

const anonKey = createJWT(anonPayload, jwtSecret);
console.log('\n3️⃣  ANON_KEY (pour le frontend et API publique):');
console.log(anonKey);

// 4. Service Role Key (JWT avec role service_role, expire dans 10 ans)
const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: now,
  exp: now + tenYears
};

const serviceKey = createJWT(servicePayload, jwtSecret);
console.log('\n4️⃣  SERVICE_ROLE_KEY (pour les opérations admin):');
console.log(serviceKey);

console.log('\n' + '='.repeat(60));
console.log('\n📋 Copier ces valeurs dans Coolify :\n');

console.log('Variables d\'environnement:');
console.log('-----------------------------------');
console.log(`POSTGRES_PASSWORD=${postgresPassword}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceKey}`);
console.log(`SITE_URL=https://henrardvisuals.com`);
console.log(`API_EXTERNAL_URL=https://api.henrardvisuals.com`);
console.log(`DISABLE_SIGNUP=false`);

console.log('\n\nBuild Arguments (service app uniquement):');
console.log('------------------------------------------');
console.log(`VITE_SUPABASE_URL=https://api.henrardvisuals.com`);
console.log(`VITE_SUPABASE_ANON_KEY=${anonKey}`);

console.log('\n\n⚠️  IMPORTANT:');
console.log('- Gardez ces clés secrètes et sécurisées');
console.log('- Ne les commitez JAMAIS dans Git');
console.log('- Utilisez uniquement ANON_KEY côté frontend');
console.log('- SERVICE_ROLE_KEY bypass toute sécurité RLS\n');
