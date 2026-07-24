const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Validates an image file (allowed format + size) and reads it as a data URL
 * for preview. Returns `null` (after calling `onError`) if validation fails.
 *
 * Shared by every image upload input in the app — opportunity cover/logo,
 * profile avatar/company logo/header image. These previously each carried
 * their own copy of the same two checks; a changed rule had to be applied by
 * hand at every call site, and the profile page's copies had silently
 * drifted to skip the format check the opportunity pages still had.
 */
export function readImageFile(file: File, onError: (message: string) => void): Promise<string> | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    onError('Format non autorisé (JPEG, PNG ou WebP uniquement).')
    return null
  }
  if (file.size > MAX_IMAGE_BYTES) {
    onError('Image trop volumineuse (5 Mo max).')
    return null
  }
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}
