import { describe, expect, it, vi } from 'vitest'
import provider, { GroundmailNotificationService, toTemplateVariables } from './index'

function fakeFetch() {
  return vi.fn(async () =>
    new Response(JSON.stringify({ id: 'em_123', status: 'queued' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function lastBody(fetch: ReturnType<typeof fakeFetch>) {
  const [url, init] = fetch.mock.calls.at(-1) as unknown as [string, RequestInit]
  return { url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) }
}

describe('medusa-notification-groundmail', () => {
  it('exports a Medusa notification module provider', () => {
    expect(provider.services).toEqual([GroundmailNotificationService])
    expect(GroundmailNotificationService.identifier).toBe('notification-groundmail')
  })

  it('validates options', () => {
    const saved = process.env.GROUNDMAIL_API_KEY
    delete process.env.GROUNDMAIL_API_KEY
    try {
      expect(() => GroundmailNotificationService.validateOptions({})).toThrow(/api_key/)
      expect(() => GroundmailNotificationService.validateOptions({ api_key: 'gm_x' })).not.toThrow()
    } finally {
      if (saved !== undefined) process.env.GROUNDMAIL_API_KEY = saved
    }
  })

  it('sends rendered content with the default From', async () => {
    const fetch = fakeFetch()
    const service = new GroundmailNotificationService(
      {},
      { api_key: 'gm_test_key', from: 'Shop <orders@shop.test>', base_url: 'https://api.test', fetch },
    )

    const result = await service.send({
      to: 'buyer@example.com',
      channel: 'email',
      template: 'order-placed',
      content: { subject: 'Order #1001', html: '<p>Thanks</p>', text: 'Thanks' },
      attachments: [{ filename: 'invoice.pdf', content: 'cGRm', content_type: 'application/pdf' }],
      provider_data: { bcc: ['audit@shop.test'], tags: { type: 'order' } },
    })

    expect(result).toEqual({ id: 'em_123' })
    const { url, headers, body } = lastBody(fetch)
    expect(url).toBe('https://api.test/emails')
    expect(headers.get('authorization')).toBe('Bearer gm_test_key')
    expect(body).toMatchObject({
      from: 'Shop <orders@shop.test>',
      to: 'buyer@example.com',
      subject: 'Order #1001',
      html: '<p>Thanks</p>',
      text: 'Thanks',
      bcc: ['audit@shop.test'],
    })
    expect(body.attachments).toEqual([{ name: 'invoice.pdf', content_type: 'application/pdf', data: 'cGRm' }])
  })

  it('sends a Groundmail template when there is no content', async () => {
    const fetch = fakeFetch()
    const service = new GroundmailNotificationService(
      {},
      { api_key: 'gm_test_key', from: 'orders@shop.test', templates: { 'order-placed': 'order_confirmation' }, fetch },
    )

    await service.send({
      to: 'buyer@example.com',
      from: 'Shop <hello@shop.test>',
      channel: 'email',
      template: 'order-placed',
      data: { order: { display_id: 1001, total: 42.5, email: 'buyer@example.com' }, customer_name: 'Ada' },
    })

    const { body } = lastBody(fetch)
    expect(body.from).toBe('Shop <hello@shop.test>')
    expect(body.template).toEqual({
      id: 'order_confirmation',
      variables: {
        order_display_id: 1001,
        order_total: 42.5,
        order_email: 'buyer@example.com',
        customer_name: 'Ada',
      },
    })
  })

  it('flattens notification data into template variables', () => {
    expect(
      toTemplateVariables({
        a: { b: { c: 'deep' } },
        list: ['x', 'y'],
        items: [{ title: 'skip' }],
        when: new Date('2026-01-02T03:04:05.000Z'),
        none: null,
        ok: true,
      }),
    ).toEqual({ a_b_c: 'deep', list: 'x, y', when: '2026-01-02T03:04:05.000Z', ok: true })
  })

  it('wraps API errors in a MedusaError', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'Domain not verified' }), { status: 422 }))
    const service = new GroundmailNotificationService({}, { api_key: 'gm_test_key', from: 'a@shop.test', fetch })
    await expect(
      service.send({ to: 'b@example.com', channel: 'email', template: 't', content: { subject: 's', text: 't' } }),
    ).rejects.toThrow(/Failed to send email: .*Domain not verified/)
  })
})
