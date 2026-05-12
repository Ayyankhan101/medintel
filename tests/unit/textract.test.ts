import { describe, it, expect } from 'vitest'
import { extractTextFromBlocks, isTextractConfident } from '@/lib/textract'

describe('extractTextFromBlocks', () => {
  it('concatenates LINE blocks into readable text', () => {
    const blocks = [
      { BlockType: 'LINE', Text: 'Patient: Ali Khan', Confidence: 99 },
      { BlockType: 'LINE', Text: 'Rx: Aspirin 75mg',  Confidence: 95 },
      { BlockType: 'WORD', Text: 'ignored',            Confidence: 99 },
    ]
    const result = extractTextFromBlocks(blocks as any)
    expect(result).toContain('Patient: Ali Khan')
    expect(result).toContain('Rx: Aspirin 75mg')
    expect(result).not.toContain('ignored')
  })

  it('returns empty string for empty block array', () => {
    expect(extractTextFromBlocks([])).toBe('')
  })

  it('excludes blocks below confidence threshold', () => {
    const blocks = [
      { BlockType: 'LINE', Text: 'Clear text',  Confidence: 95 },
      { BlockType: 'LINE', Text: 'Blurry text', Confidence: 50 },
    ]
    const result = extractTextFromBlocks(blocks as any)
    expect(result).toContain('Clear text')
    expect(result).not.toContain('Blurry text')
  })
})

describe('isTextractConfident', () => {
  it('returns true when confidence is >= 80', () => {
    expect(isTextractConfident(80)).toBe(true)
    expect(isTextractConfident(99)).toBe(true)
  })

  it('returns false when confidence is < 80', () => {
    expect(isTextractConfident(79)).toBe(false)
    expect(isTextractConfident(0)).toBe(false)
  })
})
