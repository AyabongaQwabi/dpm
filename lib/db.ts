// Supabase database type definitions.
// These are hand-written stubs derived from supabase/migrations/20260620000000_init.sql.
// Replace with the generated output of `supabase gen types typescript --local > lib/db.ts`
// once the Supabase project is linked and the migration has been applied.

export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded'
export type ActorType = 'customer' | 'provider' | 'system'
export type DiscountType = 'amount' | 'percent' | 'none'
export type ServiceType = 'time_based' | 'fixed_deliverable'
export type MessageActor = 'provider' | 'customer'
export type CreditTransactionType = 'purchase' | 'spend' | 'refund'
export type ProviderPayoutStatus = 'pending' | 'processing' | 'paid'
export type ClaimStatus = 'unclaimed' | 'claim_pending' | 'claimed'
export type ProfileClaimStatus = 'pending' | 'verified' | 'expired' | 'rejected'
export type ProviderSubscriptionStatus = 'active' | 'expired' | 'cancelled'
export type InputType =
  | 'short_text'
  | 'rich_text'
  | 'number'
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'tag_picker'
  | 'image_upload'
  | 'file_upload'
  | 'location_search'

export interface ProviderCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_seed: boolean
  created_at: string
}

export interface ProviderType {
  id: string
  category_id: string
  name: string
  slug: string
  is_seed: boolean
  created_at: string
}

export interface Field {
  id: string
  key: string
  label: string
  input_type: InputType
  options: unknown | null
  validator_config: unknown | null
  is_tag_searchable: boolean
  created_at: string
}

export interface FormConfig {
  id: string
  provider_type_id: string | null
  category_id: string | null
  step_number: number
  step_title: string
  created_at: string
}

export interface FormConfigField {
  id: string
  form_config_id: string
  field_id: string
  display_order: number
  is_required: boolean
}

export interface Provider {
  id: string
  provider_type_id: string
  auth_provider_id: string | null
  business_name: string
  slug: string | null
  bio: string | null
  profile_image: string | null
  gallery: unknown
  faqs: unknown
  links: unknown
  location_city: string | null
  location_state: string | null
  location_country: string | null
  phone: string | null
  website: string | null
  address: string | null
  claim_status: ClaimStatus
  is_scraped: boolean
  scraped_at: string | null
  is_featured: boolean
  is_seed: boolean
  social_links: { platform: string; url: string }[]
  languages: string[]
  portfolio: { title: string; description: string; image_url: string }[]
  onboarding_step: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface ProviderFieldValue {
  provider_id: string
  field_id: string
  value: unknown
  updated_at: string
}

export interface ProfileClaim {
  id: string
  provider_id: string
  claimant_email: string
  verification_code: string
  code_expires_at: string
  status: ProfileClaimStatus
  claimed_auth_id: string | null
  created_at: string
  verified_at: string | null
}

export interface ProviderSubscription {
  id: string
  provider_id: string
  package_number: number
  monthly_fee: number
  billing_start: string
  billing_end: string
  status: ProviderSubscriptionStatus
  last_reminder_sent_at: string | null
  last_renewal_yoco_ref: string | null
  created_at: string
}

export interface Service {
  id: string
  provider_id: string
  image: string | null
  title: string
  description: string
  price: number
  discount_type: DiscountType
  discount_amount: number | null
  article_json: unknown | null
  article_text: string | null
  service_type: ServiceType
  is_published: boolean
  is_seed: boolean
  created_at: string
  updated_at: string
}

export interface ServicePackage {
  id: string
  service_id: string
  name: string
  description: string
  price: number
  discount_type: DiscountType
  discount_amount: number | null
  offerings: string[]
  requirements: string
  requirement_file_slots: { name: string }[]
  delivery_time: string
  is_default: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface MessageThread {
  id: string
  provider_id: string
  customer_id: string
  service_id: string
  booking_id: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  thread_id: string
  actor: MessageActor
  body: string
  created_at: string
}

export interface Tag {
  id: string
  name: string
  is_seed: boolean
  created_at: string
}

export interface ProviderTag {
  provider_id: string
  tag_id: string
}

export interface Customer {
  id: string
  email: string
  name: string
  phone: string | null
  auth_provider_id: string | null
  credit_balance: number
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  provider_id: string
  customer_id: string
  service_id: string
  package_id: string | null
  notes: string | null
  status: BookingStatus
  payment_status: PaymentStatus | null
  final_price: number
  commission_amount: number
  provider_payout_amount: number
  cancellation_reason: string | null
  requested_at: string
  created_at: string
  updated_at: string
}

export interface CreditTransaction {
  id: string
  customer_id: string
  type: CreditTransactionType
  amount: number
  bonus_credits: number | null
  promotion_id: string | null
  description: string
  booking_id: string | null
  yoco_ref: string | null
  created_at: string
}

export interface ProviderPayout {
  id: string
  booking_id: string
  provider_id: string
  gross_amount: number
  commission_amount: number
  net_payout_amount: number
  status: ProviderPayoutStatus
  created_at: string
  updated_at: string
}

export interface BookingStatusHistory {
  id: string
  booking_id: string
  from_status: BookingStatus | null
  to_status: BookingStatus
  actor_type: ActorType
  actor_id: string | null
  created_at: string
}

export interface Review {
  id: string
  booking_id: string
  service_id: string | null
  package_id: string | null
  provider_id: string
  customer_id: string
  rating: number
  comment: string
  is_seed: boolean
  created_at: string
}

export interface ContentPost {
  id: string
  provider_id: string
  image_url: string | null
  body: string | null
  post_type: string
  is_seed: boolean
  created_at: string
}

export interface TenantDomain {
  id: string
  domain: string
  category_id: string | null
  created_at: string
}

export interface TenantBranding {
  id: string
  tenant_domain_id: string
  site_name: string
  logo_url: string | null
  theme_color: string | null
  created_at: string
  updated_at: string
}

export interface PlatformConfig {
  id: string
  key: string
  value: unknown
  description: string | null
  updated_at: string
}

export interface PaidPlacement {
  id: string
  provider_id: string
  boost_factor: number
  active_from: string
  active_until: string
  created_at: string
}
