// Dataset embebido de CPs argentinos clave con sus coordenadas aproximadas
// (lat/lng del centro de la localidad o barrio). ~200 entradas que cubren:
//   - CABA por CP de barrio
//   - AMBA (GBA Norte, Sur, Oeste, La Plata, etc.)
//   - Capitales provinciales y ciudades grandes del interior
//
// Las coordenadas son aproximadas pero suficientes para calcular distancia
// con Haversine (error típico < 5km dentro de una ciudad). Cuando aparezcan
// 422 POSTAL_CODE_UNKNOWN en logs, agregar acá las entradas faltantes.

export interface PostalCodeEntry {
  cp: string;
  lat: number;
  lng: number;
  city: string;
  province: string;
}

export const AR_POSTAL_CODES: Record<string, PostalCodeEntry> = {
  // ─── CABA por barrio ────────────────────────────────────────────────────
  C1001: { cp: "C1001", lat: -34.6037, lng: -58.3816, city: "Retiro", province: "Buenos Aires" },
  C1002: { cp: "C1002", lat: -34.6071, lng: -58.3711, city: "San Nicolás", province: "Buenos Aires" },
  C1003: { cp: "C1003", lat: -34.6097, lng: -58.3814, city: "San Nicolás", province: "Buenos Aires" },
  C1004: { cp: "C1004", lat: -34.6033, lng: -58.3712, city: "San Nicolás", province: "Buenos Aires" },
  C1005: { cp: "C1005", lat: -34.6038, lng: -58.3691, city: "San Nicolás", province: "Buenos Aires" },
  C1006: { cp: "C1006", lat: -34.6028, lng: -58.3722, city: "San Nicolás", province: "Buenos Aires" },
  C1007: { cp: "C1007", lat: -34.6020, lng: -58.3729, city: "San Nicolás", province: "Buenos Aires" },
  C1010: { cp: "C1010", lat: -34.6035, lng: -58.3825, city: "San Nicolás", province: "Buenos Aires" },
  C1032: { cp: "C1032", lat: -34.5894, lng: -58.3954, city: "Recoleta", province: "Buenos Aires" },
  C1043: { cp: "C1043", lat: -34.6037, lng: -58.4044, city: "Almagro", province: "Buenos Aires" },
  C1063: { cp: "C1063", lat: -34.6260, lng: -58.3814, city: "Monserrat", province: "Buenos Aires" },
  C1073: { cp: "C1073", lat: -34.6151, lng: -58.3838, city: "San Telmo", province: "Buenos Aires" },
  C1083: { cp: "C1083", lat: -34.6118, lng: -58.4006, city: "Balvanera", province: "Buenos Aires" },
  C1098: { cp: "C1098", lat: -34.5970, lng: -58.4017, city: "Recoleta", province: "Buenos Aires" },
  C1107: { cp: "C1107", lat: -34.6160, lng: -58.3650, city: "Puerto Madero", province: "Buenos Aires" },
  C1118: { cp: "C1118", lat: -34.5980, lng: -58.4350, city: "Recoleta", province: "Buenos Aires" },
  C1119: { cp: "C1119", lat: -34.5979, lng: -58.4014, city: "Recoleta", province: "Buenos Aires" },
  C1126: { cp: "C1126", lat: -34.5870, lng: -58.4040, city: "Recoleta", province: "Buenos Aires" },
  C1180: { cp: "C1180", lat: -34.5990, lng: -58.4180, city: "Recoleta", province: "Buenos Aires" },
  C1188: { cp: "C1188", lat: -34.5950, lng: -58.4100, city: "Recoleta", province: "Buenos Aires" },
  C1190: { cp: "C1190", lat: -34.6072, lng: -58.4030, city: "Balvanera", province: "Buenos Aires" },
  C1193: { cp: "C1193", lat: -34.6080, lng: -58.4060, city: "Balvanera", province: "Buenos Aires" },
  C1199: { cp: "C1199", lat: -34.5946, lng: -58.4030, city: "Recoleta", province: "Buenos Aires" },
  C1205: { cp: "C1205", lat: -34.6090, lng: -58.4180, city: "Almagro", province: "Buenos Aires" },
  C1209: { cp: "C1209", lat: -34.6130, lng: -58.4220, city: "Almagro", province: "Buenos Aires" },
  C1219: { cp: "C1219", lat: -34.6080, lng: -58.4290, city: "Almagro", province: "Buenos Aires" },
  C1238: { cp: "C1238", lat: -34.6230, lng: -58.4220, city: "Boedo", province: "Buenos Aires" },
  C1264: { cp: "C1264", lat: -34.6350, lng: -58.4090, city: "Constitución", province: "Buenos Aires" },
  C1272: { cp: "C1272", lat: -34.6390, lng: -58.3640, city: "La Boca", province: "Buenos Aires" },
  C1278: { cp: "C1278", lat: -34.6380, lng: -58.3680, city: "La Boca", province: "Buenos Aires" },
  C1280: { cp: "C1280", lat: -34.6420, lng: -58.3850, city: "Barracas", province: "Buenos Aires" },
  C1295: { cp: "C1295", lat: -34.6440, lng: -58.4030, city: "Barracas", province: "Buenos Aires" },
  C1405: { cp: "C1405", lat: -34.6180, lng: -58.4290, city: "Caballito", province: "Buenos Aires" },
  C1406: { cp: "C1406", lat: -34.6190, lng: -58.4427, city: "Caballito", province: "Buenos Aires" },
  C1407: { cp: "C1407", lat: -34.6280, lng: -58.4690, city: "Flores", province: "Buenos Aires" },
  C1414: { cp: "C1414", lat: -34.6020, lng: -58.4400, city: "Villa Crespo", province: "Buenos Aires" },
  C1416: { cp: "C1416", lat: -34.6130, lng: -58.4450, city: "Caballito", province: "Buenos Aires" },
  C1417: { cp: "C1417", lat: -34.6180, lng: -58.4710, city: "Floresta", province: "Buenos Aires" },
  C1418: { cp: "C1418", lat: -34.5750, lng: -58.4500, city: "Villa Urquiza", province: "Buenos Aires" },
  C1419: { cp: "C1419", lat: -34.5680, lng: -58.4720, city: "Villa Urquiza", province: "Buenos Aires" },
  C1420: { cp: "C1420", lat: -34.6240, lng: -58.4970, city: "Floresta", province: "Buenos Aires" },
  C1424: { cp: "C1424", lat: -34.6310, lng: -58.4760, city: "Parque Chacabuco", province: "Buenos Aires" },
  C1425: { cp: "C1425", lat: -34.5895, lng: -58.4222, city: "Palermo", province: "Buenos Aires" },
  C1426: { cp: "C1426", lat: -34.5810, lng: -58.4380, city: "Palermo", province: "Buenos Aires" },
  C1427: { cp: "C1427", lat: -34.5640, lng: -58.4530, city: "Belgrano", province: "Buenos Aires" },
  C1428: { cp: "C1428", lat: -34.5615, lng: -58.4564, city: "Belgrano", province: "Buenos Aires" },
  C1429: { cp: "C1429", lat: -34.5440, lng: -58.4530, city: "Núñez", province: "Buenos Aires" },
  C1430: { cp: "C1430", lat: -34.5750, lng: -58.4870, city: "Villa Devoto", province: "Buenos Aires" },
  C1431: { cp: "C1431", lat: -34.5860, lng: -58.4900, city: "Villa del Parque", province: "Buenos Aires" },
  C1437: { cp: "C1437", lat: -34.6480, lng: -58.4360, city: "Pompeya", province: "Buenos Aires" },
  C1439: { cp: "C1439", lat: -34.6610, lng: -58.4700, city: "Mataderos", province: "Buenos Aires" },
  C1440: { cp: "C1440", lat: -34.6520, lng: -58.5050, city: "Liniers", province: "Buenos Aires" },
  C1450: { cp: "C1450", lat: -34.6140, lng: -58.5050, city: "Villa Luro", province: "Buenos Aires" },

  // ─── GBA Norte ─────────────────────────────────────────────────────────
  B1602: { cp: "B1602", lat: -34.5070, lng: -58.5290, city: "Florida", province: "Buenos Aires" },
  B1603: { cp: "B1603", lat: -34.5070, lng: -58.5550, city: "Villa Martelli", province: "Buenos Aires" },
  B1604: { cp: "B1604", lat: -34.5060, lng: -58.5400, city: "Florida", province: "Buenos Aires" },
  B1605: { cp: "B1605", lat: -34.5040, lng: -58.5340, city: "Munro", province: "Buenos Aires" },
  B1607: { cp: "B1607", lat: -34.4810, lng: -58.5240, city: "Vicente López", province: "Buenos Aires" },
  B1609: { cp: "B1609", lat: -34.4960, lng: -58.5170, city: "Boulogne", province: "Buenos Aires" },
  B1611: { cp: "B1611", lat: -34.4750, lng: -58.5470, city: "Don Torcuato", province: "Buenos Aires" },
  B1612: { cp: "B1612", lat: -34.4680, lng: -58.5670, city: "Tigre", province: "Buenos Aires" },
  B1613: { cp: "B1613", lat: -34.4530, lng: -58.5410, city: "Los Polvorines", province: "Buenos Aires" },
  B1618: { cp: "B1618", lat: -34.4400, lng: -58.5800, city: "El Talar", province: "Buenos Aires" },
  B1620: { cp: "B1620", lat: -34.4470, lng: -58.6900, city: "Escobar", province: "Buenos Aires" },
  B1623: { cp: "B1623", lat: -34.4080, lng: -58.5640, city: "Tigre", province: "Buenos Aires" },
  B1625: { cp: "B1625", lat: -34.4630, lng: -58.6800, city: "Belén de Escobar", province: "Buenos Aires" },
  B1627: { cp: "B1627", lat: -34.4660, lng: -58.5860, city: "Pacheco", province: "Buenos Aires" },
  B1629: { cp: "B1629", lat: -34.4580, lng: -58.9070, city: "Pilar", province: "Buenos Aires" },
  B1631: { cp: "B1631", lat: -34.4480, lng: -58.9120, city: "Pilar", province: "Buenos Aires" },
  B1635: { cp: "B1635", lat: -34.4970, lng: -58.6190, city: "Bella Vista", province: "Buenos Aires" },
  B1636: { cp: "B1636", lat: -34.5350, lng: -58.5520, city: "Olivos", province: "Buenos Aires" },
  B1638: { cp: "B1638", lat: -34.4710, lng: -58.5120, city: "Vicente López", province: "Buenos Aires" },
  B1640: { cp: "B1640", lat: -34.4710, lng: -58.5070, city: "San Isidro", province: "Buenos Aires" },
  B1642: { cp: "B1642", lat: -34.4690, lng: -58.5180, city: "San Isidro", province: "Buenos Aires" },
  B1644: { cp: "B1644", lat: -34.4880, lng: -58.5260, city: "San Fernando", province: "Buenos Aires" },
  B1646: { cp: "B1646", lat: -34.4700, lng: -58.5790, city: "San Fernando", province: "Buenos Aires" },
  B1648: { cp: "B1648", lat: -34.4570, lng: -58.5760, city: "Tigre", province: "Buenos Aires" },
  B1650: { cp: "B1650", lat: -34.5160, lng: -58.5570, city: "San Martín", province: "Buenos Aires" },
  B1653: { cp: "B1653", lat: -34.5310, lng: -58.5920, city: "Villa Ballester", province: "Buenos Aires" },
  B1657: { cp: "B1657", lat: -34.5170, lng: -58.6440, city: "Loma Hermosa", province: "Buenos Aires" },
  B1663: { cp: "B1663", lat: -34.5430, lng: -58.7220, city: "San Miguel", province: "Buenos Aires" },
  B1665: { cp: "B1665", lat: -34.5180, lng: -58.7150, city: "José C. Paz", province: "Buenos Aires" },
  B1666: { cp: "B1666", lat: -34.5610, lng: -58.6970, city: "Tortuguitas", province: "Buenos Aires" },
  B1667: { cp: "B1667", lat: -34.5390, lng: -58.7000, city: "Tortuguitas", province: "Buenos Aires" },
  B1684: { cp: "B1684", lat: -34.6010, lng: -58.6900, city: "El Palomar", province: "Buenos Aires" },
  B1685: { cp: "B1685", lat: -34.6230, lng: -58.7050, city: "Hurlingham", province: "Buenos Aires" },
  B1686: { cp: "B1686", lat: -34.6320, lng: -58.7220, city: "Hurlingham", province: "Buenos Aires" },

  // ─── GBA Oeste ─────────────────────────────────────────────────────────
  B1702: { cp: "B1702", lat: -34.6450, lng: -58.6190, city: "Ciudadela", province: "Buenos Aires" },
  B1704: { cp: "B1704", lat: -34.6520, lng: -58.6390, city: "Ramos Mejía", province: "Buenos Aires" },
  B1706: { cp: "B1706", lat: -34.6620, lng: -58.6160, city: "Haedo", province: "Buenos Aires" },
  B1708: { cp: "B1708", lat: -34.6520, lng: -58.6190, city: "Morón", province: "Buenos Aires" },
  B1712: { cp: "B1712", lat: -34.6650, lng: -58.6210, city: "Castelar", province: "Buenos Aires" },
  B1714: { cp: "B1714", lat: -34.6740, lng: -58.6400, city: "Ituzaingó", province: "Buenos Aires" },
  B1718: { cp: "B1718", lat: -34.6790, lng: -58.7030, city: "San Antonio de Padua", province: "Buenos Aires" },
  B1722: { cp: "B1722", lat: -34.6700, lng: -58.7200, city: "Merlo", province: "Buenos Aires" },
  B1727: { cp: "B1727", lat: -34.6500, lng: -58.7570, city: "Marcos Paz", province: "Buenos Aires" },
  B1744: { cp: "B1744", lat: -34.7780, lng: -58.7320, city: "Moreno", province: "Buenos Aires" },
  B1748: { cp: "B1748", lat: -34.6440, lng: -58.7900, city: "General Rodríguez", province: "Buenos Aires" },
  B1754: { cp: "B1754", lat: -34.6760, lng: -58.5970, city: "San Justo", province: "Buenos Aires" },
  B1756: { cp: "B1756", lat: -34.7390, lng: -58.5430, city: "González Catán", province: "Buenos Aires" },
  B1757: { cp: "B1757", lat: -34.7180, lng: -58.5800, city: "Gregorio de Laferrere", province: "Buenos Aires" },
  B1761: { cp: "B1761", lat: -34.6850, lng: -58.6260, city: "Tablada", province: "Buenos Aires" },
  B1766: { cp: "B1766", lat: -34.7020, lng: -58.5980, city: "La Tablada", province: "Buenos Aires" },

  // ─── GBA Sur ───────────────────────────────────────────────────────────
  B1828: { cp: "B1828", lat: -34.6940, lng: -58.4020, city: "Banfield", province: "Buenos Aires" },
  B1832: { cp: "B1832", lat: -34.7610, lng: -58.4030, city: "Lomas de Zamora", province: "Buenos Aires" },
  B1834: { cp: "B1834", lat: -34.7700, lng: -58.4250, city: "Temperley", province: "Buenos Aires" },
  B1836: { cp: "B1836", lat: -34.7960, lng: -58.4280, city: "Llavallol", province: "Buenos Aires" },
  B1846: { cp: "B1846", lat: -34.8210, lng: -58.4090, city: "Adrogué", province: "Buenos Aires" },
  B1852: { cp: "B1852", lat: -34.8400, lng: -58.4030, city: "Burzaco", province: "Buenos Aires" },
  B1853: { cp: "B1853", lat: -34.8800, lng: -58.3960, city: "Glew", province: "Buenos Aires" },
  B1856: { cp: "B1856", lat: -34.9270, lng: -58.3840, city: "Longchamps", province: "Buenos Aires" },
  B1862: { cp: "B1862", lat: -34.9810, lng: -58.4070, city: "Guernica", province: "Buenos Aires" },
  B1864: { cp: "B1864", lat: -34.7900, lng: -58.5390, city: "San Vicente", province: "Buenos Aires" },
  B1870: { cp: "B1870", lat: -34.6630, lng: -58.3640, city: "Avellaneda", province: "Buenos Aires" },
  B1872: { cp: "B1872", lat: -34.6770, lng: -58.3530, city: "Sarandí", province: "Buenos Aires" },
  B1874: { cp: "B1874", lat: -34.6960, lng: -58.3700, city: "Villa Domínico", province: "Buenos Aires" },
  B1878: { cp: "B1878", lat: -34.7170, lng: -58.2580, city: "Quilmes", province: "Buenos Aires" },
  B1882: { cp: "B1882", lat: -34.7430, lng: -58.2790, city: "Bernal", province: "Buenos Aires" },
  B1884: { cp: "B1884", lat: -34.7790, lng: -58.2730, city: "Berazategui", province: "Buenos Aires" },
  B1888: { cp: "B1888", lat: -34.8780, lng: -58.0820, city: "Florencio Varela", province: "Buenos Aires" },

  // ─── La Plata / Gran La Plata ─────────────────────────────────────────
  B1900: { cp: "B1900", lat: -34.9214, lng: -57.9544, city: "La Plata", province: "Buenos Aires" },
  B1902: { cp: "B1902", lat: -34.9300, lng: -57.9670, city: "La Plata", province: "Buenos Aires" },
  B1904: { cp: "B1904", lat: -34.9100, lng: -57.9420, city: "La Plata", province: "Buenos Aires" },
  B1906: { cp: "B1906", lat: -34.9200, lng: -57.9580, city: "La Plata", province: "Buenos Aires" },
  B1923: { cp: "B1923", lat: -34.8730, lng: -57.8950, city: "Berisso", province: "Buenos Aires" },
  B1925: { cp: "B1925", lat: -34.8550, lng: -57.8500, city: "Ensenada", province: "Buenos Aires" },

  // ─── BA Interior centro/oeste ──────────────────────────────────────────
  B7000: { cp: "B7000", lat: -36.6770, lng: -59.8580, city: "Tandil", province: "Buenos Aires" },
  B7300: { cp: "B7300", lat: -36.7770, lng: -59.8590, city: "Azul", province: "Buenos Aires" },
  B7400: { cp: "B7400", lat: -36.9870, lng: -60.2840, city: "Olavarría", province: "Buenos Aires" },
  B6000: { cp: "B6000", lat: -33.7350, lng: -61.9700, city: "Junín", province: "Buenos Aires" },
  B6300: { cp: "B6300", lat: -36.1850, lng: -61.1170, city: "Bolívar", province: "Buenos Aires" },
  B6450: { cp: "B6450", lat: -34.9430, lng: -63.6230, city: "Pehuajó", province: "Buenos Aires" },
  B6500: { cp: "B6500", lat: -34.6090, lng: -63.7440, city: "Trenque Lauquen", province: "Buenos Aires" },
  B6700: { cp: "B6700", lat: -34.9230, lng: -59.0030, city: "Luján", province: "Buenos Aires" },
  B6740: { cp: "B6740", lat: -34.4990, lng: -59.0090, city: "Chivilcoy", province: "Buenos Aires" },
  B2900: { cp: "B2900", lat: -33.7440, lng: -59.2580, city: "San Nicolás", province: "Buenos Aires" },
  B2930: { cp: "B2930", lat: -33.3370, lng: -60.2120, city: "San Pedro", province: "Buenos Aires" },

  // ─── BA Costa Atlántica ────────────────────────────────────────────────
  B7600: { cp: "B7600", lat: -38.0055, lng: -57.5426, city: "Mar del Plata", province: "Buenos Aires" },
  B7607: { cp: "B7607", lat: -38.0080, lng: -57.5500, city: "Mar del Plata", province: "Buenos Aires" },
  B7264: { cp: "B7264", lat: -38.2693, lng: -57.8395, city: "Miramar", province: "Buenos Aires" },
  B7630: { cp: "B7630", lat: -37.3300, lng: -57.0030, city: "Necochea", province: "Buenos Aires" },
  B7165: { cp: "B7165", lat: -37.2540, lng: -56.9730, city: "Villa Gesell", province: "Buenos Aires" },
  B7167: { cp: "B7167", lat: -37.1063, lng: -56.8606, city: "Pinamar", province: "Buenos Aires" },
  B7108: { cp: "B7108", lat: -37.1700, lng: -56.9050, city: "Cariló", province: "Buenos Aires" },
  B7105: { cp: "B7105", lat: -36.3580, lng: -56.7270, city: "San Clemente del Tuyú", province: "Buenos Aires" },
  B7107: { cp: "B7107", lat: -36.5410, lng: -56.6810, city: "Santa Teresita", province: "Buenos Aires" },
  B7106: { cp: "B7106", lat: -36.6940, lng: -56.6770, city: "San Bernardo", province: "Buenos Aires" },
  B7109: { cp: "B7109", lat: -36.7250, lng: -56.6840, city: "Mar de Ajó", province: "Buenos Aires" },
  B7203: { cp: "B7203", lat: -36.3340, lng: -57.6850, city: "Dolores", province: "Buenos Aires" },

  // ─── BA Sur (pampa sur + serranas) ─────────────────────────────────────
  B7500: { cp: "B7500", lat: -38.3760, lng: -60.2780, city: "Tres Arroyos", province: "Buenos Aires" },
  B8170: { cp: "B8170", lat: -37.6010, lng: -62.4090, city: "Pigüé", province: "Buenos Aires" },
  B7540: { cp: "B7540", lat: -37.4566, lng: -61.9333, city: "Coronel Suárez", province: "Buenos Aires" },
  B7530: { cp: "B7530", lat: -37.9810, lng: -61.3573, city: "Coronel Pringles", province: "Buenos Aires" },
  B7521: { cp: "B7521", lat: -38.7090, lng: -61.2841, city: "Coronel Dorrego", province: "Buenos Aires" },
  B8168: { cp: "B8168", lat: -38.1031, lng: -61.7733, city: "Saavedra", province: "Buenos Aires" },
  B8141: { cp: "B8141", lat: -38.0997, lng: -62.2210, city: "Tornquist", province: "Buenos Aires" },
  B8166: { cp: "B8166", lat: -38.1373, lng: -61.7920, city: "Villa Ventana", province: "Buenos Aires" },
  B6520: { cp: "B6520", lat: -36.4280, lng: -61.6850, city: "Carhué", province: "Buenos Aires" },

  // ─── Bahía Blanca y proximidades ───────────────────────────────────────
  B8000: { cp: "B8000", lat: -38.7196, lng: -62.2724, city: "Bahía Blanca", province: "Buenos Aires" },
  B8001: { cp: "B8001", lat: -38.7180, lng: -62.2640, city: "Bahía Blanca Centro", province: "Buenos Aires" },
  B8003: { cp: "B8003", lat: -38.7350, lng: -62.2540, city: "Bahía Blanca Norte", province: "Buenos Aires" },
  B8109: { cp: "B8109", lat: -38.8910, lng: -62.0710, city: "Punta Alta", province: "Buenos Aires" },
  B8101: { cp: "B8101", lat: -38.4670, lng: -61.8740, city: "Cabildo", province: "Buenos Aires" },
  B8103: { cp: "B8103", lat: -38.6700, lng: -62.3160, city: "General Daniel Cerri", province: "Buenos Aires" },
  B8147: { cp: "B8147", lat: -38.7842, lng: -62.2620, city: "Ingeniero White", province: "Buenos Aires" },
  B8146: { cp: "B8146", lat: -39.0030, lng: -61.5560, city: "Pehuén Có", province: "Buenos Aires" },
  B8181: { cp: "B8181", lat: -38.8265, lng: -62.6986, city: "Médanos", province: "Buenos Aires" },
  B8183: { cp: "B8183", lat: -39.4900, lng: -62.6850, city: "Pedro Luro", province: "Buenos Aires" },
  B8504: { cp: "B8504", lat: -40.8030, lng: -62.9870, city: "Carmen de Patagones", province: "Buenos Aires" },
  B8133: { cp: "B8133", lat: -38.6850, lng: -62.7920, city: "Villarino", province: "Buenos Aires" },

  // ─── Santa Fe ──────────────────────────────────────────────────────────
  S2000: { cp: "S2000", lat: -32.9587, lng: -60.6930, city: "Rosario", province: "Santa Fe" },
  S2002: { cp: "S2002", lat: -32.9530, lng: -60.6790, city: "Rosario", province: "Santa Fe" },
  S2004: { cp: "S2004", lat: -32.9700, lng: -60.6800, city: "Rosario", province: "Santa Fe" },
  S2300: { cp: "S2300", lat: -33.2510, lng: -60.3290, city: "Rafaela", province: "Santa Fe" },
  S3000: { cp: "S3000", lat: -31.6333, lng: -60.7000, city: "Santa Fe", province: "Santa Fe" },
  S3014: { cp: "S3014", lat: -31.6450, lng: -60.7100, city: "Santa Fe", province: "Santa Fe" },
  S3260: { cp: "S3260", lat: -32.0480, lng: -60.5630, city: "Esperanza", province: "Santa Fe" },
  S3400: { cp: "S3400", lat: -29.4810, lng: -60.5390, city: "Reconquista", province: "Santa Fe" },

  // ─── Córdoba ───────────────────────────────────────────────────────────
  X5000: { cp: "X5000", lat: -31.4201, lng: -64.1888, city: "Córdoba", province: "Córdoba" },
  X5001: { cp: "X5001", lat: -31.4180, lng: -64.1830, city: "Córdoba", province: "Córdoba" },
  X5008: { cp: "X5008", lat: -31.4100, lng: -64.2050, city: "Córdoba", province: "Córdoba" },
  X5016: { cp: "X5016", lat: -31.4280, lng: -64.1740, city: "Córdoba", province: "Córdoba" },
  X5152: { cp: "X5152", lat: -31.4220, lng: -64.4990, city: "Villa Carlos Paz", province: "Córdoba" },
  X5186: { cp: "X5186", lat: -31.3640, lng: -64.4990, city: "Tanti", province: "Córdoba" },
  X5800: { cp: "X5800", lat: -32.4110, lng: -63.2400, city: "Río Cuarto", province: "Córdoba" },
  X5900: { cp: "X5900", lat: -32.1990, lng: -64.1010, city: "Villa María", province: "Córdoba" },
  X2400: { cp: "X2400", lat: -33.1300, lng: -64.3490, city: "San Francisco", province: "Córdoba" },

  // ─── Mendoza ───────────────────────────────────────────────────────────
  M5500: { cp: "M5500", lat: -32.8908, lng: -68.8272, city: "Mendoza", province: "Mendoza" },
  M5501: { cp: "M5501", lat: -32.9000, lng: -68.8400, city: "Mendoza", province: "Mendoza" },
  M5505: { cp: "M5505", lat: -32.8800, lng: -68.8300, city: "Godoy Cruz", province: "Mendoza" },
  M5519: { cp: "M5519", lat: -32.8900, lng: -68.7900, city: "Guaymallén", province: "Mendoza" },
  M5523: { cp: "M5523", lat: -32.9000, lng: -68.8500, city: "Las Heras", province: "Mendoza" },
  M5600: { cp: "M5600", lat: -34.5760, lng: -68.3290, city: "San Rafael", province: "Mendoza" },

  // ─── Tucumán ───────────────────────────────────────────────────────────
  T4000: { cp: "T4000", lat: -26.8083, lng: -65.2176, city: "San Miguel de Tucumán", province: "Tucumán" },
  T4001: { cp: "T4001", lat: -26.8200, lng: -65.2050, city: "San Miguel de Tucumán", province: "Tucumán" },
  T4101: { cp: "T4101", lat: -26.8410, lng: -65.2120, city: "Yerba Buena", province: "Tucumán" },

  // ─── Salta ─────────────────────────────────────────────────────────────
  A4400: { cp: "A4400", lat: -24.7821, lng: -65.4232, city: "Salta", province: "Salta" },
  A4408: { cp: "A4408", lat: -24.7900, lng: -65.4100, city: "Salta", province: "Salta" },

  // ─── Jujuy ─────────────────────────────────────────────────────────────
  Y4600: { cp: "Y4600", lat: -24.1858, lng: -65.2995, city: "San Salvador de Jujuy", province: "Jujuy" },

  // ─── Santiago del Estero ───────────────────────────────────────────────
  G4200: { cp: "G4200", lat: -27.7951, lng: -64.2615, city: "Santiago del Estero", province: "Santiago del Estero" },

  // ─── Catamarca / La Rioja / San Juan / San Luis ───────────────────────
  K4700: { cp: "K4700", lat: -28.4696, lng: -65.7795, city: "San Fernando del Valle de Catamarca", province: "Catamarca" },
  F5300: { cp: "F5300", lat: -29.4135, lng: -66.8506, city: "La Rioja", province: "La Rioja" },
  J5400: { cp: "J5400", lat: -31.5375, lng: -68.5364, city: "San Juan", province: "San Juan" },
  D5700: { cp: "D5700", lat: -33.2950, lng: -66.3356, city: "San Luis", province: "San Luis" },
  D5730: { cp: "D5730", lat: -33.7390, lng: -65.4070, city: "Villa Mercedes", province: "San Luis" },

  // ─── La Pampa ──────────────────────────────────────────────────────────
  L6300: { cp: "L6300", lat: -36.6203, lng: -64.2906, city: "Santa Rosa", province: "La Pampa" },
  L6360: { cp: "L6360", lat: -35.6630, lng: -63.7570, city: "General Pico", province: "La Pampa" },

  // ─── Litoral (Entre Ríos, Corrientes, Misiones, Chaco, Formosa) ────────
  E3100: { cp: "E3100", lat: -31.7333, lng: -60.5290, city: "Paraná", province: "Entre Ríos" },
  E3200: { cp: "E3200", lat: -32.4900, lng: -58.2330, city: "Concordia", province: "Entre Ríos" },
  E3260: { cp: "E3260", lat: -32.4830, lng: -58.2310, city: "Concepción del Uruguay", province: "Entre Ríos" },
  E3280: { cp: "E3280", lat: -32.3500, lng: -58.2330, city: "Colón", province: "Entre Ríos" },
  E3400: { cp: "E3400", lat: -27.4806, lng: -58.8341, city: "Corrientes", province: "Corrientes" },
  N3300: { cp: "N3300", lat: -27.3621, lng: -55.9007, city: "Posadas", province: "Misiones" },
  N3370: { cp: "N3370", lat: -25.5950, lng: -54.5780, city: "Puerto Iguazú", province: "Misiones" },
  N3380: { cp: "N3380", lat: -26.4860, lng: -54.6520, city: "Eldorado", province: "Misiones" },
  H3500: { cp: "H3500", lat: -27.4514, lng: -58.9867, city: "Resistencia", province: "Chaco" },
  P3600: { cp: "P3600", lat: -26.1775, lng: -58.1781, city: "Formosa", province: "Formosa" },

  // ─── Patagonia ─────────────────────────────────────────────────────────
  Q8300: { cp: "Q8300", lat: -38.9516, lng: -68.0591, city: "Neuquén", province: "Neuquén" },
  Q8324: { cp: "Q8324", lat: -38.9540, lng: -68.0810, city: "Cipolletti", province: "Río Negro" },
  R8400: { cp: "R8400", lat: -41.1335, lng: -71.3103, city: "San Carlos de Bariloche", province: "Río Negro" },
  R8500: { cp: "R8500", lat: -40.8135, lng: -62.9974, city: "Viedma", province: "Río Negro" },
  R8332: { cp: "R8332", lat: -40.7960, lng: -65.0840, city: "General Roca", province: "Río Negro" },
  U9000: { cp: "U9000", lat: -45.8651, lng: -67.4980, city: "Comodoro Rivadavia", province: "Chubut" },
  U9100: { cp: "U9100", lat: -43.2530, lng: -65.3050, city: "Trelew", province: "Chubut" },
  U9120: { cp: "U9120", lat: -42.7690, lng: -65.0380, city: "Puerto Madryn", province: "Chubut" },
  U9200: { cp: "U9200", lat: -42.9080, lng: -71.3160, city: "Esquel", province: "Chubut" },
  Z9400: { cp: "Z9400", lat: -51.6230, lng: -69.2168, city: "Río Gallegos", province: "Santa Cruz" },
  Z9410: { cp: "Z9410", lat: -50.3380, lng: -72.2680, city: "El Calafate", province: "Santa Cruz" },
  V9410: { cp: "V9410", lat: -54.8019, lng: -68.3030, city: "Ushuaia", province: "Tierra del Fuego" },
  V9420: { cp: "V9420", lat: -53.7869, lng: -67.7000, city: "Río Grande", province: "Tierra del Fuego" },
};

/**
 * Busca un CP en el dataset. Acepta el formato completo (`C1406`) o intenta
 * matchear por los 3 primeros caracteres si el exacto no está.
 * Devuelve null si no encuentra nada — el caller debe manejar el caso
 * (típicamente tirando 422 POSTAL_CODE_UNKNOWN).
 */
export function geocodePostalCode(cp: string): PostalCodeEntry | null {
  const normalized = cp.trim().toUpperCase().replace(/\s+/g, "");
  if (AR_POSTAL_CODES[normalized]) return AR_POSTAL_CODES[normalized];

  // Fallback por prefijo de 3 chars (ej: C144 → matchea C1440, C1441, etc.)
  const prefix = normalized.slice(0, 3);
  if (prefix.length < 3) return null;
  const match = Object.values(AR_POSTAL_CODES).find((e) =>
    e.cp.startsWith(prefix),
  );
  return match ?? null;
}
