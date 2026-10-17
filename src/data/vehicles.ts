/** Car makes and their models (current and common recent ones), used as form suggestions. */
export const CAR_MODELS: Record<string, string[]> = {
  'Abarth': ['124 Spider', '500', '500e', '595', '600e', '695'],
  'Acura': ['ADX', 'ILX', 'Integra', 'MDX', 'NSX', 'RDX', 'RLX', 'TLX', 'ZDX'],
  'Alfa Romeo': ['4C', 'Brera', 'Giulia', 'Giulietta', 'Junior', 'MiTo', 'Stelvio', 'Tonale', '147', '156', '159'],
  'Alpine': ['A110', 'A290', 'A390'],
  'Aston Martin': ['DB11', 'DB12', 'DBS', 'DBX', 'Vantage', 'Vanquish'],
  'Audi': [
    'A1', 'A3', 'A4', 'A4 Allroad', 'A5', 'A6', 'A6 Allroad', 'A6 e-tron', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron',
    'Q5', 'Q6 e-tron', 'Q7', 'Q8', 'Q8 e-tron', 'R8', 'RS3', 'RS4', 'RS6', 'S3', 'S4', 'S5', 'TT', 'e-tron GT',
  ],
  'BAIC': ['BJ40', 'BJ60', 'X35', 'X55', 'X7', 'EU5'],
  'Bentley': ['Bentayga', 'Continental GT', 'Flying Spur', 'Mulsanne'],
  'BMW': [
    '1 Series', '2 Series', '2 Series Active Tourer', '2 Series Gran Coupé', '3 Series', '4 Series', '5 Series',
    '6 Series', '7 Series', '8 Series', 'i3', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX2', 'iX3', 'M2', 'M3', 'M4', 'M5',
    'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4',
  ],
  'BYD': ['Atto 2', 'Atto 3', 'Dolphin', 'Dolphin Surf', 'Han', 'Seal', 'Seal U', 'Sealion 7', 'Seagull', 'Song Plus', 'Tang', 'Yuan Plus'],
  'Buick': ['Enclave', 'Encore', 'Encore GX', 'Envision', 'Envista', 'LaCrosse', 'Regal'],
  'Cadillac': ['CT4', 'CT5', 'Escalade', 'Lyriq', 'Optiq', 'XT4', 'XT5', 'XT6'],
  'Changan': ['Alsvin', 'CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'CS85', 'CS95', 'Deepal S07', 'Eado', 'Hunter', 'Uni-K', 'Uni-T', 'Uni-V'],
  'Chery': ['Arrizo 5', 'Arrizo 6', 'Arrizo 8', 'Omoda 5', 'Tiggo 2', 'Tiggo 3', 'Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 8 Pro', 'Tiggo 9'],
  'Chevrolet': [
    'Aveo', 'Blazer', 'Bolt EV', 'Camaro', 'Captiva', 'Colorado', 'Corvette', 'Cruze', 'Equinox', 'Groove', 'Malibu',
    'Onix', 'Sail', 'Silverado', 'Spark', 'Suburban', 'Tahoe', 'Tracker', 'Trailblazer', 'Traverse', 'Trax',
  ],
  'Chrysler': ['300', 'Pacifica', 'Voyager'],
  'Citroën': [
    'Berlingo', 'C-Elysée', 'C1', 'C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C4 X', 'C5', 'C5 Aircross', 'C5 X',
    'DS3', 'Jumper', 'Jumpy', 'Nemo', 'SpaceTourer', 'ë-C3', 'ë-C4', 'Ami',
  ],
  'Cupra': ['Ateca', 'Born', 'Formentor', 'Leon', 'Tavascan', 'Terramar'],
  'Dacia': ['Bigster', 'Dokker', 'Duster', 'Jogger', 'Lodgy', 'Logan', 'Sandero', 'Sandero Stepway', 'Spring'],
  'Daewoo': ['Lanos', 'Matiz', 'Nexia', 'Nubira'],
  'Daihatsu': ['Ayla', 'Gran Max', 'Rocky', 'Sirion', 'Terios', 'Xenia'],
  'Dodge': ['Challenger', 'Charger', 'Durango', 'Hornet', 'Journey', 'Ram'],
  'DS': ['DS 3', 'DS 4', 'DS 5', 'DS 7', 'DS 9', 'N°8'],
  'Ferrari': ['296', '488', '812', 'F8', 'Portofino', 'Purosangue', 'Roma', 'SF90'],
  'Fiat': [
    '500', '500C', '500e', '500L', '500X', '600', 'Doblò', 'Ducato', 'Fiorino', 'Grande Panda', 'Panda', 'Punto',
    'Qubo', 'Talento', 'Tipo', 'Fullback',
  ],
  'Ford': [
    'Bronco', 'Bronco Sport', 'C-Max', 'EcoSport', 'Edge', 'Escape', 'Expedition', 'Explorer', 'F-150', 'Fiesta',
    'Focus', 'Fusion', 'Galaxy', 'Ka', 'Kuga', 'Maverick', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Ranger',
    'S-Max', 'Tourneo Connect', 'Tourneo Courier', 'Transit', 'Transit Custom',
  ],
  'Geely': ['Azkarra', 'Coolray', 'Emgrand', 'EX5', 'Geometry C', 'Monjaro', 'Okavango', 'Starray', 'Tugella'],
  'Genesis': ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  'GMC': ['Acadia', 'Canyon', 'Hummer EV', 'Sierra', 'Terrain', 'Yukon'],
  'Great Wall': ['Poer', 'Wingle 5', 'Wingle 7'],
  'Haval': ['H2', 'H6', 'H9', 'Jolion', 'Dargo'],
  'Honda': [
    'Accord', 'City', 'Civic', 'CR-V', 'e:Ny1', 'HR-V', 'Insight', 'Jazz', 'Odyssey', 'Passport', 'Pilot',
    'Prelude', 'Ridgeline', 'ZR-V',
  ],
  'Hyundai': [
    'Accent', 'Azera', 'Bayon', 'Creta', 'Elantra', 'Grand i10', 'H-1', 'i10', 'i20', 'i30', 'i40', 'Inster',
    'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Ioniq 9', 'ix35', 'Kona', 'Palisade', 'Santa Cruz', 'Santa Fe', 'Sonata',
    'Staria', 'Tucson', 'Venue',
  ],
  'Infiniti': ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  'Isuzu': ['D-Max', 'MU-X'],
  'Iveco': ['Daily'],
  'Jaguar': ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF', 'XJ'],
  'Jeep': ['Avenger', 'Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Renegade', 'Wagoneer', 'Wrangler'],
  'Jetour': ['Dashing', 'T1', 'T2', 'X70', 'X90'],
  'Kia': [
    'Carens', 'Carnival', 'Ceed', 'EV3', 'EV5', 'EV6', 'EV9', 'K5', 'Niro', 'Optima', 'Pegas', 'Picanto',
    'ProCeed', 'Rio', 'Seltos', 'Sonet', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Stonic', 'Telluride',
  ],
  'Lada': ['4x4 / Niva', 'Granta', 'Largus', 'Vesta', 'XRay'],
  'Lamborghini': ['Huracán', 'Revuelto', 'Temerario', 'Urus'],
  'Land Rover': [
    'Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Evoque',
    'Range Rover Sport', 'Range Rover Velar',
  ],
  'Leapmotor': ['B10', 'C10', 'T03'],
  'Lexus': ['ES', 'GX', 'IS', 'LBX', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'RZ', 'TX', 'UX'],
  'Lincoln': ['Aviator', 'Corsair', 'Nautilus', 'Navigator'],
  'Lotus': ['Eletre', 'Emeya', 'Emira', 'Evora'],
  'Lynk & Co': ['01', '02', '05', '08'],
  'Mahindra': ['Bolero', 'Scorpio', 'Thar', 'XUV300', 'XUV700', 'Pik Up'],
  'Maserati': ['Ghibli', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte'],
  'Mazda': ['2', '3', '6', 'BT-50', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-60', 'CX-80', 'CX-90', 'MX-30', 'MX-5'],
  'McLaren': ['720S', '750S', 'Artura', 'GT'],
  'Mercedes-Benz': [
    'A-Class', 'B-Class', 'C-Class', 'CLA', 'CLE', 'CLS', 'E-Class', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'G-Class',
    'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S-Class', 'SL', 'Citan', 'Sprinter', 'V-Class', 'Vito', 'X-Class',
  ],
  'MG': ['3', '4', '5', 'Cyberster', 'HS', 'ZS', 'Marvel R', 'RX5', 'S5', 'ZS EV', 'GT', 'One'],
  'Mini': ['Aceman', 'Clubman', 'Convertible', 'Cooper', 'Countryman', 'Paceman'],
  'Mitsubishi': ['ASX', 'Attrage', 'Colt', 'Eclipse Cross', 'L200', 'Lancer', 'Mirage', 'Outlander', 'Pajero', 'Pajero Sport', 'Space Star', 'Xpander'],
  'Nissan': [
    'Almera', 'Altima', 'Ariya', 'Frontier', 'Juke', 'Kicks', 'Leaf', 'Micra', 'Murano', 'Navara', 'Note',
    'Pathfinder', 'Patrol', 'Qashqai', 'Rogue', 'Sentra', 'Sunny', 'Terrano', 'Versa', 'X-Trail', 'Z',
  ],
  'Opel': [
    'Adam', 'Astra', 'Combo', 'Corsa', 'Crossland', 'Frontera', 'Grandland', 'Insignia', 'Meriva', 'Mokka',
    'Movano', 'Vivaro', 'Zafira',
  ],
  'Peugeot': [
    '107', '108', '206', '207', '208', '2008', '301', '307', '308', '3008', '407', '408', '5008', '508',
    'Bipper', 'Boxer', 'Expert', 'Landtrek', 'Partner', 'Rifter', 'Traveller', 'e-208', 'e-2008',
  ],
  'Polestar': ['2', '3', '4'],
  'Porsche': ['718 Boxster', '718 Cayman', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Proton': ['Persona', 'Saga', 'X50', 'X70'],
  'Ram': ['1500', '2500', '3500', 'ProMaster'],
  'Renault': [
    'Arkana', 'Austral', 'Captur', 'Clio', 'Espace', 'Express', 'Fluence', 'Kadjar', 'Kangoo', 'Koleos', 'Kwid',
    'Laguna', 'Master', 'Megane', 'Megane E-Tech', 'Rafale', 'Renault 4 E-Tech', 'Renault 5 E-Tech', 'Scenic',
    'Symbol', 'Talisman', 'Trafic', 'Twingo', 'Zoe',
  ],
  'Rolls-Royce': ['Cullinan', 'Ghost', 'Phantom', 'Spectre'],
  'Seat': ['Alhambra', 'Arona', 'Ateca', 'Ibiza', 'Leon', 'Mii', 'Tarraco', 'Toledo'],
  'Škoda': ['Elroq', 'Enyaq', 'Fabia', 'Kamiq', 'Karoq', 'Kodiaq', 'Octavia', 'Rapid', 'Scala', 'Superb', 'Yeti'],
  'Smart': ['#1', '#3', '#5', 'ForFour', 'ForTwo'],
  'SsangYong / KGM': ['Actyon', 'Korando', 'Musso', 'Rexton', 'Tivoli', 'Torres'],
  'Subaru': ['BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX', 'XV'],
  'Suzuki': [
    'Alto', 'Baleno', 'Celerio', 'Ciaz', 'Dzire', 'Ertiga', 'Grand Vitara', 'Ignis', 'Jimny', 'S-Cross', 'S-Presso',
    'Swace', 'Swift', 'Vitara', 'XL7',
  ],
  'Tata': ['Harrier', 'Nexon', 'Punch', 'Safari', 'Tiago', 'Xenon'],
  'Tesla': ['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y'],
  'Toyota': [
    '4Runner', 'Avalon', 'Aygo', 'Aygo X', 'bZ4X', 'C-HR', 'Camry', 'Corolla', 'Corolla Cross', 'Fortuner',
    'GR86', 'Highlander', 'Hilux', 'Land Cruiser', 'Land Cruiser Prado', 'Prius', 'Proace', 'RAV4', 'Rush',
    'Sequoia', 'Sienna', 'Supra', 'Tacoma', 'Tundra', 'Urban Cruiser', 'Yaris', 'Yaris Cross',
  ],
  'Volkswagen': [
    'Amarok', 'Arteon', 'Caddy', 'California', 'Crafter', 'Golf', 'Golf Variant', 'ID.3', 'ID.4', 'ID.5', 'ID.7',
    'ID. Buzz', 'Jetta', 'Multivan', 'Passat', 'Polo', 'Scirocco', 'Sharan', 'T-Cross', 'T-Roc', 'Taigo',
    'Tayron', 'Tiguan', 'Touareg', 'Touran', 'Transporter', 'Up!', 'Virtus',
  ],
  'Volvo': ['C40', 'EX30', 'EX40', 'EX90', 'S60', 'S90', 'V40', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
  'Xpeng': ['G6', 'G9', 'P7'],
  'Zeekr': ['001', '7X', 'X'],
};

export const CAR_MAKES = Object.keys(CAR_MODELS).sort((a, b) => a.localeCompare(b));

/** Models for a make, matched case-insensitively; empty for unknown makes. */
export function modelsFor(make: string): string[] {
  const key = CAR_MAKES.find((m) => m.toLowerCase() === make.trim().toLowerCase());
  return key ? CAR_MODELS[key] : [];
}

/** Fuel station brands, used as suggestions in the fill-up form. */
export const FUEL_STATIONS = [
  'ADNOC', 'Afriquia', 'Agil', 'Agip', 'Ampol', 'Aral', 'Auchan', 'Avia', 'BP', 'Bharat Petroleum', 'Caltex',
  'Carrefour', 'Casino', 'Cepsa / Moeve', 'Chevron', 'Circle K', 'Citgo', 'Costco', 'ENOC', 'Eni', 'Esso',
  'ExxonMobil', 'Galp', 'Gulf', 'HP (Hindustan Petroleum)', 'Indian Oil', 'Intermarché', 'Ipiranga', 'Jet',
  'Leclerc', 'Lukoil', 'Marathon', 'Mobil', 'MOL', 'Naftal', 'OiLibya', 'Ola Energy', 'OMV', 'Orlen', 'Pemex', 'Petrobras',
  'Petrom', 'Petromin', 'Petronas', 'Petro-Canada', 'Phillips 66', 'Q8', 'Repsol', 'Saudi Aramco', 'Shell',
  'Sinopec', 'Speedway', 'Star Oil', 'Sunoco', 'Super U', 'Tamoil', 'Texaco', 'TotalEnergies',
  'Valero', 'Vivo Energy', 'Winxo', 'YPF', '76',
].sort((a, b) => a.localeCompare(b));
