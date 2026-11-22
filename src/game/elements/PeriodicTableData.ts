
import type { ChemicalElement } from './ChemicalElement';

/**
 * Periodic Table Dataset
 * Contains all 118 officially recognized chemical elements.
 *
 * This dataset is independent from ElementCatalog.ts.
 * Do not use it to replace unidentified crystal samples.
 */
export const PERIODIC_TABLE_DATA: ChemicalElement[] = [
  // Period 1
  { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', atomicWeight: '1.008', group: 1, period: 1, category: 'reactive-nonmetal' },
  { atomicNumber: 2, symbol: 'He', name: 'Helium', atomicWeight: '4.0026', group: 18, period: 1, category: 'noble-gas' },

  // Period 2
  { atomicNumber: 3, symbol: 'Li', name: 'Lithium', atomicWeight: '6.94', group: 1, period: 2, category: 'alkali-metal' },
  { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', atomicWeight: '9.0122', group: 2, period: 2, category: 'alkaline-earth-metal' },
  { atomicNumber: 5, symbol: 'B', name: 'Boron', atomicWeight: '10.81', group: 13, period: 2, category: 'metalloid' },
  { atomicNumber: 6, symbol: 'C', name: 'Carbon', atomicWeight: '12.011', group: 14, period: 2, category: 'reactive-nonmetal' },
  { atomicNumber: 7, symbol: 'N', name: 'Nitrogen', atomicWeight: '14.007', group: 15, period: 2, category: 'reactive-nonmetal' },
  { atomicNumber: 8, symbol: 'O', name: 'Oxygen', atomicWeight: '15.999', group: 16, period: 2, category: 'reactive-nonmetal' },
  { atomicNumber: 9, symbol: 'F', name: 'Fluorine', atomicWeight: '18.998', group: 17, period: 2, category: 'halogen' },
  { atomicNumber: 10, symbol: 'Ne', name: 'Neon', atomicWeight: '20.180', group: 18, period: 2, category: 'noble-gas' },

  // Period 3
  { atomicNumber: 11, symbol: 'Na', name: 'Sodium', atomicWeight: '22.990', group: 1, period: 3, category: 'alkali-metal' },
  { atomicNumber: 12, symbol: 'Mg', name: 'Magnesium', atomicWeight: '24.305', group: 2, period: 3, category: 'alkaline-earth-metal' },
  { atomicNumber: 13, symbol: 'Al', name: 'Aluminium', atomicWeight: '26.982', group: 13, period: 3, category: 'post-transition-metal' },
  { atomicNumber: 14, symbol: 'Si', name: 'Silicon', atomicWeight: '28.085', group: 14, period: 3, category: 'metalloid' },
  { atomicNumber: 15, symbol: 'P', name: 'Phosphorus', atomicWeight: '30.974', group: 15, period: 3, category: 'reactive-nonmetal' },
  { atomicNumber: 16, symbol: 'S', name: 'Sulfur', atomicWeight: '32.06', group: 16, period: 3, category: 'reactive-nonmetal' },
  { atomicNumber: 17, symbol: 'Cl', name: 'Chlorine', atomicWeight: '35.45', group: 17, period: 3, category: 'halogen' },
  { atomicNumber: 18, symbol: 'Ar', name: 'Argon', atomicWeight: '39.948', group: 18, period: 3, category: 'noble-gas' },

  // Period 4
  { atomicNumber: 19, symbol: 'K', name: 'Potassium', atomicWeight: '39.098', group: 1, period: 4, category: 'alkali-metal' },
  { atomicNumber: 20, symbol: 'Ca', name: 'Calcium', atomicWeight: '40.078', group: 2, period: 4, category: 'alkaline-earth-metal' },
  { atomicNumber: 21, symbol: 'Sc', name: 'Scandium', atomicWeight: '44.956', group: 3, period: 4, category: 'transition-metal' },
  { atomicNumber: 22, symbol: 'Ti', name: 'Titanium', atomicWeight: '47.867', group: 4, period: 4, category: 'transition-metal' },
  { atomicNumber: 23, symbol: 'V', name: 'Vanadium', atomicWeight: '50.942', group: 5, period: 4, category: 'transition-metal' },
  { atomicNumber: 24, symbol: 'Cr', name: 'Chromium', atomicWeight: '51.996', group: 6, period: 4, category: 'transition-metal' },
  { atomicNumber: 25, symbol: 'Mn', name: 'Manganese', atomicWeight: '54.938', group: 7, period: 4, category: 'transition-metal' },
  { atomicNumber: 26, symbol: 'Fe', name: 'Iron', atomicWeight: '55.845', group: 8, period: 4, category: 'transition-metal' },
  { atomicNumber: 27, symbol: 'Co', name: 'Cobalt', atomicWeight: '58.933', group: 9, period: 4, category: 'transition-metal' },
  { atomicNumber: 28, symbol: 'Ni', name: 'Nickel', atomicWeight: '58.693', group: 10, period: 4, category: 'transition-metal' },
  { atomicNumber: 29, symbol: 'Cu', name: 'Copper', atomicWeight: '63.546', group: 11, period: 4, category: 'transition-metal' },
  { atomicNumber: 30, symbol: 'Zn', name: 'Zinc', atomicWeight: '65.38', group: 12, period: 4, category: 'transition-metal' },
  { atomicNumber: 31, symbol: 'Ga', name: 'Gallium', atomicWeight: '69.723', group: 13, period: 4, category: 'post-transition-metal' },
  { atomicNumber: 32, symbol: 'Ge', name: 'Germanium', atomicWeight: '72.630', group: 14, period: 4, category: 'metalloid' },
  { atomicNumber: 33, symbol: 'As', name: 'Arsenic', atomicWeight: '74.922', group: 15, period: 4, category: 'metalloid' },
  { atomicNumber: 34, symbol: 'Se', name: 'Selenium', atomicWeight: '78.971', group: 16, period: 4, category: 'reactive-nonmetal' },
  { atomicNumber: 35, symbol: 'Br', name: 'Bromine', atomicWeight: '79.904', group: 17, period: 4, category: 'halogen' },
  { atomicNumber: 36, symbol: 'Kr', name: 'Krypton', atomicWeight: '83.798', group: 18, period: 4, category: 'noble-gas' },

  // Period 5
  { atomicNumber: 37, symbol: 'Rb', name: 'Rubidium', atomicWeight: '85.468', group: 1, period: 5, category: 'alkali-metal' },
  { atomicNumber: 38, symbol: 'Sr', name: 'Strontium', atomicWeight: '87.62', group: 2, period: 5, category: 'alkaline-earth-metal' },
  { atomicNumber: 39, symbol: 'Y', name: 'Yttrium', atomicWeight: '88.906', group: 3, period: 5, category: 'transition-metal' },
  { atomicNumber: 40, symbol: 'Zr', name: 'Zirconium', atomicWeight: '91.224', group: 4, period: 5, category: 'transition-metal' },
  { atomicNumber: 41, symbol: 'Nb', name: 'Niobium', atomicWeight: '92.906', group: 5, period: 5, category: 'transition-metal' },
  { atomicNumber: 42, symbol: 'Mo', name: 'Molybdenum', atomicWeight: '95.95', group: 6, period: 5, category: 'transition-metal' },
  { atomicNumber: 43, symbol: 'Tc', name: 'Technetium', atomicWeight: '[98]', group: 7, period: 5, category: 'transition-metal' },
  { atomicNumber: 44, symbol: 'Ru', name: 'Ruthenium', atomicWeight: '101.07', group: 8, period: 5, category: 'transition-metal' },
  { atomicNumber: 45, symbol: 'Rh', name: 'Rhodium', atomicWeight: '102.91', group: 9, period: 5, category: 'transition-metal' },
  { atomicNumber: 46, symbol: 'Pd', name: 'Palladium', atomicWeight: '106.42', group: 10, period: 5, category: 'transition-metal' },
  { atomicNumber: 47, symbol: 'Ag', name: 'Silver', atomicWeight: '107.87', group: 11, period: 5, category: 'transition-metal' },
  { atomicNumber: 48, symbol: 'Cd', name: 'Cadmium', atomicWeight: '112.41', group: 12, period: 5, category: 'transition-metal' },
  { atomicNumber: 49, symbol: 'In', name: 'Indium', atomicWeight: '114.82', group: 13, period: 5, category: 'post-transition-metal' },
  { atomicNumber: 50, symbol: 'Sn', name: 'Tin', atomicWeight: '118.71', group: 14, period: 5, category: 'post-transition-metal' },
  { atomicNumber: 51, symbol: 'Sb', name: 'Antimony', atomicWeight: '121.76', group: 15, period: 5, category: 'metalloid' },
  { atomicNumber: 52, symbol: 'Te', name: 'Tellurium', atomicWeight: '127.60', group: 16, period: 5, category: 'metalloid' },
  { atomicNumber: 53, symbol: 'I', name: 'Iodine', atomicWeight: '126.90', group: 17, period: 5, category: 'halogen' },
  { atomicNumber: 54, symbol: 'Xe', name: 'Xenon', atomicWeight: '131.29', group: 18, period: 5, category: 'noble-gas' },

  // Period 6
  { atomicNumber: 55, symbol: 'Cs', name: 'Caesium', atomicWeight: '132.91', group: 1, period: 6, category: 'alkali-metal' },
  { atomicNumber: 56, symbol: 'Ba', name: 'Barium', atomicWeight: '137.33', group: 2, period: 6, category: 'alkaline-earth-metal' },
  { atomicNumber: 57, symbol: 'La', name: 'Lanthanum', atomicWeight: '138.91', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 58, symbol: 'Ce', name: 'Cerium', atomicWeight: '140.12', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 59, symbol: 'Pr', name: 'Praseodymium', atomicWeight: '140.91', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 60, symbol: 'Nd', name: 'Neodymium', atomicWeight: '144.24', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 61, symbol: 'Pm', name: 'Promethium', atomicWeight: '[145]', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 62, symbol: 'Sm', name: 'Samarium', atomicWeight: '150.36', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 63, symbol: 'Eu', name: 'Europium', atomicWeight: '151.96', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 64, symbol: 'Gd', name: 'Gadolinium', atomicWeight: '157.25', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 65, symbol: 'Tb', name: 'Terbium', atomicWeight: '158.93', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 66, symbol: 'Dy', name: 'Dysprosium', atomicWeight: '162.50', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 67, symbol: 'Ho', name: 'Holmium', atomicWeight: '164.93', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 68, symbol: 'Er', name: 'Erbium', atomicWeight: '167.26', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 69, symbol: 'Tm', name: 'Thulium', atomicWeight: '168.93', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 70, symbol: 'Yb', name: 'Ytterbium', atomicWeight: '173.05', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 71, symbol: 'Lu', name: 'Lutetium', atomicWeight: '174.97', group: null, period: 6, category: 'lanthanoid' },
  { atomicNumber: 72, symbol: 'Hf', name: 'Hafnium', atomicWeight: '178.49', group: 4, period: 6, category: 'transition-metal' },
  { atomicNumber: 73, symbol: 'Ta', name: 'Tantalum', atomicWeight: '180.95', group: 5, period: 6, category: 'transition-metal' },
  { atomicNumber: 74, symbol: 'W', name: 'Tungsten', atomicWeight: '183.84', group: 6, period: 6, category: 'transition-metal' },
  { atomicNumber: 75, symbol: 'Re', name: 'Rhenium', atomicWeight: '186.21', group: 7, period: 6, category: 'transition-metal' },
  { atomicNumber: 76, symbol: 'Os', name: 'Osmium', atomicWeight: '190.23', group: 8, period: 6, category: 'transition-metal' },
  { atomicNumber: 77, symbol: 'Ir', name: 'Iridium', atomicWeight: '192.22', group: 9, period: 6, category: 'transition-metal' },
  { atomicNumber: 78, symbol: 'Pt', name: 'Platinum', atomicWeight: '195.08', group: 10, period: 6, category: 'transition-metal' },
  { atomicNumber: 79, symbol: 'Au', name: 'Gold', atomicWeight: '196.97', group: 11, period: 6, category: 'transition-metal' },
  { atomicNumber: 80, symbol: 'Hg', name: 'Mercury', atomicWeight: '200.59', group: 12, period: 6, category: 'transition-metal' },
  { atomicNumber: 81, symbol: 'Tl', name: 'Thallium', atomicWeight: '204.38', group: 13, period: 6, category: 'post-transition-metal' },
  { atomicNumber: 82, symbol: 'Pb', name: 'Lead', atomicWeight: '207.2', group: 14, period: 6, category: 'post-transition-metal' },
  { atomicNumber: 83, symbol: 'Bi', name: 'Bismuth', atomicWeight: '208.98', group: 15, period: 6, category: 'post-transition-metal' },
  { atomicNumber: 84, symbol: 'Po', name: 'Polonium', atomicWeight: '[209]', group: 16, period: 6, category: 'post-transition-metal' },
  { atomicNumber: 85, symbol: 'At', name: 'Astatine', atomicWeight: '[210]', group: 17, period: 6, category: 'halogen' },
  { atomicNumber: 86, symbol: 'Rn', name: 'Radon', atomicWeight: '[222]', group: 18, period: 6, category: 'noble-gas' },

  // Period 7
  { atomicNumber: 87, symbol: 'Fr', name: 'Francium', atomicWeight: '[223]', group: 1, period: 7, category: 'alkali-metal' },
  { atomicNumber: 88, symbol: 'Ra', name: 'Radium', atomicWeight: '[226]', group: 2, period: 7, category: 'alkaline-earth-metal' },
  { atomicNumber: 89, symbol: 'Ac', name: 'Actinium', atomicWeight: '[227]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 90, symbol: 'Th', name: 'Thorium', atomicWeight: '232.04', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 91, symbol: 'Pa', name: 'Protactinium', atomicWeight: '231.04', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 92, symbol: 'U', name: 'Uranium', atomicWeight: '238.03', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 93, symbol: 'Np', name: 'Neptunium', atomicWeight: '[237]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 94, symbol: 'Pu', name: 'Plutonium', atomicWeight: '[244]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 95, symbol: 'Am', name: 'Americium', atomicWeight: '[243]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 96, symbol: 'Cm', name: 'Curium', atomicWeight: '[247]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 97, symbol: 'Bk', name: 'Berkelium', atomicWeight: '[247]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 98, symbol: 'Cf', name: 'Californium', atomicWeight: '[251]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 99, symbol: 'Es', name: 'Einsteinium', atomicWeight: '[252]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 100, symbol: 'Fm', name: 'Fermium', atomicWeight: '[257]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 101, symbol: 'Md', name: 'Mendelevium', atomicWeight: '[258]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 102, symbol: 'No', name: 'Nobelium', atomicWeight: '[259]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 103, symbol: 'Lr', name: 'Lawrencium', atomicWeight: '[266]', group: null, period: 7, category: 'actinoid' },
  { atomicNumber: 104, symbol: 'Rf', name: 'Rutherfordium', atomicWeight: '[267]', group: 4, period: 7, category: 'transition-metal' },
  { atomicNumber: 105, symbol: 'Db', name: 'Dubnium', atomicWeight: '[268]', group: 5, period: 7, category: 'transition-metal' },
  { atomicNumber: 106, symbol: 'Sg', name: 'Seaborgium', atomicWeight: '[269]', group: 6, period: 7, category: 'transition-metal' },
  { atomicNumber: 107, symbol: 'Bh', name: 'Bohrium', atomicWeight: '[270]', group: 7, period: 7, category: 'transition-metal' },
  { atomicNumber: 108, symbol: 'Hs', name: 'Hassium', atomicWeight: '[277]', group: 8, period: 7, category: 'transition-metal' },
  { atomicNumber: 109, symbol: 'Mt', name: 'Meitnerium', atomicWeight: '[278]', group: 9, period: 7, category: 'transition-metal' },
  { atomicNumber: 110, symbol: 'Ds', name: 'Darmstadtium', atomicWeight: '[281]', group: 10, period: 7, category: 'transition-metal' },
  { atomicNumber: 111, symbol: 'Rg', name: 'Roentgenium', atomicWeight: '[282]', group: 11, period: 7, category: 'transition-metal' },
  { atomicNumber: 112, symbol: 'Cn', name: 'Copernicium', atomicWeight: '[285]', group: 12, period: 7, category: 'transition-metal' },
  { atomicNumber: 113, symbol: 'Nh', name: 'Nihonium', atomicWeight: '[286]', group: 13, period: 7, category: 'post-transition-metal' },
  { atomicNumber: 114, symbol: 'Fl', name: 'Flerovium', atomicWeight: '[289]', group: 14, period: 7, category: 'post-transition-metal' },
  { atomicNumber: 115, symbol: 'Mc', name: 'Moscovium', atomicWeight: '[290]', group: 15, period: 7, category: 'post-transition-metal' },
  { atomicNumber: 116, symbol: 'Lv', name: 'Livermorium', atomicWeight: '[293]', group: 16, period: 7, category: 'post-transition-metal' },
  { atomicNumber: 117, symbol: 'Ts', name: 'Tennessine', atomicWeight: '[294]', group: 17, period: 7, category: 'halogen' },
  { atomicNumber: 118, symbol: 'Og', name: 'Oganesson', atomicWeight: '[294]', group: 18, period: 7, category: 'noble-gas' },
];

export function getElementByAtomicNumber(
  atomicNumber: number,
): ChemicalElement | undefined {
  return PERIODIC_TABLE_DATA.find(
    (element) => element.atomicNumber === atomicNumber,
  );
}

export function getElementBySymbol(
  symbol: string,
): ChemicalElement | undefined {
  return PERIODIC_TABLE_DATA.find(
    (element) => element.symbol.toLowerCase() === symbol.toLowerCase(),
  );
}
