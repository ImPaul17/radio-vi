export const sceneNames = ["Costa", "Pantano", "Ciudad", "Puerto", "Carretera", "Club"];

// Song and programme examples listed in Rockstar's credits.
// The initial station's track follows the supplied screenshot.
export const stations = [
  {
    id: "afrobank", name: "AfroBank FM", genre: "Afrobeat y amapiano",
    monogram: "AB", frequency: "FM", accent: "#c9ef70", ink: "#262d12", scene: 2,
    track: "Do I (Remix)", artist: "Phyno y Burna Boy", source: "creditos",
  },
  {
    id: "back-country", name: "Back Country Radio", genre: "Country",
    monogram: "BC", frequency: "RADIO", accent: "#e8bf91", ink: "#442816", scene: 4,
    track: "Let Your Love Flow", artist: "The Bellamy Brothers", source: "creditos",
  },
  {
    id: "chamber", name: "The Chamber 106.6", genre: "Metal",
    monogram: "CH", frequency: "106.6", accent: "#f198aa", ink: "#3b1221", scene: 3,
    track: "I Am the Law", artist: "Anthrax", source: "creditos",
  },
  {
    id: "circoloco", name: "CircoLoco Records Radio", genre: "House y techno",
    monogram: "CL", frequency: "RADIO", accent: "#f88664", ink: "#3d1712", scene: 5,
    track: "Silver Lines", artist: "ANOTR feat. Emily Warren", source: "creditos",
  },
  {
    id: "cocoteo", name: "Cocoteo FM", genre: "Latino actual",
    monogram: "CO", frequency: "FM", accent: "#edb9ff", ink: "#332047", scene: 0,
    track: "MOJABI GHOST", artist: "Tainy y Bad Bunny", source: "creditos",
  },
  {
    id: "dirty-south", name: "Dirty South Classics", genre: "Rap sureño",
    monogram: "DS", frequency: "RADIO", accent: "#c1c899", ink: "#292d1c", scene: 2,
    track: "No Lie", artist: "2 Chainz y Drake", source: "creditos",
  },
  {
    id: "emotion", name: "Emotion 98.3", genre: "Baladas",
    monogram: "EM", frequency: "98.3", accent: "#ff96ad", ink: "#3c1321", scene: 0,
    track: "All Out of Love", artist: "Air Supply", source: "creditos",
  },
  {
    id: "flash", name: "Flash FM", genre: "Pop",
    monogram: "FL", frequency: "FM", accent: "#ffd254", ink: "#352814", scene: 2,
    track: "Fame is a Gun", artist: "Addison Rae", source: "creditos",
  },
  {
    id: "gloriana", name: "Gloriana Blues Radio", genre: "Blues",
    monogram: "GB", frequency: "RADIO", accent: "#97a6ef", ink: "#1e2153", scene: 1,
    track: "Chains and Things", artist: "B.B. King", source: "creditos",
  },
  {
    id: "honey", name: "Honey FM", genre: "R&B",
    monogram: "HN", frequency: "FM", accent: "#f1c58c", ink: "#432d13", scene: 0,
    track: "Dance With Me", artist: "112", source: "creditos",
  },
  {
    id: "kaleidoscope", name: "Kaleidoscope FM", genre: "Versiones y pop global",
    monogram: "KA", frequency: "FM", accent: "#b6a9ff", ink: "#28204f", scene: 5,
    track: "Say It Right", artist: "Alim Qasimov y Fargana Qasimova", source: "creditos",
  },
  {
    id: "leonida-jazz", name: "Leonida Jazz Radio", genre: "Jazz",
    monogram: "LJ", frequency: "RADIO", accent: "#99d3df", ink: "#152f3d", scene: 0,
    track: "WHATUP", artist: "DOMi & JD BECK", source: "creditos",
  },
  {
    id: "la-ola", name: "Radio La Ola", genre: "Salsa y música tropical",
    monogram: "LO", frequency: "RADIO", accent: "#e6a7f2", ink: "#362545", scene: 0,
    track: "Que Viva Chango", artist: "Albita Rodríguez y Willy Chirino", source: "creditos",
  },
  {
    id: "mudclub", name: "Thrillbilly Mud Club Radio", genre: "Rock alternativo · Nu metal",
    monogram: "MC", frequency: "RADIO", accent: "#f1a674", ink: "#442415", scene: 1,
    track: "Freak on a Leash", artist: "Korn", source: "referencia",
  },
  {
    id: "on-u", name: "Radio On-U", genre: "Dub y reggae",
    monogram: "OU", frequency: "RADIO", accent: "#91e1af", ink: "#153a2a", scene: 0,
    track: "Dub Inspector", artist: "Adrian Sherwood", source: "creditos",
  },
  {
    id: "stockyard", name: "Stockyard FM", genre: "Indie y electrónica",
    monogram: "SY", frequency: "FM", accent: "#92d8fb", ink: "#112d46", scene: 3,
    track: "Illegal", artist: "PinkPantheress", source: "creditos",
  },
  {
    id: "symphony", name: "Symphony FM", genre: "Clásica",
    monogram: "SF", frequency: "FM", accent: "#ded3fa", ink: "#3b2c52", scene: 0,
    track: "Sinfonía n.º 7 · II. Allegretto", artist: "Ludwig van Beethoven", source: "creditos",
  },
  {
    id: "the-vault", name: "The Vault Radio", genre: "Electrónica de club",
    monogram: "TV", frequency: "RADIO", accent: "#eab4d3", ink: "#4b2444", scene: 5,
    track: "XTC", artist: "DJ Koze", source: "creditos",
  },
  {
    id: "the-wipe", name: "The Wipe Talk Radio", genre: "Radio hablada",
    monogram: "TW", frequency: "RADIO", accent: "#cce3a7", ink: "#34421b", scene: 2,
    track: "Ask Dr. Nita", artist: "Anitta", source: "creditos",
  },
  {
    id: "vcrr", name: "Vice City Rap Radio", genre: "Hip hop",
    monogram: "VR", frequency: "RADIO", accent: "#f4bf57", ink: "#402b13", scene: 2,
    track: "Players", artist: "Coi Leray", source: "creditos",
  },
  {
    id: "vice-city-fm", name: "Vice City FM", genre: "Pop de los 80",
    monogram: "VC", frequency: "FM", accent: "#ff92cb", ink: "#412240", scene: 0,
    track: "Hot Together", artist: "The Pointer Sisters", source: "creditos",
  },
  {
    id: "v-rock", name: "V-Rock", genre: "Rock clásico",
    monogram: "RV", frequency: "RADIO", accent: "#f4a88e", ink: "#43231e", scene: 4,
    track: "Love Is a Long Road", artist: "Tom Petty", source: "creditos",
  },
  {
    id: "wktt", name: "WKTT Talk Radio", genre: "Radio hablada",
    monogram: "WK", frequency: "RADIO", accent: "#bbd2ff", ink: "#24345b", scene: 2,
    track: "The Richard Bastion Show", artist: "Jason Sudeikis", source: "creditos",
  },
  {
    id: "worldwide", name: "Worldwide FM", genre: "Soul y ritmos globales",
    monogram: "WW", frequency: "FM", accent: "#d2ec9b", ink: "#2d3c1e", scene: 5,
    track: "Star Chasers", artist: "4hero", source: "creditos",
  },
];

