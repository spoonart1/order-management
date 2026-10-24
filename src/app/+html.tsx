import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * File resmi Expo Router: +html.tsx
 * Sesuai dokumentasi resmi Expo: https://docs.expo.dev/router/reference/html/
 * Digunakan untuk mengatur template <head>, <title>, dan <link rel="icon"> pada web.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Title tab browser */}
        <title>Alora Studio — Operational & Backoffice Management</title>

        {/* Favicon resmi web */}
        <link rel="icon" href="/favicon.ico" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
