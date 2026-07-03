import crypto from 'node:crypto';
import path from 'node:path';

import cors from 'cors';
import express from 'express';
import multer from 'multer';

import { createToken, normalizeRole, verifyToken } from './auth.js';
import { mutateDb, readDb, uploadDir } from './db.js';

const apiPrefix = process.env.API_PREFIX || '/api';
const publicBaseUrl =
  process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3131}`;

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.pdf';
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      cb(null, true);
      return;
    }
    cb(new ApiError(400, 'Dokumen harus berupa PDF.'));
  },
});

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  const router = express.Router();

  app.get('/', (_req, res) => {
    res.json({
      message: 'Ship Monitoring API aktif.',
      health: `${apiPrefix}/health`,
      docs: 'Baca backend/README.md untuk daftar endpoint.',
    });
  });

  router.get('/', (_req, res) => {
    res.json({
      message: 'Ship Monitoring API aktif.',
      health: `${apiPrefix}/health`,
      endpoints: [
        'POST /auth/login',
        'GET /ships',
        'GET /submissions',
        'PUT /submissions/:id/manager-validation',
      ],
    });
  });

  router.get('/health', (_req, res) => {
    res.json({ message: 'OK', data: { service: 'ship-monitoring-backend' } });
  });

  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body ?? {};
    const db = readDb();
    const user = db.users.find(
      (item) =>
        item.username === `${username || ''}`.trim() &&
        item.password === password,
    );
    if (!user) throw new ApiError(401, 'Username atau password salah.');
    res.json({ token: createToken(user), data: serializeUser(db, user) });
  });

  router.get('/ships', authRequired, requireRole('ADMIN', 'MANAGER'), (req, res) => {
    const db = readDb();
    res.json({ data: db.ships.map((ship) => serializeShip(req, db, ship)) });
  });

  router.get('/ships/my', authRequired, requireRole('NAHKODA'), (req, res) => {
    const db = readDb();
    const ships = db.ships.filter((ship) => ship.captainId === req.user.id);
    res.json({ data: ships.map((ship) => serializeShip(req, db, ship)) });
  });

  router.post('/location/update', authRequired, requireRole('NAHKODA'), (req, res) => {
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new ApiError(400, 'Latitude dan longitude wajib valid.');
    }

    const location = mutateDb((db) => {
      const ship = db.ships.find((item) => item.captainId === req.user.id);
      if (!ship) throw new ApiError(404, 'Kapal Nakhoda tidak ditemukan.');
      const now = new Date().toISOString();
      const existing = db.locations.find((item) => item.shipId === ship.id);
      if (existing) {
        existing.latitude = latitude;
        existing.longitude = longitude;
        existing.updatedAt = now;
        return existing;
      }
      const created = {
        id: `loc-${crypto.randomUUID()}`,
        shipId: ship.id,
        latitude,
        longitude,
        createdAt: now,
        updatedAt: now,
      };
      db.locations.push(created);
      return created;
    });

    res.json({ message: 'Lokasi kapal berhasil dikirim.', data: location });
  });

  router.get('/location/ships', authRequired, requireRole('ADMIN', 'MANAGER'), (req, res) => {
    const db = readDb();
    res.json({
      data: db.locations.map((location) => serializeLocation(req, db, location)),
    });
  });

  router.post(
    '/submissions',
    authRequired,
    requireRole('NAHKODA'),
    upload.fields([
      { name: 'sailingPermit', maxCount: 1 },
      { name: 'callSignCertificate', maxCount: 1 },
      { name: 'safetyCertificate', maxCount: 1 },
      { name: 'radioStationPermit', maxCount: 1 },
    ]),
    (req, res) => {
      const requiredFiles = [
        'sailingPermit',
        'callSignCertificate',
        'safetyCertificate',
        'radioStationPermit',
      ];
      for (const field of requiredFiles) {
        if (!req.files?.[field]?.[0]) {
          throw new ApiError(400, 'Keempat dokumen PDF wajib diunggah.');
        }
      }

      const created = mutateDb((db) => {
        const ship = db.ships.find((item) => item.captainId === req.user.id);
        if (!ship) throw new ApiError(404, 'Kapal Nakhoda tidak ditemukan.');
        const submission = {
          id: `sub-${Date.now()}`,
          shipId: ship.id,
          captainUserId: req.user.id,
          captainName: req.body?.captainName || req.user.name,
          employeeCount: Number(req.body?.employeeCount || 0),
          cargo: req.body?.cargo || '-',
          cargoAmount: req.body?.cargoAmount || '-',
          status: 'PENDING',
          submittedAt: new Date().toISOString(),
          reviewNote: null,
          reviewedAt: null,
          sailingPermitUrl: fileUrl(req.files.sailingPermit[0]),
          callSignCertificateUrl: fileUrl(req.files.callSignCertificate[0]),
          safetyCertificateUrl: fileUrl(req.files.safetyCertificate[0]),
          radioStationPermitUrl: fileUrl(req.files.radioStationPermit[0]),
        };
        db.submissions.unshift(submission);
        return serializeSubmission(req, db, submission);
      });

      res.status(201).json({ data: created });
    },
  );

  router.get('/submissions', authRequired, requireRole('ADMIN', 'MANAGER'), (req, res) => {
    const db = readDb();
    const status = `${req.query.status || ''}`.trim().toUpperCase();
    const shipNumber = `${req.query.shipNumber || ''}`.trim().toUpperCase();
    let submissions = [...db.submissions];
    if (status) {
      submissions = submissions.filter((item) => item.status === status);
    }
    if (shipNumber) {
      submissions = submissions.filter((item) => {
        const ship = db.ships.find((candidate) => candidate.id === item.shipId);
        return ship?.shipNumber.toUpperCase().includes(shipNumber);
      });
    }
    res.json({ data: submissions.map((item) => serializeSubmission(req, db, item)) });
  });

  router.get('/submissions/my-history', authRequired, requireRole('NAHKODA'), (req, res) => {
    const db = readDb();
    const submissions = db.submissions.filter(
      (item) => item.captainUserId === req.user.id,
    );
    res.json({ data: submissions.map((item) => serializeSubmission(req, db, item)) });
  });

  router.get(
    '/submissions/arrival-inspection/checklist',
    authRequired,
    requireRole('ADMIN'),
    (_req, res) => {
      res.json({ data: readDb().checklist });
    },
  );

  router.get(
    '/submissions/ship/:shipNumber/history',
    authRequired,
    requireRole('ADMIN', 'MANAGER'),
    (req, res) => {
      const db = readDb();
      const normalized = req.params.shipNumber.toUpperCase();
      const ship = db.ships.find(
        (item) => item.shipNumber.toUpperCase() === normalized,
      );
      if (!ship) throw new ApiError(404, 'Kapal tidak ditemukan.');
      const submissions = db.submissions.filter((item) => item.shipId === ship.id);
      res.json({ data: submissions.map((item) => serializeSubmission(req, db, item)) });
    },
  );

  router.get('/submissions/:id', authRequired, (req, res) => {
    const db = readDb();
    const submission = findSubmission(db, req.params.id);
    ensureCanReadSubmission(req.user, submission);
    res.json({ data: serializeSubmission(req, db, submission) });
  });

  router.patch(
    '/submissions/:id/approve',
    authRequired,
    requireRole('ADMIN'),
    (req, res) => {
      const updated = mutateDb((db) => {
        const submission = findSubmission(db, req.params.id);
        submission.status = 'WAITING_MANAGER_VALIDATION';
        submission.reviewNote = 'Disetujui Admin, menunggu keputusan Manager.';
        submission.reviewedAt = new Date().toISOString();
        return serializeSubmission(req, db, submission);
      });
      res.json({ data: updated });
    },
  );

  router.patch(
    '/submissions/:id/reject',
    authRequired,
    requireRole('ADMIN'),
    (req, res) => {
      const note = req.body?.reviewNote || req.body?.note || 'Ditolak Admin.';
      const updated = mutateDb((db) => {
        const submission = findSubmission(db, req.params.id);
        submission.status = 'REJECTED';
        submission.reviewNote = note;
        submission.reviewedAt = new Date().toISOString();
        return serializeSubmission(req, db, submission);
      });
      res.json({ data: updated });
    },
  );

  router.put(
    '/submissions/:id/manager-validation',
    authRequired,
    requireRole('MANAGER'),
    (req, res) => {
      const decision = normalizeDecision(req.body);
      const note =
        req.body?.reviewNote ||
        req.body?.note ||
        (decision === 'APPROVED'
          ? 'Disetujui Kepala KSOP.'
          : 'Ditolak Kepala KSOP.');

      const updated = mutateDb((db) => {
        const submission = findSubmission(db, req.params.id);
        if (submission.status !== 'WAITING_MANAGER_VALIDATION') {
          throw new ApiError(
            409,
            'Pengajuan belum berada pada tahap keputusan Manager.',
          );
        }
        submission.status = decision;
        submission.reviewNote = note;
        submission.reviewedAt = new Date().toISOString();
        return serializeSubmission(req, db, submission);
      });
      res.json({ data: updated });
    },
  );

  router.get(
    '/submissions/:id/arrival-inspection',
    authRequired,
    requireRole('ADMIN'),
    (req, res) => {
      const db = readDb();
      const inspection = db.inspections.find(
        (item) => item.submissionId === req.params.id,
      );
      res.json({ data: inspection || null });
    },
  );

  router.put(
    '/submissions/:id/arrival-inspection',
    authRequired,
    requireRole('ADMIN'),
    upload.any(),
    (req, res) => {
      const inspection = mutateDb((db) => {
        findSubmission(db, req.params.id);
        const now = new Date().toISOString();
        const existing = db.inspections.find(
          (item) => item.submissionId === req.params.id,
        );
        const payload = {
          submissionId: req.params.id,
          inspectionItems: parseJsonArray(req.body?.inspectionItems),
          note: req.body?.note || null,
          updatedAt: now,
        };
        if (existing) {
          Object.assign(existing, payload);
          return existing;
        }
        const created = { id: `insp-${crypto.randomUUID()}`, ...payload };
        db.inspections.push(created);
        return created;
      });
      res.json({ data: inspection });
    },
  );

  app.use(apiPrefix, router);
  app.use(errorHandler);
  return app;
}

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function authRequired(req, _res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) throw new ApiError(401, 'Sesi login berakhir.');

  const db = readDb();
  const user = db.users.find((item) => item.id === payload.id);
  if (!user) throw new ApiError(401, 'Sesi login tidak valid.');
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, _res, next) => {
    const allowed = roles.map(normalizeRole);
    if (!allowed.includes(normalizeRole(req.user?.role))) {
      throw new ApiError(403, 'Akses ditolak untuk fitur ini.');
    }
    next();
  };
}

function serializeUser(db, user) {
  const ship = db.ships.find((item) => item.id === user.shipId);
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    shipId: ship?.id,
    shipNumber: ship?.shipNumber,
    shipName: ship?.name,
    ship: ship ? serializeShipInfo(db, ship) : null,
  };
}

function serializeShip(req, db, ship) {
  const latestLocation = db.locations
    .filter((item) => item.shipId === ship.id)
    .sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`))[0];
  const latestSubmission = db.submissions
    .filter((item) => item.shipId === ship.id)
    .sort((a, b) => `${b.submittedAt}`.localeCompare(`${a.submittedAt}`))[0];
  return {
    ...serializeShipInfo(db, ship),
    latestLocation: latestLocation
      ? {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          createdAt: latestLocation.updatedAt,
        }
      : null,
    latestSubmission: latestSubmission
      ? serializeSubmission(req, db, latestSubmission)
      : null,
  };
}

