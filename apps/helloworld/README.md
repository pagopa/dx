# Hello World Next.js App

This is a simple Next.js application demonstrating ISR (Incremental Static Regeneration) functionality.

## Features

- 🏠 **Homepage**: Simple landing page with navigation
- 📝 **Posts with ISR**: Pages that regenerate every 60 seconds to demonstrate ISR
- 🔗 **Dynamic Routes**: Individual post pages with 30-second revalidation
- 🌐 **API Routes**: Simple API endpoint returning current server time
- 🎨 **Modern Styling**: Clean CSS with dark/light mode support

## Getting Started

1. Install dependencies:
```bash
yarn install
```

2. Run the development server:
```bash
yarn dev
```

3. Build for production:
```bash
yarn build
```

4. Start production server:
```bash
yarn start
```

## ISR Configuration

- **Posts page**: Revalidates every 60 seconds (`revalidate = 60`)
- **Individual post pages**: Revalidate every 30 seconds (`revalidate = 30`)
- **Static generation**: All post pages are pre-generated at build time

## OpenNext Compatibility

This app is configured to work with OpenNext for AWS Lambda deployment:
- Uses `output: 'standalone'` in next.config.js
- Compatible with AWS Lambda and CloudFront
- Optimized for serverless deployment

## File Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── posts/
│   │   ├── page.tsx (ISR: 60s)
│   │   └── [id]/
│   │       └── page.tsx (ISR: 30s)
│   └── api/
│       └── hello/
│           └── route.ts
└── ...
```
