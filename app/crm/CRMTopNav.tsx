"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function navButtonStyle(active = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    minHeight: 46,
    padding: "0 18px",
    borderRadius: 16,
    border: `1px solid ${active ? "#0b1f44" : "#cfd8e3"}`,
    background: active ? "#0b1f44" : "#ffffff",
    color: active ? "#ffffff" : "#0b1f44",
    textDecoration: "none",
    fontSize: 16,
    fontWeight: 800,
  };
}

export default function CRMTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const panelStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #d9e0ea",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "clamp(2rem, 4vw, 3rem)",
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    color: "#0b1f44",
  };

  const descStyle: React.CSSProperties = {
    margin: "10px 0 0",
    fontSize: 16,
    lineHeight: 1.7,
    color: "#5d728f",
    maxWidth: 720,
  };

  const navWrapStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    paddingBottom: 4,
    flexWrap: "nowrap",
  };

  const headerRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const logoutButton: React.CSSProperties = {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "8px 14px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  };

  const isCRM = pathname === "/crm";
  const isLeads = pathname === "/crm/leads";
  const isNewLead = pathname === "/crm/leads/new";

  return (
    <section style={panelStyle}>
      <div style={headerRow}>
        <div>
          <h1 style={titleStyle}>CRM</h1>
          <p style={descStyle}>
            Patient lead management, follow-ups, and front desk workflow.
          </p>
        </div>

        <button onClick={handleLogout} style={logoutButton}>
          Logout
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={navWrapStyle}>
          <Link href="/dashboard" style={navButtonStyle(false)}>
            Dashboard
          </Link>

          <Link href="/crm" style={navButtonStyle(isCRM)}>
            CRM
          </Link>

          <Link href="/crm/leads" style={navButtonStyle(isLeads)}>
            Leads
          </Link>

          <Link href="/crm/leads/new" style={navButtonStyle(isNewLead)}>
            New Lead
          </Link>
        </div>
      </div>
    </section>
  );
}