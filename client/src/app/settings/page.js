'use client'

import { useState, useEffect } from 'react'
import useApi from '../../hooks/useApi'
import { useUser } from '../../context/UserContext'
import Loading from '../../components/Loading'
import { toast } from 'react-hot-toast'

export default function SettingsPage() {
  const { user, fetchUser, logout } = useUser()
  const { patch, post } = useApi()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
      setAvatar(user.avatar || '')
      setDateOfBirth(user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '')
    }
  }, [user])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại')
      setLoading(false)
      return
    }
    try {
      await patch('/user/me', { username, email, avatar, dateOfBirth, currentPassword })
      await fetchUser()
      toast.success('Cập nhật thông tin cá nhân thành công!')
      setCurrentPassword('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    if (newPassword !== confirmNewPassword) {
      toast.error('Mật khẩu mới không khớp')
      setLoading(false)
      return
    }
    try {
      await post('/user/me/password', { oldPassword, newPassword })
      toast.success('Đổi mật khẩu thành công!')
      setOldPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <Loading text="Đang tải Settings…" />
  if (loading) return <Loading text="Đang xử lý…" />

  return (
    <div className="p-8 max-w-lg mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Personal Info */}
      <h2 className="text-xl font-bold">Personal Info</h2>
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Avatar URL</label>
          <input
            type="text"
            value={avatar}
            onChange={e => setAvatar(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Date of Birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={e => setDateOfBirth(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>

      {/* Change Password */}
      <h2 className="text-xl font-bold">Change Password</h2>
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Old Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Confirm New Password</label>
          <input
            type="password"
            value={confirmNewPassword}
            onChange={e => setConfirmNewPassword(e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save Password
        </button>
      </form>

      <button
        onClick={logout}
        className="mt-8 inline-block bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  )
}
