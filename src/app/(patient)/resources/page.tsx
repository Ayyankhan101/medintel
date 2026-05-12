'use client'
import { ResourceFinder } from '@/components/resources/ResourceFinder'

export default function ResourcesPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Medical Resources</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Find the nearest hospitals, pharmacies, oxygen cylinders, and emergency equipment near you.
        </p>
      </div>
      <ResourceFinder />
    </div>
  )
}
