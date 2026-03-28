'use client'

import React, { useState, useEffect } from 'react'
import { getProgram, saveProgram } from '@/app/api/program.api'
import { getPapersByConference } from '@/app/api/paper.api'
import { PaperResponse } from '@/types/paper'
import { AdvancedProgram, DEFAULT_PROGRAM, ProgramLocation, ProgramPresentationType } from '@/types/program'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Settings, LayoutGrid, Eye, EyeOff, Plus, Trash2, Globe2, Palette } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState('config')

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
        setAllPapers(papersResult.filter((p: PaperResponse) => p.status === 'ACCEPTED'))
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    loadData()
  }, [conferenceId])

  const save = async (updated: AdvancedProgram) => {
    setSaving(true)
    try {
      await saveProgram(conferenceId, updated as any)
      toast.success('Program saved!')
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  const handleSave = () => save(program)
  const updateProgram = (updated: AdvancedProgram) => { setProgram(updated); }

  // ── Location helpers ───────────────────────────────────────────────────────
  const [newLocName, setNewLocName] = useState('')
  const addLocation = () => {
    if (!newLocName.trim()) return
    const updated: AdvancedProgram = {
      ...program,
      settings: {
        ...program.settings,
        locations: [...program.settings.locations, { id: crypto.randomUUID(), name: newLocName.trim() }]
      }
    }
    setProgram(updated)
    setNewLocName('')
  }
  const removeLocation = (id: string) => setProgram({
    ...program,
    settings: { ...program.settings, locations: program.settings.locations.filter(l => l.id !== id) }
  })

  // ── Presentation type helpers ──────────────────────────────────────────────
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('#6366f1')
  const addType = () => {
    if (!newTypeName.trim()) return
    const updated: AdvancedProgram = {
      ...program,
      settings: {
        ...program.settings,
        presentationTypes: [...program.settings.presentationTypes, { id: crypto.randomUUID(), name: newTypeName.trim(), color: newTypeColor }]
      }
    }
    setProgram(updated)
    setNewTypeName('')
    setNewTypeColor('#6366f1')
  }
  const removeType = (id: string) => setProgram({
    ...program,
    settings: { ...program.settings, presentationTypes: program.settings.presentationTypes.filter(t => t.id !== id) }
  })
  const updateTypeColor = (id: string, color: string) => setProgram({
    ...program,
    settings: {
      ...program.settings,
      presentationTypes: program.settings.presentationTypes.map(t => t.id === id ? { ...t, color } : t)
    }
  })

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="config" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configuration
          </TabsTrigger>
          <TabsTrigger value="grid" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> Schedule Grid
          </TabsTrigger>
        </TabsList>

        {/* ── CONFIGURATION TAB ────────────────────────────────────────────── */}
        <TabsContent value="config" className="pt-6 space-y-8">
          {/* Section 1: Locations (columns) */}
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
              <Globe2 className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Locations / Rooms</h3>
                <p className="text-xs text-gray-500 mt-0.5">Each location will be a column in the schedule grid</p>
              </div>
            </div>
            <div className="divide-y">
              {program.settings.locations.length === 0 && (
                <div className="px-6 py-4 text-sm text-gray-400 italic">No locations yet. Add one below.</div>
              )}
              {program.settings.locations.map((loc, i) => (
                <div key={loc.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-6">{i + 1}</span>
                    <span className="font-medium text-gray-800">{loc.name}</span>
                  </div>
                  <button onClick={() => removeLocation(loc.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="px-6 py-4 flex gap-2">
                <Input placeholder="e.g. Grand Hall A" value={newLocName} onChange={e => setNewLocName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLocation()} className="rounded-xl" />
                <Button onClick={addLocation} variant="outline" className="rounded-xl shrink-0">
                  <Plus className="w-4 h-4 mr-1" /> Add Location
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: Presentation Types (card colors) */}
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
              <Palette className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Presentation Types</h3>
                <p className="text-xs text-gray-500 mt-0.5">Assign a color to each type — sessions will show these colors on the grid</p>
              </div>
            </div>
            <div className="divide-y">
              {program.settings.presentationTypes.map((type, i) => (
                <div key={type.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                  <span className="text-xs font-bold text-gray-400 w-6">{i + 1}</span>
                  <div
                    className="w-8 h-6 rounded-md border border-white/20 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="flex-1 font-medium text-gray-800">{type.name}</span>
                  <input type="color" value={type.color} onChange={e => updateTypeColor(type.id, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" title="Change color" />
                  <button onClick={() => removeType(type.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="px-6 py-4 flex gap-2 items-center">
                <input type="color" value={newTypeColor} onChange={e => setNewTypeColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white" title="Pick a color" />
                <Input placeholder="e.g. Oral Presentation" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addType()} className="rounded-xl" />
                <Button onClick={addType} variant="outline" className="rounded-xl shrink-0">
                  <Plus className="w-4 h-4 mr-1" /> Add Type
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── GRID BUILDER TAB ─────────────────────────────────────────────── */}
        <TabsContent value="grid" className="pt-4">
          <GridBuilderPanel
            program={program}
            allPapers={allPapers}
            onProgramChange={updateProgram}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProgramBuilder

