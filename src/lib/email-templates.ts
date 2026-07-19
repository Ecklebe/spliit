import { getTranslations } from 'next-intl/server'

export async function magicLinkEmail(
  url: string,
  host: string,
): Promise<{ subject: string; text: string; html: string }> {
  const t = await getTranslations('Emails.MagicLink')
  return {
    subject: t('subject', { host }),
    text: t('text', { host, url }),
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f0fdf4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                  <tr>
                    <td style="padding: 40px 40px 32px 40px; text-align: center;">
<!-- Logo with text -->
                      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                          <td style="vertical-align: middle; padding-left: 10px;">
                            <span style="font-size: 28px; font-weight: 700; color: #0d7d5f; letter-spacing: -0.5px;">Spliit</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px;">
                      <div style="height: 1px; background: linear-gradient(to right, transparent, #e5e7eb, transparent);"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px 40px 40px 40px; text-align: center;">
                      <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #1a1a1a;">
                        ${t('html.title')}
                      </h1>
                      <p style="margin: 0 0 32px 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                        ${t('html.body')}
                      </p>
                      <a href="${url}" style="display: inline-block; background-color: #0d9669; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; transition: background-color 0.2s;">
                        ${t('html.cta')}
                      </a>
                      <p style="margin: 32px 0 0 0; font-size: 13px; color: #9ca3af;">
                        ${t('html.copyLabel')}
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 13px; color: #0d7d5f; word-break: break-all;">
                        ${url}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 32px 40px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                        ${t('html.footer')}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }
}
