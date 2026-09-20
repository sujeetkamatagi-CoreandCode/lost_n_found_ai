export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'student' | 'staff' | 'admin';
export type LostItemStatus = 'lost' | 'matched' | 'claimed' | 'closed';
export type FoundItemStatus = 'found' | 'matched' | 'claimed' | 'returned' | 'disposed';
export type MatchStatus = 'pending' | 'verified' | 'rejected' | 'resolved';
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          student_id: string | null;
          phone: string | null;
          avatar_url: string | null;
          department: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          student_id?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          department?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          student_id?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          department?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lost_items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          description: string;
          distinctive_features: string | null;
          location_lost: string;
          building: string | null;
          room_or_area: string | null;
          date_lost: string;
          time_lost_range: string | null;
          image_urls: string[];
          reward_amount: number;
          contact_email: string | null;
          contact_phone: string | null;
          status: LostItemStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category: string;
          description: string;
          distinctive_features?: string | null;
          location_lost: string;
          building?: string | null;
          room_or_area?: string | null;
          date_lost?: string;
          time_lost_range?: string | null;
          image_urls?: string[];
          reward_amount?: number;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: LostItemStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          category?: string;
          description?: string;
          distinctive_features?: string | null;
          location_lost?: string;
          building?: string | null;
          room_or_area?: string | null;
          date_lost?: string;
          time_lost_range?: string | null;
          image_urls?: string[];
          reward_amount?: number;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: LostItemStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lost_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      found_items: {
        Row: {
          id: string;
          finder_id: string;
          title: string;
          category: string;
          description: string;
          location_found: string;
          building: string | null;
          room_or_area: string | null;
          date_found: string;
          image_urls: string[];
          current_storage_location: string;
          finder_contact_info: string | null;
          status: FoundItemStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          finder_id: string;
          title: string;
          category: string;
          description: string;
          location_found: string;
          building?: string | null;
          room_or_area?: string | null;
          date_found?: string;
          image_urls?: string[];
          current_storage_location?: string;
          finder_contact_info?: string | null;
          status?: FoundItemStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          finder_id?: string;
          title?: string;
          category?: string;
          description?: string;
          location_found?: string;
          building?: string | null;
          room_or_area?: string | null;
          date_found?: string;
          image_urls?: string[];
          current_storage_location?: string;
          finder_contact_info?: string | null;
          status?: FoundItemStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "found_items_finder_id_fkey";
            columns: ["finder_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          id: string;
          lost_item_id: string;
          found_item_id: string;
          confidence_score: number;
          reasoning: string;
          status: MatchStatus;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lost_item_id: string;
          found_item_id: string;
          confidence_score: number;
          reasoning: string;
          status?: MatchStatus;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lost_item_id?: string;
          found_item_id?: string;
          confidence_score?: number;
          reasoning?: string;
          status?: MatchStatus;
          verified_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_lost_item_id_fkey";
            columns: ["lost_item_id"];
            isOneToOne: false;
            referencedRelation: "lost_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_found_item_id_fkey";
            columns: ["found_item_id"];
            isOneToOne: false;
            referencedRelation: "found_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      claims: {
        Row: {
          id: string;
          found_item_id: string;
          claimant_id: string;
          lost_item_id: string | null;
          match_id: string | null;
          proof_description: string;
          proof_image_urls: string[];
          status: ClaimStatus;
          reviewer_id: string | null;
          reviewer_notes: string | null;
          verified_at: string | null;
          handover_location: string | null;
          handover_timestamp: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          found_item_id: string;
          claimant_id: string;
          lost_item_id?: string | null;
          match_id?: string | null;
          proof_description: string;
          proof_image_urls?: string[];
          status?: ClaimStatus;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          verified_at?: string | null;
          handover_location?: string | null;
          handover_timestamp?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          found_item_id?: string;
          claimant_id?: string;
          lost_item_id?: string | null;
          match_id?: string | null;
          proof_description?: string;
          proof_image_urls?: string[];
          status?: ClaimStatus;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          verified_at?: string | null;
          handover_location?: string | null;
          handover_timestamp?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claims_found_item_id_fkey";
            columns: ["found_item_id"];
            isOneToOne: false;
            referencedRelation: "found_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_claimant_id_fkey";
            columns: ["claimant_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_lost_item_id_fkey";
            columns: ["lost_item_id"];
            isOneToOne: false;
            referencedRelation: "lost_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}

// -----------------------------------------------------------------------------
// Type Helpers and Shorthands
// -----------------------------------------------------------------------------

export type User = Database['public']['Tables']['users']['Row'];
export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type UpdateUser = Database['public']['Tables']['users']['Update'];

export type LostItem = Database['public']['Tables']['lost_items']['Row'];
export type InsertLostItem = Database['public']['Tables']['lost_items']['Insert'];
export type UpdateLostItem = Database['public']['Tables']['lost_items']['Update'];

export type FoundItem = Database['public']['Tables']['found_items']['Row'];
export type InsertFoundItem = Database['public']['Tables']['found_items']['Insert'];
export type UpdateFoundItem = Database['public']['Tables']['found_items']['Update'];

export type Match = Database['public']['Tables']['matches']['Row'];
export type InsertMatch = Database['public']['Tables']['matches']['Insert'];
export type UpdateMatch = Database['public']['Tables']['matches']['Update'];

export type Claim = Database['public']['Tables']['claims']['Row'];
export type InsertClaim = Database['public']['Tables']['claims']['Insert'];
export type UpdateClaim = Database['public']['Tables']['claims']['Update'];

// -----------------------------------------------------------------------------
// Extended / Relational Types
// -----------------------------------------------------------------------------

export interface LostItemWithUser extends LostItem {
  users?: User | null;
}

export interface FoundItemWithUser extends FoundItem {
  users?: User | null;
}

export interface MatchWithDetails extends Match {
  lost_items?: LostItem | null;
  found_items?: FoundItem | null;
  verifier?: User | null;
}

export interface ClaimWithDetails extends Claim {
  found_items?: FoundItem | null;
  claimant?: User | null;
  lost_items?: LostItem | null;
  matches?: Match | null;
  reviewer?: User | null;
}

// -----------------------------------------------------------------------------
// Filter & Query Options
// -----------------------------------------------------------------------------

export interface ItemFilterOptions {
  category?: string;
  building?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface LostItemFilterOptions extends ItemFilterOptions {
  status?: LostItemStatus;
  userId?: string;
}

export interface FoundItemFilterOptions extends ItemFilterOptions {
  status?: FoundItemStatus;
  finderId?: string;
}
