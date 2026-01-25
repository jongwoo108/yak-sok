import { Redirect } from 'expo-router';
import { useMedicationStore } from '../services/store';

export default function Index() {
    const isAuthenticated = useMedicationStore((state) => state.isAuthenticated);
    return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
