// app/layout.js
import '../styles/globals.css'
import Layout from '../components/Layout'
import ClientProviders from './providers'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: '4funBET - Nhà cái đến từ nụ cười',
  description: 'Fun card games with friends',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-100 transition-colors duration-300">
        <ClientProviders>
          <Layout>{children}</Layout>
          <Toaster
            position="top-right"
            toastOptions={{
              // đúng 1.5 giây như yêu cầu
              duration: 1500,
              // dùng animation mặc định của react-hot-toast
            }}
          />
        </ClientProviders>
      </body>
    </html>
  )
}
