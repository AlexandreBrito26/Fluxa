/**
 * Anexos ficam no próprio lançamento (localStorage, limite de ~5 MB por app).
 * Por isso o tamanho é limitado. Um comprovante em foto/PDF cabe com folga nesse limite.
 */
export const MAX_ATTACHMENT_BYTES = 400 * 1024

export interface Attachment {
  name: string
  dataUrl: string
}

/** Mensagem de erro para um arquivo que não pode ser anexado, ou null se estiver ok. */
export function attachmentError(size: number): string | null {
  if (size > MAX_ATTACHMENT_BYTES) {
    return `Arquivo muito grande (${Math.round(size / 1024)} KB). O limite é ${MAX_ATTACHMENT_BYTES / 1024} KB.`
  }
  return null
}

/** Lê o arquivo como data URL. Rejeita arquivos acima do limite. */
export function readAttachment(file: File): Promise<Attachment> {
  const err = attachmentError(file.size)
  if (err) return Promise.reject(new Error(err))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result) })
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}
