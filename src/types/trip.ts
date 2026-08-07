export interface Trip {
  tripId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface Segment {
  segmentId: string;
  tripId: string;
  place: string;
  order: number;
  startDate: string;
  endDate: string;
}

export interface ItineraryItem {
  itemId: string;
  segmentId: string;
  placeName: string;
  address: string;
  transport: string;
  memo: string;
  reservationNumber: string;
  category: string; // "주차" 이면 항상 골드 강조
  order: number;
  time: string; // HH:MM, optional
}

export interface ChecklistItem {
  checkId: string;
  tripId: string;
  label: string;
  done: boolean;
}

// One per trip — keyed by tripId itself rather than a separate id, since a
// trip only ever has a single rental car record.
export interface RentalCar {
  tripId: string;
  pickupDate: string;
  returnDate: string;
  location: string;
  company: string;
  pickupTime: string; // HH:MM
  returnTime: string; // HH:MM
}
