export type UserRole = 'SOLICITANTE' | 'TECNICO' | 'GESTOR' | 'ADMIN' | 'SUPERADMIN';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationType = 'TICKET_CREATED' | 'TICKET_UPDATED' | 'TICKET_ASSIGNED' | 'SLA_BREACHED' | 'SYSTEM';

export interface Institution {
  id: string;
  cnpj: string | null;
  fantasy_name: string;
  corporate_name: string;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  gemini_api_key?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  institution_id: string | null;
  team_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  institution_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      institutions: {
        Row: Institution;
        Insert: Omit<Institution, 'id' | 'created_at'>;
        Update: Partial<Omit<Institution, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
    };
  };
}
