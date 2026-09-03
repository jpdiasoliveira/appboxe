import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { Label } from '../../components/ui/Label'
import { BodyMetricsChart } from '../../components/BodyMetricsChart'
import { PhysicalAssessmentBanner } from '../../components/PhysicalAssessmentBanner'
import { useAuth } from '../../contexts/AuthContext'
import { useStudentContext } from '../../contexts/StudentContext'
import { fetchBodyMetrics } from '../../lib/body-metrics-api'
import { fetchBodyAssessmentStatus } from '../../lib/body-assessment-api'
import type { BodyAssessmentStatus } from '../../lib/body-assessment-types'
import type { BodyMetricRow } from '../../lib/body-metrics-types'
import { formatPhoneBR } from '../../lib/phone-utils'
import { updateStudentProfile } from './student-api'

export function StudentProfilePage() {
  const { profile } = useAuth()
  const { student, refresh } = useStudentContext()
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [saved, setSaved] = useState(false)
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricRow[]>([])
  const [bodyAssessmentStatus, setBodyAssessmentStatus] = useState<BodyAssessmentStatus | null>(null)

  useEffect(() => {
    if (!student) return
    setPhone(formatPhoneBR(student.phone ?? ''))
    setBirthDate(student.birth_date ?? '')
    setWeightKg(student.weight_kg != null ? String(student.weight_kg) : '')
    setHeightCm(student.height_cm != null ? String(student.height_cm) : '')
    setEmergencyName(student.emergency_contact_name ?? '')
    setEmergencyPhone(formatPhoneBR(student.emergency_contact_phone ?? ''))
    void fetchBodyMetrics(student.id).then(setBodyMetrics)
    void fetchBodyAssessmentStatus(student.id)
      .then(setBodyAssessmentStatus)
      .catch(() => setBodyAssessmentStatus(null))
  }, [student])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!student) return
    await updateStudentProfile(student.id, {
      phone: phone || undefined,
      birth_date: birthDate || null,
      weight_kg: weightKg ? Number(weightKg) : null,
      height_cm: heightCm ? Number(heightCm) : null,
      emergency_contact_name: emergencyName || null,
      emergency_contact_phone: emergencyPhone || null,
    })
    setSaved(true)
    await refresh()
    if (student) {
      const metrics = await fetchBodyMetrics(student.id)
      setBodyMetrics(metrics)
      const status = await fetchBodyAssessmentStatus(student.id)
      setBodyAssessmentStatus(status)
    }
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-6 text-2xl font-semibold">Meu perfil</h2>
      <PhysicalAssessmentBanner status={bodyAssessmentStatus} />
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Label>Nome</Label>
          <Input value={profile?.name ?? ''} disabled />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <PhoneInput id="phone" value={phone} onChange={setPhone} />
        </div>
        <div>
          <Label htmlFor="birth">Data de nascimento</Label>
          <Input id="birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="height">Altura (cm)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="em-name">Contato de emergência</Label>
          <Input id="em-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="em-phone">Tel. emergência</Label>
          <PhoneInput id="em-phone" value={emergencyPhone} onChange={setEmergencyPhone} />
        </div>
        {saved ? <p className="text-sm text-[var(--color-success)]">Salvo.</p> : null}
        <Button type="submit">Salvar</Button>
      </form>

      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold">Evolução física</h3>
        <BodyMetricsChart metrics={bodyMetrics} />
      </div>
    </div>
  )
}
