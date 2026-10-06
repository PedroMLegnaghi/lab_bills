import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { SignUpForm } from "@/components/auth-forms";
import { getCurrentMember } from "@/lib/auth";

export default async function SignUpPage() {
  if (await getCurrentMember()) redirect("/");
  return (
    <AuthCard title="Crie sua conta com o código do lab">
      <SignUpForm />
    </AuthCard>
  );
}
