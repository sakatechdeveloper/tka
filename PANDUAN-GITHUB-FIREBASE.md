# Panduan online: GitHub Pages + Firebase

GitHub Pages meng-host file dashboard. Firebase Realtime Database menyimpan jadwal dan token agar browser lain melihat data yang sama. Token diatur otomatis untuk dihapus setelah 15 menit oleh dashboard.

## 1. Siapkan Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat project.
2. Di **Project settings → General → Your apps**, tambahkan aplikasi Web. Salin `apiKey`, `authDomain`, `projectId`, dan `appId`.
3. Di **Build → Realtime Database**, buat database. Salin URL database yang tampil, contohnya `https://NAMA-PROJECT-default-rtdb.REGION.firebasedatabase.app`.
4. Di **Build → Authentication → Sign-in method**, aktifkan **Email/Password**.
5. Di **Authentication → Users**, tambahkan dua akun dengan kata sandi yang kuat: satu akun pengelola dan satu akun layar/komputer ujian. Catat UID masing-masing.
6. Buka **Realtime Database → Rules**. Isi aturan dari `firebase-rules.json`, ganti `GANTI_DENGAN_ADMIN_UID` dan `GANTI_DENGAN_DISPLAY_UID` dengan UID tadi, lalu klik **Publish**. Aturan ini membatasi tulis data ke akun pengelola dan memberi baca data ke kedua akun.

## 2. Isi konfigurasi dashboard

Buka `firebase-config.js`, lalu ganti nilai `ISI_...` dengan nilai dari Firebase. Isi juga `adminUid` dan `displayUid` dengan UID akun Firebase. Pastikan `path` tetap `tka/current` dan ubah `enabled` menjadi `true`.

Contoh bentuknya (gunakan nilai project Anda sendiri):

```js
window.TKA_FIREBASE_CONFIG = {
  enabled: true,
  apiKey: "nilai-api-key",
  authDomain: "nama-project.firebaseapp.com",
  databaseURL: "https://nama-project-default-rtdb.region.firebasedatabase.app",
  projectId: "nama-project",
  appId: "nilai-app-id",
  adminUid: "uid-akun-pengelola",
  displayUid: "uid-akun-layar",
  path: "tka/current"
};
```

`firebase-config.js` berisi konfigurasi aplikasi web, bukan kata sandi. Jangan masukkan password akun Firebase ke file atau repository. Keamanan data ditentukan oleh Authentication dan Rules database.

## 3. Unggah ke GitHub

1. Buat repository GitHub baru. Jika repository publik, ingat bahwa kode sumber dan konfigurasi web dapat dilihat siapa saja.
2. Unggah file proyek: `index.html`, `manifest.json`, `sw.js`, `firebase-config.js`, `sman-logo.png`, dan `tka-sukses.png`. `server.js` hanya diperlukan untuk penggunaan server Node lokal; GitHub Pages tidak menjalankan server Node.
3. Di repository buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**, pilih branch utama (`main`) dan folder `/(root)`, lalu simpan.
5. Tunggu proses deploy, lalu buka alamat Pages yang diberikan GitHub. Pastikan alamat menggunakan HTTPS.

## 4. Sambungkan dua browser

1. Buka alamat Pages di browser pengelola, klik **MASUK**, lalu gunakan akun pengelola.
2. Buka alamat yang sama di browser/komputer lain, klik **MASUK**, lalu gunakan akun layar.
3. Token dan pengaturan yang diubah dari akun pengelola akan tersinkron ke browser layar selama keduanya online. Tombol **TAMPILKAN TOKEN** menampilkan token di panel utama.

## Catatan

- Jangan gunakan Rules terbuka untuk umum (`.read: true` / `.write: true`).
- Setiap orang yang mengetahui kredensial akun layar dapat membaca token selama token aktif. Bagikan akun layar hanya ke perangkat ujian yang diizinkan.
- Uji dulu dengan token percobaan dan pastikan token terhapus setelah masa aktifnya.
- Setelah mengubah `firebase-config.js`, unggah kembali file tersebut ke GitHub. Jika halaman masih menampilkan konfigurasi lama, lakukan refresh paksa atau hapus cache site/service worker.
