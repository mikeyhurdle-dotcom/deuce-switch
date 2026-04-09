import { StyleSheet, View } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { Radius, Spacing } from '../../lib/constants';

export function HomeSkeleton() {
  return (
    <View style={styles.container}>
      {/* Live banner placeholder */}
      <Skeleton width="100%" height={80} borderRadius={Radius.lg} />

      {/* CTA cards */}
      <View style={styles.ctaRow}>
        <Skeleton width="48%" height={100} borderRadius={Radius.lg} />
        <Skeleton width="48%" height={100} borderRadius={Radius.lg} />
      </View>

      {/* Section header */}
      <Skeleton width={160} height={20} borderRadius={Radius.sm} />

      {/* Feed cards */}
      <Skeleton width="100%" height={140} borderRadius={Radius.md} />
      <Skeleton width="100%" height={140} borderRadius={Radius.md} />
      <Skeleton width="100%" height={140} borderRadius={Radius.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
    paddingTop: Spacing[3],
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
});
