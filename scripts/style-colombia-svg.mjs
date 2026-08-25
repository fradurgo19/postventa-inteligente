import fs from 'node:fs';

let s = fs.readFileSync('public/maps/colombia.svg', 'utf8');
if (!s.includes('fill="#e8eef5"')) {
  s = s.replace(
    '<svg\n\txmlns="http://www.w3.org/2000/svg"\n\tviewBox="0 0 613 694"\n\taria-label="Map of Colombia"\n>',
    `<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 613 694"
	aria-label="Map of Colombia"
	fill="#dbe4ee"
	stroke="#64748b"
	stroke-width="0.65"
>`
  );
  fs.writeFileSync('public/maps/colombia.svg', s);
}
console.log('styled');