function serializeShipInfo(db, ship) {
  const captain = db.users.find((user) => user.id === ship.captainId);
  return {
    id: ship.id,
    shipNumber: ship.shipNumber,
    name: ship.name,
    captain: captain
      ? { id: captain.id, name: captain.name, username: captain.username }
      : null,
  };
}

function serializeSubmission(req, db, submission) {
  const ship = db.ships.find((item) => item.id === submission.shipId);
  return {
    ...submission,
    ship: ship ? serializeShipInfo(db, ship) : null,
    sailingPermitUrl: absoluteUrl(req, submission.sailingPermitUrl),
    callSignCertificateUrl: absoluteUrl(req, submission.callSignCertificateUrl),
    safetyCertificateUrl: absoluteUrl(req, submission.safetyCertificateUrl),
    radioStationPermitUrl: absoluteUrl(req, submission.radioStationPermitUrl),
  };
}

function serializeLocation(req, db, location) {
  const ship = db.ships.find((item) => item.id === location.shipId);
  const latestSubmission = db.submissions
    .filter((item) => item.shipId === location.shipId)
    .sort((a, b) => `${b.submittedAt}`.localeCompare(`${a.submittedAt}`))[0];
  return {
    shipId: location.shipId,
    shipNumber: ship?.shipNumber || '-',
    shipName: ship?.name || '-',
    latitude: location.latitude,
    longitude: location.longitude,
    captain: ship?.captainId
      ? serializeUser(db, db.users.find((user) => user.id === ship.captainId))
      : null,
    updatedAt: location.updatedAt,
    latestSubmission: latestSubmission
      ? serializeSubmission(req, db, latestSubmission)
      : null,
  };
}

