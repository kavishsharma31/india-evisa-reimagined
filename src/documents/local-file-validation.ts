import { z } from 'zod'

export const LOCAL_FILE_SOURCE = 'LOCAL_FILE' as const

export const localDocumentMetadataSchema = z
  .object({
    source: z.literal(LOCAL_FILE_SOURCE),
    mimeType: z.enum(['image/jpeg', 'application/pdf']),
    sizeBytes: z.number().int().positive(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .strict()

export type LocalDocumentMetadata = z.infer<typeof localDocumentMetadataSchema>

type LocalPhotoRequirement = Readonly<{
  kind: 'PHOTO'
  accept: string
  minimumBytes: number
  maximumBytes: number
  minimumWidthPixels: number
  minimumHeightPixels: number
}>

type LocalPdfRequirement = Readonly<{
  kind: 'PDF'
  accept: string
  minimumBytes: number
  maximumBytes: number
}>

export type LocalFileRequirement = LocalPhotoRequirement | LocalPdfRequirement

const PHOTO_REQUIREMENT: LocalFileRequirement = Object.freeze({
  kind: 'PHOTO',
  accept: '.jpg,.jpeg,image/jpeg',
  minimumBytes: 10 * 1024,
  maximumBytes: 1024 * 1024,
  minimumWidthPixels: 350,
  minimumHeightPixels: 350,
})

const PDF_REQUIREMENT: LocalFileRequirement = Object.freeze({
  kind: 'PDF',
  accept: '.pdf,application/pdf',
  minimumBytes: 10 * 1024,
  maximumBytes: 300 * 1024,
})

export function localFileRequirement(documentType: string): LocalFileRequirement {
  return documentType === 'SYNTHETIC_PORTRAIT' ? PHOTO_REQUIREMENT : PDF_REQUIREMENT
}

export type LocalFileValidationResult =
  | Readonly<{ valid: true; metadata: LocalDocumentMetadata }>
  | Readonly<{ valid: false; errors: readonly string[] }>

function extension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot).toLowerCase()
}

export function validateLocalDocumentMetadata(input: {
  documentType: string
  name: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
}): LocalFileValidationResult {
  const requirement = localFileRequirement(input.documentType)
  const errors: string[] = []
  if (requirement.kind === 'PHOTO') {
    const jpegType = input.mimeType === 'image/jpeg' && ['.jpg', '.jpeg'].includes(extension(input.name))
    if (!jpegType) {
      errors.push('Upload a JPEG photograph.')
    }
    if (input.sizeBytes < requirement.minimumBytes || input.sizeBytes > requirement.maximumBytes) {
      errors.push('Photograph must be between 10 KB and 1 MB.')
    }
    if (jpegType) {
      if (
        input.width === undefined ||
        input.height === undefined ||
        input.width !== input.height
      ) {
        errors.push('Photograph must be square.')
      }
      if (
        input.width !== undefined &&
        input.height !== undefined &&
        (input.width < requirement.minimumWidthPixels || input.height < requirement.minimumHeightPixels)
      ) {
        errors.push('Photograph must be at least 350 × 350 pixels.')
      }
    }
  } else {
    if (input.mimeType !== 'application/pdf' || extension(input.name) !== '.pdf') {
      errors.push('Upload this document as a PDF.')
    }
    if (input.sizeBytes < requirement.minimumBytes || input.sizeBytes > requirement.maximumBytes) {
      errors.push('PDF must be between 10 KB and 300 KB.')
    }
  }

  if (errors.length > 0) {
    return Object.freeze({ valid: false, errors: Object.freeze(errors) })
  }
  return Object.freeze({
    valid: true,
    metadata: localDocumentMetadataSchema.parse({
      source: LOCAL_FILE_SOURCE,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      ...(requirement.kind === 'PHOTO' ? { width: input.width, height: input.height } : {}),
    }),
  })
}

function jpegDimensions(bytes: Uint8Array): Readonly<{ width: number; height: number }> | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let offset = 2
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    if (marker === undefined) return null
    offset += 2
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue
    if (offset + 1 >= bytes.length) return null
    const length = (bytes[offset] ?? 0) * 256 + (bytes[offset + 1] ?? 0)
    if (length < 2 || offset + length > bytes.length) return null
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    if (isStartOfFrame && length >= 7) {
      return Object.freeze({
        height: (bytes[offset + 3] ?? 0) * 256 + (bytes[offset + 4] ?? 0),
        width: (bytes[offset + 5] ?? 0) * 256 + (bytes[offset + 6] ?? 0),
      })
    }
    offset += length
  }
  return null
}

export async function inspectLocalDocumentFile(
  documentType: string,
  file: File,
): Promise<LocalFileValidationResult> {
  const photo = localFileRequirement(documentType).kind === 'PHOTO'
  const dimensions = photo
    ? jpegDimensions(new Uint8Array(await file.arrayBuffer()))
    : null
  return validateLocalDocumentMetadata({
    documentType,
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    ...(dimensions === null ? {} : dimensions),
  })
}

export function formatFileSize(sizeBytes: number): string {
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}
