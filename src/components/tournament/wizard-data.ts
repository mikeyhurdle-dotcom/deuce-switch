/**
 * Shared types, constants, and data for the Tournament Creation Wizard.
 * Imported by create.tsx, StepBasics, StepSettings, and StepPreview.
 */
import { Alpha, Colors } from '../../lib/constants';
import type { Ionicons } from '@expo/vector-icons';

// ── Types ───────────────────────────────────────────────────────────────────
export type IconName = keyof typeof Ionicons.glyphMap;

export type TournamentFormat = {
  id: string;
  icon: IconName;
  iconColor: string;
  name: string;
  desc: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  info: string;
  stats: { label: string; value: string }[];
  comingSoon?: boolean;
};

// ── Format Data ─────────────────────────────────────────────────────────────
export const FORMATS: TournamentFormat[] = [
  {
    id: 'americano',
    icon: 'swap-horizontal',
    iconColor: Colors.opticYellow,
    name: 'Americano',
    desc: 'Rotating partners, individual scores',
    tag: 'POPULAR',
    tagColor: Colors.opticYellow,
    tagBg: Alpha.yellow08,
    info: 'Every player partners with everyone else across rounds. Scores are individual — the best all-round player wins.',
    stats: [
      { label: 'players', value: '8-16' },
      { label: 'rounds', value: '5-7' },
      { label: 'min', value: '~90' },
    ],
  },
  {
    id: 'mexicano',
    icon: 'trending-up',
    iconColor: Colors.violetLight,
    name: 'Mexicano',
    desc: 'Skill-balanced matchups every round',
    tag: 'COMING SOON',
    tagColor: Colors.textDim,
    tagBg: 'rgba(148,163,184,0.08)',
    info: 'After each round, the algorithm re-seeds matchups by score. Top plays top, bottom plays bottom. Every match stays competitive.',
    stats: [
      { label: 'players', value: '8-16' },
      { label: 'rounds', value: '5-7' },
      { label: 'min', value: '~90' },
    ],
    comingSoon: true,
  },
  {
    id: 'team_americano',
    icon: 'people',
    iconColor: Colors.aquaGreen,
    name: 'Team Americano',
    desc: 'Fixed pairs, rotating opponents',
    tag: 'COMING SOON',
    tagColor: Colors.textDim,
    tagBg: 'rgba(148,163,184,0.08)',
    info: 'Bring your partner — you stay together all tournament while opponents rotate each round. Great for couples or regular pairs.',
    stats: [
      { label: 'players', value: '8-16' },
      { label: 'rounds', value: '4-6' },
      { label: 'min', value: '~75' },
    ],
    comingSoon: true,
  },
  {
    id: 'mixicano',
    icon: 'shuffle',
    iconColor: Colors.warning,
    name: 'Mixicano',
    desc: 'Mixed gender rotating partners',
    tag: 'COMING SOON',
    tagColor: Colors.textDim,
    tagBg: 'rgba(148,163,184,0.08)',
    info: 'Mixed-gender Americano. Each team is one man + one woman, partners rotate every round. Individual scoring.',
    stats: [
      { label: 'players', value: '8-16' },
      { label: 'rounds', value: '5-7' },
      { label: 'min', value: '~90' },
    ],
    comingSoon: true,
  },
];

// ── Toggle Config ───────────────────────────────────────────────────────────
export const TOGGLES = [
  { key: 'hostOnly', label: 'Host Only (Don\'t Play)', hint: 'Organise without being added as a player', defaultOn: false },
  { key: 'public', label: 'Public Event', hint: 'Listed in local event discovery', defaultOn: false },
  { key: 'lateJoiners', label: 'Allow Late Joiners', hint: 'Players can join after round 1', defaultOn: true },
  { key: 'tvDisplay', label: 'TV Display Mode', hint: 'Show courts & scores on a big screen', defaultOn: false },
  { key: 'soundEffects', label: 'Sound Effects', hint: 'Haptics + sounds for round changes', defaultOn: true },
] as const;

// ── Advanced Settings Config ────────────────────────────────────────────────
export const ADVANCED_SETTINGS = [
  {
    key: 'scoringVariant',
    label: 'Scoring Variant',
    hint: 'How points are awarded each match',
    options: [
      { id: 'standard', label: 'Standard' },
      { id: 'golden_point', label: 'Golden Point' },
      { id: 'tiebreak', label: 'Tiebreak at 20-20' },
    ],
    defaultValue: 'standard',
  },
  {
    key: 'serveRotation',
    label: 'Serve Rotation',
    hint: 'How the serve alternates between teams',
    options: [
      { id: 'alternate', label: 'Alternate' },
      { id: 'every_4', label: 'Every 4 Points' },
    ],
    defaultValue: 'alternate',
  },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
