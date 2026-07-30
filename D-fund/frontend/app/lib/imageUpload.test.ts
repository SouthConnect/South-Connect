import { describe, it, expect, vi } from 'vitest'
import { readImageFile } from './imageUpload'

function makeFile(type: string, sizeBytes: number): File {
  const bytes = new Uint8Array(sizeBytes)
  return new File([bytes], 'test-image', { type })
}

describe('readImageFile', () => {
  it('rejects a disallowed format and never touches the file', () => {
    const onError = vi.fn()
    const result = readImageFile(makeFile('image/gif', 1024), onError)
    expect(result).toBeNull()
    expect(onError).toHaveBeenCalledWith('Format non autorisé (JPEG, PNG ou WebP uniquement).')
  })

  it('rejects a file over the 5 MB limit', () => {
    const onError = vi.fn()
    const result = readImageFile(makeFile('image/png', 5 * 1024 * 1024 + 1), onError)
    expect(result).toBeNull()
    expect(onError).toHaveBeenCalledWith('Image trop volumineuse (5 Mo max).')
  })

  it('accepts a file exactly at the 5 MB limit', async () => {
    const onError = vi.fn()
    const result = readImageFile(makeFile('image/jpeg', 5 * 1024 * 1024), onError)
    expect(result).not.toBeNull()
    expect(onError).not.toHaveBeenCalled()
    await expect(result).resolves.toEqual(expect.stringContaining('data:'))
  })

  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s and resolves a data URL', async (type) => {
    const onError = vi.fn()
    const result = readImageFile(makeFile(type, 100), onError)
    await expect(result).resolves.toEqual(expect.stringContaining('data:'))
    expect(onError).not.toHaveBeenCalled()
  })
})
