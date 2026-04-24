# Smart Study 2.0.0

Aplikasi perencana studi (study planner) seluler komprehensif yang dibangun dengan **React Native** dan **Expo**. Dirancang khusus untuk mahasiswa tingkat akhir dalam mengelola mata kuliah, tenggat waktu tugas (deadline), jadwal, dan ketidakhadiran (jatah absen) secara offline dalam sebuah antarmuka dasbor yang efisien.

## Yang Baru di Versi 2.0

- **Widget Layar Beranda Android:** Periksa jadwal harian Anda secara instan langsung dari layar utama _smartphone_ tanpa perlu membuka aplikasi. Kini diperbarui dengan sistem **Penyegaran Otomatis (Auto-Refresh)** setiap pergantian hari.
- **Pelacak Ketidakhadiran (Absensi):** Lacak "Jatah Bolos" Anda per mata kuliah. Bilah kemajuan (progress bar) visual melindungi Anda agar tidak melewati batas maksimal absensi.
- **Pengingat Deadline Dinamis:** Jangan pernah melewatkan tugas! Aplikasi ini akan menjadwalkan notifikasi _push_ lokal asli yang memperingatkan Anda tepat **24 Jam** dan **1 Jam** sebelum deadline tugas.
- **High-Craft Mobile UX & Performa Optimal:** Peningkatan interaksi responsif pada kartu, target sentuh yang diperluas (mengadopsi _Fitts' Law_), dan rendering _list_ minim lag berkat memoziation `useCallback` menyeluruh.
- **Stabilitas Database & Sinkronisasi Ekspor/Impor:** Menggunakan operasi _asynchronous_ (await) penuh dan implementasi SQLite WAL _checkpointing_ untuk menjamin database 100% andal, mencegah _data loss_, serta didukung oleh API `expo-file-system` modern.
- **Layar Pengaturan (Settings):** Pusat kendali baru yang fungsional untuk memudahkan Anda mencadangkan (ekspor) atau memulihkan (impor) data studi Anda.

## Fitur Utama

- **Perencana Studi:** Atur dan jadwalkan sesi belajar dan kelas perkuliahan Anda dengan mulus.
- **Database Lokal:** Menggunakan SQLite untuk penyimpanan on-device yang sangat cepat dan 100% offline. Tidak memerlukan koneksi internet.
- **Grafik & Statistik Visual:** Pantau kemajuan studi Anda lewat visualisasi interaktif (`react-native-chart-kit`).
- **UI Modern (NativeWind):** Mengandalkan **Tailwind CSS** dipadukan dengan implementasi kelas estetika _frontend_ yang mendukung Dark Mode untuk tampilan rapi dan premium.
- **Integrasi _Native_ Sistem:** Sistem operasi inti secara masif digunakan, mencakup Picker Waktu (_DateTimePickerAndroid_) lokal hingga notifikasi peranti langsung (_expo-notifications_).

## Tech Stack (Kumpulan Teknologi)

- [React Native](https://reactnative.dev/) & [Expo SDK 54](https://expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)
- [Expo SQLite / FileSystem](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Android Widget](https://github.com/sAleksovski/react-native-android-widget)

## Instalasi & Pengaturan

1. **Unduh (Clone) repositori:**

   ```bash
   git clone https://github.com/shoutoxa/smart-study.git
   cd smart_study_planner_mobile
   ```

2. **Instal dependensi:**
   Pastikan mesin Anda telah menginstal Node.js, lalu jalankan:

   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Dev Server):**
   ```bash
   npx expo start
   ```

## Menjalankan di Perangkat Asli / Emulator

- **Android:** Tekan `a` pada menu terminal Expo.
- **iOS:** Tekan `i` pada terminal Expo _atau_ memindai QR code via aplikasi **Expo Go** menggunakan iPhone/iPad Anda.

## Memproduksi Rilis Aplikasi APK Mandiri (Offline / Standalone)

Untuk mem-_build_ aplikasi berupa _file_ `.apk` yang sangat ringan dan independen (tidak lagi memerlukan Expo Go / Bundler, cocok untuk dipakai 100% offline tanpa internet):

```bash
eas build --profile preview --platform android
```

_(Begitu selesai, unduh tautan APK dari halaman dashboard terminal Expo Anda untuk memasangnya secara manual)._

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.
