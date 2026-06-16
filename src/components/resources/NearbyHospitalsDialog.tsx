'use client'
import { useState } from 'react'
import { MapPin } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { NearbyHospitals } from './NearbyHospitals'
import { useI18n } from '@/lib/i18n/client'

interface Props {
  /** Open the dialog automatically once on mount. */
  autoOpen?: boolean
}

export function NearbyHospitalsDialog({ autoOpen = false }: Props) {
  const { T } = useI18n()
  const [open, setOpen] = useState(autoOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <MapPin className="w-4 h-4" />
        {T('nearby.dialogTrigger')}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-emerald-600" />
            {T('nearby.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {T('nearby.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          <NearbyHospitals />
        </div>
      </DialogContent>
    </Dialog>
  )
}
