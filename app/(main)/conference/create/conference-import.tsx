"use client"

import { useRouter } from "next/navigation"
import { ExcelImport } from "@/components/excel-import"
import { downloadConferenceTemplate, previewConferenceImport, importConference, type ImportResult } from "@/app/api/conference.api"

const CONFERENCE_PREVIEW_HEADERS = ["name", "acronym", "location", "startDate", "endDate", "websiteUrl", "country", "bannerImageUrl", "societySponsor"]

export function ConferenceImport() {
    const router = useRouter()

    const handleSuccess = (result: ImportResult) => {
        if (result.conferenceId) {
            setTimeout(() => router.push(`/conference/${result.conferenceId}/update`), 1500)
        }
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Import Conference from Excel</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Download the template, fill in conference details, then upload to preview and import.
                </p>
                <ExcelImport
                    entityName="Conference"
                    previewHeaders={CONFERENCE_PREVIEW_HEADERS}
                    onDownloadTemplate={downloadConferenceTemplate}
                    onPreview={previewConferenceImport}
                    onImport={importConference}
                    onImportSuccess={handleSuccess}
                    templateFilename="conference_template.xlsx"
                />
            </div>
        </div>
    )
}
