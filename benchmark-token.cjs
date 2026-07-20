const jwt = require("jsonwebtoken");

const ITERASI = 20000;
const WARMUP = 2000;

// Gunakan secret khusus pengujian.
// Jangan menuliskan JWT_SECRET produksi di laporan.
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "benchmark-secret-key-minimal-32-karakter";

const payload = {
  userId: 1,
  role: "ADMIN",
};

// Fungsi pembuatan token
function buatToken() {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  });
}

// Fungsi verifikasi token
function verifikasiToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
  });
}

// Pemanasan sebelum pengukuran utama
function pemanasan(fungsi) {
  for (let i = 0; i < WARMUP; i++) {
    fungsi();
  }
}

// Fungsi pengukuran
function benchmark(namaOperasi, fungsi) {
  const waktuAwal = process.hrtime.bigint();

  for (let i = 0; i < ITERASI; i++) {
    fungsi();
  }

  const waktuAkhir = process.hrtime.bigint();

  // Nanodetik menjadi milidetik
  const waktuTotalMs =
    Number(waktuAkhir - waktuAwal) / 1_000_000;

  const rataRataMs = waktuTotalMs / ITERASI;

  const throughput =
    ITERASI / (waktuTotalMs / 1000);

  return {
    operasi: namaOperasi,
    iterasi: ITERASI,
    "waktu total": `${waktuTotalMs.toFixed(2)} ms`,
    "rata-rata": `${rataRataMs.toFixed(6)} ms`,
    throughput: `${Math.round(throughput).toLocaleString(
      "id-ID"
    )} operasi/detik`,
  };
}

// Token dibuat satu kali untuk pengujian verifikasi
const tokenPengujian = buatToken();

// Pemanasan, tidak masuk perhitungan 20.000 iterasi
pemanasan(() => buatToken());
pemanasan(() => verifikasiToken(tokenPengujian));

// Pengujian utama
const hasilPembuatan = benchmark(
  "Pembuatan token",
  () => buatToken()
);

const hasilVerifikasi = benchmark(
  "Verifikasi token",
  () => verifikasiToken(tokenPengujian)
);

console.table([
  hasilPembuatan,
  hasilVerifikasi,
]);
