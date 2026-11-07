import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export const roleLabelMap = {
  OWNER: 'Pemilik & Super Admin',
  ADMIN: 'Admin Operasional & Pembelian',
  KASIR: 'Kasir Toko (Penjualan)',
  GUDANG: 'Staf Gudang & Logistik',
  KEUANGAN: 'Akuntan & Finance',
};

// GET: List all users in Supabase Auth
export async function GET(request) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const formattedUsers = (data?.users || []).map((u) => {
      const userRole = u.user_metadata?.role || 'KASIR';
      return {
        id: u.id,
        email: u.email,
        fullName: u.user_metadata?.full_name || u.email.split('@')[0],
        displayName: u.user_metadata?.display_name || u.user_metadata?.full_name || u.email,
        role: userRole,
        roleLabel: roleLabelMap[userRole] || u.user_metadata?.role_label || 'Staf Kasir',
        phone: u.user_metadata?.phone || '-',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        emailConfirmed: Boolean(u.email_confirmed_at),
      };
    });

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (err) {
    console.error('API /api/admin/users GET error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST: Create a new user (by Admin)
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role, phone } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email dan password wajib diisi!' }, { status: 400 });
    }

    const assignedRole = role || 'KASIR';
    const cleanFullName = fullName?.trim() || email.split('@')[0];

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanFullName,
        display_name: `${cleanFullName} (${assignedRole})`,
        role: assignedRole,
        role_label: roleLabelMap[assignedRole] || 'Staf Kasir',
        phone: phone?.trim() || '-',
      },
    });

    if (error) throw error;

    return NextResponse.json({ success: true, user: data.user });
  } catch (err) {
    console.error('API /api/admin/users POST error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PUT: Edit user profile & role, or Reset Password (by Admin)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId, newPassword, fullName, role, phone } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID wajib disertakan!' }, { status: 400 });
    }

    // Fetch existing user to safely merge metadata
    const { data: userRecord, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (fetchErr) throw fetchErr;

    const existingMeta = userRecord?.user?.user_metadata || {};
    const updatePayload = {};

    if (newPassword && newPassword.trim()) {
      updatePayload.password = newPassword.trim();
    }

    const newRole = role || existingMeta.role || 'KASIR';
    const newFullName = fullName !== undefined ? fullName.trim() : (existingMeta.full_name || '');
    const newPhone = phone !== undefined ? phone.trim() : (existingMeta.phone || '-');

    updatePayload.user_metadata = {
      ...existingMeta,
      full_name: newFullName,
      role: newRole,
      role_label: roleLabelMap[newRole] || newRole,
      phone: newPhone,
      display_name: `${newFullName} (${newRole})`,
    };

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Data pengguna dan hak akses berhasil diperbarui!',
      user: data.user,
    });
  } catch (err) {
    console.error('API /api/admin/users PUT error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE: Delete a user (by Admin)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID wajib disertakan!' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Pengguna berhasil dihapus!' });
  } catch (err) {
    console.error('API /api/admin/users DELETE error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
