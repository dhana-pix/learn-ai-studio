export type Vec3Tuple = [number, number, number];

export type MriLayerId = 'exterior' | 'cryogenic' | 'magnet' | 'rf';

export type MriPartId =
  | 'front-shroud'
  | 'rear-housing'
  | 'patient-table'
  | 'cryo-turret'
  | 'vacuum-vessel'
  | 'helium-vessel'
  | 'superconducting-magnet'
  | 'shim-tray'
  | 'gradient-coil'
  | 'rf-body-coil'
  | 'bore-liner'
  | 'head-coil';

export type ViewMode = 'solid' | 'cutaway' | 'xray';

export interface MriLayerMeta {
  id: MriLayerId;
  order: number;
  name: string;
  shortName: string;
  subtitle: string;
  color: string;
  description: string;
}

export interface MriSpecItem {
  label: string;
  value: string;
}

export interface MriMicroDetail {
  name: string;
  subtitle: string;
  description: string;
  /** Local position inside the part group where the micro detail sits */
  localAnchor: Vec3Tuple;
  /** Camera offset relative to the micro anchor (world space) for macro close-up */
  cameraOffset: Vec3Tuple;
  specs: MriSpecItem[];
}

export interface MriPartMeta {
  id: MriPartId;
  code: string;
  layerId: MriLayerId;
  name: string;
  englishName: string;
  summary: string;
  functionDetail: string;
  /** Base world anchor of the part when fully assembled */
  baseAnchor: Vec3Tuple;
  /** Offset added at explode = 1.0 */
  explodeOffset: Vec3Tuple;
  /** Extra offset added when this specific part is detached individually */
  detachOffset: Vec3Tuple;
  /** Camera offset from part center when inspecting this part */
  focusCameraOffset: Vec3Tuple;
  /** Pin anchor offset from part group origin for 3D callout label */
  pinLocalOffset: Vec3Tuple;
  /** Whether cutaway mode hides or peels back this outer shell */
  cutawayBehavior: 'hide' | 'fade' | 'keep';
  /** Whether this part slides when the patient table moves into the bore */
  movesWithTable?: boolean;
  specs: MriSpecItem[];
  microDetail: MriMicroDetail;
}

export const MRI_LAYERS: MriLayerMeta[] = [
  {
    id: 'exterior',
    order: 1,
    name: 'Lapisan 1 · Eksterior & Antarmuka Pasien',
    shortName: 'Eksterior',
    subtitle: 'Casing Gantry, Panel Kontrol & Meja Pasien',
    color: '#2563eb',
    description:
      'Pelindung akustik berbahan komposit medis, layar sentuh operator ganda, headphone pneumatik, serta meja pasien bermotor presisi.',
  },
  {
    id: 'cryogenic',
    order: 2,
    name: 'Lapisan 2 · Sistem Kriogenik & Vakum',
    shortName: 'Kriogenik',
    subtitle: 'Coldhead 4.2 K, Bejana Vakum & Perisai Termal',
    color: '#0284c7',
    description:
      'Menjaga magnet superkonduktor pada suhu ultra-dingin 4,2 Kelvin (-269°C) menggunakan vakum tinggi, insulasi MLI, dan pendingin siklus tertutup.',
  },
  {
    id: 'magnet',
    order: 3,
    name: 'Lapisan 3 · Inti Magnet & Kumparan Gradien',
    shortName: 'Magnet & Gradien',
    subtitle: 'Superkonduktor NbTi 3.0T, Baki Shim & Gradien X/Y/Z',
    color: '#d97706',
    description:
      'Jantung pemindai MRI: kumparan superkonduktor Niobium-Titanium penghasil medan 3,0 Tesla, baki shim homogenitas, dan kumparan gradien pemetaan spasial.',
  },
  {
    id: 'rf',
    order: 4,
    name: 'Lapisan 4 · Sistem RF & Terowongan Bore',
    shortName: 'RF & Bore',
    subtitle: 'Birdcage RF 127,7 MHz, Bore 70 cm & Koil Kepala 32-Kanal',
    color: '#0d9488',
    description:
      'Pemancar dan penerima gelombang radio (RF) resonansi proton hidrogen, terowongan pasien dengan pencahayaan ambient, serta koil penerima lokal resolusi tinggi.',
  },
];

