// 生成密码哈希的工具脚本
// 使用方法：node scripts/generatePasswordHash.js <你的密码>

const crypto = require('crypto');

const password = process.argv[2];

if (!password) {
  console.error('请提供密码作为参数');
  console.log('使用方法: node scripts/generatePasswordHash.js <你的密码>');
  process.exit(1);
}

// 使用 SHA-256 哈希（与前端 authService.ts 中的逻辑一致）
const hash = crypto.createHash('sha256').update(password).digest('hex');

console.log('\n密码:', password);
console.log('SHA-256 哈希值:', hash);
console.log('\n在 Supabase 中执行以下 SQL:');
console.log(`INSERT INTO public.users (username, password_hash, role) VALUES ('ygfitness', '${hash}', 'admin');`);
console.log('\n或者更新现有用户:');
console.log(`UPDATE public.users SET password_hash = '${hash}' WHERE username = 'ygfitness';`);
