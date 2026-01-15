export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  owner_id?: string;
  custom_properties: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface CompanyCreate {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  custom_properties?: Record<string, unknown>;
}

export type ContactStatus = "lead" | "prospect" | "customer" | "churned" | "other";

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  status: ContactStatus;
  source?: string;
  company_id?: string;
  company_name?: string;
  owner_id?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  notes?: string;
  custom_properties: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface ContactCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  status?: ContactStatus;
  source?: string;
  company_id?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  notes?: string;
  custom_properties?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
