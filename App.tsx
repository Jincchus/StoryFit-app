import { useRef, useEffect } from 'react'
import { BackHandler, StyleSheet, SafeAreaView, Platform, ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Haptics from 'expo-haptics'
import { WebView } from 'react-native-webview'
import type { WebView as WebViewType, WebViewMessageEvent } from 'react-native-webview'

function handleWebMessage(e: WebViewMessageEvent) {
  try {
    const data = JSON.parse(e.nativeEvent.data)
    if (data?.type !== 'haptic') return
    switch (data.style) {
      case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break
      case 'warning': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break
      case 'error': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break
      case 'heavy': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break
      case 'medium': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break
      default: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  } catch {}
}

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://storyfit.duckdns.org'

export default function App() {
  const webViewRef = useRef<WebViewType>(null)
  const canGoBackRef = useRef(false)

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const handler = () => {
      if (canGoBackRef.current) {
        webViewRef.current?.goBack()
        return true
      }
      return false
    }
    BackHandler.addEventListener('hardwareBackPress', handler)
    return () => BackHandler.removeEventListener('hardwareBackPress', handler)
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onNavigationStateChange={state => { canGoBackRef.current = state.canGoBack }}
        onMessage={handleWebMessage}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#9b59b6" />
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
