export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
          banner_url: string | null
          bio: string
          is_site_admin: boolean
          equipped_badge_id: string | null
          equipped_title_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string
          is_site_admin?: boolean
          equipped_badge_id?: string | null
          equipped_title_id?: string | null
          created_at?: string
        }
        Update: {
          username?: string
          display_name?: string
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string
          is_site_admin?: boolean
          equipped_badge_id?: string | null
          equipped_title_id?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      whistles: {
        Row: {
          id: string
          user_id: string
          audio_url: string
          duration_s: number
          caption: string
          likes_count: number
          comments_count: number
          group_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          audio_url: string
          duration_s: number
          caption?: string
          likes_count?: number
          comments_count?: number
          group_id?: string | null
          created_at?: string
        }
        Update: {
          caption?: string
        }
        Relationships: [
          {
            foreignKeyName: 'whistles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      reposts: {
        Row: {
          id: string
          user_id: string
          original_whistle_id: string
          group_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_whistle_id: string
          group_id?: string | null
          created_at?: string
        }
        Update: {
          group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reposts_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reposts_original_whistle_id_fkey'
            columns: ['original_whistle_id']
            isOneToOne: false
            referencedRelation: 'whistles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reposts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      likes: {
        Row: {
          user_id: string
          whistle_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          whistle_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          whistle_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          user_id: string
          whistle_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          whistle_id: string
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
      competition_comments: {
        Row: {
          id: string
          competition_id: string
          entry_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          competition_id: string
          entry_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string
          avatar_url: string | null
          banner_url: string | null
          is_private: boolean
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          avatar_url?: string | null
          banner_url?: string | null
          is_private?: boolean
          owner_id: string
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          avatar_url?: string | null
          banner_url?: string | null
          is_private?: boolean
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member'
        }
        Relationships: []
      }
      competitions: {
        Row: {
          id: string
          title: string
          theme: string
          description: string
          title_base: string
          submission_ends_at: string
          voting_ends_at: string
          group_id: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          theme: string
          description?: string
          title_base: string
          submission_ends_at: string
          voting_ends_at: string
          group_id?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          title?: string
          theme?: string
          description?: string
          title_base?: string
        }
        Relationships: []
      }
      competition_entries: {
        Row: {
          id: string
          competition_id: string
          user_id: string
          whistle_id: string
          votes_count: number
          created_at: string
        }
        Insert: {
          id?: string
          competition_id: string
          user_id: string
          whistle_id: string
          votes_count?: number
          created_at?: string
        }
        Update: {
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'competition_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'competition_entries_whistle_id_fkey'
            columns: ['whistle_id']
            isOneToOne: false
            referencedRelation: 'whistles'
            referencedColumns: ['id']
          }
        ]
      }
      competition_votes: {
        Row: {
          competition_id: string
          entry_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          competition_id: string
          entry_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          competition_id?: string
          entry_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          competition_id: string
          label: string
          icon: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          competition_id: string
          label?: string
          icon?: string
          created_at?: string
        }
        Update: {
          label?: string
          icon?: string
        }
        Relationships: []
      }
      user_titles: {
        Row: {
          id: string
          user_id: string
          competition_id: string
          tier: 'gold' | 'silver' | 'bronze'
          title: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          competition_id: string
          tier: 'gold' | 'silver' | 'bronze'
          title: string
          created_at?: string
        }
        Update: {
          title?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      competition_title_for_place: {
        Args: { p_title_base: string; p_place: number }
        Returns: string
      }
      get_competition_whistle_ids: {
        Args: Record<string, never>
        Returns: { whistle_id: string }[]
      }
      get_feed: {
        Args: { p_user_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          item_type: 'whistle' | 'repost'
          item_id: string
          original_whistle_id: string
          actor_user_id: string
          audio_url: string
          duration_s: number
          caption: string
          likes_count: number
          comments_count: number
          group_id: string | null
          created_at: string
          score: number
          username: string
          display_name: string
          avatar_url: string | null
          equipped_badge_label: string | null
          equipped_title: string | null
          original_user_id: string
          original_username: string
          original_display_name: string
          original_avatar_url: string | null
        }[]
      }
      is_competition_participant: {
        Args: { p_competition_id: string; p_user_id?: string }
        Returns: boolean
      }
      remove_group_member: {
        Args: { p_group_id: string; p_target_user_id: string }
        Returns: undefined
      }
      set_group_member_role: {
        Args: { p_group_id: string; p_target_user_id: string; p_role: 'admin' | 'member' }
        Returns: undefined
      }
      settle_competition_rewards: {
        Args: { p_competition_id: string }
        Returns: undefined
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Whistle = Database['public']['Tables']['whistles']['Row']
export type Repost = Database['public']['Tables']['reposts']['Row']
export type UserBadge = Database['public']['Tables']['user_badges']['Row']
export type UserTitle = Database['public']['Tables']['user_titles']['Row']
export type WhistleWithProfile = Whistle & {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url' | 'equipped_badge_id' | 'equipped_title_id'>
}
export type FeedItem = Database['public']['Functions']['get_feed']['Returns'][number]
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Competition = Database['public']['Tables']['competitions']['Row']
export type CompetitionEntry = Database['public']['Tables']['competition_entries']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
