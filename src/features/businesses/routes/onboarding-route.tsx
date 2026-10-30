import { AuthShell } from '@/components/auth-shell';

import { CreateBusinessForm } from '../components/create-business-form';

export default function OnboardingRoute() {
  return (
    <AuthShell wide>
      <CreateBusinessForm />
    </AuthShell>
  );
}
