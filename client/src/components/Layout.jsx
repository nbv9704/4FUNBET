import Navbar from './Navbar'
import { Toaster } from 'react-hot-toast' // Thêm Toaster for global toast

export default function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      <Toaster position="top-right" /> {/* Thêm Toaster, position right for PC */}
      {/* sau này nếu cần footer, add ở đây */}
    </>
  )
}