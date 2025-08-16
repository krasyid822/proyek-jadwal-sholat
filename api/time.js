export default function handler(req, res) {
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  res.status(200).json({ serverTime: now });
}
