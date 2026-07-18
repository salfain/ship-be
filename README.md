# Ship Monitoring Backend

Backend Express untuk aplikasi Flutter Ship Monitoring.

## Fitur

- Login role `NAHKODA`, `ADMIN`, `MANAGER`
- Pembuatan akun pengguna baru oleh Admin
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
npm install
npm run dev
```

File `.env` sudah disertakan agar hasil clone bisa langsung dijalankan. Secret
token dibuat acak pada startup pertama dan disimpan di `data/token-secret`, jadi
tidak ada secret production yang disimpan di repository publik.

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
GET  /api/users
POST /api/users
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

Set `PUBLIC_BASE_URL` ke origin publik yang melayani folder `/uploads` tanpa
akhiran `/api`. Untuk deployment VPS saat ini:

```env
PUBLIC_BASE_URL=http://43.133.134.10
```

Jika backend dijalankan dengan PM2, muat ulang konfigurasi environment setelah
perubahan:

```bash
pm2 startOrRestart ecosystem.config.cjs --update-env
```

Untuk instalasi baru di VPS, cukup clone repository, install dependency, lalu
jalankan konfigurasi PM2:

```bash
npm ci --omit=dev
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save
```

Backend ini cocok untuk development dan dasar deployment VPS. Untuk production final, sebaiknya ganti penyimpanan JSON menjadi database seperti PostgreSQL/MySQL, hash password dengan bcrypt/argon2, dan simpan file upload di object storage atau storage VPS yang dibackup.
