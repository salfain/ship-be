import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export const dataDir = path.resolve(
  rootDir,
  process.env.DATA_DIR || 'data',
);
export const uploadDir = path.resolve(
  rootDir,
  process.env.UPLOAD_DIR || 'uploads',
);

const dbPath = path.join(dataDir, 'db.json');

export function ensureStorage() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    writeDb(seedData());
  }
}

export function readDb() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

export function writeDb(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function mutateDb(mutator) {
  const db = readDb();
  const result = mutator(db);
  writeDb(db);
  return result;
}

function seedData() {
  const now = new Date();
  const minutesAgo = (minutes) =>
    new Date(now.getTime() - minutes * 60_000).toISOString();

  return {
    users: [
      {
        id: 'usr-nahkoda-1',
        username: 'nahkoda',
        password: 'password',
        name: 'Budi Santoso',
        role: 'NAHKODA',
        shipId: 'ship-001',
      },
      {
        id: 'usr-admin-1',
        username: 'admin',
        password: 'password',
        name: 'Tata Usaha KSOP',
        role: 'ADMIN',
      },
      {
        id: 'usr-manager-1',
        username: 'manager',
        password: 'password',
        name: 'Kepala KSOP',
        role: 'MANAGER',
      },
    ],
    ships: [
      {
        id: 'ship-001',
        shipNumber: 'KM-001',
        name: 'Nusantara Jaya',
        captainId: 'usr-nahkoda-1',
      },
      {
        id: 'ship-002',
        shipNumber: 'KM-002',
        name: 'Bahari Indah',
        captainId: null,
      },
      {
        id: 'ship-003',
        shipNumber: 'KM-003',
        name: 'Samudra Jaya',
        captainId: null,
      },
    ],
    locations: [
      {
        id: 'loc-001',
        shipId: 'ship-001',
        latitude: -6.104,
        longitude: 106.886,
        updatedAt: minutesAgo(8),
        createdAt: minutesAgo(8),
      },
      {
        id: 'loc-002',
        shipId: 'ship-002',
        latitude: -6.032,
        longitude: 106.78,
        updatedAt: minutesAgo(18),
        createdAt: minutesAgo(18),
      },
    ],
    submissions: [
      {
        id: 'sub-2025-001',
        shipId: 'ship-001',
        captainUserId: 'usr-nahkoda-1',
        captainName: 'Budi Santoso',
        employeeCount: 10,
        cargo: 'Kontainer',
        cargoAmount: '20 Unit',
        status: 'PENDING',
        submittedAt: minutesAgo(180),
        reviewNote: null,
        reviewedAt: null,
        sailingPermitUrl: null,
        callSignCertificateUrl: null,
        safetyCertificateUrl: null,
        radioStationPermitUrl: null,
      },
      {
        id: 'sub-2025-002',
        shipId: 'ship-001',
        captainUserId: 'usr-nahkoda-1',
        captainName: 'Budi Santoso',
        employeeCount: 8,
        cargo: 'Barang Umum',
        cargoAmount: '12 Ton',
        status: 'WAITING_MANAGER_VALIDATION',
        submittedAt: minutesAgo(320),
        reviewNote: 'Dokumen telah diverifikasi Admin.',
        reviewedAt: minutesAgo(200),
        sailingPermitUrl: null,
        callSignCertificateUrl: null,
        safetyCertificateUrl: null,
        radioStationPermitUrl: null,
      },
      {
        id: 'sub-2025-003',
        shipId: 'ship-002',
        captainUserId: null,
        captainName: 'Ahmad Fauzi',
        employeeCount: 12,
        cargo: 'Curah',
        cargoAmount: '50 Ton',
        status: 'APPROVED',
        submittedAt: minutesAgo(1440),
        reviewNote: 'Disetujui Kepala KSOP.',
        reviewedAt: minutesAgo(900),
        sailingPermitUrl: null,
        callSignCertificateUrl: null,
        safetyCertificateUrl: null,
        radioStationPermitUrl: null,
      },
    ],
    inspections: [],
    checklist: [
      { itemNo: 1, question: 'Kondisi dokumen kapal sesuai.' },
      { itemNo: 2, question: 'Kapal aman untuk sandar.' },
      { itemNo: 3, question: 'Jumlah awak sesuai pengajuan.' },
      { itemNo: 4, question: 'Muatan sesuai dokumen.' },
    ],
  };
}
