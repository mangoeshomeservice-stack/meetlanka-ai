// Generates MEET UP Windows icon and Electron window PNG using only Node built-ins.
// The Windows ICO contains a PNG-compressed 256x256 image.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const size = 256;
const pixels = Buffer.alloc(size * size * 4);
function blend(x, y, rgb, alpha) {
    if (x < 0 || y < 0 || x >= size || y >= size || alpha <= 0) return;
    const k = (y * size + x) * 4;
    const a = Math.min(1, alpha);
    for (let c = 0; c < 3; c++) pixels[k + c] = Math.round(pixels[k + c] * (1 - a) + rgb[c] * a);
    pixels[k + 3] = 255;
}
function stroke(ax, ay, bx, by, width, color1, color2) {
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len));
        const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
        if (d < width / 2 + 1) {
            const c = color1.map((v, i) => Math.round(v * (1 - t) + color2[i] * t));
            blend(x, y, c, Math.min(1, width / 2 + 1 - d));
        }
    }
}
function disk(cx, cy, radius, color) {
    for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(size - 1, cy + radius); y++)
        for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(size - 1, cx + radius); x++)
            blend(x, y, color, Math.min(1, radius - Math.hypot(x - cx, y - cy)));
}
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = (y * size + x) * 4;
    pixels[k] = 7 + Math.round(x / size * 10);
    pixels[k + 1] = 17 + Math.round(y / size * 11);
    pixels[k + 2] = 43 + Math.round(x / size * 32);
    pixels[k + 3] = 255;
}
stroke(48, 188, 48, 66, 26, [0, 202, 240], [38, 102, 255]);
stroke(48, 66, 126, 137, 26, [38, 102, 255], [86, 87, 255]);
stroke(126, 137, 204, 66, 26, [86, 87, 255], [209, 52, 241]);
stroke(204, 66, 204, 188, 26, [209, 52, 241], [153, 57, 245]);
stroke(48, 188, 126, 204, 8, [0, 219, 242], [18, 178, 255]);
stroke(126, 204, 204, 188, 8, [18, 178, 255], [75, 93, 255]);
disk(166, 141, 9, [255, 255, 255]);
disk(188, 129, 8, [255, 255, 255]);
stroke(156, 163, 166, 154, 7, [255, 255, 255], [255, 255, 255]);
stroke(166, 154, 176, 163, 7, [255, 255, 255], [255, 255, 255]);
const table = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t.push(c >>> 0); } return t; })();
function crc(buf) { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type); const n = Buffer.alloc(4); n.writeUInt32BE(data.length); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(Buffer.concat([name, data]))); return Buffer.concat([n, name, data, sum]); }
const raw = Buffer.alloc(size * (1 + size * 4));
for (let y = 0; y < size; y++) pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
const out = path.resolve(__dirname, '../resources');
fs.writeFileSync(path.join(out, 'icon.png'), png);
const icoHeader = Buffer.alloc(22); icoHeader.writeUInt16LE(1, 2); icoHeader.writeUInt16LE(1, 4); icoHeader[6] = 0; icoHeader[7] = 0; icoHeader.writeUInt16LE(1, 10); icoHeader.writeUInt16LE(32, 12); icoHeader.writeUInt32LE(png.length, 14); icoHeader.writeUInt32LE(22, 18);
fs.writeFileSync(path.join(out, 'icon.ico'), Buffer.concat([icoHeader, png]));
console.log('Generated MEET UP icon.png and icon.ico');
