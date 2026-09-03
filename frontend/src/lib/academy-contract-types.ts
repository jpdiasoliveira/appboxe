export interface AcademyContractDocument {
  id: string
  academy_id: string
  title: string
  file_path: string
  original_filename: string | null
  mime_type: string
  file_size_bytes: number | null
  is_active: boolean
  uploaded_by: string | null
  created_at: string
  updated_at: string
}
