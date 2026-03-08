import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '../lib/constants';
import { Button } from './ui/Button';

type Props = {
  children: ReactNode;
  fallbackMessage?: string;
};

type State = {
  hasError: boolean;
};

/**
 * React error boundary that catches render errors and shows a retry UI.
 * Wrap around any screen or component tree that might throw.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.props.fallbackMessage ??
              'An unexpected error occurred. Try again.'}
          </Text>
          <Button
            title="RETRY"
            onPress={this.handleRetry}
            variant="primary"
            size="md"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },
});
