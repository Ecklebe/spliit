[<img alt="Spliit" height="60" src="https://github.com/spliit-app/spliit/blob/main/public/logo-with-text.png?raw=true" />](https://spliit.app)

Spliit is a free and open source alternative to Splitwise. You can either use the official instance at [Spliit.app](https://spliit.app), or deploy your own instance:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fspliit-app%2Fspliit&project-name=my-spliit-instance&repository-name=my-spliit-instance&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D&)

## Features

- [x] Create a group and share it with friends
- [x] Create expenses with description
- [x] Display group balances
- [x] Create reimbursement expenses
- [x] Progressive Web App
- [x] Select all/no participant for expenses
- [x] Split expenses unevenly [(#6)](https://github.com/spliit-app/spliit/issues/6)
- [x] Mark a group as favorite [(#29)](https://github.com/spliit-app/spliit/issues/29)
- [x] Tell the application who you are when opening a group [(#7)](https://github.com/spliit-app/spliit/issues/7)
- [x] Assign a category to expenses [(#35)](https://github.com/spliit-app/spliit/issues/35)
- [x] Search for expenses in a group [(#51)](https://github.com/spliit-app/spliit/issues/51)
- [x] Upload and attach images to expenses [(#63)](https://github.com/spliit-app/spliit/issues/63)
- [x] Create expense by scanning a receipt [(#23)](https://github.com/spliit-app/spliit/issues/23)

### Possible incoming features

- [ ] Ability to create recurring expenses [(#5)](https://github.com/spliit-app/spliit/issues/5)
- [ ] Import expenses from Splitwise [(#22)](https://github.com/spliit-app/spliit/issues/22)

## Stack

- [Next.js](https://nextjs.org/) for the web application
- [TailwindCSS](https://tailwindcss.com/) for the styling
- [shadcn/UI](https://ui.shadcn.com/) for the UI components
- [Prisma](https://prisma.io) to access the database
- [Vercel](https://vercel.com/) for hosting (application and database)

## Contribute

The project is open to contributions. Feel free to open an issue or even a pull-request!
Join the discussion in [the Spliit Discord server](https://discord.gg/YSyVXbwvSY).

If you want to contribute financially and help us keep the application free and without ads, you can also:

- 💜 [Sponsor me (Sebastien)](https://github.com/sponsors/scastiel), or
- 💙 [Make a small one-time donation](https://donate.stripe.com/28o3eh96G7hH8k89Ba).

### Translation

The project's translations are managed using [our Weblate project](https://hosted.weblate.org/projects/spliit/spliit/).
You can easily add missing translations to the project or even add a new language!
Here is the current state of translation:

<a href="https://hosted.weblate.org/engage/spliit/">
<img src="https://hosted.weblate.org/widget/spliit/spliit/multi-auto.svg" alt="Translation status" />
</a>

## Run locally

1. Clone the repository (or fork it if you intend to contribute)
2. Run `npm install` to install dependencies.
3. Start a PostgreSQL server with `./scripts/start-local-db.sh`.
4. Copy the file `.env.example` as `.env`
5. Run prisma migrations and generate the client with `npm run prisma-migrate` and `npm run prisma-generate`
6. Run `npm run dev` to start the development server

## Run in a container

1. Run `npm run build-image` to build the docker image from the Dockerfile
2. Copy the file `container.env.example` as `container.env`
3. Run `npm run start-container` to start the postgres and the spliit2 containers
4. You can access the app by browsing to http://localhost:3000

## Run with Docker compose

This is a sample `docker-compose.yml` file that you can use to deploy this web app.

```yaml
name: spliit

services:
  app:
    image: ghcr.io/spliit-app/spliit:latest
    user: "1000:1000" # change to your user id or remove if you want root
    ports:
      - "8080:3000/tcp"
    environment:
      POSTGRES_PRISMA_URL: postgresql://spliit:spliit@database:5432/spliit
      POSTGRES_URL_NON_POOLING: postgresql://spliit:spliit@database:5432/spliit
    volumes:
      - ./app/cache:/usr/app/.next/cache
    depends_on:
      - database
    networks:
      - spliit

  database:
    image: postgres:17.3
    user: "1000:1000" # same as above
    environment:
      POSTGRES_USER: spliit
      POSTGRES_PASSWORD: spliit
      POSTGRES_DB: spliit
    volumes:
      - ./database/data:/var/lib/postgresql/data
    networks:
      - spliit

networks:
  spliit:
```

The web app will then be available on your host at http://localhost:8080/.

You can use named volumes in place of bind mounts if you prefer not having
data stored inside local directories.

## Health check

The application has a health check endpoint that can be used to check if the application is running and if the database is accessible.

- `GET /api/health/readiness` or `GET /api/health` - Check if the application is ready to serve requests, including database connectivity.
- `GET /api/health/liveness` - Check if the application is running, but not necessarily ready to serve requests.

## Opt-in features

### Expense documents

Spliit offers users to upload images (to an AWS S3 bucket) and attach them to expenses. To enable this feature:

- Create an S3 bucket on AWS or any S3-compatible provider.
- Update your environments variables with appropriate values:

```.env
NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS=true
S3_UPLOAD_KEY=AAAAAAAAAAAAAAAAAAAA
S3_UPLOAD_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
S3_UPLOAD_BUCKET=name-of-s3-bucket
S3_UPLOAD_REGION=us-east-1
```

You can also use other S3 providers by providing a custom endpoint:

```.env
S3_UPLOAD_ENDPOINT=http://localhost:9000
```

### Create expense from receipt

You can offer users to create expense by uploading a receipt. This feature relies on a vision-enabled LLM, and S3 storage for the uploaded images.

To enable the feature:

- You must enable expense documents feature as well (see section above). That might change in the future, but for now we need to store images to make receipt scanning work.
- Subscribe to an OpenAI API compatible provider and get access to model with _vision_.
- Update your environment variables with appropriate values:

```.env
NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_IMAGE_MODEL=gpt-5-nano
```

### Deduce category from title

You can offer users to automatically deduce the expense category from the title. Since this feature relies on a OpenAI subscription, follow the signup instructions above and configure the following environment variables:

```.env
NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_TEXT_MODEL=gtp3.5-turbo
```

### Group cloud sync

Spliit allows users to sync their groups to the cloud and access them across multiple devices. This feature is entirely optional - anonymous, URL-based group access (Spliit's default, no-account model) always works regardless of whether it's configured - and is off by default. Signing in is handed off to one or more **OIDC providers** you configure; there is no email/SMTP/magic-link step at all.

#### How it works

1. An operator registers one or more OIDC providers via environment variables (see below)
2. Once configured, users can sign in with any of the configured providers
3. On first sign-in, a sync profile is created for that user
4. Users can opt in to sync individual groups to their profile
5. They can access all their synced groups from any device by signing in again
6. Users control sync preferences (sync can be enabled/disabled at any time for each group)

#### OIDC setup

To enable sign-in/group sync, register at least one OIDC provider:

```.env
AUTH_SECRET=<run: openssl rand -base64 32>
AUTH_URL=https://your-domain.example.com
OIDC_PROVIDERS=zitadel

OIDC_PROVIDER_ZITADEL_NAME=Zitadel
OIDC_PROVIDER_ZITADEL_ISSUER=https://your-zitadel-instance.example.com
OIDC_PROVIDER_ZITADEL_CLIENT_ID=<from your OIDC provider>
OIDC_PROVIDER_ZITADEL_CLIENT_SECRET=<from your OIDC provider>
```

`OIDC_PROVIDERS` is a comma-separated list of provider ids (e.g. `zitadel,keycloak`); each id needs its own `OIDC_PROVIDER_<ID>_{NAME,ISSUER,CLIENT_ID,CLIENT_SECRET}` set. `zitadel` gets Auth.js's built-in Zitadel preset; any other id is registered as a generic OIDC provider, so this works with any standards-compliant OIDC issuer (Keycloak, Authentik, Okta, etc.), not just Zitadel. Register your OIDC app's redirect URI as `<your-domain>/api/auth/callback/<provider-id>`.

`AUTH_URL` is strongly recommended whenever the app runs behind a reverse proxy: without it, Auth.js's own request-based origin detection can be unreliable in some proxy setups, causing OAuth redirects to use the wrong host.

When `OIDC_PROVIDERS` is empty (the default), the whole feature is fully hidden - not just unlinked - throughout the app: no Settings nav link, no sign-in UI, and `/settings`/`/api/auth/*` genuinely 404 rather than being unreachable-but-present.

#### Sync behavior

- Groups are stored locally by default (no account required)
- Users can enable sync for individual groups at any time
- Synced groups appear in "My groups" when signed in
- Local groups remain accessible even when signed out
- Disabling sync does not delete the group, only removes cloud association

### Admin stats page

A minimal, read-only `/admin` page (group/participant/expense/user/synced-group counts) is available, styled after Traefik's own `/dashboard` entrypoint. It's off by default, independent of the OIDC setting above:

```.env
ENABLE_ADMIN=true
```

When enabled, it's still gated by an OIDC "admin" role grant (an `admins` project role on your OIDC provider, asserted into the ID token's roles claim) - enabling it with no OIDC provider configured just leaves the page permanently unreachable, since nobody can ever hold that role without a login path. No administrative actions are wired up yet; it's read-only.

## License

MIT, see [LICENSE](./LICENSE).
