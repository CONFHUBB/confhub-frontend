'use client'

import React, { useState, useEffect } from 'react'
import { getProgram, saveProgram } from '@/app/api/program.api'
import { getPapersByConference } from '@/app/api/paper.api'
import { PaperResponse } from '@/types/paper'
import { AdvancedProgram, DEFAULT_PROGRAM } from '@/types/program'
import { Button } from '@/components/ui/button'
import { Save, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { GridBuilderPanel } from './grid-builder-panel'

interface ProgramBuilderProps {
  conferenceId: number
}

export function ProgramBuilder({ conferenceId }: ProgramBuilderProps) {
  const [program, setProgram] = useState<AdvancedProgram>(DEFAULT_PROGRAM)
  const [allPapers, setAllPapers] = useState<PaperResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [progResult, papersResult] = await Promise.all([
          getProgram(conferenceId),
          getPapersByConference(conferenceId)
        ])
        const parsed = (typeof progResult === 'string' && progResult.trim() !== '')
          ? JSON.parse(progResult.trim()) : progResult
        if (parsed && parsed.settings) {
          setProgram({ ...DEFAULT_PROGRAM, ...parsed })
        }
        setAllPapers(papersResult.filter((p: PaperResponse) => p.status === 'ACCEPTED' || p.status === 'PUBLISHED'))
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    loadData()
  }, [conferenceId])

  const save = async (updated: AdvancedProgram) => {
    setSaving(true)
    try {
      await saveProgram(conferenceId, updated as any)
      toast.success('Program saved successfully!\nYour conference schedule has been updated.')
    } catch (err: any) {
      toast.error('Failed to save program\n' + (err.response?.data?.detail || err.message || 'An unexpected error occurred.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => save(program)
  const updateProgram = (updated: AdvancedProgram) => { setProgram(updated); }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading program builder...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Program Builder</h2>
          <p className="text-sm text-gray-500 mt-0.5">Build and publish your conference schedule</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { const u = { ...program, published: !program.published }; setProgram(u); save(u) }}
            className={program.published ? 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-600 bg-white hover:bg-gray-50'}
          >
            {program.published ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            {program.published ? 'Published' : 'Unpublished'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Grid Builder (includes sub-tabs for Schedule Grid & Session Details) */}
      <GridBuilderPanel
        program={program}
        allPapers={allPapers}
        onProgramChange={updateProgram}
      />
    </div>
  )
}

export default ProgramBuilder
