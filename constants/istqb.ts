// constants/istqb.ts
// Data lengkap semua level dan kategori sertifikasi ISTQB

export interface ISTQBCategory {
  code: string;
  name: string;
  shortName: string;
  defaultQuestions: number;
  defaultDuration: number; // menit
  passingScore: number;    // persentase minimal lulus
}

export interface ISTQBLevel {
  level: string;
  color: string;      // warna utama
  lightColor: string; // warna muda untuk background
  icon: string;
  description: string;
  categories: ISTQBCategory[];
}

export const ISTQB_LEVELS: ISTQBLevel[] = [
  {
    level: 'Foundation',
    color: '#1565C0',
    lightColor: '#E3F2FD',
    icon: '📘',
    description: 'Sertifikasi dasar, prasyarat untuk hampir semua sertifikasi lain',
    categories: [
      { code: 'CTFL', name: 'Certified Tester Foundation Level', shortName: 'CTFL v4.0', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CTFL-AT', name: 'Foundation Level Agile Tester', shortName: 'CTFL-AT', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-AI-F', name: 'Foundation Level AI Testing', shortName: 'CT-AI v1.0', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
    ],
  },
  {
    level: 'Advanced',
    color: '#6A1B9A',
    lightColor: '#F3E5F5',
    icon: '📗',
    description: 'Butuh CTFL + pengalaman kerja di bidang testing',
    categories: [
      { code: 'CTAL-TA', name: 'Test Analyst', shortName: 'CTAL-TA v4.0', defaultQuestions: 65, defaultDuration: 180, passingScore: 65 },
      { code: 'CTAL-TTA', name: 'Technical Test Analyst', shortName: 'CTAL-TTA', defaultQuestions: 45, defaultDuration: 120, passingScore: 65 },
      { code: 'CTAL-TM', name: 'Test Management', shortName: 'CTAL-TM v3.0', defaultQuestions: 65, defaultDuration: 180, passingScore: 65 },
      { code: 'CTAL-TAE', name: 'Test Automation Engineering', shortName: 'CTAL-TAE v2.0', defaultQuestions: 40, defaultDuration: 90, passingScore: 65 },
      { code: 'CTAL-AT', name: 'Advanced Level Agile Tester', shortName: 'CTAL-AT v2.0', defaultQuestions: 40, defaultDuration: 90, passingScore: 65 },
      { code: 'CTAL-ATT', name: 'Agile Technical Tester', shortName: 'CTAL-ATT', defaultQuestions: 40, defaultDuration: 90, passingScore: 65 },
    ],
  },
  {
    level: 'Specialist',
    color: '#00695C',
    lightColor: '#E0F2F1',
    icon: '📙',
    description: 'Fokus pada topik spesifik, bisa diambil setelah Foundation',
    categories: [
      { code: 'CT-AI', name: 'AI Testing', shortName: 'CT-AI v2.0', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-GenAI', name: 'Testing with Generative AI', shortName: 'CT-GenAI', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-TAS', name: 'Test Automation Strategy', shortName: 'CT-TAS', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-MBT', name: 'Model-Based Tester', shortName: 'CT-MBT', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-MAT', name: 'Mobile Application Testing', shortName: 'CT-MAT', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-ATLaS', name: 'Agile Test Leadership at Scale', shortName: 'CT-ATLaS', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-AcT', name: 'Acceptance Testing', shortName: 'CT-AcT', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-PT', name: 'Performance Testing', shortName: 'CT-PT', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-SEC', name: 'Security Tester', shortName: 'CT-SEC', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-STE', name: 'Security Test Engineer', shortName: 'CT-STE', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-UT', name: 'Usability Testing', shortName: 'CT-UT', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-AuT', name: 'Automotive Software Tester', shortName: 'CT-AuT', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-GaMe', name: 'Game Testing', shortName: 'CT-GaMe', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
      { code: 'CT-GT', name: 'Gambling Industry Tester', shortName: 'CT-GT', defaultQuestions: 40, defaultDuration: 60, passingScore: 65 },
    ],
  },
  {
    level: 'Expert',
    color: '#E65100',
    lightColor: '#FFF3E0',
    icon: '📕',
    description: 'Level tertinggi, untuk profesional senior dengan banyak pengalaman',
    categories: [
      { code: 'Expert-ITP', name: 'Improving the Test Process', shortName: 'Expert ITP', defaultQuestions: 40, defaultDuration: 120, passingScore: 65 },
      { code: 'Expert-TM', name: 'Test Management', shortName: 'Expert TM', defaultQuestions: 40, defaultDuration: 120, passingScore: 65 },
    ],
  },
];

export const getLevelByCategory = (categoryCode: string): ISTQBLevel | undefined =>
  ISTQB_LEVELS.find((l) => l.categories.some((c) => c.code === categoryCode));

export const getCategoryByCode = (categoryCode: string): ISTQBCategory | undefined => {
  for (const level of ISTQB_LEVELS) {
    const cat = level.categories.find((c) => c.code === categoryCode);
    if (cat) return cat;
  }
  return undefined;
};

export const getLevelColor = (levelName: string): string => {
  const level = ISTQB_LEVELS.find((l) => l.level === levelName);
  return level?.color ?? '#1565C0';
};
