// client/src/components/Layout.jsx
import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      {/* sau này nếu cần footer, add ở đây */}
    </>
  )
}
