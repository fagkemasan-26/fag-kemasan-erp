import './globals.css';

export const metadata = {
  title: 'FAG KEMASAN - Sistem Kasir & Pencatatan',
  description: 'Sistem Kasir, Stok & Pembelian Terpadu FAG Kemasan',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-100">{children}</body>
    </html>
  );
}
