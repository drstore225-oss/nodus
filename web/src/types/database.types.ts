export type UserRole = 'SOLICITANTE' | 'TECNICO' | 'GESTOR' | 'ADMIN' | 'SUPERADMIN';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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
    };
  };
}
