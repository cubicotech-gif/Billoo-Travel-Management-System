import { supabase } from './supabase'

export const STORAGE_BUCKET = 'documents'

/**
 * Initialize storage bucket if it doesn't exist
 */
export async function initializeStorageBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((bucket) => bucket.name === STORAGE_BUCKET)

    if (!bucketExists) {
      await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      })
    }
  } catch (error) {
    console.error('Error initializing storage bucket:', error)
  }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  entityType: string,
  entityId: string
): Promise<{ url: string; path: string } | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${entityType}/${entityId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName)

    return {
      url: urlData.publicUrl,
      path: fileName,
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    return null
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

/**
 * Get signed URL for private file access
 */
export async function getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn)

    if (error) throw error
    return data.signedUrl
  } catch (error) {
    console.error('Error getting signed URL:', error)
    return null
  }
}

/**
 * Download a file
 */
export async function downloadFile(filePath: string, fileName: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(filePath)

    if (error) throw error

    const url = window.URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error downloading file:', error)
  }
}