function findSubmission(db, id) {
  const submission = db.submissions.find((item) => item.id === id);
  if (!submission) throw new ApiError(404, 'Pengajuan tidak ditemukan.');
  return submission;
}

function ensureCanReadSubmission(user, submission) {
  if (normalizeRole(user.role) !== 'NAHKODA') return;
  if (submission.captainUserId !== user.id) {
    throw new ApiError(403, 'Akses ditolak untuk pengajuan ini.');
  }
}

function normalizeDecision(body) {
  const raw = `${body?.decision || body?.status || body?.result || ''}`
    .trim()
    .toUpperCase();
  if (['APPROVED', 'APPROVE', 'SETUJUI', 'DISETUJUI'].includes(raw)) {
    return 'APPROVED';
  }
  if (['REJECTED', 'REJECT', 'TOLAK', 'DITOLAK'].includes(raw)) {
    return 'REJECTED';
  }
  throw new ApiError(400, 'Decision wajib APPROVED atau REJECTED.');
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fileUrl(file) {
  return file ? `/uploads/${file.filename}` : null;
}

function absoluteUrl(req, value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base = publicBaseUrl || `${req.protocol}://${req.get('host')}`;
  return `${base}${value}`;
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ message: 'Ukuran dokumen maksimal 4 MB.' });
    return;
  }

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message:
      statusCode >= 500
        ? 'Server sedang bermasalah. Coba lagi nanti.'
        : error.message,
  });
}
