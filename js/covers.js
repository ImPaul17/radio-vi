import { stations } from "./catalog.js";

// Keep the numbered PNGs in order.
export const coverFiles = {
  afrobank: "media/logos/png/1-afrobank-fm.png",
  "back-country": "media/logos/png/2-back-country-radio.png",
  chamber: "media/logos/png/3-the-chamber-106-6.png",
  circoloco: "media/logos/png/4-circoloco-records-radio.png",
  cocoteo: "media/logos/png/5-cocoteo-fm.png",
  "dirty-south": "media/logos/png/6-dirty-south-classics.png",
  emotion: "media/logos/png/7-emotion-98-3.png",
  flash: "media/logos/png/8-flash-fm.png",
  gloriana: "media/logos/png/9-gloriana-blues-radio.png",
  honey: "media/logos/png/10-honey-fm.png",
  kaleidoscope: "media/logos/png/11-kaleidoscope-fm.png",
  "leonida-jazz": "media/logos/png/12-leonida-jazz-radio.png",
  "la-ola": "media/logos/png/13-radio-la-ola.png",
  "on-u": "media/logos/png/14-radio-on-u.png",
  stockyard: "media/logos/png/15-stockyard-fm.png",
  symphony: "media/logos/png/16-symphony-fm.png",
  "the-wipe": "media/logos/png/17-the-wipe.png",
  vcrr: "media/logos/png/18-vcrr.png",
  "vice-city-fm": "media/logos/png/19-vice-city-fm.png",
  "v-rock": "media/logos/png/20-v-rock.png",
  wktt: "media/logos/png/21-wktt.png",
  worldwide: "media/logos/png/22-worldwide-fm.png",
  "the-vault": "media/logos/png/23-the-vault-radio.png",
  "sniper-la-perle": "media/logos/png/24-the-sniper-of-la-perle.png",
  mudclub: "media/logos/png/25-thrillbilly-mud-club-radio.png",
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
  cover: "media/logos/png/26-los-diozes-fm.png",
}, {
  id: "huelintown-fm",
  name: "Huelintown FM",
  monogram: "HT",
  cover: "media/logos/png/27-huelintown-fm.png",
}];
