import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import nodemailer from 'nodemailer'
import path from 'path'

// Types
export interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

export interface SendEmailResult {
  success: boolean
  error?: string
}

interface EmailTransport {
  send(options: SendEmailOptions): Promise<SendEmailResult>
}

// SMTP Transport
class SmtpTransport implements EmailTransport {
  private transporter: nodemailer.Transporter

  constructor(
    private config: {
      host: string
      port: number
      user?: string
      pass?: string
      from: string
    },
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth:
        config.user && config.pass
          ? { user: config.user, pass: config.pass }
          : undefined,
    })
  }

  async send({
    to,
    subject,
    text,
    html,
  }: SendEmailOptions): Promise<SendEmailResult> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject,
        text,
        html,
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMTP send failed',
      }
    }
  }
}

// Local File Transport (development)
class LocalFileTransport implements EmailTransport {
  constructor(
    private mailDir: string,
    private from: string,
  ) {}

  async send({
    to,
    subject,
    text,
    html,
  }: SendEmailOptions): Promise<SendEmailResult> {
    try {
      if (!existsSync(this.mailDir)) {
        await mkdir(this.mailDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${timestamp}-${to.replace(/[^a-zA-Z0-9@.-]/g, '_')}.eml`
      const filePath = path.join(this.mailDir, filename)

      const emlContent = `From: ${this.from}
To: ${to}
Subject: ${subject}
Content-Type: text/html; charset=utf-8

${html || text || ''}`

      await writeFile(filePath, emlContent, 'utf-8')
      console.log(`[DEV] Email written to ${filePath}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File write failed',
      }
    }
  }
}

// Factory function
function createTransport(): EmailTransport {
  const SMTP_HOST = process.env.SMTP_HOST
  const SMTP_PORT = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT)
    : 587
  const SMTP_USER = process.env.SMTP_USER
  const SMTP_PASS = process.env.SMTP_PASS
  const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@spliit.app'

  if (SMTP_HOST) {
    return new SmtpTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      pass: SMTP_PASS,
      from: EMAIL_FROM,
    })
  }

  return new LocalFileTransport(path.join(process.cwd(), '.mail'), EMAIL_FROM)
}

// Singleton transport
let transport: EmailTransport | null = null

export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  if (!transport) {
    transport = createTransport()
  }
  return transport.send(options)
}
