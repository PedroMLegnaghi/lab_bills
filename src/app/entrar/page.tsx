import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { SignInForm } from "@/components/auth-forms";
import { getCurrentMember } from "@/lib/auth";

export default async function SignInPage() {
  if (await getCurrentMember()) redirect("/");
  return (
    <AuthCard title="Entre para ver e registrar compras">
      <SignInForm />
    </AuthCard>
  );
}
