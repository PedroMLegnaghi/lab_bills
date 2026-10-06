// No-JS end-to-end run against a running server: submits the server-rendered forms exactly as a
// browser without JavaScript would (Server Actions render progressive-enhancement fields).
// Every name and value here is invented. Creates members and purchases: point it at a dev or
// throwaway database, never at the lab's real one.
//
//   E2E_BASE=http://localhost:3000 LAB_ACCESS_CODE=... node tests/e2e-nojs.mjs
const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failures++; };

class Client {
  cookie = "";
  async get(path) {
    const r = await fetch(BASE + path, { headers: { cookie: this.cookie }, redirect: "manual" });
    return { status: r.status, location: r.headers.get("location"), html: await r.text(), type: r.headers.get("content-type") };
  }
  // Submits the n-th <form> on the page, with its hidden fields plus `fields`.
  async submit(path, fields, formIndex = 0) {
    const page = await this.get(path);
    const forms = [...page.html.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/g)];
    const form = forms[formIndex];
    if (!form) throw new Error(`no form #${formIndex} on ${path}`);
    const fd = new FormData();
    for (const m of form[1].matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
      const name = m[0].match(/name="([^"]*)"/)?.[1];
      const value = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
      if (name && !(name in fields)) fd.append(decode(name), decode(value));
    }
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    const r = await fetch(BASE + path, {
      method: "POST", body: fd, redirect: "manual",
      headers: { cookie: this.cookie, origin: BASE },
    });
    const set = r.headers.getSetCookie().find((c) => c.startsWith("lab_session="));
    if (set) { this.cookie = set.split(";")[0]; this.rawCookie = set; }
    return { status: r.status, location: r.headers.get("location"), html: await r.text() };
  }
}

// Minimal valid files, identified by magic bytes.
const png = new Blob([Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364f8cf00000301010018dd8db40000000049454e44ae426082", "hex")], { type: "image/png" });
const jpg = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9])], { type: "image/jpeg" });
const fakeImage = new Blob(["<html><script>alert(1)</script></html>"], { type: "image/png" });

const suffix = Date.now().toString(36);
const ana = new Client(), bia = new Client(), caio = new Client();
const code = process.env.LAB_ACCESS_CODE;

// Sign-up
let r = await ana.submit("/cadastro", { code: "wrong", name: `Ana ${suffix}`, password: "senha123" });
check(r.html.includes("Código do laboratório incorreto"), "wrong lab code is rejected");
r = await ana.submit("/cadastro", { code, name: `Ana ${suffix}`, password: "senha123", pixKey: "ana.pix@example.com" });
check(r.status === 303 && ana.cookie, `Ana signs up (status ${r.status})`);
check(/httponly/i.test(ana.rawCookie) && (BASE.startsWith("https") || !/;\s*secure/i.test(ana.rawCookie)),
  "session cookie is HttpOnly, and not Secure over plain http");
r = await bia.submit("/cadastro", { code, name: `ana ${suffix}`, password: "senha123" });
check(r.html.includes("Já existe um membro"), "duplicate name (case-insensitive) is rejected");
await bia.submit("/cadastro", { code, name: `Bia ${suffix}`, password: "senha123" });
await caio.submit("/cadastro", { code, name: `Caio ${suffix}`, password: "senha123" });
check(bia.cookie && caio.cookie, "Bia and Caio sign up");

// Sign-in
const bia2 = new Client();
r = await bia2.submit("/entrar", { name: `BIA ${suffix}`, password: "errada" });
check(r.html.includes("Nome ou senha incorretos"), "wrong password is rejected");
r = await bia2.submit("/entrar", { name: `BIA ${suffix}`, password: "senha123" });
check(r.status === 303 && bia2.cookie, "sign-in works, name case-insensitive");

