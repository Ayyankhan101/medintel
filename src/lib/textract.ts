import { TextractClient, DetectDocumentTextCommand, type Block } from '@aws-sdk/client-textract'

let _textract: TextractClient | null = null
function getClient(): TextractClient {
  if (!_textract) {
    _textract = new TextractClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _textract
}

export function isTextractConfident(confidence: number): boolean {
  return confidence >= 80
}

export function extractTextFromBlocks(blocks: Block[]): string {
  return blocks
    .filter(b => b.BlockType === 'LINE' && b.Text && isTextractConfident(b.Confidence ?? 0))
    .map(b => b.Text!)
    .join('\n')
}

export async function ocrDocumentFromS3(s3Key: string): Promise<string> {
  const response = await getClient().send(
    new DetectDocumentTextCommand({
      Document: { S3Object: { Bucket: process.env.AWS_S3_BUCKET!, Name: s3Key } },
    })
  )
  return extractTextFromBlocks(response.Blocks ?? [])
}

export async function ocrDocumentFromBuffer(imageBuffer: Buffer): Promise<string> {
  const response = await getClient().send(
    new DetectDocumentTextCommand({ Document: { Bytes: imageBuffer } })
  )
  return extractTextFromBlocks(response.Blocks ?? [])
}
