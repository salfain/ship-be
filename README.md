# Ship Monitoring Backend

Backend Express untuk aplikasi Flutter Ship Monitoring.

## Fitur

- Login role `NAHKODA`, `ADMIN`, `MANAGER`
- Data kapal dan kapal milik Nakhoda
- Pengajuan berlabuh dengan upload 4 PDF
- Verifikasi Admin
- Keputusan Manager melalui endpoint baru
- Lokasi kapal
- Checklist dan hasil inspeksi kedatangan
- Penyimpanan JSON lokal untuk development/testing

## Akun Default

| Role | Username | Password |
|---|---|---|
| Nakhoda | `nahkoda` | `password` |
| Admin | `admin` | `password` |
| Manager | `manager` | `password` |

## Menjalankan Lokal

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

API lokal:

```text
http://localhost:3131/api
```

Jika Flutter dijalankan di Android emulator, gunakan:

```env
API_BASE_URL=http://10.0.2.2:3131/api
MANAGER_DECISION_ENABLED=true
```

Jika dijalankan di HP fisik, ganti host dengan IP laptop dalam jaringan yang sama.

## Endpoint Penting

```text
POST /api/auth/login
GET  /api/ships
GET  /api/ships/my
POST /api/location/update
GET  /api/location/ships
POST /api/submissions
GET  /api/submissions
GET  /api/submissions/my-history
GET  /api/submissions/:id
GET  /api/submissions/ship/:shipNumber/history
PATCH /api/submissions/:id/approve
PATCH /api/submissions/:id/reject
PUT  /api/submissions/:id/manager-validation
GET  /api/submissions/arrival-inspection/checklist
GET  /api/submissions/:id/arrival-inspection
PUT  /api/submissions/:id/arrival-inspection
```

Manager approval memakai:

```http
PUT /api/submissions/:id/manager-validation
Content-Type: application/json

{
  "decision": "APPROVED",
  "reviewNote": "Disetujui Kepala KSOP."
}
```

Untuk menolak:

```json
{
  "decision": "REJECTED",
  "reviewNote": "Catatan penolakan"
}
```

## Catatan Production

Backend ini cocok untuk development dan dasar deployment VPS. Untuk production final, sebaiknya ganti penyimpanan JSON menjadi database seperti PostgreSQL/MySQL, hash password dengan bcrypt/argon2, dan simpan file upload di object storage atau storage VPS yang dibackup.
