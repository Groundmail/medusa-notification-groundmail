<p align="center">
  <a href="https://groundmail.dev">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://app.groundmail.dev/images/github/readme-logo-dark.png">
      <img alt="Groundmail" src="https://app.groundmail.dev/images/github/readme-logo-light.png" height="44">
    </picture>
  </a>
</p>

<h1 align="center">Groundmail for Medusa</h1>

<p align="center">
  A <a href="https://medusajs.com">Medusa</a> v2 notification provider for the Groundmail transactional email API.<br>
  Order confirmations, shipping updates and password resets go out on the <code>email</code> channel through Groundmail.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/medusa-notification-groundmail"><img alt="npm" src="https://img.shields.io/npm/v/medusa-notification-groundmail?color=a3461f&label=npm"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-b48f62"></a>
</p>

<p align="center">
  <a href="https://docs.groundmail.dev/frameworks/medusa">Docs</a> ·
  <a href="https://app.groundmail.dev/signup">Get a free account</a> ·
  <a href="https://groundmail.dev">groundmail.dev</a>
</p>

---

## Install

```bash
npm install medusa-notification-groundmail
```

```bash
GROUNDMAIL_API_KEY=gm_your_key_here
```

## Configure

```ts
// medusa-config.ts
module.exports = defineConfig({
  // ...
  modules: [
    {
      resolve: '@medusajs/medusa/notification',
      options: {
        providers: [
          {
            resolve: 'medusa-notification-groundmail',
            id: 'groundmail',
            options: {
              channels: ['email'],
              api_key: process.env.GROUNDMAIL_API_KEY,
              from: 'Acme <orders@yourdomain.com>',
            },
          },
        ],
      },
    },
  ],
})
```

## Send

From a subscriber or workflow:

```ts
await notificationModuleService.createNotifications({
  to: order.email,
  channel: 'email',
  template: 'order-placed',
  data: { order: { display_id: order.display_id, total: order.total } },
})
```

Without `content`, the provider sends the [Groundmail template](https://docs.groundmail.dev/templates) whose id or alias matches `template`, with `data` as its variables. Nested keys are joined with underscores, so `{{order_display_id}}` in the template reads `data.order.display_id`.

To send your own markup instead, pass `content: { subject, html, text }`.

## Options

| Option | Purpose |
|--------|---------|
| `api_key` | Groundmail API key. Falls back to `GROUNDMAIL_API_KEY` |
| `from` | Default From address, on a verified domain |
| `reply_to` | Default Reply-To address |
| `templates` | Map Medusa template names to Groundmail templates, e.g. `{ "order-placed": "order_confirmation" }` |
| `base_url` | Override the API base URL |

`provider_data` on a notification can carry `cc`, `bcc`, `replyTo`, `tags`, `headers`, `idempotencyKey` and `scheduledAt`.

## Contributing

Found a bug or want something added? [Open an issue](https://github.com/Groundmail/medusa-notification-groundmail/issues). This code is published here on each release, so we port fixes rather than merging pull requests directly. The HTTP client itself is the [`groundmail`](https://www.npmjs.com/package/groundmail) package.

## Why Groundmail

- **Our own mail servers and IP space.** Your password resets and receipts don't share a pool with bulk marketing senders.
- **Transactional email only.** No newsletters or cold outreach on the platform, which keeps the sending reputation clean.
- **Start free.** 3,000 emails a month on the Free plan; Pro is 50,000 emails for $20/month. Dedicated IPs on Scale.
- **Built for code and for agents.** REST API, SMTP, SDKs for Node, Python, Go, PHP and Ruby, a CLI, and an MCP server for Claude, ChatGPT and Cursor.

## All Groundmail libraries

| Use | Package |
|-----|---------|
| Node.js / TypeScript | [`groundmail`](https://www.npmjs.com/package/groundmail) on npm |
| Python, Go, Ruby | [Groundmail/groundmail-sdks](https://github.com/Groundmail/groundmail-sdks) |
| PHP | [Groundmail/groundmail-php](https://github.com/Groundmail/groundmail-php) |
| Laravel | [Groundmail/groundmail-laravel](https://github.com/Groundmail/groundmail-laravel) |
| Symfony Mailer | [Groundmail/groundmail-symfony-mailer](https://github.com/Groundmail/groundmail-symfony-mailer) |
| Nodemailer | [Groundmail/groundmail-nodemailer](https://github.com/Groundmail/groundmail-nodemailer) |
| NestJS | [Groundmail/nestjs-groundmail](https://github.com/Groundmail/nestjs-groundmail) |
| Strapi | [Groundmail/strapi-provider-email-groundmail](https://github.com/Groundmail/strapi-provider-email-groundmail) |
| Medusa | [Groundmail/medusa-notification-groundmail](https://github.com/Groundmail/medusa-notification-groundmail) |
| AdonisJS | [Groundmail/adonisjs-groundmail](https://github.com/Groundmail/adonisjs-groundmail) |
| CLI | [`groundmail-cli`](https://www.npmjs.com/package/groundmail-cli) on npm |
| MCP server (Claude, ChatGPT, Cursor) | [Groundmail/groundmail-mcp](https://github.com/Groundmail/groundmail-mcp) |
| Agent skills and Claude Code plugin | [Groundmail/groundmail-skills](https://github.com/Groundmail/groundmail-skills) |

[Website](https://groundmail.dev) · [Docs](https://docs.groundmail.dev) · [Pricing](https://groundmail.dev/pricing) · [Sign up free](https://app.groundmail.dev/signup)
