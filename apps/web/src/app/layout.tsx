import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zenith',
  description: 'A self-hosted Discord clone',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-cosmic min-h-screen transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
