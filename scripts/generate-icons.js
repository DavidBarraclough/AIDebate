// Generates solid-colour PNG icons for PWA manifest.
// Uses only Node.js built-ins (zlib) — no extra packages required.
// Run: node scripts/generate-icons.js

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

// CRC32 lookup table (required by PNG spec)
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[i] = c
}
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t   = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function solidPNG(size, r, g, b) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit depth, RGB colour type

  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(size * rowSize)
  for (let y = 0; y < size; y++) {
    const row = y * rowSize
    raw[row] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const p = row + 1 + x * 3
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b
    }
  }

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })

// Indigo #1e1b4b — matches theme_color in manifest
writeFileSync('public/icon-192.png', solidPNG(192, 0x1e, 0x1b, 0x4b))
writeFileSync('public/icon-512.png', solidPNG(512, 0x1e, 0x1b, 0x4b))
console.log('✓ public/icon-192.png')
console.log('✓ public/icon-512.png')
