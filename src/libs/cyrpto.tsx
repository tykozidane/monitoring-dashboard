import aesjs from 'aes-js';

// ==========================================
// 1. PERSIAPAN KEY (Wajib 32 Bytes)
// ==========================================
const prepareKey = (keyString: string): Uint8Array => {
  const keyBytes = aesjs.utils.utf8.toBytes(keyString);

  // Padding atau potong agar pas 32 bytes (256-bit)
  const result = new Uint8Array(32);

  for (let i = 0; i < 32; i++) {
    result[i] = keyBytes[i % keyBytes.length];
  }


  return result;
};

// ==========================================
// 2. GENERATOR IV (Pengacak)
// ==========================================
const generateIv = (): Uint8Array => {
  const iv = new Uint8Array(16);

  for (let i = 0; i < 16; i++) {
    iv[i] = Math.floor(Math.random() * 256);
  }


  return iv;
};

// ==========================================
// ENCRYPT FUNCTION
// Output: string HEX (Contoh: "a1b2:c3d4...")
// ==========================================
const encrypt = (data: string, secretKey: string): string => {
  try {
    const textBytes = aesjs.utils.utf8.toBytes(data);
    const keyBytes = prepareKey(secretKey);
    const iv = generateIv();

    // Pakai AES Counter (CTR) - Cepat & Aman
    const aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(iv));
    const encryptedBytes = aesCtr.encrypt(textBytes);

    // Ubah ke Hex (Otomatis URL Safe, tidak perlu replace +/= lagi)
    const ivHex = aesjs.utils.hex.fromBytes(iv);
    const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);

    // Format gabungan: IV:ENCRYPTED
    return `${ivHex}:${encryptedHex}`;
  } catch (e) {
    console.error("Server Encrypt Error:", e);

    return "";
  }
};

// ==========================================
// DECRYPT FUNCTION
// Input: string HEX dari Client
// ==========================================
const decrypt = (ciphertext: string, secretKey: string): string => {
  try {
    if (!ciphertext || !ciphertext.includes(':')) return "";

    // Pisahkan IV dan Data
    const [ivHex, encryptedHex] = ciphertext.split(':');

    const keyBytes = prepareKey(secretKey);
    const iv = aesjs.utils.hex.toBytes(ivHex);
    const encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);

    const aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(iv));
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  } catch (e) {
    console.error("Server Decrypt Error:", e);

    return "";
  }
};

// eslint-disable-next-line import/no-anonymous-default-export
export default { encrypt, decrypt };
