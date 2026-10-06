import { AppShell } from "@/components/app-shell";
import { PurchaseForm } from "@/components/purchase-form";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayInput } from "@/lib/purchases";

export default async function NewPurchasePage() {
  const me = await requireMember();
  // Same rule as createPurchase: active members, plus the buyer even if inactive.
  const others = await db.member.count({ where: { active: true, id: { not: me.id } } });
  return (
    <AppShell me={me} title="Nova compra">
      <PurchaseForm today={todayInput()} activeMembers={others + 1} />
    </AppShell>
  );
}
