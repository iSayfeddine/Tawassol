import { redirect } from "next/navigation";
import Link from "next/link";
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

export default async function BureauPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");

  const { data: assignments, error } = await supabase
    .from("bureau_assignments")
    .select("person_id, role_key, role_name, display_order")
    .order("display_order", { ascending: true });

  if (error) {
    return (
      <main style={styles.page}>
        <h2>Unable to load bureau members</h2>
        <p>Please check the database permissions.</p>
      </main>
    );
  }

  const personIds = (assignments || []).map((item) => item.person_id);

  const { data: people } = personIds.length
    ? await supabase
        .from("people")
        .select("id, full_name")
        .in("id", personIds)
    : { data: [] };

  const peopleMap = new Map(
    (people || []).map((person) => [person.id, person.full_name])
  );

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <Image
            src="/logo.png"
            alt="Tawassol Sihi"
            width={54}
            height={54}
            priority
            style={styles.logo}
          />
          <div>
            <div style={styles.brandArabic}>التواصل الصحي</div>
            <div style={styles.brandEnglish}>TAWASSOL SIHI</div>
          </div>
        </div>

        <form action={signOut}>
          <button type="submit" style={styles.signOut}>
            Sign out ↗
          </button>
        </form>
      </header>

      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarLabel}>WORKSPACE</div>

          <Link href="/dashboard" style={styles.navLink}>
            ◫　Dashboard
          </Link>

          <div style={styles.sidebarLabel}>MANAGEMENT</div>

          <div style={styles.activeNav}>◇　Bureau</div>

          <Link href="/dashboard/members" style={styles.disabledNav}>
            ♧　Members
          </Link>
          <div style={styles.disabledNav}>▦　Events</div>
          <div style={styles.disabledNav}>◈　Treasury</div>
          <div style={styles.disabledNav}>↻　Activity History</div>

          <div style={styles.sidebarFooter}>
            PRIVATE BUREAU PLATFORM
            <br />
            TAWASSOL SIHI
          </div>
        </aside>

        <section style={styles.content}>
          <div style={styles.eyebrow}>MANAGEMENT / BUREAU</div>

          <div style={styles.heading}>
            <div>
              <h1 style={styles.title}>Bureau Management</h1>
              <p style={styles.subtitle}>
                The official leadership team of Tawassol Sihi.
              </p>
            </div>

            <div style={styles.count}>
              <strong>{assignments?.length ?? 0}</strong>
              <span> BUREAU MEMBERS</span>
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>FULL NAME</th>
                  <th style={styles.th}>POSITION</th>
                  <th style={styles.th}>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {(assignments || []).map((assignment) => (
                  <tr key={assignment.person_id}>
                    <td style={styles.tdNumber}>
                      {assignment.display_order}
                    </td>

                    <td style={styles.tdName}>
                      {peopleMap.get(assignment.person_id) || "Unknown"}
                    </td>

                    <td style={styles.td}>
                      {assignment.role_name ||
                        roleLabels[assignment.role_key] ||
                        assignment.role_key}
                    </td>

                    <td style={styles.td}>
                      <span style={styles.status}>
                        <span style={styles.dot} />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!assignments || assignments.length === 0) && (
              <p style={styles.empty}>No bureau members found.</p>
            )}
          </div>

          <p style={styles.note}>
            Bureau information is currently displayed in read-only mode.
          </p>

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
    objectFit: "contain",
  },
  brandArabic: {
    fontSize: "27px",
    fontWeight: 700,
  },
  brandEnglish: {
    marginTop: "3px",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "#91a5bc",
  },
  signOut: {
    padding: "10px 16px",
    background: "transparent",
    border: "1px solid rgba(164,196,229,0.2)",
    borderRadius: "7px",
    color: "#a6d4ff",
    cursor: "pointer",
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
  navLink: {
    display: "block",
    padding: "13px 12px",
    color: "#91a5bc",
    textDecoration: "none",
    fontSize: "12px",
    marginBottom: "35px",
  },
  activeNav: {
    padding: "13px 12px",
    borderRadius: "7px",
    background: "rgba(120,186,255,0.11)",
    color: "#a6d4ff",
    fontSize: "12px",
  },
  disabledNav: {
    padding: "13px 12px",
    color: "#71869d",
    fontSize: "12px",
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
  content: {
    flex: 1,
    minWidth: 0,
    padding: "42px clamp(20px, 5vw, 65px)",
  },
  eyebrow: {
    color: "#78baff",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "2px",
  },
  heading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "25px",
    marginBottom: "35px",
  },
  title: {
    margin: 0,
    fontSize: "30px",
  },
  subtitle: {
    color: "#91a5bc",
    fontSize: "13px",
    marginTop: "10px",
  },
  count: {
    padding: "13px 17px",
    background: "#0d1d30",
    border: "1px solid rgba(164,196,229,0.13)",
    borderRadius: "8px",
    color: "#91a5bc",
    fontSize: "10px",
    letterSpacing: "1px",
  },
  tableContainer: {
    width: "100%",
    overflowX: "auto",
    background: "#0d1d30",
    border: "1px solid rgba(164,196,229,0.13)",
    borderRadius: "9px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    minWidth: "650px",
  },
  th: {
    padding: "17px 20px",
    color: "#71869d",
    fontSize: "9px",
    letterSpacing: "1.4px",
    fontWeight: 700,
    borderBottom: "1px solid rgba(164,196,229,0.13)",
  },
  td: {
    padding: "17px 20px",
    color: "#b6c7d9",
    fontSize: "12px",
    borderBottom: "1px solid rgba(164,196,229,0.08)",
  },
  tdNumber: {
    padding: "17px 20px",
    color: "#78baff",
    fontSize: "12px",
    borderBottom: "1px solid rgba(164,196,229,0.08)",
  },
  tdName: {
    padding: "17px 20px",
    color: "#f2f6fc",
    fontSize: "13px",
    fontWeight: 600,
    borderBottom: "1px solid rgba(164,196,229,0.08)",
  },
  status: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#91a5bc",
    fontSize: "11px",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#78baff",
  },
  empty: {
    padding: "25px",
    color: "#91a5bc",
    fontSize: "13px",
  },
  note: {
    marginTop: "18px",
    color: "#71869d",
    fontSize: "11px",
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
