// client/src/app/profile/page.js
'use client'

import RequireAuth from '@/components/RequireAuth'
import { useUser } from '../../context/UserContext'
import Loading from '../../components/Loading'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

function ProfilePage() {
  const { user } = useUser()

  if (!user) return <Loading text="Đang tải Profile…" />

  const copyId = () => {
    navigator.clipboard.writeText(user.id)
      .then(() => toast.success('ID đã copy thành công!'))
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-center">Profile</h1>

      {/* ID (readonly + copy) */}
      <div className="flex justify-center items-center space-x-2 mb-6">
        <input
          type="text"
          value={user.id}
          readOnly
          className="w-64 border rounded px-2 py-1 text-center bg-gray-100 text-gray-900 dark:text-gray-900"
        />
        <button
          onClick={copyId}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Copy
        </button>
      </div>

      {/* Avatar + User Info */}
      <div className="flex items-start space-x-8">
        {/* Avatar + Settings Button */}
        <div className="flex flex-col items-center">
          <img
            src={user.avatar || '/default-avatar.png'}
            alt="Avatar"
            className="w-48 h-48 rounded-lg object-cover border-2 border-gray-300 shadow-md"
          />

          {/* Account Settings Button */}
          <Link
            href="/settings"
            className="mt-4 w-48 text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Account Settings
          </Link>
        </div>

        {/* About Info */}
        <div className="self-center bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-lg font-semibold mb-3">About</h2>
          <p className="text-base"><strong>Username:</strong> {user.username}</p>
          <p className="text-base"><strong>Email:</strong> {user.email}</p>
          <p className="text-base">
            <strong>Date of Birth:</strong>{' '}
            {user.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString()
              : 'NN/NN/NNNN'}
          </p>
        </div>
      </div>
    </div>
  )
}
export default RequireAuth(ProfilePage)