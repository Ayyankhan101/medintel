import { vi } from 'vitest'
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    doctor: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    medicalRecord: { findMany: vi.fn(), create: vi.fn() },
  },
}))
