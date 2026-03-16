/**
 * Static registry of reference images for bundling with the app.
 * Expo requires static require() calls to include assets in the bundle.
 */

export interface RefImageEntry {
  folder: string;
  file: string;
  asset: number; // require() returns a number (asset ID)
}

const registry: RefImageEntry[] = [
  // Ca_mangel
  { folder: 'Ca_mangel', file: 'ref_1.jpg', asset: require('./Ca_mangel/ref_1.jpg') },
  { folder: 'Ca_mangel', file: 'ref_2.jpg', asset: require('./Ca_mangel/ref_2.jpg') },
  { folder: 'Ca_mangel', file: 'ref_3.jpg', asset: require('./Ca_mangel/ref_3.jpg') },
  // Cu_mangel
  { folder: 'Cu_mangel', file: 'ref_1.jpg', asset: require('./Cu_mangel/ref_1.jpg') },
  // Fe_mangel
  { folder: 'Fe_mangel', file: 'ref_1.jpg', asset: require('./Fe_mangel/ref_1.jpg') },
  { folder: 'Fe_mangel', file: 'ref_2.jpg', asset: require('./Fe_mangel/ref_2.jpg') },
  // K_mangel
  { folder: 'K_mangel', file: 'ref_1.jpg', asset: require('./K_mangel/ref_1.jpg') },
  { folder: 'K_mangel', file: 'ref_2.jpg', asset: require('./K_mangel/ref_2.jpg') },
  { folder: 'K_mangel', file: 'ref_3.jpg', asset: require('./K_mangel/ref_3.jpg') },
  // Mg_mangel
  { folder: 'Mg_mangel', file: 'ref_1.jpg', asset: require('./Mg_mangel/ref_1.jpg') },
  { folder: 'Mg_mangel', file: 'ref_2.jpg', asset: require('./Mg_mangel/ref_2.jpg') },
  { folder: 'Mg_mangel', file: 'ref_3.jpg', asset: require('./Mg_mangel/ref_3.jpg') },
  // Mn_mangel
  { folder: 'Mn_mangel', file: 'ref_1.jpg', asset: require('./Mn_mangel/ref_1.jpg') },
  { folder: 'Mn_mangel', file: 'ref_2.jpg', asset: require('./Mn_mangel/ref_2.jpg') },
  { folder: 'Mn_mangel', file: 'ref_3.jpg', asset: require('./Mn_mangel/ref_3.jpg') },
  // Mo_mangel
  { folder: 'Mo_mangel', file: 'ref_1.jpg', asset: require('./Mo_mangel/ref_1.jpg') },
  { folder: 'Mo_mangel', file: 'ref_2.jpg', asset: require('./Mo_mangel/ref_2.jpg') },
  { folder: 'Mo_mangel', file: 'ref_3.jpg', asset: require('./Mo_mangel/ref_3.jpg') },
  // N_mangel
  { folder: 'N_mangel', file: 'ref_1.jpg', asset: require('./N_mangel/ref_1.jpg') },
  { folder: 'N_mangel', file: 'ref_2.jpg', asset: require('./N_mangel/ref_2.jpg') },
  { folder: 'N_mangel', file: 'ref_3.jpg', asset: require('./N_mangel/ref_3.jpg') },
  // P_mangel
  { folder: 'P_mangel', file: 'ref_1.jpg', asset: require('./P_mangel/ref_1.jpg') },
  { folder: 'P_mangel', file: 'ref_2.jpg', asset: require('./P_mangel/ref_2.jpg') },
  { folder: 'P_mangel', file: 'ref_3.jpg', asset: require('./P_mangel/ref_3.jpg') },
  // S_mangel
  { folder: 'S_mangel', file: 'ref_1.jpg', asset: require('./S_mangel/ref_1.jpg') },
  { folder: 'S_mangel', file: 'ref_2.jpg', asset: require('./S_mangel/ref_2.jpg') },
  { folder: 'S_mangel', file: 'ref_3.jpg', asset: require('./S_mangel/ref_3.jpg') },
  // Zn_mangel
  { folder: 'Zn_mangel', file: 'ref_1.jpg', asset: require('./Zn_mangel/ref_1.jpg') },
  { folder: 'Zn_mangel', file: 'ref_2.jpg', asset: require('./Zn_mangel/ref_2.jpg') },
  { folder: 'Zn_mangel', file: 'ref_3.jpg', asset: require('./Zn_mangel/ref_3.jpg') },
];

export default registry;
