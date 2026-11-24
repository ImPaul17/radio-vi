const rasterExtension = /\.(avif|bmp|gif|jpe?g|png|webp)$/i;
const rasterMimeType = /^image\/(avif|bmp|gif|jpe?g|png|webp)$/i;
const alternateNames = {
  chamber: ["The Chamber"],
  emotion: ["Emotion 98.3 FM"],
  "la-ola": ["La Ola Radio"],
  mudclub: ["Thrillbilly", "Mud Club Radio"],
  "on-u": ["On-U Radio"],
  "sniper-la-perle": ["The Sniper de La Perle"],
  "the-wipe": ["The Wipe"],
  wktt: ["WKTT Radio"],
};

function normalize(name) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

function nameKeys(name) {
  const words = normalize(name).replace(/[^a-z0-9]+/g, " ").trim();
  const withoutBand = words.replace(/^(?:radio|fm)\s+|\s+(?:talk radio|radio|fm)$/g, "");
  return [...new Set([words.replace(/ /g, ""), withoutBand.replace(/ /g, "")])].filter(Boolean);
}

function fileTitle(name) {
  return name.replace(/\.[^.]+$/, "")
    .replace(/^\s*\d+[\s._-]+/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/(?:^|[\s._-])(?:cover|logo|portada|car[aá]tula)\s*$/i, "");
}

function buildLookup(catalog) {
  const lookup = new Map();
  for (const station of catalog) {
    for (const name of [station.id, station.name, ...(alternateNames[station.id] ?? [])]) {
      for (const key of nameKeys(name)) {
        if (!lookup.has(key)) lookup.set(key, station.id);
        else if (lookup.get(key) !== station.id) lookup.set(key, null);
      }
    }
  }
  return lookup;
}

function loadImage(url) {
  const image = new Image();
  if (typeof image.decode === "function") {
    image.src = url;
    return image.decode();
  }
  return new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  });
}

// Successful URLs belong to the caller, which can revoke them when replacing a cover.
export async function importCoverBatch(files, catalog) {
  const lookup = buildLookup(catalog);
  const covers = new Map();
  let unmatched = 0;

  for (const file of files) {
    const extensionOrType = rasterExtension.test(file.name) || rasterMimeType.test(file.type);
    const station = nameKeys(fileTitle(file.name)).map((key) => lookup.get(key)).find(Boolean);
    if (!file.size || !extensionOrType || !station || covers.has(station)) {
      unmatched += 1;
      continue;
    }

    let url;
    try {
      url = URL.createObjectURL(file);
      await loadImage(url);
      covers.set(station, { url, name: file.name });
    } catch {
      if (url) URL.revokeObjectURL(url);
      unmatched += 1;
    }
  }

  return { covers, unmatched };
}
