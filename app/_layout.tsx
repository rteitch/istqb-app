import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { I18nProvider } from '../context/I18nContext';
import { AppDatabaseProvider } from '../context/DatabaseContext';
import { BankTypeProvider, useBankTypes } from '../context/BankTypeContext';
import { SessionProvider } from '../context/SessionContext';
import { ThemeProvider } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { isReady } = useBankTypes();

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
