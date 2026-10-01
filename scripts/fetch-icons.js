const fs = require('fs');
const path = require('path');

const ICON_NAMES = [
  'arrow-left',
  'pause',
  'play',
  'rotate-ccw',
  'house',
  'trophy',
  'award',
  'chart-column',
  'settings',
  'user',
  'star',
  'lock',
  'check',
  'timer',
  'map',
  'volume-2',
  'vibrate',
  'eye',
  'sparkles',
  'zap',
  'flame',
  'palette',
  'grid-3x3',
  'rows-3',
  'arrow-left-right',
  'gem',
  'footprints',
];

// Fallback geometry drawn in 2px round-cap style on a 24x24 grid if download fails or icon is renamed.
const FALLBACK_GEOMETRY = {
  'arrow-left': [
    'M 12 19 L 5 12 L 12 5',
    'M 19 12 H 5',
  ],
  'pause': [
    'M 6 4 V 20',
    'M 18 4 V 20',
  ],
  'play': [
    'M 6 4 L 19 12 L 6 20 Z',
  ],
  'rotate-ccw': [
    'M 3 12 A 9 9 0 1 0 12 3 A 9 9 0 0 0 5.26 5.74 L 3 8',
    'M 3 3 V 8 H 8',
  ],
  'house': [
    'M 3 9 L 12 2 L 21 9 V 20 A 2 2 0 0 1 19 22 H 5 A 2 2 0 0 1 3 20 Z',
    'M 9 22 V 12 H 15 V 22',
  ],
  'trophy': [
    'M 6 9 H 18 V 11 A 6 6 0 0 1 6 11 Z',
    'M 6 9 H 3 A 2 2 0 0 1 1 7 V 5 A 2 2 0 0 1 3 3 H 6',
    'M 18 9 H 21 A 2 2 0 0 0 23 7 V 5 A 2 2 0 0 0 21 3 H 18',
    'M 12 17 V 21',
    'M 8 21 H 16',
  ],
  'award': [
    'M 12 15 A 6 6 0 1 0 12 3 A 6 6 0 1 0 12 15 Z',
    'M 8.21 13.89 L 7 23 L 12 20 L 17 23 L 15.79 13.88',
  ],
  'chart-column': [
    'M 3 3 V 21 H 21',
    'M 18 17 V 9',
    'M 13 17 V 5',
    'M 8 17 V 13',
  ],
  'settings': [
    'M 12 15 A 3 3 0 1 0 12 9 A 3 3 0 1 0 12 15 Z',
    'M 19.4 15 A 1.65 1.65 0 0 0 20 16.5 L 20 17 A 2 2 0 0 1 18 19 L 17 19 A 1.65 1.65 0 0 0 15.5 20.4 L 15 21 A 2 2 0 0 1 13 22 H 11 A 2 2 0 0 1 9 20.4 L 8.5 19 A 1.65 1.65 0 0 0 7 18 L 6 18 A 2 2 0 0 1 4 16 L 4 15.5 A 1.65 1.65 0 0 0 2.6 14 L 2 13 A 2 2 0 0 1 2 11 L 3.6 10 A 1.65 1.65 0 0 0 5 8.5 L 5 8 A 2 2 0 0 1 7 6 L 8 6 A 1.65 1.65 0 0 0 9.5 4.6 L 10 4 A 2 2 0 0 1 12 2 H 14 A 2 2 0 0 1 16 3.6 L 16.5 5 A 1.65 1.65 0 0 0 18 6.5 L 19 7 A 2 2 0 0 1 21 9 L 21 10 A 1.65 1.65 0 0 0 22.4 11.5 L 23 12 A 2 2 0 0 1 23 14 Z',
  ],
  'user': [
    'M 19 21 V 19 A 4 4 0 0 0 11 19 V 21',
    'M 12 11 A 4 4 0 1 0 12 3 A 4 4 0 1 0 12 11 Z',
  ],
  'star': [
    'M 12 2 L 15.09 8.26 L 22 9.27 L 17 14.14 L 18.18 21.02 L 12 17.77 L 5.82 21.02 L 7 14.14 L 2 9.27 L 8.91 8.26 Z',
  ],
  'lock': [
    'M 5 11 H 19 A 2 2 0 0 1 21 13 V 20 A 2 2 0 0 1 19 22 H 5 A 2 2 0 0 1 3 20 V 13 A 2 2 0 0 1 5 11 Z',
    'M 7 11 V 7 A 5 5 0 0 1 17 7 V 11',
  ],
  'check': [
    'M 20 6 L 9 17 L 4 12',
  ],
  'timer': [
    'M 10 2 H 14',
    'M 12 14 L 15 11',
    'M 12 22 A 8 8 0 1 0 12 6 A 8 8 0 1 0 12 22 Z',
  ],
  'map': [
    'M 3 6 L 9 3 L 15 6 L 21 3 V 18 L 15 21 L 9 18 L 3 21 Z',
    'M 9 3 V 18',
    'M 15 6 V 21',
  ],
  'volume-2': [
    'M 11 5 L 6 9 H 2 V 15 H 6 L 11 19 Z',
    'M 15.54 8.46 A 5 5 0 0 1 15.54 15.54',
    'M 19.07 4.93 A 10 10 0 0 1 19.07 19.07',
  ],
  'vibrate': [
    'M 2 8 V 16',
    'M 22 8 V 16',
    'M 8 5 H 16 V 19 H 8 Z',
  ],
  'eye': [
    'M 2 12 S 6 4 12 4 S 22 12 22 12 S 18 20 12 20 S 2 12 2 12 Z',
    'M 12 15 A 3 3 0 1 0 12 9 A 3 3 0 1 0 12 15 Z',
  ],
  'sparkles': [
    'M 12 3 L 14 8 L 19 10 L 14 12 L 12 17 L 10 12 L 5 10 L 10 8 Z',
    'M 19 17 L 20 19 L 22 20 L 20 21 L 19 23 L 18 21 L 16 20 L 18 19 Z',
  ],
  'zap': [
    'M 13 2 L 3 14 H 12 L 11 22 L 21 10 H 12 Z',
  ],
  'flame': [
    'M 8.5 14.5 A 2.5 2.5 0 0 0 11 12 C 11 8.5 8 7 8 7 C 8 7 12 3 16 7 C 18 9 18 12 18 12 A 6 6 0 1 1 6 12 C 6 10 7 8 7 8 C 7 8 8.5 11 8.5 14.5 Z',
  ],
  'palette': [
    'M 12 2 A 10 10 0 0 0 2 12 A 10 10 0 0 0 12 22 A 4 4 0 0 0 16 18 A 2 2 0 0 1 18 16 H 19 A 3 3 0 0 0 22 13 A 10 10 0 0 0 12 2 Z',
  ],
  'grid-3x3': [
    'M 3 3 H 21 V 21 H 3 Z',
    'M 3 9 H 21',
    'M 3 15 H 21',
    'M 9 3 V 21',
    'M 15 3 V 21',
  ],
  'rows-3': [
    'M 3 3 H 21 V 21 H 3 Z',
    'M 3 9 H 21',
    'M 3 15 H 21',
  ],
  'arrow-left-right': [
    'M 8 3 L 4 7 L 8 11',
    'M 4 7 H 20',
    'M 16 21 L 20 17 L 16 13',
    'M 20 17 H 4',
  ],
  'gem': [
    'M 6 3 H 18 L 22 9 L 12 22 L 2 9 Z',
    'M 2 9 H 22',
    'M 12 22 L 7 9 L 10 3',
    'M 12 22 L 17 9 L 14 3',
  ],
  'footprints': [
    'M 4 16 A 2 4 0 1 0 8 16 A 2 4 0 1 0 4 16 Z',
    'M 16 8 A 2 4 0 1 0 20 8 A 2 4 0 1 0 16 8 Z',
  ],
};

