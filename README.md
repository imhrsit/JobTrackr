This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database Setup

This project uses PostgreSQL as the database. Make sure to have it installed and running on your local machine.

### Environment Variables

Create a `.env.local` file in the root of the project and add the following:

```dotenv
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/jobtrackr"
```

Replace `<username>` and `<password>` with your PostgreSQL credentials.

### Seeding the Database

To seed the database with initial data, run:

```bash
npm run db:seed
```

This will create a demo user and populate the database with sample skills and jobs.

## Prisma Client

The project uses Prisma as an ORM. To generate the Prisma Client, run:

```bash
npm run db:generate
```

This will generate the client based on the schema defined in `prisma/schema.prisma`.
