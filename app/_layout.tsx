import { Stack } from 'expo-router';
import { I18nProvider } from './context/I18nContext';
import { AppDatabaseProvider } from './context/DatabaseContext';
import { SessionProvider } from './context/SessionContext';

export default function RootLayout() {
  return (
    <I18nProvider>
      <AppDatabaseProvider>
        <SessionProvider>
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
          </Stack>
        </SessionProvider>
      </AppDatabaseProvider>
    </I18nProvider>
  );
}