function parseAttributes(tagStr) {
  const attrs = {};
  const regex = /([a-zA-Z0-9_-]+)=["\x27]([^"\x27]*)["\x27]/g;
  let match;
  while ((match = regex.exec(tagStr)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function convertElementToPath(tagName, attrs) {
  if (tagName === 'path') {
    return attrs.d ? attrs.d.trim() : null;
  }
  if (tagName === 'line') {
    const x1 = parseFloat(attrs.x1 || 0);
    const y1 = parseFloat(attrs.y1 || 0);
    const x2 = parseFloat(attrs.x2 || 0);
    const y2 = parseFloat(attrs.y2 || 0);
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  if (tagName === 'circle') {
    const cx = parseFloat(attrs.cx || 0);
    const cy = parseFloat(attrs.cy || 0);
    const r = parseFloat(attrs.r || 0);
    if (r <= 0) return null;
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }
  if (tagName === 'polyline') {
    const pts = (attrs.points || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (pts.length < 2) return null;
    let d = `M ${pts[0]} ${pts[1]}`;
    for (let i = 2; i < pts.length; i += 2) {
      d += ` L ${pts[i]} ${pts[i + 1]}`;
    }
    return d;
  }
  if (tagName === 'polygon') {
    const pts = (attrs.points || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (pts.length < 2) return null;
    let d = `M ${pts[0]} ${pts[1]}`;
    for (let i = 2; i < pts.length; i += 2) {
      d += ` L ${pts[i]} ${pts[i + 1]}`;
    }
    return `${d} Z`;
  }
  if (tagName === 'rect') {
    const x = parseFloat(attrs.x || 0);
    const y = parseFloat(attrs.y || 0);
    const w = parseFloat(attrs.width || 0);
    const h = parseFloat(attrs.height || 0);
    let rx = attrs.rx !== undefined ? parseFloat(attrs.rx) : (attrs.ry !== undefined ? parseFloat(attrs.ry) : 0);
    let ry = attrs.ry !== undefined ? parseFloat(attrs.ry) : rx;
    if (w <= 0 || h <= 0) return null;

    if (rx <= 0 && ry <= 0) {
      return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    }

    rx = Math.min(rx, w / 2);
    ry = Math.min(ry, h / 2);

    return `M ${x + rx} ${y} ` +
      `L ${x + w - rx} ${y} ` +
      `A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry} ` +
      `L ${x + w} ${y + h - ry} ` +
      `A ${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} ` +
      `L ${x + rx} ${y + h} ` +
      `A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} ` +
      `L ${x} ${y + ry} ` +
      `A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`;
  }
  return null;
}

function parseSvgToPaths(svgContent) {
  const tagMatches = svgContent.matchAll(/<([a-zA-Z0-9]+)\b([^>]*)\/?>/g);
  const paths = [];
  for (const match of tagMatches) {
    const tag = match[1];
    if (tag.startsWith('/') || tag === 'svg' || tag === 'g') continue;
    const attrs = parseAttributes(match[2]);
    const p = convertElementToPath(tag, attrs);
    if (p) {
      paths.push(p);
    }
  }
  return paths;
}

async function fetchSvg(name) {
  const url = `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/${name}.svg`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function main() {
  const iconEntries = [];

  for (const name of ICON_NAMES) {
    let paths = [];
    let isFallback = false;

    try {
      const svgText = await fetchSvg(name);
      paths = parseSvgToPaths(svgText);
      if (paths.length === 0) {
        throw new Error('No valid path elements found in SVG');
      }
      console.log(`✓ Fetched ${name} (${paths.length} path(s))`);
    } catch (err) {
      console.warn(`⚠ Failed to fetch ${name} (${err.message}), using fallback geometry.`);
      paths = FALLBACK_GEOMETRY[name] || [];
      isFallback = true;
    }

    iconEntries.push({ name, paths, isFallback });
  }

  // Format src/ui/icons.js
  let fileContent = `// Auto-generated by scripts/fetch-icons.js.
// Lucide icons (ISC license) - https://github.com/lucide-icons/lucide

export const icons = {\n`;

  for (const { name, paths, isFallback } of iconEntries) {
    if (isFallback) {
      fileContent += `  // Fallback geometry drawn for ${name} (download failed or renamed)\n`;
    }
    fileContent += `  ${JSON.stringify(name)}: [\n`;
    for (const p of paths) {
      fileContent += `    ${JSON.stringify(p)},\n`;
    }
    fileContent += `  ],\n`;
  }

  fileContent += `};\n\nexport default icons;\n`;

  const outputPath = path.join(__dirname, '..', 'src', 'ui', 'icons.js');
  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log(`Wrote ${iconEntries.length} icons to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
