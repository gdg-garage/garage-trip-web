export type JoiningStatus = 'awaiting' | 'yes' | 'no';

export interface RegistrationInfo {
  joiningStatus: JoiningStatus;
  arrivalDate: string;
  arrivalHour: string;
  departureDate: string;
  departureHour: string;
  childrenCount: number;
  foodRestrictions: string;
  note: string;
}

export interface RegistrationHistoryItem {
  id: number;
  created_at: string;
  fields: {
    arrival_date?: string;
    departure_date?: string;
    food_restrictions?: string;
    children_count?: number;
    cancelled?: boolean;
    note?: string;
  };
}
