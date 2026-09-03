import { supabase } from '../../lib/supabase'
import {
  deleteAcademyContractFile,
  uploadAcademyContractFile,
} from '../../lib/academy-contract-storage'
import type { AcademyContractDocument } from '../../lib/academy-contract-types'

export async function fetchActiveAcademyContract(
  academyId: string,
): Promise<AcademyContractDocument | null> {
  const { data, error } = await supabase
    .from('academy_contract_documents')
    .select('*')
    .eq('academy_id', academyId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return (data as AcademyContractDocument | null) ?? null
}

export async function uploadAcademyContract(input: {
  academyId: string
  file: File
  title?: string
}): Promise<AcademyContractDocument> {
  const { path, mimeType, size, originalFilename } = await uploadAcademyContractFile(
    input.academyId,
    input.file,
  )

  const { data: userData } = await supabase.auth.getUser()

  const { data: previous } = await supabase
    .from('academy_contract_documents')
    .select('id, file_path')
    .eq('academy_id', input.academyId)
    .eq('is_active', true)
    .maybeSingle()

  if (previous) {
    await supabase
      .from('academy_contract_documents')
      .update({ is_active: false })
      .eq('id', previous.id)
  }

  const { data, error } = await supabase
    .from('academy_contract_documents')
    .insert({
      academy_id: input.academyId,
      title: input.title?.trim() || 'Contrato de matrícula',
      file_path: path,
      original_filename: originalFilename,
      mime_type: mimeType,
      file_size_bytes: size,
      is_active: true,
      uploaded_by: userData.user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) {
    await deleteAcademyContractFile(path).catch(() => undefined)
    throw error
  }

  if (previous?.file_path && previous.file_path !== path) {
    await deleteAcademyContractFile(previous.file_path).catch(() => undefined)
  }

  return data as AcademyContractDocument
}

export async function removeActiveAcademyContract(contract: AcademyContractDocument): Promise<void> {
  const { error } = await supabase
    .from('academy_contract_documents')
    .update({ is_active: false })
    .eq('id', contract.id)

  if (error) throw error
  await deleteAcademyContractFile(contract.file_path).catch(() => undefined)
}
