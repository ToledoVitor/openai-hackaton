import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI City',
  description: 'Jogo curto sobre educação, cidade e inteligência artificial.',
};

export const viewport: Viewport = {
  themeColor: '#9edbea',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
