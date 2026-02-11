import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hireflux.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/employer/dashboard/', '/api/', '/auth/', '/test/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
