export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type EvidenceLevel = 'E1' | 'E2' | 'E3' | 'E4';
type ProjectStage =
  | 'cognition'
  | 'planning'
  | 'rfq_sent'
  | 'quoting'
  | 'contracting'
  | 'construction'
  | 'handover'
  | 'maintenance';
type KnxPartnerRank = 'Silver' | 'Gold' | 'Platinum';
type ProfileRole = 'homeowner' | 'architect' | 'installer' | 'admin';
type LocaleCode = 'de-DE' | 'en-GB';
type CountryCode = 'DE' | 'AT' | 'CH' | 'GB';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: ProfileRole;
          full_name: string | null;
          locale: LocaleCode | null;
          country_code: CountryCode | null;
          postal_code: string | null;
          city: string | null;
          house_number: string | null;
          address_line: string | null;
          area_sqm: number | null;
          floors: number | null;
          room_count: number | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          role?: ProfileRole;
          full_name?: string | null;
          locale?: LocaleCode | null;
          country_code?: CountryCode | null;
          postal_code?: string | null;
          city?: string | null;
          house_number?: string | null;
          address_line?: string | null;
          area_sqm?: number | null;
          floors?: number | null;
          room_count?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          role?: ProfileRole;
          full_name?: string | null;
          locale?: LocaleCode | null;
          country_code?: CountryCode | null;
          postal_code?: string | null;
          city?: string | null;
          house_number?: string | null;
          address_line?: string | null;
          area_sqm?: number | null;
          floors?: number | null;
          room_count?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          stage: ProjectStage;
          build_type: 'new_build' | 'renovation' | 'unsure';
          construction_phase: 'design' | 'shell_construction' | 'finished' | null;
          area_sqm: number | null;
          selected_tier: 'good' | 'better' | 'best' | null;
          fit_assessment_json: Json | null;
          budget_estimate_json: Json | null;
          is_pro_unlocked: boolean | null;
          stripe_payment_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          stage?: ProjectStage;
          build_type: 'new_build' | 'renovation' | 'unsure';
          construction_phase?: 'design' | 'shell_construction' | 'finished' | null;
          area_sqm?: number | null;
          selected_tier?: 'good' | 'better' | 'best' | null;
          fit_assessment_json?: Json | null;
          budget_estimate_json?: Json | null;
          is_pro_unlocked?: boolean | null;
          stripe_payment_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          stage?: ProjectStage;
          build_type?: 'new_build' | 'renovation' | 'unsure';
          construction_phase?: 'design' | 'shell_construction' | 'finished' | null;
          area_sqm?: number | null;
          selected_tier?: 'good' | 'better' | 'best' | null;
          fit_assessment_json?: Json | null;
          budget_estimate_json?: Json | null;
          is_pro_unlocked?: boolean | null;
          stripe_payment_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      project_rooms: {
        Row: {
          id: string;
          project_id: string;
          room_type: string;
          room_name: string;
          wiring_feasibility: 'wired_possible' | 'rf_only' | 'unsure' | null;
          features_json: Json;
          sort_order: number | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          room_type: string;
          room_name: string;
          wiring_feasibility?: 'wired_possible' | 'rf_only' | 'unsure' | null;
          features_json?: Json;
          sort_order?: number | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          room_type?: string;
          room_name?: string;
          wiring_feasibility?: 'wired_possible' | 'rf_only' | 'unsure' | null;
          features_json?: Json;
          sort_order?: number | null;
        };
        Relationships: [];
      };
      installers: {
        Row: {
          id: string;
          claimed_by_user_id: string | null;
          company_name: string;
          country_code: string;
          city: string;
          postal_code: string;
          street_address: string | null;
          house_number: string | null;
          service_radius_km: number | null;
          knx_official_rank: KnxPartnerRank;
          is_contact_public: boolean | null;
          public_email: string | null;
          public_website: string | null;
          subscription_tier: 'free' | 'pro' | null;
          is_founding_partner: boolean | null;
          avg_response_hours: number | null;
          verified_projects_count: number | null;
          gdpr_art14_notified_at: string | null;
          opted_out: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          claimed_by_user_id?: string | null;
          company_name: string;
          country_code: string;
          city: string;
          postal_code: string;
          service_radius_km?: number | null;
          knx_official_rank: KnxPartnerRank;
          is_contact_public?: boolean | null;
          public_email?: string | null;
          public_website?: string | null;
          subscription_tier?: 'free' | 'pro' | null;
          is_founding_partner?: boolean | null;
          avg_response_hours?: number | null;
          verified_projects_count?: number | null;
          gdpr_art14_notified_at?: string | null;
          opted_out?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          claimed_by_user_id?: string | null;
          company_name?: string;
          country_code?: string;
          city?: string;
          postal_code?: string;
          service_radius_km?: number | null;
          knx_official_rank?: KnxPartnerRank;
          is_contact_public?: boolean | null;
          public_email?: string | null;
          public_website?: string | null;
          subscription_tier?: 'free' | 'pro' | null;
          is_founding_partner?: boolean | null;
          avg_response_hours?: number | null;
          verified_projects_count?: number | null;
          gdpr_art14_notified_at?: string | null;
          opted_out?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      installer_fact_cards: {
        Row: {
          id: string;
          installer_id: string;
          fact_category: string;
          fact_text_de: string;
          fact_text_en: string;
          evidence: EvidenceLevel;
          source_url: string;
          verified_at: string;
          expires_at: string;
          is_disputed: boolean | null;
        };
        Insert: {
          id?: string;
          installer_id: string;
          fact_category: string;
          fact_text_de: string;
          fact_text_en: string;
          evidence: EvidenceLevel;
          source_url: string;
          verified_at: string;
          expires_at: string;
          is_disputed?: boolean | null;
        };
        Update: {
          id?: string;
          installer_id?: string;
          fact_category?: string;
          fact_text_de?: string;
          fact_text_en?: string;
          evidence?: EvidenceLevel;
          source_url?: string;
          verified_at?: string;
          expires_at?: string;
          is_disputed?: boolean | null;
        };
        Relationships: [];
      };
      rfqs: {
        Row: {
          id: string;
          project_id: string;
          rfq_version: number | null;
          mandatory_deliverables_json: Json;
          disclosed_fields_json: Json;
          share_token: string;
          pdf_storage_path: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          rfq_version?: number | null;
          mandatory_deliverables_json?: Json;
          disclosed_fields_json: Json;
          share_token: string;
          pdf_storage_path?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          rfq_version?: number | null;
          mandatory_deliverables_json?: Json;
          disclosed_fields_json?: Json;
          share_token?: string;
          pdf_storage_path?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          rfq_id: string;
          installer_id: string;
          status: 'invited' | 'viewed' | 'submitted' | 'declined' | null;
          decline_reason: string | null;
          currency: string | null;
          cost_materials: number | null;
          cost_ets_programming: number | null;
          ets_programming_hours: number | null;
          ets_hourly_rate: number | null;
          cost_installation: number | null;
          cost_commissioning: number | null;
          total_price: number | null;
          proposed_brands: string[] | null;
          commits_ets_handover: boolean | null;
          commits_keyring_handover: boolean | null;
          warranty_months: number | null;
          raw_pdf_path: string | null;
          submitted_at: string | null;
        };
        Insert: {
          id?: string;
          rfq_id: string;
          installer_id: string;
          status?: 'invited' | 'viewed' | 'submitted' | 'declined' | null;
          decline_reason?: string | null;
          currency?: string | null;
          cost_materials?: number | null;
          cost_ets_programming?: number | null;
          ets_programming_hours?: number | null;
          ets_hourly_rate?: number | null;
          cost_installation?: number | null;
          cost_commissioning?: number | null;
          proposed_brands?: string[] | null;
          commits_ets_handover?: boolean | null;
          commits_keyring_handover?: boolean | null;
          warranty_months?: number | null;
          raw_pdf_path?: string | null;
          submitted_at?: string | null;
        };
        Update: {
          id?: string;
          rfq_id?: string;
          installer_id?: string;
          status?: 'invited' | 'viewed' | 'submitted' | 'declined' | null;
          decline_reason?: string | null;
          currency?: string | null;
          cost_materials?: number | null;
          cost_ets_programming?: number | null;
          ets_programming_hours?: number | null;
          ets_hourly_rate?: number | null;
          cost_installation?: number | null;
          cost_commissioning?: number | null;
          proposed_brands?: string[] | null;
          commits_ets_handover?: boolean | null;
          commits_keyring_handover?: boolean | null;
          warranty_months?: number | null;
          raw_pdf_path?: string | null;
          submitted_at?: string | null;
        };
        Relationships: [];
      };
      handover_checklists: {
        Row: {
          id: string;
          project_id: string;
          phase: 'contract_signing' | 'final_acceptance';
          items_json: Json;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          phase: 'contract_signing' | 'final_acceptance';
          items_json: Json;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          phase?: 'contract_signing' | 'final_acceptance';
          items_json?: Json;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      installer_directory: {
        Row: {
          id: string | null;
          company_name: string | null;
          country_code: string | null;
          city: string | null;
          postal_code: string | null;
          service_radius_km: number | null;
          knx_official_rank: KnxPartnerRank | null;
          is_founding_partner: boolean | null;
          avg_response_hours: number | null;
          verified_projects_count: number | null;
          public_website: string | null;
          public_email: string | null;
          contact_withheld: boolean | null;
          latitude: number | null;
          longitude: number | null;
          public_street: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      evidence_level: EvidenceLevel;
      project_stage: ProjectStage;
      knx_partner_rank: KnxPartnerRank;
    };
    CompositeTypes: Record<string, never>;
  };
}
