import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET!

/** Default upload ceiling for presigned PUTs — 25 MB. */
export const PRESIGN_MAX_BYTES = 25 * 1024 * 1024

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  // Signed PUT can't bind a Content-Length *range* — only an exact value, which
  // would break variable-size uploads. Real enforcement: a bucket policy that
  // denies PUT for ContentLength > PRESIGN_MAX_BYTES, plus a post-upload
  // HeadObject size check before using the file (see voice/transcribe).
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
  return getSignedUrl(s3, command, { expiresIn })
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn })
}

export function buildS3Key(folder: string, filename: string): string {
  return `${folder}/${Date.now()}-${filename}`
}
