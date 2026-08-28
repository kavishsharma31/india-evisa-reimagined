import { describe, expect, it } from 'vitest'

import { localFileRequirement, validateLocalDocumentMetadata } from './local-file-validation'

const PHOTO = 'SYNTHETIC_PORTRAIT'
const PDF = 'SYNTHETIC_PASSPORT_PAGE'

describe('local document file policy', () => {
  it('centralizes browser accept values and byte bounds', () => {
    expect(localFileRequirement(PHOTO)).toEqual({
      kind: 'PHOTO', accept: '.jpg,.jpeg,image/jpeg', minimumBytes: 10_240, maximumBytes: 1_048_576,
      minimumWidthPixels: 350, minimumHeightPixels: 350,
    })
    expect(localFileRequirement(PDF)).toEqual({
      kind: 'PDF', accept: '.pdf,application/pdf', minimumBytes: 10_240, maximumBytes: 307_200,
    })
  })

  it('accepts a valid square JPEG and emits safe metadata only', () => {
    expect(validateLocalDocumentMetadata({
      documentType: PHOTO, name: 'synthetic-photo.jpeg', mimeType: 'image/jpeg',
      sizeBytes: 12_000, width: 350, height: 350,
    })).toEqual({
      valid: true,
      metadata: { source: 'LOCAL_FILE', mimeType: 'image/jpeg', sizeBytes: 12_000, width: 350, height: 350 },
    })
  })

  it.each([
    ['PNG photograph', { name: 'photo.png', mimeType: 'image/png', sizeBytes: 12_000, width: 350, height: 350 }, ['Upload a JPEG photograph.']],
    ['undersized file', { name: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 9_000, width: 350, height: 350 }, ['Photograph must be between 10 KB and 1 MB.']],
    ['oversized file', { name: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 1_048_577, width: 350, height: 350 }, ['Photograph must be between 10 KB and 1 MB.']],
    ['padded 1 × 1 photograph', { name: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 12_000, width: 1, height: 1 }, ['Photograph must be at least 350 × 350 pixels.']],
    ['349 × 349 photograph', { name: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 12_000, width: 349, height: 349 }, ['Photograph must be at least 350 × 350 pixels.']],
    ['350 × 349 photograph', { name: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 12_000, width: 350, height: 349 }, ['Photograph must be square.', 'Photograph must be at least 350 × 350 pixels.']],
  ])('rejects a %s', (_label, input, expectedErrors) => {
    const result = validateLocalDocumentMetadata({ documentType: PHOTO, ...input })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toEqual(expectedErrors)
  })

  it('accepts a valid PDF', () => {
    expect(validateLocalDocumentMetadata({
      documentType: PDF, name: 'synthetic.pdf', mimeType: 'application/pdf', sizeBytes: 12_000,
    })).toEqual({
      valid: true,
      metadata: { source: 'LOCAL_FILE', mimeType: 'application/pdf', sizeBytes: 12_000 },
    })
  })

  it.each([
    ['wrong type', { name: 'support.txt', mimeType: 'text/plain', sizeBytes: 12_000 }, 'Upload this document as a PDF.'],
    ['undersized PDF', { name: 'support.pdf', mimeType: 'application/pdf', sizeBytes: 9_000 }, 'PDF must be between 10 KB and 300 KB.'],
    ['oversized PDF', { name: 'support.pdf', mimeType: 'application/pdf', sizeBytes: 307_201 }, 'PDF must be between 10 KB and 300 KB.'],
  ])('rejects a %s', (_label, input, expectedError) => {
    const result = validateLocalDocumentMetadata({ documentType: PDF, ...input })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors).toContain(expectedError)
  })
})