// Purchase
r = await ana.submit("/compras/nova", { description: "Café e bolachas", amount: "10,00", purchasedAt: "2026-09-29", receipt: fakeImage }, 1);
check(r.html.includes("Envie uma foto"), "a non-image disguised as PNG is rejected");
r = await ana.submit("/compras/nova", { description: "Café e bolachas", amount: "abc", purchasedAt: "2026-09-29", receipt: png }, 1);
check(r.html.includes("Valor inválido"), "invalid amount is rejected");
r = await ana.submit("/compras/nova", { description: "Café e bolachas", amount: "30,00", purchasedAt: "2026-09-29", receipt: new Blob([png], { type: "image/png" }) }, 1);
check(r.status === 303 && r.location?.startsWith("/compras/"), `purchase created -> ${r.location}`);
const purchasePath = r.location;

let page = await bia.get(purchasePath);
const splitMatch = page.html.match(/÷ <!-- -->(\d+)<!-- --> membros/);
console.log(`      split count on page: ${splitMatch?.[1]}`);
check(page.html.includes("Sugestão por pessoa"), "Bia sees the purchase detail");
check(page.html.includes('value="ana.pix@example.com"'), "Bia sees the buyer's Pix key where she contributes");
const receiptName = page.html.match(/\/comprovantes\/([0-9a-f-]{36}\.png)/)?.[1];
check(!!receiptName, "purchase receipt is linked");
const img = await bia.get(`/comprovantes/${receiptName}`);
check(img.status === 200 && img.type === "image/png", `receipt served to member (${img.status} ${img.type})`);
const anon = await new Client().get(`/comprovantes/${receiptName}`);
check(anon.status === 401, "receipt hidden from anonymous");

// Contributions. On Bia's page, form 0 is sign-out, form 1 is the contribution form.
r = await bia.submit(purchasePath, { amount: "7,50", note: "Pix", receipt: jpg }, 1);
check(r.status === 200 && !r.html.includes('role="alert"'), `Bia contributes 7,50 (status ${r.status})`);
r = await caio.submit(purchasePath, { amount: "2" }, 1);
check(r.status === 200 && !r.html.includes('role="alert"'), "Caio contributes 2,00 without receipt");

page = await ana.get(purchasePath);
check(page.html.includes(`Bia ${suffix}`) && page.html.includes(`Caio ${suffix}`), "Ana sees both contributions");
check(!page.html.includes("Quanto você vai contribuir"), "buyer gets no contribution form");
check(!page.html.includes("Excluir compra"), "purchase with contributions cannot be deleted");

const home = await caio.get("/");
check(home.html.includes("Você contribuiu"), "home shows Caio's contributed status");
const summary = await bia.get("/resumo");
check(summary.status === 200 && summary.html.includes("Do seu bolso"), "summary page renders");
// Pix key editing. On /membros, form 0 is sign-out and form 1 is the Pix key form.
r = await bia.submit("/membros", { pixKey: "x".repeat(78) }, 1);
check(r.html.includes("Chave Pix longa demais"), "overlong Pix key is rejected");
r = await bia.submit("/membros", { pixKey: "  bia-chave-aleatoria  " }, 1);
check(r.html.includes("Chave salva"), "Bia saves her Pix key");
r = await bia.submit("/compras/nova", { description: "Balas", amount: "6", purchasedAt: "2026-09-29", receipt: new Blob([png], { type: "image/png" }) }, 1);
page = await caio.get(r.location);
check(page.html.includes('value="bia-chave-aleatoria"'), "Pix key added later shows up (trimmed) on the buyer's purchase");
r = await caio.submit("/compras/nova", { description: "Café", amount: "6", purchasedAt: "2026-09-29", receipt: new Blob([png], { type: "image/png" }) }, 1);
page = await ana.get(r.location);
check(page.html.includes("ainda não cadastrou uma chave Pix"), "buyer without a Pix key gets the fallback note");

const members = await bia.get("/membros");
check(members.html.includes(`Caio ${suffix}`), "members page lists members");

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
