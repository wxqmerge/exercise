export interface AppConfig {
  dayMode: 'odd-even' | 'numbered';
  days: string[];
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

export interface SetEntry {
  reps: string;
  weight: string;
}
