import { AbstractNotificationProviderService, MedusaError } from '@medusajs/framework/utils'
import type { Logger, ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from '@medusajs/framework/types'

type Groundmail = import('groundmail', { with: { 'resolution-mode': 'import' } }).Groundmail
type SendEmailParams = import('groundmail', { with: { 'resolution-mode': 'import' } }).SendEmailParams
type TemplateVariables = Record<string, string | number | boolean>

export type GroundmailNotificationOptions = {
  /** Groundmail API key (`gm_…`). Falls back to `GROUNDMAIL_API_KEY`. */
  api_key?: string
  apiKey?: string
  /** Default From address, on a domain verified in Groundmail. */
  from?: string
  /** Default Reply-To address. */
  reply_to?: string
  /**
   * Map Medusa template names to Groundmail template ids or aliases, e.g.
   * `{ "order-placed": "order_confirmation" }`. Unmapped names are used as-is.
   */
  templates?: Record<string, string>
  /** Override the API base URL. */
  base_url?: string
  /** Custom fetch implementation (tests, proxies). */
  fetch?: typeof fetch
  /** Use this client instead of building one (tests). */
  client?: Groundmail
}

type InjectedDependencies = { logger?: Logger }

/**
 * Turn notification data into Groundmail template variables. Template
 * placeholders are flat (`{{order_display_id}}`), so nested keys are joined
 * with underscores. Lists of plain values are joined with commas; lists of
 * objects are left out.
 */
export function toTemplateVariables(data: Record<string, unknown> | null | undefined): TemplateVariables {
  const out: TemplateVariables = {}
  const visit = (value: unknown, key: string) => {
    if (value == null) return
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value
    } else if (value instanceof Date) {
      out[key] = value.toISOString()
    } else if (Array.isArray(value)) {
      if (value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
        out[key] = value.join(', ')
      }
    } else if (typeof value === 'object') {
      for (const [child, childValue] of Object.entries(value)) {
        visit(childValue, key ? `${key}_${child}` : child)
      }
    }
  }
  visit(data ?? {}, '')
  return out
}

export class GroundmailNotificationService extends AbstractNotificationProviderService {
  static identifier = 'notification-groundmail'

  protected readonly options_: GroundmailNotificationOptions
  protected readonly logger_?: Logger
  private client_?: Promise<Groundmail>

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.api_key && !options.apiKey && !options.client && !process.env.GROUNDMAIL_API_KEY) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Groundmail notification provider needs `api_key` in its options (or GROUNDMAIL_API_KEY).',
      )
    }
  }

  constructor({ logger }: InjectedDependencies, options: GroundmailNotificationOptions) {
    super()
    this.logger_ = logger
    this.options_ = options ?? {}
  }

  protected async client(): Promise<Groundmail> {
    if (this.options_.client) return this.options_.client
    this.client_ ??= (async () => {
      const apiKey = this.options_.api_key || this.options_.apiKey || process.env.GROUNDMAIL_API_KEY
      if (!apiKey) throw new Error('Groundmail API key is missing.')
      // groundmail ships ES modules only; import() loads it from CommonJS.
      const { Groundmail } = await import('groundmail')
      return new Groundmail(apiKey, { baseUrl: this.options_.base_url, fetch: this.options_.fetch })
    })().catch((error: unknown) => {
      this.client_ = undefined
      throw error
    })
    return this.client_
  }

  /** Build the Groundmail send request for a Medusa notification. */
  toSendParams(notification: ProviderSendNotificationDTO): SendEmailParams {
    const from = notification.from?.trim() || this.options_.from
    if (!from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Groundmail notification has no From address. Set `from` in the provider options.',
      )
    }

    const params: SendEmailParams = { from, to: notification.to }
    const content = notification.content
    if (content && (content.html || content.text)) {
      if (content.subject) params.subject = content.subject
      if (content.html) params.html = content.html
      if (content.text) params.text = content.text
    } else {
      const id = this.options_.templates?.[notification.template] ?? notification.template
      params.template = { id, variables: toTemplateVariables(notification.data) }
      if (content?.subject) params.subject = content.subject
    }

    if (this.options_.reply_to) params.replyTo = this.options_.reply_to
    if (notification.attachments?.length) {
      params.attachments = notification.attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.content_type || 'application/octet-stream',
        ...(attachment.id ? { contentId: attachment.id } : {}),
      }))
    }

    const extra = (notification.provider_data ?? {}) as Partial<SendEmailParams>
    for (const key of ['cc', 'bcc', 'replyTo', 'tags', 'headers', 'idempotencyKey', 'scheduledAt'] as const) {
      if (extra[key] !== undefined) (params as Record<string, unknown>)[key] = extra[key]
    }
    return params
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'No notification information provided')
    }
    const params = this.toSendParams(notification)
    try {
      const result = await (await this.client()).emails.send(params)
      return { id: result.id }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_?.error(`Groundmail: failed to send "${notification.template}" to ${notification.to}: ${message}`)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Failed to send email: ${message}`)
    }
  }
}