export const onDemand = [
  {
    id: "sniper-la-perle", name: "The Sniper of La Perle", genre: "Música haitiana",
    monogram: "LP", frequency: "ON DEMAND", accent: "#dfb1f7", ink: "#3e2758", scene: 3,
    track: "Haitian Scarface", artist: "Kodak Black", source: "creditos",
  },
  {
    id: "drunk-kings", name: "Drunk Kings", genre: "Podcast · Entrevistas",
    monogram: "DK", frequency: "ON DEMAND", accent: "#fbad77", ink: "#4f2518", scene: 5,
    track: "Drunk Kings", artist: "N.O.R.E. y DJ EFN", source: "creditos",
  },
  {
    id: "final-act", name: "Final Act", genre: "Podcast · Ficción",
    monogram: "FA", frequency: "ON DEMAND", accent: "#eb9edd", ink: "#44223d", scene: 2,
    track: "Final Act", artist: "Renée Felice Smith", source: "creditos",
  },
  {
    id: "marry-murder", name: "Fuck, Marry, Murder", genre: "Podcast · Comedia",
    monogram: "FM", frequency: "ON DEMAND", accent: "#fac9c4", ink: "#472727", scene: 0,
    track: "Fuck, Marry, Murder", artist: "Chloe Fineman y Sarah Sherman", source: "creditos",
  },
  {
    id: "safe-trap", name: "The Safe Trap", genre: "Podcast · Ficción",
    monogram: "ST", frequency: "ON DEMAND", accent: "#a4dfd1", ink: "#193e39", scene: 3,
    track: "The Safe Trap", artist: "Freddie Gibbs y The Alchemist", source: "creditos",
  },
  {
    id: "vice-true-stories", name: "Vice City True Stories", genre: "Podcast · Documental",
    monogram: "VS", frequency: "ON DEMAND", accent: "#edcd86", ink: "#45351a", scene: 4,
    track: "Vice City True Stories", artist: "Billy Corben", source: "creditos",
  },
];
