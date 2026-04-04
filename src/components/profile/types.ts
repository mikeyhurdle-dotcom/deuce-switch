import { Ionicons } from '@expo/vector-icons';
import type { TournamentFormat } from '../../lib/types';

export type IconName = keyof typeof Ionicons.glyphMap;

export type RecentTournament = {
  tournament_id: string;
  name: string;
  format: TournamentFormat;
  status: 'draft' | 'running' | 'completed';
  date: string;
  rank?: number;
  totalPoints?: number;
  playerCount: number;
};

export type Insight = {
  icon: IconName;
  iconColor: string;
  value: string;
  label: string;
  detail: string;
};

export type ProfileTab = 'Overview' | 'Stats' | 'Feed' | 'History';
export const PROFILE_TABS: ProfileTab[] = ['Overview', 'Stats', 'Feed', 'History'];
