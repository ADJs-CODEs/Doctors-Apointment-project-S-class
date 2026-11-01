import type { MetadataRoute } from 'next';

// Lets phones "Add to Home Screen" as an app. iPhones only allow device notifications
// for web apps added this way.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ADJ's CODEs Patient Portal",
    short_name: "ADJ's CODEs",
    description: 'Book doctors, track your medicines and message your doctor.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f8f9fd',
    theme_color: '#0d9488',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
