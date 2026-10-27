import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { product } from '@/content/copy';
import './globals.css';

export const metadata: Metadata = {
  title: product.name,
  description: 'A European KNX decision aid for homeowners. Contractors are permanently free. The owner Project Pro Pass is €79.99 on the iPhone only.',
  icons: { icon: '/logo.png' }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
