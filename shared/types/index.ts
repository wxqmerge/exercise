export interface AppConfig {
  dayMode: 'odd-even' | 'numbered';
  days: string[];
}

export interface Exercise {
  id: string;
  name: string;
  image?: string;
}

export interface SetEntry {
  reps: string;
  weight: string;
}
