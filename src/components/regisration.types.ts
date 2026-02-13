export type JoiningStatus = 'awaiting' | 'yes' | 'no';

export interface RegistrationInfo {
  joiningStatus: JoiningStatus;
  arrivalDate: string;
  departureDate: string;
  childrenCount: number;
  foodRestrictions: string;
  note: string;
}
