import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing } from '../../lib/constants';

// ── Default variant: label + optional action link ────────────────────────────

type DefaultProps = {
  variant?: 'default';
  label: string;
  /** Optional coloured accent dot before the label */
  accentColor?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
};

// ── Filter variant: horizontal pill/chip row ─────────────────────────────────

type FilterOption<T extends string = string> = {
  key: T;
  label: string;
};

type FilterProps<T extends string = string> = {
  variant: 'filter';
  label?: string;
  options: FilterOption<T>[];
  active: T;
  onChange: (key: T) => void;
  tintColor?: string;
  testID?: string;
};

type SectionHeaderProps = DefaultProps | FilterProps;

export function SectionHeader(props: SectionHeaderProps) {
  if (props.variant === 'filter') {
    return <FilterHeader {...props} />;
  }
  return <DefaultHeader {...props} />;
}

// ── Default ──────────────────────────────────────────────────────────────────

function DefaultHeader({ label, accentColor, actionLabel, onAction, testID }: DefaultProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.labelRow}>
        {accentColor && <View style={[styles.accentDot, { backgroundColor: accentColor }]} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      {actionLabel && onAction && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAction();
          }}
          hitSlop={8}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Filter ───────────────────────────────────────────────────────────────────

function FilterHeader<T extends string>({
  label,
  options,
  active,
  onChange,
  tintColor,
  testID,
}: FilterProps<T>) {
  const activeBg = tintColor ?? Colors.opticYellow;

  return (
    <View testID={testID}>
      {label && <Text style={[styles.label, { marginBottom: Spacing[2] }]}>{label}</Text>}
      <View style={styles.filterRow}>
        {options.map((opt) => {
          const isActive = opt.key === active;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.filterPill,
                isActive && { backgroundColor: activeBg + '1A' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(opt.key);
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isActive && { color: activeBg },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[3],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
  },
  action: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.opticYellow,
  },

  // Filter variant
  filterRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing[3],
    borderRadius: 9999,
    backgroundColor: Colors.surface,
  },
  filterPillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
