import imageUploadGuidelines from '@/config/image-upload-guidelines.json'

export type ImageUploadGuidelineKey = keyof typeof imageUploadGuidelines

export interface ImageUploadGuideline {
  label: string
  recommendedSize: string
  aspectRatio: string
  usage: string
  guidance: string
}

export const IMAGE_UPLOAD_GUIDELINES = imageUploadGuidelines as Record<ImageUploadGuidelineKey, ImageUploadGuideline>

export function imageUploadHint(key: ImageUploadGuidelineKey): string {
  const guideline = IMAGE_UPLOAD_GUIDELINES[key]
  return `${guideline.recommendedSize} recommended (${guideline.aspectRatio}). ${guideline.guidance}`
}
