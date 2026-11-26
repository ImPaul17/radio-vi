import { stations } from "./catalog.js";

// Keep the numbered covers in order.
export const coverFiles = {
  afrobank: "assets/covers/1-afrobank-fm.webp",
  "back-country": "assets/covers/2-back-country-radio.webp",
  chamber: "assets/covers/3-the-chamber-106-6.webp",
  circoloco: "assets/covers/4-circoloco-records-radio.webp",
  cocoteo: "assets/covers/5-cocoteo-fm.webp",
  "dirty-south": "assets/covers/6-dirty-south-classics.webp",
  emotion: "assets/covers/7-emotion-98-3.webp",
  flash: "assets/covers/8-flash-fm.webp",
  gloriana: "assets/covers/9-gloriana-blues-radio.webp",
  honey: "assets/covers/10-honey-fm.webp",
  kaleidoscope: "assets/covers/11-kaleidoscope-fm.webp",
  "leonida-jazz": "assets/covers/12-leonida-jazz-radio.webp",
  "la-ola": "assets/covers/13-radio-la-ola.webp",
  "on-u": "assets/covers/14-radio-on-u.webp",
  stockyard: "assets/covers/15-stockyard-fm.webp",
  symphony: "assets/covers/16-symphony-fm.webp",
  "the-wipe": "assets/covers/17-the-wipe.webp",
  vcrr: "assets/covers/18-vcrr.webp",
  "vice-city-fm": "assets/covers/19-vice-city-fm.webp",
  "v-rock": "assets/covers/20-v-rock.webp",
  wktt: "assets/covers/21-wktt.webp",
  worldwide: "assets/covers/22-worldwide-fm.webp",
  "the-vault": "assets/covers/23-the-vault-radio.webp",
  "sniper-la-perle": "assets/covers/24-the-sniper-of-la-perle.webp",
  mudclub: "assets/covers/25-thrillbilly-mud-club-radio.webp",
};

const catalogById = new Map(stations.map((entry) => [entry.id, entry]));

const stationsWithCovers = Object.entries(coverFiles).map(([id, cover]) => ({
  ...catalogById.get(id),
  cover,
}));

export const demandShelf = stationsWithCovers.filter(({ id }) => id === "sniper-la-perle");
export const radioShelf = stationsWithCovers.filter((station) => !demandShelf.includes(station));

export const extraRadioShelf = [{
  id: "los-diozes-fm",
  name: "Los Diozes FM",
  monogram: "LD",
  cover: "assets/covers/26-los-diozes-fm.webp",
}, {
  id: "huelintown-fm",
  name: "Huelintown FM",
  monogram: "HT",
  cover: "assets/covers/27-huelintown-fm.webp",
}];
