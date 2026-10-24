import { describe, expect, it } from 'vitest'
import { MAX_ATTACHMENT_BYTES, attachmentError } from './attachments'

describe('attachmentError', () => {
  it('aceita arquivo dentro do limite', () => {
    expect(attachmentError(1024)).toBeNull()
    expect(attachmentError(MAX_ATTACHMENT_BYTES)).toBeNull()
  })
  it('recusa arquivo acima do limite com a mensagem do tamanho', () => {
    const msg = attachmentError(MAX_ATTACHMENT_BYTES + 1)
    expect(msg).toContain('muito grande')
    expect(msg).toContain('400 KB')
  })
})
