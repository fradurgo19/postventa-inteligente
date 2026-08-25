import fs from 'node:fs';
const s = fs.readFileSync('public/maps/colombia.svg', 'utf8');

function pathStart(id) {
  const re = new RegExp(`id="${id}"[\\s\\S]*?d="([^"]+)"`);
  const m = s.match(re);
  if (!m) return null;
  const d = m[1];
  const nums = d.match(/-?\d+\.?\d*/g)?.slice(0, 8);
  return nums;
}

for (const id of ['dc', 'ant', 'atl', 'vac', 'san', 'cor', 'cho', 'ama', 'lag', 'nar', 'nsa', 'met']) {
  console.log(id, pathStart(id));
}
