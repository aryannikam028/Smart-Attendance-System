import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Attendance System | Yashoda Technical Campus (YSPM)',
  description: 'Production biometric and academic attendance management system for Final Year B.Tech (ETC) - Yashoda Technical Campus, Satara.',
  keywords: ['Attendance', 'Biometric', 'YSPM', 'Yashoda Technical Campus', 'ESP8266', 'Electronics and Telecommunication'],
  authors: [{ name: 'YSPM ETC Department' }],
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/logo.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
