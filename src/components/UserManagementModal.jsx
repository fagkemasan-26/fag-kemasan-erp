'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  KeyRound,
  Shield,
  Trash2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit3,
  Phone,
  UserCheck,
  Check,
  Building2,
  Sparkles,
} from 'lucide-react';

export const AVAILABLE_ROLES = [
  {
    id: 'OWNER',
    name: 'Owner (Pemilik Usaha)',
    label: 'Pemilik & Super Admin',
    desc: 'Hak akses tertinggi ke seluruh modul sistem: Keuangan, Penjualan, Pembelian, Persediaan, Buku Besar, Pengaturan Usaha, dan Manajemen Staf.',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    colorHex: '#07291D',
    permissions: [
      'Penjualan (PO / PI / DP / DO / Faktur)',
      'Pembelian & Hutang Pabrik',
      'Persediaan & Stok Kemasan',
      'Buku Besar (COA) & Jurnal Umum',
      'Laporan Keuangan (Laba Rugi, Neraca, Arus Kas)',
      'Pengaturan Profil Usaha & Pajak',
      'Kelola Akun Staf & Reset Password Langsung',
    ],
  },
  {
    id: 'ADMIN',
    name: 'Admin Operasional',
    label: 'Admin Operasional & Pembelian',
    desc: 'Mengelola operasional harian usaha: Transaksi Penjualan, Pembelian ke supplier, Kontrol stok kemasan gudang, dan Catat Kas Masuk/Keluar.',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    colorHex: '#1D4ED8',
    permissions: [
      'Penjualan (PO / PI / DP / DO / Faktur)',
      'Pembelian & Hutang Pabrik',
      'Persediaan & Stok Kemasan Gudang',
      'Catat Kas Masuk & Kas Keluar Harian',
      'Daftar Pelanggan & Pemasok',
    ],
  },
  {
    id: 'KASIR',
    name: 'Kasir Toko (Penjualan)',
    label: 'Kasir & Front Office',
    desc: 'Fokus melayani pelanggan toko: Membuat Pesanan Penjualan (PO), Faktur Penjualan, Cetak Struk/Nota, dan Cek Stok Kemasan.',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    colorHex: '#D97706',
    permissions: [
      'Pesanan Penjualan (PO & Proforma Invoice)',
      'Faktur Penjualan & Kasir Kas',
      'Penerimaan Pembayaran Pelanggan',
      'Cek Ketersediaan Stok & Harga Kemasan',
      'Cetak Nota / Invoice PDF',
    ],
  },
  {
    id: 'GUDANG',
    name: 'Staf Gudang & Logistik',
    label: 'Staf Gudang & Logistik',
    desc: 'Fokus pergerakan fisik barang: Penerimaan Barang (RI) dari supplier, Pengiriman Surat Jalan (DO), dan Opname Fisik Kemasan.',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    colorHex: '#EA580C',
    permissions: [
      'Pengiriman Barang / Surat Jalan (DO)',
      'Penerimaan Barang Pabrik (RI)',
      'Kartu Stok Fisik & Penyesuaian Barang',
    ],
  },
  {
    id: 'KEUANGAN',
    name: 'Akuntan & Finance',
    label: 'Akuntan & Finance',
    desc: 'Fokus pembukuan & akuntansi: Buku Besar (COA), Jurnal Penyesuaian, Rekonsiliasi Kas Bank, dan Analisis Laporan Keuangan.',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    colorHex: '#7E22CE',
    permissions: [
      'Buku Besar & Daftar Akun (COA)',
      'Jurnal Umum Double-Entry',
      'Laporan Laba Rugi, Neraca & Arus Kas',
      'Monitoring Saldo Kas & Rekening Bank',
    ],
  },
];