export const MRI_PARTS: MriPartMeta[] = [
  {
    id: 'front-shroud',
    code: '01',
    layerId: 'exterior',
    name: 'Casing Depan & Panel Sentuh Ganda',
    englishName: 'Front Gantry Shroud & Dual Touch Consoles',
    summary:
      'Penutup depan ergonomis dengan layar sentuh operator kiri-kanan, proyektor laser posisi, dan headphone peredam bising.',
    functionDetail:
      'Melindungi komponen internal dari debu dan sentuhan, meredam kebisingan akustik kumparan gradien, serta memudahkan radiografer memposisikan pasien langsung di samping bore.',
    baseAnchor: [0, 1.15, 0.56],
    explodeOffset: [0, 0.32, 2.35],
    detachOffset: [0, 0.2, 1.25],
    focusCameraOffset: [1.55, 0.55, 1.85],
    pinLocalOffset: [0.72, 1.62, 0.72],
    cutawayBehavior: 'fade',
    specs: [
      { label: 'Material Casing', value: 'ABS-PC Medis Non-Magnetik' },
      { label: 'Layar Operator', value: '2 × 10,1" Kapasitif' },
      { label: 'Laser Posisi', value: 'Kelas 1 (635 nm)' },
      { label: 'Redaman Suara', value: '-18 dB Akustik' },
    ],
    microDetail: {
      name: 'Panel Sentuh Kiri & Proyektor Laser Isocenter',
      subtitle: 'Operator Touchscreen & Crosshair Laser Module',
      description:
        'Layar sentuh kapasitif antarmagnetik yang menampilkan posisi meja pasien secara real-time, tombol berhenti darurat (E-Stop), serta modul laser penanda titik tengah pemindaian (isocenter).',
      localAnchor: [-0.62, 1.54, 0.80],
      cameraOffset: [-0.18, 0.08, 0.48],
      specs: [
        { label: 'Akurasi Laser', value: '±0,5 mm' },
        { label: 'Tombol Darurat', value: 'Mekanik Non-Fero' },
        { label: 'Konektor', value: 'Serat Optik Terisolasi' },
      ],
    },
  },
  {
    id: 'rear-housing',
    code: '02',
    layerId: 'exterior',
    name: 'Penutup Belakang & Peredam Akustik',
    englishName: 'Rear Acoustic Housing & Service Panels',
    summary:
      'Cangkang belakang komposit dengan panel akses servis, saluran pendingin udara, dan busa peredam getaran.',
    functionDetail:
      'Menutup akses teknisi menuju terminal busbar gradien, manifold air dingin, dan kotak elektronik RF di bagian belakang magnet sekaligus menekan getaran suara selama sekuens pemindaian cepat.',
    baseAnchor: [0, 1.15, -0.58],
    explodeOffset: [0, 0.0, -2.0],
    detachOffset: [0, 0.0, -1.25],
    focusCameraOffset: [-1.75, 0.65, -1.95],
    pinLocalOffset: [-0.82, 1.68, -0.68],
    cutawayBehavior: 'hide',
    specs: [
      { label: 'Struktur', value: 'Fiberglass Komposit' },
      { label: 'Panel Akses', value: '4 Pintu Kait Cepat' },
      { label: 'Sirkulasi Udara', value: '240 m³/jam' },
    ],
    microDetail: {
      name: 'Kait Servis Baja Nirkarat & Busa Peredam Akustik',
      subtitle: 'Non-Magnetic Service Latch & Acoustic Ribs',
      description:
        'Kait servis berbahan stainless steel austenitik 316L (non-feromagnetik) dan tulang peredam gelombang suara bergerigi untuk meredam resonansi frekuensi 500–2.000 Hz.',
      localAnchor: [0.82, 1.25, -0.55],
      cameraOffset: [0.46, 0.14, -0.34],
      specs: [
        { label: 'Paduan Logam', value: 'SS 316L Non-Magnetik' },
        { label: 'Tebal Busa', value: '35 mm Poliuretan' },
        { label: 'Kunci', value: 'Quarter-Turn Cam' },
      ],
    },
  },
  {
    id: 'patient-table',
    code: '03',
    layerId: 'exterior',
    name: 'Meja Pasien Bermotor & Aktuator',
    englishName: 'Motorized Patient Couch & Ball-Screw Drive',
    summary:
      'Meja geser serat karbon dengan bantalan ergonomis, kolom angkat teleskopik, pegangan dorong, dan roda kastor medis.',
    functionDetail:
      'Menggeser pasien masuk ke dalam bore 70 cm dengan ketepatan sub-milimeter menggunakan aktuator sekrup bola (ball-screw) serta menopang beban hingga 250 kg tanpa distorsi medan magnet.',
    baseAnchor: [0, 0.56, 1.72],
    explodeOffset: [0, 0.0, 2.25],
    detachOffset: [0, 0.0, 1.35],
    focusCameraOffset: [2.1, 0.95, 1.45],
    pinLocalOffset: [0.42, 0.98, 2.08],
    cutawayBehavior: 'keep',
    movesWithTable: true,
    specs: [
      { label: 'Beban Maksimal', value: '250 kg' },
      { label: 'Presisi Geser', value: '±0,2 mm' },
      { label: 'Material Papan', value: 'Komposit Serat Karbon' },
      { label: 'Rentang Gerak', value: '210 cm Horizontal' },
    ],
    microDetail: {
      name: 'Aktuator Sekrup Bola & Encoder Optik Presisi',
      subtitle: 'Precision Ball-Screw Linear Drive & Optical Encoder',
      description:
        'Mekanisme penggerak meja di bawah papan karbon yang terdiri dari batang ulir presisi, rel pemandu linear ganda, motor servo non-magnetik, dan piringan encoder optik untuk pelacakan posisi.',
      localAnchor: [0.0, 0.80, 1.98],
      cameraOffset: [0.48, 0.22, 0.42],
      specs: [
        { label: 'Pitch Ulir', value: '5,0 mm / putaran' },
        { label: 'Resolusi Encoder', value: '4.096 pulsa/rev' },
        { label: 'Pelumas', value: 'PFPE Bebas Silikon' },
      ],
    },
  },
  {
    id: 'cryo-turret',
    code: '04',
    layerId: 'cryogenic',
    name: 'Menara Coldhead & Pipa Quench',
    englishName: 'Cryocooler Coldhead Turret & Quench Vent',
    summary:
      'Unit pendingin kriogenik 2-tahap Gifford-McMahon di puncak gantry beserta katup pengaman tekanan dan pipa buang quench.',
    functionDetail:
      'Mendinginkan kembali uap helium menjadi cairan secara terus-menerus (zero boil-off) sehingga magnet tetap superkonduktif tanpa perlu pengisian helium rutin, dilengkapi pipa darurat quench ke luar gedung.',
    baseAnchor: [0, 2.38, -0.05],
    explodeOffset: [0, 1.15, -0.15],
    detachOffset: [0, 0.95, 0.0],
    focusCameraOffset: [1.45, 0.55, 1.35],
    pinLocalOffset: [0.36, 2.52, 0.15],
    cutawayBehavior: 'keep',
    specs: [
      { label: 'Tahap 1 / Tahap 2', value: '45 K / 4,2 K' },
      { label: 'Siklus Pendingin', value: 'Gifford-McMahon 1,2 Hz' },
      { label: 'Tekanan Kerja', value: '1,05 bar abs' },
    ],
    microDetail: {
      name: 'Kepala Pendingin 2-Tahap & Manometer Helium',
      subtitle: '2-Stage 4.2K Coldhead Regenerator & Burst Disc',
      description:
        'Silinder tembaga berlapis sirip pendingin dengan regenerator dua tingkat (45 K dan 4,2 K), flensa baut keliling, katup cakram pecah darurat (burst disc), serta pengukur tekanan helium.',
      localAnchor: [0.0, 2.36, -0.02],
      cameraOffset: [0.44, 0.16, 0.44],
      specs: [
        { label: 'Daya Dingin 4.2K', value: '1,5 Watt' },
        { label: 'Batas Burst Disc', value: '2,4 bar' },
        { label: 'Selang Fleksibel', value: 'Anyaman SS 316' },
      ],
    },
  },
  {
    id: 'vacuum-vessel',
    code: '05',
    layerId: 'cryogenic',
    name: 'Bejana Vakum Luar (OVC)',
    englishName: 'Outer Vacuum Cryostat Vessel',
    summary:
      'Tabung tekanan baja nirkarat bervakum tinggi dengan flensa baut keliling dan lapisan foil super-insulasi MLI.',
    functionDetail:
      'Berfungsi layaknya termos raksasa bertekanan vakum ultra-tinggi (10⁻⁶ mbar) untuk mencegah perpindahan panas konduksi dan konveksi dari suhu ruangan ke inti magnet 4,2 Kelvin.',
    baseAnchor: [0, 1.15, -0.02],
    explodeOffset: [-1.62, 0.22, -0.82],
    detachOffset: [-1.35, 0.18, -0.45],
    focusCameraOffset: [1.65, 0.65, 1.75],
    pinLocalOffset: [-0.94, 1.62, 0.22],
    cutawayBehavior: 'fade',
    specs: [
      { label: 'Tingkat Vakum', value: '1,0 × 10⁻⁶ mbar' },
      { label: 'Material Dinding', value: 'SS 304L 8 mm' },
      { label: 'Insulasi Termal', value: '40 Lapis Mylar MLI' },
    ],
    microDetail: {
      name: 'Flensa Vakum, Segel Viton & Lapisan Foil MLI',
      subtitle: 'Vacuum Flange Bolts, O-Ring Seal & Super-Insulation',
      description:
        'Sambungan flensa presisi dengan 24 baut heksagonal keliling, cincin segel vakum elastis, dan tumpukan lapisan tipis Mylar beraluminium (Multi-Layer Insulation) pemantul radiasi inframerah.',
      localAnchor: [0.68, 1.62, 0.56],
      cameraOffset: [0.36, 0.22, 0.46],
      specs: [
        { label: 'Jumlah Baut', value: '24 × M12 SS316' },
        { label: 'Laju Kebocoran', value: '< 10⁻⁹ mbar·L/s' },
        { label: 'Reflektivitas MLI', value: '98,5% IR' },
      ],
    },
  },
  {
    id: 'helium-vessel',
    code: '06',
    layerId: 'cryogenic',
    name: 'Perisai Termal 40K & Tangki Helium Cair',
    englishName: '40K Thermal Shield & Sealed Liquid Helium Vessel',
    summary:
      'Silinder perisai radiasi tembaga 40 Kelvin yang membungkus tangki helium cair tertutup rapat beserta koil kondensor mikro.',
    functionDetail:
      'Menyerap radiasi panas dari dinding luar sebelum mencapai tangki helium, lalu mendistribusikan helium cair bersuhu -269°C melalui pipa kondensor mikro untuk merendam kumparan superkonduktor.',
    baseAnchor: [0, 1.15, -0.02],
    explodeOffset: [1.62, 0.22, -0.62],
    detachOffset: [1.35, 0.18, -0.35],
    focusCameraOffset: [1.55, 0.55, 1.65],
    pinLocalOffset: [0.80, 1.65, 0.18],
    cutawayBehavior: 'fade',
    specs: [
      { label: 'Suhu Perisai', value: '40 K (-233 °C)' },
      { label: 'Volume Helium', value: '7 L (Siklus Tertutup)' },
      { label: 'Material Perisai', value: 'Tembaga OFHC 99,99%' },
    ],
    microDetail: {
      name: 'Sensor Suhu Cernox & Pipa Kondensor Mikro',
      subtitle: 'Cryogenic Cernox Sensor & Micro-Condenser Loops',
      description:
        'Pipa kapiler tembaga yang mengembunkan gas helium secara lokal di sekitar koil, dipantau oleh sensor resistansi tipis Cernox berpresisi milikelvin dengan konektor keramik vakum.',
      localAnchor: [0.56, 1.68, 0.42],
      cameraOffset: [0.38, 0.22, 0.42],
      specs: [
        { label: 'Akurasi Sensor', value: '±5 mK pada 4,2 K' },
        { label: 'Diameter Pipa', value: '8,0 mm Tembaga' },
        { label: 'Feedthrough', value: 'Keramik Alumina' },
      ],
    },
  },
  {
    id: 'superconducting-magnet',
    code: '07',
    layerId: 'magnet',
    name: 'Kumparan Magnet Superkonduktor 3.0T',
    englishName: '3.0T NbTi Superconducting Main Magnet Coils',
    summary:
      'Enam cincin solenoida utama dan koil perisai aktif berbahan kawat superkonduktor Niobium-Titanium yang menghasilkan medan statis 3,0 Tesla.',
    functionDetail:
      'Mengalirkan arus listrik persisten sebesar 520 Ampere tanpa hambatan listrik sedikit pun (0 Ohm) untuk menyelaraskan spin proton hidrogen di dalam tubuh pasien secara seragam.',
    baseAnchor: [0, 1.15, -0.02],
    explodeOffset: [0, 0.0, 0.0],
    detachOffset: [0, 0.48, 0.0],
    focusCameraOffset: [1.45, 0.52, 1.55],
    pinLocalOffset: [0.0, 1.88, 0.0],
    cutawayBehavior: 'keep',
    specs: [
      { label: 'Kekuatan Medan B₀', value: '3,0 Tesla (60.000× Bumi)' },
      { label: 'Arus Persisten', value: '520 Ampere (0 Ω)' },
      { label: 'Konduktor', value: 'Filamen NbTi / Cu' },
      { label: 'Panjang Kawat', value: '~42 km Terlilit' },
    ],
    microDetail: {
      name: 'Modul Penampang Filamen NbTi & Sakelar Persisten',
      subtitle: 'NbTi Copper-Matrix Filaments & Persistent Switch',
      description:
        'Blok sambungan superkonduktor yang memperlihatkan puluhan filamen mikroskopis Niobium-Titanium (berdiameter 25 mikrometer) tertanam dalam matriks tembaga penstabil beserta pemanas sakelar mode persisten.',
      localAnchor: [0.52, 1.48, 0.46],
      cameraOffset: [0.34, 0.14, 0.36],
      specs: [
        { label: 'Diameter Filamen', value: '25 µm NbTi' },
        { label: 'Rasio Cu : NbTi', value: '2,2 : 1' },
        { label: 'Suhu Kritis Tc', value: '9,2 Kelvin' },
      ],
    },
  },
  {
    id: 'shim-tray',
    code: '08',
    layerId: 'magnet',
    name: 'Baki Shim Pasif & Kalibrasi Homogenitas',
    englishName: 'Passive Ferro-Shim Trays & Homogeneity Ring',
    summary:
      '24 rel laci fiberglass G10 melingkar berisi keping pelat baja silikon terkalibrasi untuk meratakan keseragaman medan magnet.',
    functionDetail:
      'Mengoreksi ketidaksempurnaan mikro pada medan magnet utama B₀ hingga mencapai keseragaman di bawah 0,5 part-per-million (ppm) di seluruh volume pemindaian 50 cm.',
    baseAnchor: [0, 1.15, -0.02],
    explodeOffset: [-1.32, -0.14, 0.72],
    detachOffset: [-1.1, -0.05, 0.65],
    focusCameraOffset: [1.35, 0.45, 1.45],
    pinLocalOffset: [-0.56, 1.56, 0.36],
    cutawayBehavior: 'keep',
    specs: [
      { label: 'Jumlah Rel Baki', value: '24 Slot Sirkumferensial' },
      { label: 'Homogenitas Target', value: '< 0,5 ppm (45 cm DSV)' },
      { label: 'Material Pelat', value: 'Baja Silikon M19' },
    ],
    microDetail: {
      name: 'Kantong Pelat Baja Silikon Bernomor (Shim Pocket)',
      subtitle: 'Calibrated Silicon-Steel Shim Stack in G10 Rail',
      description:
        'Susunan pelat tipis baja silikon dengan ketebalan bertingkat (0,1 mm hingga 2,0 mm) yang dikunci rapat di dalam kantong komposit fiberglass G10 anti-getaran.',
      localAnchor: [0.39, 1.42, 0.44],
      cameraOffset: [0.32, 0.16, 0.36],
      specs: [
        { label: 'Ketebalan Pelat', value: '0,1 / 0,5 / 1,0 mm' },
        { label: 'Material Laci', value: 'Epoxy Fiberglass G10' },
        { label: 'Pengunci', value: 'Pin Kuningan Non-Fero' },
      ],
    },
  },
  {
    id: 'gradient-coil',
    code: '09',
    layerId: 'magnet',
    name: 'Kumparan Gradien X, Y, Z & Pendingin Air',
    englishName: '3-Axis Gradient Coil Assembly & Chilled Water Loops',
    summary:
      'Silinder resin epoksi dengan pola tembaga "sidik jari" Golay/Maxwell, pipa pendingin air spiral, dan busbar arus tinggi.',
    functionDetail:
      'Mengubah medan magnet secara linear di sumbu X, Y, dan Z ribuan kali per detik untuk mengkodekan posisi spasial setiap potongan citra 3D. Gaya Lorentz pada koil inilah sumber bunyi ketukan khas MRI.',
    baseAnchor: [0, 1.15, -0.02],
    explodeOffset: [1.32, -0.14, 0.85],
    detachOffset: [1.1, -0.05, 0.75],
    focusCameraOffset: [1.35, 0.48, 1.45],
    pinLocalOffset: [0.52, 1.54, 0.42],
    cutawayBehavior: 'keep',
    specs: [
      { label: 'Amplitudo Gradien', value: '45 mT/m per sumbu' },
      { label: 'Slew Rate', value: '200 T/m/s' },
      { label: 'Arus Puncak', value: '900 A / 2.000 V' },
      { label: 'Pendinginan', value: 'Air Deionisasi 18 °C' },
    ],
    microDetail: {
      name: 'Busbar Tembaga Arus Tinggi & Manifold Pendingin',
      subtitle: 'High-Current Laminated Busbars & Cooling Manifold',
      description:
        'Terminal tembaga berlapis epoksi penghantar arus pulsa 900 Ampere ke kumparan X, Y, dan Z, dipadukan dengan sambungan pipa air bertekanan kuningan untuk membuang panas hingga 25 kW.',
      localAnchor: [0.36, 1.38, 0.48],
      cameraOffset: [0.34, 0.16, 0.38],
      specs: [
        { label: 'Disipasi Panas', value: 'Hingga 25 kW' },
        { label: 'Aliran Air', value: '22 Liter/menit' },
        { label: 'Isolasi Tegangan', value: '5 kV Resin Epoksi' },
      ],
    },
  },
  {
    id: 'rf-body-coil',
    code: '10',
    layerId: 'rf',
    name: 'Kumparan Tubuh RF Birdcage',
    englishName: 'Quadrature RF Body Birdcage Resonator',
    summary:
      'Struktur sangkar burung 16 batang tembaga berlapis perak dengan cincin ujung dan kapasitor keramik tegangan tinggi.',
    functionDetail:
      'Memancarkan pulsa gelombang radio tepat pada frekuensi Larmor proton hidrogen (127,74 MHz untuk 3.0T) guna mengeksitasi atom tubuh secara seragam sebelum sinyal gema ditangkap kembali.',
    baseAnchor: [0, 1.15, -0.02],
    explodeOffset: [0, 0.34, 1.38],
    detachOffset: [0, 0.25, 1.12],
    focusCameraOffset: [1.22, 0.42, 1.28],
    pinLocalOffset: [0.0, 1.58, 0.42],
    cutawayBehavior: 'keep',
    specs: [
      { label: 'Frekuensi Larmor', value: '127,74 MHz (3.0T)' },
      { label: 'Jumlah Batang', value: '16 Rungs Quadrature' },
      { label: 'Daya RF Puncak', value: '35 kW Pulsa' },
    ],
    microDetail: {
      name: 'Kapasitor Keramik Tegangan Tinggi & Dioda PIN',
      subtitle: 'Non-Magnetic High-Voltage Tuning Capacitors & PIN Diodes',
      description:
        'Kapasitor porselen non-magnetik yang disolder presisi di setiap sambungan batang birdcage untuk menyetel resonansi tepat 127,74 MHz, beserta sirkuit dioda PIN untuk memutus koil tubuh saat fase penerimaan.',
      localAnchor: [0.28, 1.43, 0.44],
      cameraOffset: [0.28, 0.12, 0.30],
      specs: [
        { label: 'Rating Tegangan', value: '7,2 kV RF Peak' },
        { label: 'Faktor Q', value: '> 2.000 pada 128 MHz' },
        { label: 'Lapisan Konduktor', value: 'Perak 15 µm (Skin Effect)' },
      ],
    },
  },
  {
    id: 'bore-liner',
    code: '11',
    layerId: 'rf',
    name: 'Tabung Bore 70 cm & Pencahayaan Ambient',
    englishName: '70 cm Wide-Bore Liner & Ambient LED Halo',
    summary:
      'Terowongan dalam berdiameter 70 cm dengan cincin lampu LED biru menenangkan, kisi ventilasi udara, dan mikrofon interkom.',
    functionDetail:
      'Memberikan ruang luas bagi pasien untuk mengurangi rasa klaustrofobia, menghadirkan sirkulasi udara sejuk, komunikasi dua arah dengan operator, serta pencahayaan ambient yang lembut.',
    baseAnchor: [0, 1.15, 0.0],
    explodeOffset: [0, -0.24, 1.98],
    detachOffset: [0, -0.15, 1.45],
    focusCameraOffset: [1.18, 0.38, 1.42],
    pinLocalOffset: [-0.34, 1.38, 0.56],
    cutawayBehavior: 'keep',
    specs: [
      { label: 'Diameter Bore', value: '70 cm (Wide Bore)' },
      { label: 'Pencahayaan', value: 'LED Non-Magnetik 6500K' },
      { label: 'Sirkulasi Bore', value: '3 Tingkat Aliran Udara' },
    ],
    microDetail: {
      name: 'Cincin Diffuser LED & Kisi Interkom Pasien',
      subtitle: 'Ambient LED Ring Diffuser & Ventilation Louvers',
      description:
        'Cincin lensa akrilik optik penyebar cahaya biru-putih tanpa interferensi RF, dilengkapi kisi ventilasi udara segar dan transduser mikrofon piezoelektrik non-magnetik.',
      localAnchor: [0.0, 1.48, 0.52],
      cameraOffset: [0.28, -0.04, 0.38],
      specs: [
        { label: 'Interferensi RF', value: '< -100 dBm (Terfilter)' },
        { label: 'Material Tabung', value: 'Fiberglass Anti-Bakteri' },
        { label: 'Transduser', value: 'Piezo Non-Magnetik' },
      ],
    },
  },
  {
    id: 'head-coil',
    code: '12',
    layerId: 'rf',
    name: 'Koil Penerima Kepala 32-Kanal',
    englishName: '32-Channel Phased-Array Head Receiver Coil',
    summary:
      'Rangka penerima neuroimaging 32-kanal yang dipasang di sandaran kepala, menampakkan loop tembaga dan papan pre-amplifier LNA.',
    functionDetail:
      'Berada sangat dekat dengan kepala pasien untuk menangkap sinyal resonansi magnetik lemah (mikrovolt) dengan rasio sinyal-terhadap-derau (SNR) sangat tinggi guna pencitraan otak resolusi sub-milimeter.',
    baseAnchor: [0, 1.06, 1.06],
    explodeOffset: [0, 0.72, 2.38],
    detachOffset: [0, 0.52, 0.0],
    focusCameraOffset: [0.85, 0.42, 0.88],
    pinLocalOffset: [0.0, 1.34, 1.06],
    cutawayBehavior: 'keep',
    movesWithTable: true,
    specs: [
      { label: 'Jumlah Kanal', value: '32 Elemen Phased-Array' },
      { label: 'Noise Figure LNA', value: '0,45 dB Ultra-Low' },
      { label: 'Faktor Akselerasi', value: 'SENSE / Compressed 8×' },
    ],
    microDetail: {
      name: 'Papan PCB Pre-Amplifier (LNA) & Loop Tembaga Mikro',
      subtitle: 'Low-Noise Amplifier PCB & Phased-Array Copper Loops',
      description:
        'Sirkuit papan cetak emas miniatur berisi chip penguat derau ultra-rendah (GaAs FET LNA), perangkap balun koaksial, dan kumparan tembaga tumpang-tindih untuk memisahkan kopling antar-kanal.',
      localAnchor: [0.13, 1.13, 1.06],
      cameraOffset: [0.28, 0.14, 0.24],
      specs: [
        { label: 'Penguatan LNA', value: '+28 dB pada 127,7 MHz' },
        { label: 'Impedansi Input', value: '< 1,5 Ω (Decoupling)' },
        { label: 'Transmisi Data', value: 'Digital Optik dStream' },
      ],
    },
  },
];

export const MRI_PART_MAP: Record<MriPartId, MriPartMeta> = MRI_PARTS.reduce(
  (acc, part) => {
    acc[part.id] = part;
    return acc;
  },
  {} as Record<MriPartId, MriPartMeta>
);

export const MRI_LAYER_MAP: Record<MriLayerId, MriLayerMeta> = MRI_LAYERS.reduce(
  (acc, layer) => {
    acc[layer.id] = layer;
    return acc;
  },
  {} as Record<MriLayerId, MriLayerMeta>
);
