#!/usr/bin/env node
/**
 * 부조록 라이선스 발급 도구 (Ed25519 오프라인 서명)
 *
 *   node scripts/gen-license.mjs init
 *     → licenses/keypair.json 생성(절대 커밋 금지, gitignore됨)
 *     → 공개키를 src/license/publicKey.ts 에 자동 기록
 *
 *   node scripts/gen-license.mjs issue --to 홍길동 [--plan lifetime|event] [--exp YYYY-MM-DD]
 *     → 라이선스 키 1개 출력 (기본 plan: lifetime)
 *
 * 키 포맷: BUJO-<base64url(JSON payload)>-<base64url(signature)>
 * payload = { product: "bujorok", plan, issuedTo?, exp?, iat }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEYPAIR_PATH = path.join(ROOT, 'licenses', 'keypair.json');
const PUBLIC_KEY_TS = path.join(ROOT, 'src', 'license', 'publicKey.ts');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function b64url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

function cmdInit(args) {
  if (fs.existsSync(KEYPAIR_PATH) && !args.force) {
    console.error(`⚠️  이미 키쌍이 존재합니다: ${KEYPAIR_PATH}`);
    console.error('   새로 만들면 기존에 발급한 모든 라이선스가 무효화됩니다.');
    console.error('   정말 새로 만들려면 --force 를 붙이세요.');
    process.exit(1);
  }
  const priv = ed.utils.randomPrivateKey();
  const pub = ed.getPublicKey(priv);
  const privHex = ed.etc.bytesToHex(priv);
  const pubHex = ed.etc.bytesToHex(pub);

  fs.mkdirSync(path.dirname(KEYPAIR_PATH), { recursive: true });
  fs.writeFileSync(
    KEYPAIR_PATH,
    JSON.stringify(
      { privateKeyHex: privHex, publicKeyHex: pubHex, createdAt: new Date().toISOString() },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(
    PUBLIC_KEY_TS,
    `// ⚠️ 이 파일은 \`node scripts/gen-license.mjs init\` 실행 시 자동으로 갱신됩니다.\n// 직접 수정하지 마세요.\nexport const LICENSE_PUBLIC_KEY_HEX =\n  '${pubHex}';\n`,
  );

  console.log('✅ 키쌍 생성 완료');
  console.log(`   비밀키: ${KEYPAIR_PATH}  ← 절대 커밋/공유 금지 (백업은 안전한 곳에)`);
  console.log(`   공개키: ${PUBLIC_KEY_TS} 에 기록됨`);
}

function cmdIssue(args) {
  if (!fs.existsSync(KEYPAIR_PATH)) {
    console.error('❌ 키쌍이 없습니다. 먼저 실행하세요: node scripts/gen-license.mjs init');
    process.exit(1);
  }
  const { privateKeyHex } = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
  const plan = args.plan ?? 'lifetime';
  if (plan !== 'lifetime' && plan !== 'event') {
    console.error('❌ --plan 은 lifetime 또는 event 여야 합니다.');
    process.exit(1);
  }
  if (args.exp && !/^\d{4}-\d{2}-\d{2}$/.test(args.exp)) {
    console.error('❌ --exp 형식은 YYYY-MM-DD 입니다.');
    process.exit(1);
  }

  const payload = {
    product: 'bujorok',
    plan,
    ...(typeof args.to === 'string' && args.to ? { issuedTo: args.to } : {}),
    ...(typeof args.exp === 'string' && args.exp ? { exp: args.exp } : {}),
    iat: new Date().toISOString().slice(0, 10),
  };

  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = ed.sign(new TextEncoder().encode(payloadB64), ed.etc.hexToBytes(privateKeyHex));
  const sigB64 = b64url(sig);
  if (sigB64.length !== 86) {
    console.error('❌ 내부 오류: 서명 길이가 예상과 다릅니다.');
    process.exit(1);
  }
  const key = `BUJO-${payloadB64}-${sigB64}`;

  // 자체 검증
  const { publicKeyHex } = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
  const ok = ed.verify(sig, new TextEncoder().encode(payloadB64), ed.etc.hexToBytes(publicKeyHex));
  if (!ok) {
    console.error('❌ 자체 검증 실패 — 키쌍을 확인하세요.');
    process.exit(1);
  }

  console.log('✅ 라이선스 발급 완료');
  console.log(`   플랜   : ${plan === 'lifetime' ? '평생권' : '행사 1회권'}`);
  if (payload.issuedTo) console.log(`   구매자 : ${payload.issuedTo}`);
  if (payload.exp) console.log(`   만료일 : ${payload.exp}`);
  console.log('');
  console.log(key);
}

const cmd = process.argv[2];
const args = parseArgs(process.argv.slice(3));

if (cmd === 'init') cmdInit(args);
else if (cmd === 'issue') cmdIssue(args);
else {
  console.log('사용법:');
  console.log('  node scripts/gen-license.mjs init [--force]');
  console.log('  node scripts/gen-license.mjs issue --to 홍길동 [--plan lifetime|event] [--exp YYYY-MM-DD]');
  process.exit(cmd ? 1 : 0);
}