export default function UserManagementModal({ isOpen, onClose, currentUser, onUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sub-modal: Edit User & Peran Hak Akses
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('KASIR');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Sub-modal: Tambah Staf Baru
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('KASIR');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Sub-modal: Admin Reset Password Langsung
  const [isResetPwOpen, setIsResetPwOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [adminResetPw, setAdminResetPw] = useState('');
  const [adminResetConfirmPw, setAdminResetConfirmPw] = useState('');
  const [showAdminResetPw, setShowAdminResetPw] = useState(false);
  const [showAdminResetConfirmPw, setShowAdminResetConfirmPw] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Fetch users from API
  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setUsers(json.users || []);

      // Auto-sync current logged-in user profile with latest database record
      if (currentUser && onUserUpdated && json.users) {
        const matchingCurrent = json.users.find(
          (u) => u.email === currentUser.email || u.id === currentUser.id
        );
        if (matchingCurrent && matchingCurrent.fullName !== currentUser.user_metadata?.full_name) {
          onUserUpdated({
            ...currentUser,
            user_metadata: {
              ...currentUser.user_metadata,
              full_name: matchingCurrent.fullName,
              role: matchingCurrent.role,
              role_label: matchingCurrent.roleLabel,
              phone: matchingCurrent.phone,
            },
          });
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setErrorMessage(err.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Open Edit User Modal
  const handleOpenEdit = (user) => {
    setSelectedUserForEdit(user);
    setEditFullName(user.fullName || '');
    setEditPhone(user.phone && user.phone !== '-' ? user.phone : '');
    setEditRole(user.role || 'KASIR');
    setIsEditUserOpen(true);
  };

  // Submit Edit User & Role
  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    if (!editFullName.trim()) {
      alert('Nama lengkap staf wajib diisi!');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForEdit.id,
          fullName: editFullName.trim(),
          phone: editPhone.trim() || '-',
          role: editRole,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setSuccessMessage(`Profil & Hak Akses ${selectedUserForEdit.email} berhasil diperbarui!`);
      setIsEditUserOpen(false);
      setSelectedUserForEdit(null);

      // Instantly sync current logged-in user in header if editing own account
      if (currentUser && onUserUpdated && (currentUser.email === selectedUserForEdit.email || currentUser.id === selectedUserForEdit.id)) {
        onUserUpdated({
          ...currentUser,
          user_metadata: {
            ...currentUser.user_metadata,
            full_name: editFullName.trim(),
            role: editRole,
            phone: editPhone.trim() || '-',
          },
        });
      }

      await fetchUsers();
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Save edit user error:', err);
      alert(err.message || 'Gagal memperbarui data pengguna.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword) {
      alert('Email dan kata sandi awal wajib diisi!');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          fullName: newFullName.trim(),
          role: newRole,
          phone: newPhone.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setSuccessMessage(`Pengguna ${newEmail} berhasil ditambahkan dengan peran ${newRole}!`);
      setIsAddUserOpen(false);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewPhone('');
      await fetchUsers();
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Create user error:', err);
      alert(err.message || 'Gagal menambahkan pengguna.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Handle Admin Direct Password Reset
  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    if (!adminResetPw || adminResetPw.length < 6) {
      alert('Password baru minimal harus 6 karakter!');
      return;
    }
    if (adminResetPw !== adminResetConfirmPw) {
      alert('Konfirmasi password tidak cocok dengan password baru!');
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForReset.id,
          newPassword: adminResetPw,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setSuccessMessage(
        `Password untuk ${selectedUserForReset.fullName || selectedUserForReset.email} berhasil direset!`
      );
      setIsResetPwOpen(false);
      setSelectedUserForReset(null);
      setAdminResetPw('');
      setAdminResetConfirmPw('');
      await fetchUsers();
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Reset password error:', err);
      alert(err.message || 'Gagal mereset kata sandi.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user) => {
    if (user.role === 'OWNER') {
      alert('Akun Pemilik (Owner) tidak dapat dihapus untuk keamanan sistem!');
      return;
    }

    const confirmDel = window.confirm(
      `Apakah Anda yakin ingin menghapus akun pengguna "${user.fullName} (${user.email})"?\n\nPengguna tidak akan bisa masuk lagi ke sistem.`
    );
    if (!confirmDel) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setSuccessMessage(`Pengguna ${user.email} berhasil dihapus.`);
      await fetchUsers();
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Delete user error:', err);
      alert(err.message || 'Gagal menghapus pengguna.');
    }
  };

  if (!isOpen) return null;

  const currentRoleInfo = AVAILABLE_ROLES.find((r) => r.id === editRole) || AVAILABLE_ROLES[0];
  const newRoleInfo = AVAILABLE_ROLES.find((r) => r.id === newRole) || AVAILABLE_ROLES[2];

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-[#07291D] text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase flex items-center gap-2">
                <span>Manajemen Pengguna &amp; Hak Akses Staf</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-800/80 text-[10px] text-emerald-200 font-mono">
                  Admin Panel
                </span>
              </h3>
              <p className="text-[11px] text-emerald-300/80">
                Kelola akun staf kasir, ubah peran &amp; hak akses, serta reset kata sandi langsung dari akun Admin
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setNewEmail('');
                setNewFullName('');
                setNewPassword('');
                setNewPhone('');
                setNewRole('KASIR');
                setIsAddUserOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-95 flex items-center space-x-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Pengguna Baru</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-900/50 transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifikasi Banner */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center space-x-2 text-xs text-emerald-900 font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center space-x-2 text-xs text-rose-900 font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tabel Pengguna */}
        <div className="p-5 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-emerald-800 animate-spin" />
              <p className="text-xs font-semibold">Memuat data pengguna...</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs" data-user-table>
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Nama &amp; Email Akun</th>
                    <th className="py-2.5 px-3">Peran / Role</th>
                    <th className="py-2.5 px-3">No. Telepon</th>
                    <th className="py-2.5 px-3">Terakhir Masuk</th>
                    <th className="py-2.5 px-3 text-center">Aksi Akun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map((u) => {
                    const isOwner = u.role === 'OWNER';
                    const roleConfig = AVAILABLE_ROLES.find((r) => r.id === u.role) || AVAILABLE_ROLES[2];

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#07291D] text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 uppercase border border-emerald-600/40">
                              {u.fullName ? u.fullName.substring(0, 2) : u.email.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <span>{u.fullName || 'Tanpa Nama'}</span>
                                {isOwner && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Owner
                                  </span>
                                )}
                              </p>
                              <p className="font-mono text-[11px] text-slate-500 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${roleConfig.badgeClass}`}
                          >
                            {roleConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {u.phone || '-'}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-500">
                          {u.lastSignInAt
                            ? new Date(u.lastSignInAt).toLocaleString('id-ID', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : 'Belum pernah login'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Tombol 1: Edit Staf & Peran Hak Akses */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              title="Edit Profil & Peran Hak Akses"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold text-[10px] transition active:scale-95 flex items-center space-x-1"
                            >
                              <Edit3 className="w-3 h-3 text-emerald-700" />
                              <span>Edit</span>
                            </button>

                            {/* Tombol 2: Reset Password Staf Langsung */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserForReset(u);
                                setAdminResetPw('');
                                setAdminResetConfirmPw('');
                                setIsResetPwOpen(true);
                              }}
                              title="Reset Password Langsung dari Admin"
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[10px] transition active:scale-95 flex items-center space-x-1"
                            >
                              <KeyRound className="w-3 h-3 text-amber-700" />
                              <span>Reset PW</span>
                            </button>

                            {/* Tombol 3: Hapus User (Terkunci untuk Owner) */}
                            {!isOwner && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                title="Hapus Pengguna"
                                className="p-1 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-lg transition active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total Pengguna Terdaftar: <strong>{users.length}</strong> akun
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-MODAL 1: EDIT STAF & PERAN HAK AKSES                 */}
      {/* ======================================================== */}
      {isEditUserOpen && selectedUserForEdit && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-[#07291D] text-white flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-emerald-300" />
                <span className="font-bold text-xs uppercase">
                  Edit Profil &amp; Hak Akses Pengguna
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditUserOpen(false)}
                className="text-emerald-300/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Info Pengguna */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">
                    Akun Login (Email):
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-900">{selectedUserForEdit.email}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">ID: {selectedUserForEdit.id.slice(0, 8)}...</span>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Staf *
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  placeholder="Contoh: Rina - Kasir Toko"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>

              {/* Nomor Telepon / WA */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nomor WhatsApp / Telepon
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>

              {/* Pemilihan Peran & Hak Akses */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Pilih Peran &amp; Hak Akses (Role) *
                </label>
                <div className="space-y-2">
                  {AVAILABLE_ROLES.map((roleItem) => {
                    const isSelected = editRole === roleItem.id;
                    return (
                      <div
                        key={roleItem.id}
                        onClick={() => setEditRole(roleItem.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">{roleItem.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${roleItem.badgeClass}`}>
                              {roleItem.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{roleItem.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pratinjau Hak Akses Modul Aktif */}
              <div className="p-3 bg-emerald-950/5 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-900 font-bold uppercase block mb-1.5">
                  Daftar Modul yang Dapat Diakses oleh {currentRoleInfo.label}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-emerald-950 font-medium">
                  {currentRoleInfo.permissions.map((perm, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <Check className="w-3 h-3 text-emerald-700 shrink-0 stroke-[3]" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg font-bold shadow-xs flex items-center space-x-1 disabled:opacity-50 transition active:scale-95"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Simpan Perubahan Hak Akses</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL 2: RESET PASSWORD LANGSUNG DARI ADMIN          */}
      {/* ======================================================== */}
      {isResetPwOpen && selectedUserForReset && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-[#07291D] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-emerald-300" />
                <span className="font-bold text-xs uppercase">
                  Reset Password Pengguna
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPwOpen(false)}
                className="text-emerald-300/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword} className="p-4 space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">
                  Target Pengguna:
                </span>
                <p className="font-bold text-slate-900">{selectedUserForReset.fullName}</p>
                <p className="font-mono text-[11px] text-slate-500">{selectedUserForReset.email}</p>
              </div>

              {/* Password Baru with Eye Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Password Baru *
                </label>
                <div className="relative">
                  <input
                    type={showAdminResetPw ? 'text' : 'password'}
                    value={adminResetPw}
                    onChange={(e) => setAdminResetPw(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    required
                    className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminResetPw(!showAdminResetPw)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                  >
                    {showAdminResetPw ? (
                      <EyeOff className="w-3.5 h-3.5 text-emerald-800" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru with Eye Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Konfirmasi Password Baru *
                </label>
                <div className="relative">
                  <input
                    type={showAdminResetConfirmPw ? 'text' : 'password'}
                    value={adminResetConfirmPw}
                    onChange={(e) => setAdminResetConfirmPw(e.target.value)}
                    placeholder="Ulangi password baru..."
                    required
                    className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminResetConfirmPw(!showAdminResetConfirmPw)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                  >
                    {showAdminResetConfirmPw ? (
                      <EyeOff className="w-3.5 h-3.5 text-emerald-800" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsResetPwOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-3.5 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg font-bold shadow-xs flex items-center space-x-1 disabled:opacity-50"
                >
                  {isSubmittingReset ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Simpan Password Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL 3: TAMBAH PENGGUNA STAF BARU                   */}
      {/* ======================================================== */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-[#07291D] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-emerald-300" />
                <span className="font-bold text-xs uppercase">Tambah Staf / Pengguna Baru</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-emerald-300/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Staf *
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Contoh: Rina - Kasir Toko"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Email Akun *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="staff@fagkemasan.com"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Peran / Hak Akses *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nomor WhatsApp / Telepon
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Contoh: 0812-xxxx-xxxx"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* Password Awal with Eye Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Kata Sandi (Password) Awal *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    required
                    className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-3.5 h-3.5 text-emerald-800" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Staf dapat langsung login menggunakan email &amp; password ini.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-1.5 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-lg font-bold shadow-xs flex items-center space-x-1 disabled:opacity-50"
                >
                  {isSubmittingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mendaftarkan...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Daftarkan Pengguna</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
