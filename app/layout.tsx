import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Slow TV — home broadcast system',
  description: 'A tactile 1990s television interface for your own local media library.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
