export interface AppConfig {
  dayMode: 'odd-even' | 'numbered';
  dayCount: number;
  days: string[];
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

export interface SetEntry {
  reps: string[];
  weights: string[];
}
