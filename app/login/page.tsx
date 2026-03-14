import { signInAction } from "./actions";
import Image from "next/image";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: SearchParams;
};

function getParam(
  sp: Record<string, string | string[] | undefined>,
  key: string
) {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const error = getParam(sp ?? {}, "error");
  const next = getParam(sp ?? {}, "next");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
        }}
      >
       
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#6366f1",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
          <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Clinic Logo"
            width={80}
            height={80}
            priority
          />
        </div>
            Staff Portal
          </div>

          <h1
            style={{
              fontSize: 30,
              lineHeight: 1.15,
              fontWeight: 800,
              color: "#111827",
              margin: 0,
            }}
          >
            Sign in
          </h1>

          <p
            style={{
              color: "#6b7280",
              fontSize: 14,
              marginTop: 10,
              marginBottom: 0,
            }}
          >
            Access CRM, inventory, dashboard, and internal tools.
          </p>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 12,
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 14,
              border: "1px solid #fecaca",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        ) : null}

        <form action={signInAction} style={{ display: "grid", gap: 14 }}>
          <input type="hidden" name="next" value={next} />

          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
                fontSize: 14,
                color: "#111827",
              }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="name@company.com"
              autoComplete="email"
              style={{
                width: "100%",
                height: 46,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                outline: "none",
                fontSize: 15,
                background: "#fff",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
                fontSize: 14,
                color: "#111827",
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: "100%",
                height: 46,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                outline: "none",
                fontSize: 15,
                background: "#fff",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              height: 48,
              marginTop: 4,
              border: 0,
              borderRadius: 12,
              background: "#111827",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}