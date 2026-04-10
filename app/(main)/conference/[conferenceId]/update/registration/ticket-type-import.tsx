'use client'

import { ExcelImport } from '@/components/excel-import'
import { downloadTicketTypeTemplate, previewTicketTypeImport, importTicketTypes } from '@/app/api/registration.api'

const TICKET_TYPE_PREVIEW_HEADERS = ['name', 'description', 'price', 'currency', 'deadline', 'maxQuantity', 'category', 'isActive']

interface Props {
  conferenceId: number
  onImportSuccess?: () => void
}

export function TicketTypeImport({ conferenceId, onImportSuccess }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Import Ticket Types from Excel</h3>
      <p className="text-sm text-gray-500 mb-4">
        Download the template, fill in ticket type details, then upload to preview and import.
      </p>
      <ExcelImport
        entityName="Ticket Type"
        previewHeaders={TICKET_TYPE_PREVIEW_HEADERS}
        onDownloadTemplate={() => downloadTicketTypeTemplate(conferenceId)}
        onPreview={(file) => previewTicketTypeImport(conferenceId, file)}
        onImport={(file) => importTicketTypes(conferenceId, file)}
        onImportSuccess={() => onImportSuccess?.()}
        templateFilename="ticket_type_template.xlsx"
      />
    </div>
  )
}