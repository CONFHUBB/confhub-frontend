import http from '@/lib/http'

export const getProgram = async (conferenceId: number): Promise<any> => {
  const res = await http.get(`/conferences/${conferenceId}/program`)
  return res.data
}

export const saveProgram = async (conferenceId: number, programData: any): Promise<void> => {
  await http.put(`/conferences/${conferenceId}/program`, programData)
}
