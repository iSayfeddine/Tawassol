import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

const roleLabels: Record<string, string> = {
  president: "President",
  vpi_internal: "Vice President for Internal Affairs",
  vpe: "Vice President for External Affairs",
  secretary_general: "Secretary General",
  treasurer: "Treasurer",
  media: "Head of Media and Communications",
  conferences: "Head of Conferences and Seminars",
  workshops: "Head of Workshops and Simulation",
  funding: "Head of Funding and Partnerships",
  pharmacy: "Head of Pharmacy",
  podcast: "Head of Podcast and Medical Content",
  awareness: "Head of Awareness and Guidance",
};

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/");
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("person_id, role_key")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <main style={styles.page}>
        <div style={styles.panel}>
          <h1>Profile not found</h1>
          <p>
            Your account is authenticated, but it is not linked to a bureau
            profile. Please contact the platform administrator.
          </p>
        </div>
      </main>
    );
  }

  const [
    { data: person },
    { count: memberCount },
    { count: bureauCount },
    { count: eventCount },
    { count: transactionCount },
  ] = await Promise.all([
    supabase
      .from("people")
      .select("full_name")
      .eq("id", profile.person_id)
      .single(),

    supabase
      .from("members")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("bureau_assignments")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("events")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("financial_transactions")
      .select("*", { count: "exact", head: true }),
  ]);

  const fullName = person?.full_name || "Bureau Member";
  const roleName = roleLabels[profile.role_key] || "Bureau Member";

  const statistics = [
    {
      label: "CLUB MEMBERS",
      value: memberCount ?? "—",
      description: "Registered members",
      icon: "◈",
    },
    {
      label: "BUREAU MEMBERS",
      value: bureauCount ?? "—",
      description: "Official bureau positions",
      icon: "◇",
    },
    {
      label: "EVENTS",
      value: eventCount ?? "—",
      description: "Recorded club activities",
      icon: "▦",
    },
    {
      label: "TRANSACTIONS",
      value: transactionCount ?? "—",
      description: "Recorded financial operations",
      icon: "↗",
    },
  ];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <Image
            src="/logo.png"
            alt="Tawassol Sihi Logo"
            width={58}
            height={58}
            priority
            style={styles.logo}
          />

          <div>
            <div style={styles.brandArabic}>التواصل الصحي</div>
            <div style={styles.brandEnglish}>TAWASSOL SIHI</div>
          </div>
        </div>

        <form action={signOut}>
          <button type="submit" style={styles.signOutButton}>
            Sign out ↗
          </button>
        </form>
      </header>

      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarLabel}>WORKSPACE</div>

          <div style={styles.activeNav}>
            <span>◫</span>
            Dashboard
          </div>

          <div style={styles.sidebarLabel}>MANAGEMENT</div>

          <div style={styles.navItem}>
            <span>◇</span>
            Bureau
            <span style={styles.comingSoon}>Soon</span>
          </div>

          <div style={styles.navItem}>
            <span>♧</span>
            Members
            <span style={styles.comingSoon}>Soon</span>
          </div>

          <div style={styles.navItem}>
            <span>▦</span>
            Events
            <span style={styles.comingSoon}>Soon</span>
          </div>

          <div style={styles.navItem}>
            <span>◈</span>
            Treasury
            <span style={styles.comingSoon}>Soon</span>
          </div>

          <div style={styles.navItem}>
            <span>↻</span>
            Activity History
            <span style={styles.comingSoon}>Soon</span>
          </div>

          <div style={styles.sidebarFooter}>
            PRIVATE BUREAU PLATFORM
            <br />
            TAWASSOL SIHI
          </div>
        </aside>

        <section style={styles.mainContent}>
          <div style={styles.topLabel}>OVERVIEW / DASHBOARD</div>

          <div style={styles.welcomeBlock}>
            <div>
              <h1 style={styles.title}>
                Welcome back, <span style={styles.blue}>{fullName}</span>
              </h1>

              <p style={styles.subtitle}>
                Here is an overview of your club's activity and organization.
              </p>
            </div>

            <div style={styles.roleBadge}>
              <span style={styles.statusDot} />
              {roleName}
            </div>
          </div>

          <div style={styles.sectionHeading}>
            <h2 style={styles.sectionTitle}>Club overview</h2>
            <span style={styles.sectionDescription}>LIVE DATABASE COUNTS</span>
          </div>

          <div style={styles.statisticsGrid}>
            {statistics.map((stat) => (
              <div key={stat.label} style={styles.statCard}>
                <div style={styles.statTop}>
                  <span style={styles.statLabel}>{stat.label}</span>
                  <span style={styles.statIcon}>{stat.icon}</span>
                </div>

                <div style={styles.statValue}>{stat.value}</div>

                <div style={styles.statDescription}>
                  {stat.description}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.sectionHeading}>
            <h2 style={styles.sectionTitle}>Platform modules</h2>
            <span style={styles.sectionDescription}>MANAGEMENT TOOLS</span>
          </div>

          <div style={styles.modulesGrid}>
            {[
              ["01", "Bureau management", "Official team and responsibilities"],
              ["02", "Member database", "Member information and membership status"],
              ["03", "Events management", "Activities, attendance and participants"],
              ["04", "Treasury", "Membership fees and financial records"],
              ["05", "Activity history", "Changes and administrative actions"],
            ].map(([number, title, description]) => (
              <div key={number} style={styles.moduleRow}>
                <span style={styles.moduleNumber}>{number}</span>

                <div style={styles.moduleText}>
                  <div style={styles.moduleTitle}>{title}</div>
                  <div style={styles.moduleDescription}>{description}</div>
                </div>

                <span style={styles.moduleStatus}>IN DEVELOPMENT</span>
              </div>
            ))}
          </div>

          <footer style={styles.footer}>
            TAWASSOL SIHI · INTERNAL MANAGEMENT PLATFORM
          </footer>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#071321",
    color: "#f2f6fc",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    minHeight: "88px",
    padding: "14px 5%",
    borderBottom: "1px solid rgba(164,196,229,0.13)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  logo: {
    width: "58px",
    height: "58px",
    objectFit: "contain",
  },
  brandArabic: {
    fontSize: "27px",
    fontWeight: 700,
    color: "#ffffff",
  },
  brandEnglish: {
    marginTop: "3px",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "#91a5bc",
  },
  signOutButton: {
    padding: "10px 16px",
    background: "transparent",
    border: "1px solid rgba(164,196,229,0.2)",
    borderRadius: "7px",
    color: "#a6d4ff",
    cursor: "pointer",
    fontSize: "12px",
  },
  layout: {
    display: "flex",
    minHeight: "calc(100vh - 88px)",
  },
  sidebar: {
    width: "235px",
    flexShrink: 0,
    padding: "34px 18px",
    borderRight: "1px solid rgba(164,196,229,0.13)",
    position: "relative",
  },
  sidebarLabel: {
    margin: "12px 12px 15px",
    color: "#637990",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "1.8px",
  },
  activeNav: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px 12px",
    marginBottom: "35px",
    borderRadius: "7px",
    background: "rgba(120,186,255,0.11)",
    color: "#a6d4ff",
    fontSize: "13px",
    fontWeight: 600,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "13px 12px",
    color: "#91a5bc",
    fontSize: "12px",
  },
  comingSoon: {
    marginLeft: "auto",
    color: "#637990",
    fontSize: "9px",
  },
  sidebarFooter: {
    position: "absolute",
    bottom: "30px",
    left: "30px",
    color: "#637990",
    fontSize: "9px",
    lineHeight: 2,
    letterSpacing: "1px",
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    padding: "42px clamp(22px, 5vw, 65px)",
  },
  topLabel: {
    color: "#78baff",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "2px",
  },
  welcomeBlock: {
    marginTop: "22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(25px, 3vw, 36px)",
    lineHeight: 1.4,
  },
  blue: {
    color: "#78baff",
  },
  subtitle: {
    marginTop: "10px",
    color: "#91a5bc",
    fontSize: "13px",
    lineHeight: 1.7,
  },
  roleBadge: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "11px 14px",
    border: "1px solid rgba(120,186,255,0.2)",
    borderRadius: "7px",
    color: "#a6d4ff",
    fontSize: "11px",
  },
  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#78baff",
  },
  sectionHeading: {
    marginTop: "48px",
    marginBottom: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 600,
  },
  sectionDescription: {
    color: "#637990",
    fontSize: "9px",
    letterSpacing: "1.5px",
  },
  statisticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  statCard: {
    padding: "20px",
    background: "#0d1d30",
    border: "1px solid rgba(164,196,229,0.13)",
    borderRadius: "9px",
  },
  statTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    color: "#91a5bc",
    fontSize: "9px",
    letterSpacing: "1.3px",
    fontWeight: 700,
  },
  statIcon: {
    color: "#78baff",
    fontSize: "19px",
  },
  statValue: {
    marginTop: "22px",
    fontSize: "32px",
    fontWeight: 700,
    color: "#ffffff",
  },
  statDescription: {
    marginTop: "7px",
    color: "#637990",
    fontSize: "11px",
  },
  modulesGrid: {
    borderTop: "1px solid rgba(164,196,229,0.13)",
  },
  moduleRow: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "19px 12px",
    borderBottom: "1px solid rgba(164,196,229,0.13)",
  },
  moduleNumber: {
    color: "#78baff",
    fontSize: "11px",
    fontWeight: 700,
  },
  moduleText: {
    flex: 1,
  },
  moduleTitle: {
    color: "#eaf2fc",
    fontSize: "13px",
    fontWeight: 600,
  },
  moduleDescription: {
    marginTop: "5px",
    color: "#71869d",
    fontSize: "11px",
  },
  moduleStatus: {
    color: "#91a5bc",
    fontSize: "9px",
    letterSpacing: "1px",
  },
  footer: {
    marginTop: "55px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(164,196,229,0.13)",
    color: "#637990",
    fontSize: "9px",
    letterSpacing: "1.3px",
  },
};
