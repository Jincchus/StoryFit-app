import { useRef, useEffect } from 'react'
import { BackHandler, StyleSheet, SafeAreaView, Platform, ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { WebView } from 'react-native-webview'
import type { WebView as WebViewType, WebViewMessageEvent } from 'react-native-webview'

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://storyfit.duckdns.org'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

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

async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null
  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  if (status !== 'granted') return null
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  return token.data
}

export default function App() {
  const webViewRef = useRef<WebViewType>(null)
  const canGoBackRef = useRef(false)
  const pushTokenRef = useRef<string | null>(null)

  const injectPushToken = () => {
    if (!pushTokenRef.current) return
    webViewRef.current?.injectJavaScript(
      `window.__EXPO_PUSH_TOKEN__=${JSON.stringify(pushTokenRef.current)}; true;`
    )
  }

  useEffect(() => {
    getPushToken()
      .then(token => { pushTokenRef.current = token; injectPushToken() })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(resp => {
      const url = resp.notification.request.content.data?.url
      if (typeof url === 'string' && url.startsWith('/')) {
        webViewRef.current?.injectJavaScript(`location.href=${JSON.stringify(APP_URL + url)}; true;`)
      }
    })
    return () => sub.remove()
  }, [])

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
        onLoadEnd={injectPushToken}
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
