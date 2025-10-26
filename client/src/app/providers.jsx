// client/src/app/providers.jsx
'use client'

import { ThemeProvider } from 'next-themes'
import { UserProvider } from '../context/UserContext'

export default function ClientProviders({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
      <UserProvider>{children}</UserProvider>
    </ThemeProvider>
  )
}
