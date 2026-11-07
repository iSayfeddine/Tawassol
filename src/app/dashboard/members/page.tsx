
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

type Member = {
  id: string;
  person_id: string;
  notes: string | null;
  club_points: number | null;
  is_vip: boolean;
  has_warning: boolean;
  is_banned: boolean;
  is_archived: boolean;
};

type Skill = {
  id: number;
  name: string;
};

type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  points: number;
  isVip: boolean;
  hasWarning: boolean;
  isBanned: boolean;
  isArchived: boolean;
  skills: string[];
  paid: boolean;
};

const colors = {
  background: "#071321",
  panel: "#0d1d30",
  panelLight: "#12263d",
  border: "#203750",
  blue: "#78baff",
  brightBlue: "#a6d4ff",
  gold: "#d6b778",
  text: "#f2f6fc",
  muted: "#91a5bc",
  green: "#69d5a0",
  red: "#ff7777",
};

export default function MembersPage() {
  const router = useRouter();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberPeriod, setMemberPeriod] = useState("Checking membership period...");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("person_id, role_key")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Your bureau profile could not be found.");
        }

        const { data: currentPerson } = await supabase
          .from("people")
          .select("full_name")
          .eq("id", profile.person_id)
          .single();

        if (!cancelled) {
          setUserName(currentPerson?.full_name || "Bureau member");
        }

        const today = new Date().toISOString().slice(0, 10);

        const { data: period, error: periodError } = await supabase
          .from("membership_periods")
          .select("id, name, start_date, end_date")
          .lte("start_date", today)
          .gte("end_date", today)
          .maybeSingle();

        if (periodError) {
          throw new Error("Could not load the membership period.");
        }

        if (!cancelled) {
          setMemberPeriod(period?.name || "No active period");
        }

        const { data: memberData, error: memberError } = await supabase
          .from("members")
          .select(
            "id, person_id, notes, club_points, is_vip, has_warning, is_banned, is_archived"
          );

        if (memberError) {
          throw new Error("Could not load members. Please check database permissions.");
        }

        const memberList = (memberData || []) as Member[];
        const memberIds = memberList.map((member) => member.id);
        const personIds = memberList.map((member) => member.person_id);

        let people: Person[] = [];
        let skillLinks: { member_id: string; skill_id: number }[] = [];
        let skills: Skill[] = [];
        let paidMemberIds = new Set<string>();

        if (personIds.length > 0) {
          const { data, error } = await supabase
            .from("people")
            .select("id, full_name, email, phone")
            .in("id", personIds);

          if (error) {
            throw new Error("Could not load member contact information.");
          }

          people = (data || []) as Person[];
        }

        const [skillsResult, linksResult] = await Promise.all([
          supabase.from("skills").select("id, name"),
          memberIds.length > 0
            ? supabase
                .from("member_skills")
                .select("member_id, skill_id")
                .in("member_id", memberIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (skillsResult.error || linksResult.error) {
          throw new Error("Could not load member skills.");
        }

        skills = (skillsResult.data || []) as Skill[];
        skillLinks = (linksResult.data || []) as {
          member_id: string;
          skill_id: number;
        }[];

        if (period && memberIds.length > 0) {
          const { data: payments, error: paymentError } = await supabase
            .from("membership_fee_records")
            .select("member_id, status")
            .eq("period_id", period.id);

          if (paymentError) {
            throw new Error("Could not load membership payment records.");
          }

          paidMemberIds = new Set(
            (payments || [])
              .filter((payment) => payment.status?.toLowerCase() === "paid")
              .map((payment) => payment.member_id)
          );
        }

        const peopleMap = new Map(
          people.map((person) => [person.id, person])
        );

        const skillsMap = new Map(
          skills.map((skill) => [skill.id, skill.name])
        );

        const memberSkillsMap = new Map<string, string[]>();

        skillLinks.forEach((link) => {
          const skillName = skillsMap.get(link.skill_id);

          if (skillName) {
            const existing = memberSkillsMap.get(link.member_id) || [];
            existing.push(skillName);
            memberSkillsMap.set(link.member_id, existing);
          }
        });

        const rows: MemberRow[] = memberList.map((member) => {
          const person = peopleMap.get(member.person_id);

          return {
            id: member.id,
            name: person?.full_name || "Unknown member",
            email: person?.email || "",
            phone: person?.phone || "",
            notes: member.notes || "",
            points: member.club_points || 0,
            isVip: member.is_vip || false,
            hasWarning: member.has_warning || false,
            isBanned: member.is_banned || false,
            isArchived: member.is_archived || false,
            skills: memberSkillsMap.get(member.id) || [],
            paid: paidMemberIds.has(member.id),
          };
        });

        if (!cancelled) {
          setMembers(rows);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Something went wrong."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...members]
      .filter((member) => {
        if (!query) return true;

        return (
          member.name.toLowerCase().includes(query) ||
          member.phone.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (a.paid !== b.paid) return a.paid ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [members, search]);

  const paidCount = members.filter((member) => member.paid).length;
  const unpaidCount = members.length - paidCount;
  const vipCount = members.filter((member) => member.isVip).length;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const styles = {
    page: {
      minHeight: "100vh",
      background: colors.background,
      color: colors.text,
      fontFamily: "Arial, sans-serif",
    } as React.CSSProperties,
    header: {
      height: 76,
      padding: "0 5%",
      borderBottom: `1px solid ${colors.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
    } as React.CSSProperties,
    brand: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    } as React.CSSProperties,
    logo: {
      width: 43,
      height: 43,
      objectFit: "contain",
    } as React.CSSProperties,
    button: {
      background: colors.panelLight,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      padding: "9px 15px",
      borderRadius: 7,
      cursor: "pointer",
      fontSize: 13,
    } as React.CSSProperties,
    content: {
      maxWidth: 1450,
      margin: "0 auto",
      padding: "30px 5%",
    } as React.CSSProperties,
    nav: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 30,
    } as React.CSSProperties,
    navLink: {
      color: colors.muted,
      textDecoration: "none",
      padding: "9px 14px",
      borderRadius: 7,
      fontSize: 13,
    } as React.CSSProperties,
    activeNav: {
      color: colors.brightBlue,
      background: "#17314d",
      border: `1px solid ${colors.border}`,
    } as React.CSSProperties,
    heading: {
      fontSize: 27,
      fontWeight: 600,
      margin: "0 0 8px",
      letterSpacing: "-0.5px",
    } as React.CSSProperties,
    muted: {
      color: colors.muted,
      fontSize: 13,
    } as React.CSSProperties,
    stats: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
      gap: 12,
      margin: "26px 0",
    } as React.CSSProperties,
    stat: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: 9,
      padding: "17px 19px",
    } as React.CSSProperties,
    toolbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 15,
      flexWrap: "wrap",
      margin: "25px 0 15px",
    } as React.CSSProperties,
    search: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: 7,
      padding: "11px 14px",
      color: colors.text,
      width: "min(100%, 340px)",
      fontSize: 13,
      outline: "none",
    } as React.CSSProperties,
    tableContainer: {
      overflowX: "auto",
      border: `1px solid ${colors.border}`,
      borderRadius: 9,
      background: colors.panel,
    } as React.CSSProperties,
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 850,
      fontSize: 13,
      textAlign: "left",
    } as React.CSSProperties,
    th: {
      padding: "14px 16px",
      color: colors.muted,
      fontWeight: 500,
      borderBottom: `1px solid ${colors.border}`,
      whiteSpace: "nowrap",
      background: "#102239",
    } as React.CSSProperties,
    td: {
      padding: "14px 16px",
      borderBottom: `1px solid ${colors.border}`,
      verticalAlign: "middle",
    } as React.CSSProperties,
    tag: {
      display: "inline-block",
      padding: "4px 7px",
      margin: "2px 3px 2px 0",
      borderRadius: 5,
      background: "#18344f",
      color: colors.brightBlue,
      fontSize: 11,
      whiteSpace: "nowrap",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <Image
            src="/logo.png"
            alt="Tawassol Sihi"
            width={43}
            height={43}
            style={styles.logo}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              التواصل الصحي
            </div>
            <div style={{ color: colors.muted, fontSize: 11 }}>
              Tawassol Sihi
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {userName}
          </span>
          <button style={styles.button} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <main style={styles.content}>
        <nav style={styles.nav}>
          <Link href="/dashboard" style={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/dashboard/bureau" style={styles.navLink}>
            Bureau
          </Link>
          <Link
            href="/dashboard/members"
            style={{ ...styles.navLink, ...styles.activeNav }}
          >
            Members
          </Link>
          <span style={{ ...styles.navLink, opacity: 0.45 }}>
            Events · Soon
          </span>
          <span style={{ ...styles.navLink, opacity: 0.45 }}>
            Treasury · Soon
          </span>
          <span style={{ ...styles.navLink, opacity: 0.45 }}>
            Activity History · Soon
          </span>
        </nav>

        <div>
          <div style={styles.muted}>CLUB DATABASE</div>
          <h1 style={styles.heading}>Members</h1>
          <p style={styles.muted}>
            Manage and consult the Tawassol Sihi membership database.
          </p>
        </div>

        <section style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.muted}>Total members</div>
            <div style={{ fontSize: 27, marginTop: 9, fontWeight: 600 }}>
              {loading ? "—" : members.length}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.muted}>Paid members</div>
            <div
              style={{
                fontSize: 27,
                marginTop: 9,
                fontWeight: 600,
                color: colors.green,
              }}
            >
              {loading ? "—" : paidCount}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.muted}>Unpaid members</div>
            <div
              style={{
                fontSize: 27,
                marginTop: 9,
                fontWeight: 600,
                color: colors.gold,
              }}
            >
              {loading ? "—" : unpaidCount}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.muted}>VIP members</div>
            <div
              style={{
                fontSize: 27,
                marginTop: 9,
                fontWeight: 600,
                color: colors.gold,
              }}
            >
              {loading ? "—" : vipCount}
            </div>
          </div>
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={styles.muted}>
            Membership period:{" "}
            <span style={{ color: colors.brightBlue }}>
              {memberPeriod}
            </span>
          </div>

          <div style={{ color: colors.muted, fontSize: 11 }}>
            Paid members are displayed first
          </div>
        </div>

        <div style={styles.toolbar}>
          <div>
            <h2 style={{ fontSize: 17, margin: 0, fontWeight: 600 }}>
              Member directory
            </h2>
            <p style={{ ...styles.muted, margin: "5px 0 0" }}>
              {filteredMembers.length} member
              {filteredMembers.length !== 1 ? "s" : ""} displayed
            </p>
          </div>

          <input
            type="search"
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.search}
          />
        </div>

        {error && (
          <div
            style={{
              padding: 15,
              marginBottom: 15,
              border: "1px solid #703b43",
              borderRadius: 8,
              background: "#351e29",
              color: "#ffaaaa",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ ...styles.stat, textAlign: "center", padding: 45 }}>
            <div style={{ color: colors.brightBlue, fontSize: 14 }}>
              Loading members...
            </div>
            <p style={styles.muted}>
              Retrieving information from the database.
            </p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Member</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Skills</th>
                  <th style={styles.th}>Membership fee</th>
                  <th style={styles.th}>Points</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {member.name}

                        {member.isVip && (
                          <span
                            title="VIP member"
                            style={{ color: colors.gold, marginLeft: 7 }}
                          >
                            ◆
                          </span>
                        )}

                        {member.hasWarning && (
                          <span
                            title="Warning"
                            style={{ color: colors.red, marginLeft: 7 }}
                          >
                            ⚠
                          </span>
                        )}

                        {member.isBanned && (
                          <span
                            title="Banned"
                            style={{
                              color: colors.red,
                              marginLeft: 7,
                              fontSize: 10,
                            }}
                          >
                            BANNED
                          </span>
                        )}

                        {member.isArchived && (
                          <span
                            style={{
                              color: colors.muted,
                              marginLeft: 7,
                              fontSize: 10,
                            }}
                          >
                            ARCHIVED
                          </span>
                        )}
                      </div>

                      {member.email && (
                        <div
                          style={{
                            color: colors.muted,
                            fontSize: 11,
                            marginTop: 5,
                          }}
                        >
                          {member.email}
                        </div>
                      )}
                    </td>

                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      {member.phone || "—"}
                    </td>

                    <td style={{ ...styles.td, minWidth: 170 }}>
                      {member.skills.length > 0 ? (
                        member.skills.map((skill) => (
                          <span key={skill} style={styles.tag}>
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: colors.muted }}>—</span>
                      )}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          color: member.paid ? colors.green : colors.gold,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {member.paid ? "● Paid" : "○ Unpaid"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <span style={{ color: colors.brightBlue }}>
                        {member.points}
                      </span>
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color: colors.muted,
                        maxWidth: 230,
                      }}
                    >
                      {member.notes || "—"}
                    </td>
                  </tr>
                ))}

                {filteredMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        padding: 40,
                        color: colors.muted,
                      }}
                    >
                      {members.length === 0
                        ? "No members have been added yet."
                        : "No members match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p
          style={{
            color: colors.muted,
            fontSize: 11,
            marginTop: 15,
            lineHeight: 1.7,
          }}
        >
          This directory is currently read-only. Member modifications will be
          enabled after database permissions and audit logging are secured.
        </p>
      </main>
    </div>
  );
}
