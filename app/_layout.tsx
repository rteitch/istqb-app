import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { I18nProvider } from '../context/I18nContext';
import { AppDatabaseProvider } from '../context/DatabaseContext';
import { BankTypeProvider, useBankTypes } from '../context/BankTypeContext';
import { SessionProvider } from '../context/SessionContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { isReady } = useBankTypes();
  const { isDarkMode, colors } = useTheme();
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 768;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  if (!isReady) return null;

  const content = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="select-category" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="result" />
      <Stack.Screen name="history" />
      <Stack.Screen name="bank/index" />
      <Stack.Screen name="bank/add" />
      <Stack.Screen name="bank/[id]" />
      <Stack.Screen name="manage-types/index" />
      <Stack.Screen name="manage-types/category" />
    </Stack>
  );

  if (isLargeScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#020617' : '#E2E8F0', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 768, backgroundColor: colors.background, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10, overflow: 'hidden' }}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppDatabaseProvider>
          <BankTypeProvider>
            <SessionProvider>
              <AppNavigation />
            </SessionProvider>
          </BankTypeProvider>
        </AppDatabaseProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
