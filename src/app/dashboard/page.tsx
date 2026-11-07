import { redirect } from "next/navigation";
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

export default async function DashboardPage() {
  const supabase = await createClient();

  // Verify the authenticated user on the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Retrieve the user's bureau profile
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

  // Retrieve the person's name
  const { data: person } = await supabase
    .from("people")
    .select("full_name")
    .eq("id", profile.person_id)
    .single();

  const fullName = person?.full_name || "Bureau Member";
  const roleName = roleLabels[profile.role_key] || "Bureau Member";

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brandArabic}>التواصل الصحي</div>
          <div style={styles.brandEnglish}>TAWASSOL SIHI</div>
        </div>

        <div style={styles.privateLabel}>PRIVATE BUREAU PLATFORM</div>
      </header>

      <section style={styles.content}>
        <div style={styles.welcome}>WELCOME TO YOUR WORKSPACE</div>

        <h1 style={styles.title}>
          Welcome back, <span style={styles.blue}>{fullName}</span>
        </h1>

        <p style={styles.subtitle}>
          Your bureau workspace is ready.
        </p>

        <div style={styles.panel}>
          <div style={styles.panelLabel}>YOUR POSITION</div>
          <div style={styles.role}>{roleName}</div>
          <div style={styles.status}>
            <span style={styles.statusDot} />
            Authenticated bureau member
          </div>
        </div>

        <div style={styles.sectionTitle}>WORKSPACE</div>
        <p style={styles.comingSoon}>
          Your club management tools will appear here.
        </p>
      </section>
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
    minHeight: "90px",
    padding: "20px 6%",
    borderBottom: "1px solid rgba(164,196,229,0.13)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
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
  privateLabel: {
    fontSize: "10px",
    letterSpacing: "1.5px",
    color: "#78baff",
  },
  content: {
    width: "min(900px, 88%)",
    margin: "75px auto",
  },
  welcome: {
    color: "#78baff",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "2.5px",
  },
  title: {
    marginTop: "18px",
    fontSize: "clamp(28px, 5vw, 42px)",
    lineHeight: 1.3,
  },
  blue: {
    color: "#78baff",
  },
  subtitle: {
    color: "#91a5bc",
    fontSize: "15px",
    marginTop: "12px",
  },
  panel: {
    marginTop: "45px",
    padding: "28px",
    background: "#0d1d30",
    border: "1px solid rgba(164,196,229,0.13)",
    borderRadius: "12px",
  },
  panelLabel: {
    color: "#91a5bc",
    fontSize: "10px",
    letterSpacing: "2px",
  },
  role: {
    marginTop: "13px",
    fontSize: "21px",
    fontWeight: 600,
    color: "#ffffff",
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginTop: "20px",
    color: "#91a5bc",
    fontSize: "12px",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#78baff",
  },
  sectionTitle: {
    marginTop: "55px",
    color: "#78baff",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "2px",
  },
  comingSoon: {
    marginTop: "14px",
    color: "#91a5bc",
    fontSize: "14px",
  },
};
