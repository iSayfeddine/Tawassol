
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

type MemberForm = {
  name: string;
  email: string;
  phone: string;
  notes: string;
  points: string;
};

const emptyForm: MemberForm = {
  name: "",
  email: "",
  phone: "",
  notes: "",
  points: "0",
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
  const [success, setSuccess] = useState("");
  const [memberPeriod, setMemberPeriod] = useState(
    "Checking membership period..."
  );
  const [userName, setUserName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionMemberId, setActionMemberId] = useState("");

  const [skillCatalogue, setSkillCatalogue] = useState<Skill[]>([]);
  const [selectedSkillsMember, setSelectedSkillsMember] =
    useState<MemberRow | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);

  const canManageMembers =
    roleKey === "president" || roleKey === "vpi_internal";

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      setLoading(true);
      setError("");

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

        if (!cancelled) {
          setRoleKey(profile.role_key || "");
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
          throw new Error(
            "Could not load members. Please check database permissions."
          );
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

        if (!cancelled) {
          setSkillCatalogue(skills);
        }

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
  }, [router, refreshKey]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...members]
      .filter((member) => member.isArchived === showArchived)
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
  }, [members, search, showArchived]);

  const activeMembers = members.filter((member) => !member.isArchived);
  const paidCount = activeMembers.filter((member) => member.paid).length;
  const unpaidCount = activeMembers.length - paidCount;
  const vipCount = activeMembers.filter((member) => member.isVip).length;
  const archivedCount = members.filter((member) => member.isArchived).length;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function openAddForm() {
    setEditingMember(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(member: MemberRow) {
    setEditingMember(member);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      notes: member.notes,
      points: String(member.points),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingMember(null);
    setForm(emptyForm);
  }

  async function handleSaveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageMembers) {
      setError("You are not authorized to manage members.");
      return;
    }

    const name = form.name.trim();
    const points = Number(form.points);

    if (!name) {
      setError("Please enter the member's full name.");
      return;
    }

    if (!Number.isInteger(points) || points < 0) {
      setError("Club points must be a whole number greater than or equal to 0.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const supabase = createClient();

    try {
      if (editingMember) {
        const { error: updateError } = await supabase.rpc("update_member", {
          p_member_id: editingMember.id,
          p_full_name: name,
          p_email: form.email.trim() || null,
          p_phone: form.phone.trim() || null,
          p_notes: form.notes.trim() || null,
          p_club_points: points,
        });

        if (updateError) throw updateError;

        setSuccess("Member information updated successfully.");
      } else {
        const { error: createError } = await supabase.rpc("create_member", {
          p_full_name: name,
          p_email: form.email.trim() || null,
          p_phone: form.phone.trim() || null,
          p_notes: form.notes.trim() || null,
          p_club_points: points,
        });

        if (createError) throw createError;

        setSuccess("Member added successfully.");
      }

      setShowForm(false);
      setEditingMember(null);
      setForm(emptyForm);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the member. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle(member: MemberRow) {
    if (!canManageMembers) return;

    const action = member.isArchived ? "restore" : "archive";

    const confirmed = window.confirm(
      member.isArchived
        ? `Restore ${member.name} to the active members directory?`
        : `Archive ${member.name}? Their records and history will be preserved.`
    );

    if (!confirmed) return;

    setActionMemberId(member.id);
    setError("");
    setSuccess("");

    const supabase = createClient();

    try {
      const { error: archiveError } = await supabase.rpc(
        "set_member_archived",
        {
          p_member_id: member.id,
          p_archived: !member.isArchived,
        }
      );

      if (archiveError) throw archiveError;

      setSuccess(
        member.isArchived
          ? `${member.name} has been restored.`
          : `${member.name} has been archived.`
      );

      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the member's archive status."
      );
    } finally {
      setActionMemberId("");
    }
  }

  async function openSkillManager(member: MemberRow) {
    if (!canManageMembers) return;

    setSelectedSkillsMember(member);
    setSelectedSkillIds([]);
    setLoadingSkills(true);
    setError("");
    setSuccess("");

    const supabase = createClient();

    const { data, error: skillsError } = await supabase
      .from("member_skills")
      .select("skill_id")
      .eq("member_id", member.id);

    if (skillsError) {
      setError("Could not load this member's skills.");
      setSelectedSkillsMember(null);
      setLoadingSkills(false);
      return;
    }

    setSelectedSkillIds((data || []).map((item) => item.skill_id));
    setLoadingSkills(false);
  }

  function closeSkillManager() {
    if (savingSkills) return;
    setSelectedSkillsMember(null);
    setSelectedSkillIds([]);
  }

  function toggleSkill(skillId: number) {
    setSelectedSkillIds((current) =>
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId]
    );
  }

  async function handleSaveSkills() {
    if (!canManageMembers || !selectedSkillsMember) return;

    setSavingSkills(true);
    setError("");
    setSuccess("");

    const supabase = createClient();

    try {
      const { error: saveError } = await supabase.rpc("set_member_skills", {
        p_member_id: selectedSkillsMember.id,
        p_skill_ids: selectedSkillIds,
      });

      if (saveError) throw saveError;

      setSuccess(`Skills updated for ${selectedSkillsMember.name}.`);
      setSelectedSkillsMember(null);
      setSelectedSkillIds([]);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update member skills."
      );
    } finally {
      setSavingSkills(false);
    }
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
      marginBottom: 26,
    } as React.CSSProperties,
    navLink: {
      textDecoration: "none",
      color: colors.muted,
      padding: "8px 13px",
      border: `1px solid ${colors.border}`,
      borderRadius: 7,
      fontSize: 12,
    } as React.CSSProperties,
    title: {
      fontSize: 27,
      fontWeight: 700,
      margin: "0 0 6px",
    } as React.CSSProperties,
    subtitle: {
      color: colors.muted,
      fontSize: 13,
      margin: 0,
    } as React.CSSProperties,
    statGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      gap: 12,
      margin: "25px 0",
    } as React.CSSProperties,
    stat: {
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: 9,
      padding: 16,
    } as React.CSSProperties,
    statLabel: {
      color: colors.muted,
      fontSize: 11,
      marginBottom: 9,
    } as React.CSSProperties,
    statValue: {
      fontSize: 25,
      fontWeight: 700,
      color: colors.brightBlue,
    } as React.CSSProperties,
    toolbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 15,
    } as React.CSSProperties,
    input: {
      width: "100%",
      boxSizing: "border-box",
      background: "#091a2b",
      border: `1px solid ${colors.border}`,
      borderRadius: 7,
      padding: "11px 12px",
      color: colors.text,
      fontSize: 13,
      outline: "none",
    } as React.CSSProperties,
    label: {
      display: "block",
      color: colors.muted,
      fontSize: 12,
      marginBottom: 7,
    } as React.CSSProperties,
    tableContainer: {
      overflowX: "auto",
      background: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: 9,
    } as React.CSSProperties,
    table: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "left",
      fontSize: 12,
    } as React.CSSProperties,
    th: {
      padding: "13px 14px",
      color: colors.muted,
      fontWeight: 600,
      borderBottom: `1px solid ${colors.border}`,
      whiteSpace: "nowrap",
      background: "#0a1929",
    } as React.CSSProperties,
    td: {
      padding: "13px 14px",
      borderBottom: `1px solid ${colors.border}`,
      verticalAlign: "middle",
    } as React.CSSProperties,
    tag: {
      display: "inline-block",
      padding: "5px 8px",
      margin: "2px 4px 2px 0",
      borderRadius: 5,
      background: "#17314d",
      color: colors.brightBlue,
      fontSize: 10,
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    muted: {
      color: colors.muted,
      fontSize: 12,
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
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              التواصل الصحي
            </div>
            <div style={{ color: colors.muted, fontSize: 11 }}>
              Tawassol Sihi
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span style={{ color: colors.muted, fontSize: 12 }}>
            {userName}
          </span>
          <button onClick={handleSignOut} style={styles.button}>
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
            style={{
              ...styles.navLink,
              color: colors.brightBlue,
              borderColor: colors.blue,
              background: "#102943",
            }}
          >
            Members
          </Link>
        </nav>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={styles.title}>Members</h1>
            <p style={styles.subtitle}>
              Membership directory · {memberPeriod}
            </p>
          </div>

          {canManageMembers && (
            <button
              onClick={openAddForm}
              style={{
                ...styles.button,
                background: "#173b5c",
                borderColor: colors.blue,
                color: colors.brightBlue,
                fontWeight: 600,
              }}
            >
              + Add Member
            </button>
          )}
        </div>

        <div style={styles.statGrid}>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Active Members</div>
            <div style={styles.statValue}>{activeMembers.length}</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Paid</div>
            <div style={{ ...styles.statValue, color: colors.green }}>
              {paidCount}
            </div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Unpaid</div>
            <div style={{ ...styles.statValue, color: colors.gold }}>
              {unpaidCount}
            </div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>VIP Members</div>
            <div style={{ ...styles.statValue, color: colors.gold }}>
              {vipCount}
            </div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Archived</div>
            <div style={{ ...styles.statValue, color: colors.muted }}>
              {archivedCount}
            </div>
          </div>
        </div>

        <div style={styles.toolbar}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone or email..."
            style={{ ...styles.input, maxWidth: 380 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowArchived(false)}
              style={{
                ...styles.button,
                color: !showArchived ? colors.brightBlue : colors.muted,
                borderColor: !showArchived ? colors.blue : colors.border,
              }}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              style={{
                ...styles.button,
                color: showArchived ? colors.brightBlue : colors.muted,
                borderColor: showArchived ? colors.blue : colors.border,
              }}
            >
              Archived ({archivedCount})
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 13,
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

        {success && (
          <div
            style={{
              padding: 13,
              marginBottom: 15,
              border: "1px solid #285c49",
              borderRadius: 8,
              background: "#102e28",
              color: colors.green,
              fontSize: 13,
            }}
          >
            {success}
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
                  {canManageMembers && (
                    <th style={styles.th}>Actions</th>
                  )}
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

                    {canManageMembers && (
                      <td style={styles.td}>
                        <div
                          style={{
                            display: "flex",
                            gap: 7,
                            alignItems: "center",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <button
                            style={{
                              ...styles.button,
                              padding: "7px 10px",
                              color: colors.brightBlue,
                            }}
                            onClick={() => openEditForm(member)}
                          >
                            Edit
                          </button>

                          <button
                            style={{
                              ...styles.button,
                              padding: "7px 10px",
                              color: colors.gold,
                            }}
                            onClick={() => openSkillManager(member)}
                          >
                            Skills
                          </button>

                          <button
                            disabled={actionMemberId === member.id}
                            style={{
                              ...styles.button,
                              padding: "7px 10px",
                              color: member.isArchived
                                ? colors.green
                                : colors.red,
                              opacity:
                                actionMemberId === member.id ? 0.5 : 1,
                              cursor:
                                actionMemberId === member.id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                            onClick={() => handleArchiveToggle(member)}
                          >
                            {actionMemberId === member.id
                              ? "Please wait..."
                              : member.isArchived
                                ? "Restore"
                                : "Archive"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {filteredMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManageMembers ? 7 : 6}
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        padding: 40,
                        color: colors.muted,
                      }}
                    >
                      {showArchived
                        ? "No archived members."
                        : members.length === 0
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
          {canManageMembers
            ? "You have member management access. Changes are recorded automatically in the activity history."
            : "You have read-only access to the membership directory. Contact the President or VPI for member modifications."}
        </p>
      </main>

      {selectedSkillsMember && canManageMembers && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSkillManager();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              overflowY: "auto",
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 25,
              boxShadow: "0 20px 70px rgba(0,0,0,0.4)",
              margin: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: 20, margin: 0 }}>Manage Skills</h2>

              <button
                onClick={closeSkillManager}
                disabled={savingSkills}
                style={{
                  ...styles.button,
                  padding: "5px 10px",
                  fontSize: 17,
                }}
              >
                ×
              </button>
            </div>

            <p style={{ ...styles.muted, marginBottom: 20 }}>
              Select the skills that belong to{" "}
              <span style={{ color: colors.brightBlue }}>
                {selectedSkillsMember.name}
              </span>
              .
            </p>

            {loadingSkills ? (
              <p style={styles.muted}>Loading assigned skills...</p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 14,
                    color: colors.muted,
                    fontSize: 12,
                  }}
                >
                  <span>Available skills</span>
                  <span>{selectedSkillIds.length} selected</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 9,
                  }}
                >
                  {skillCatalogue.map((skill) => {
                    const checked = selectedSkillIds.includes(skill.id);

                    return (
                      <label
                        key={skill.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: 12,
                          borderRadius: 8,
                          border: `1px solid ${
                            checked ? colors.blue : colors.border
                          }`,
                          background: checked ? "#17314d" : "#091a2b",
                          cursor: "pointer",
                          fontSize: 12,
                          color: checked ? colors.brightBlue : colors.text,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSkill(skill.id)}
                          style={{ accentColor: colors.blue, marginTop: 2 }}
                        />
                        <span>{skill.name}</span>
                      </label>
                    );
                  })}
                </div>

                {skillCatalogue.length === 0 && (
                  <p style={styles.muted}>
                    No skills were found in the database.
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 22,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSkillIds([])}
                    disabled={savingSkills}
                    style={{ ...styles.button, color: colors.red }}
                  >
                    Clear all
                  </button>

                  <div style={{ display: "flex", gap: 9 }}>
                    <button
                      type="button"
                      onClick={closeSkillManager}
                      disabled={savingSkills}
                      style={styles.button}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveSkills}
                      disabled={savingSkills || loadingSkills}
                      style={{
                        ...styles.button,
                        background: "#173b5c",
                        borderColor: colors.blue,
                        color: colors.brightBlue,
                        fontWeight: 600,
                        minWidth: 125,
                        opacity: savingSkills ? 0.6 : 1,
                      }}
                    >
                      {savingSkills ? "Saving..." : "Save Skills"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showForm && canManageMembers && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 540,
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 25,
              boxShadow: "0 20px 70px rgba(0,0,0,0.4)",
              margin: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 7,
              }}
            >
              <h2 style={{ fontSize: 20, margin: 0 }}>
                {editingMember ? "Edit Member" : "Add New Member"}
              </h2>

              <button
                onClick={closeForm}
                disabled={saving}
                style={{
                  ...styles.button,
                  padding: "5px 10px",
                  fontSize: 17,
                }}
              >
                ×
              </button>
            </div>

            <p style={{ ...styles.muted, marginBottom: 23 }}>
              {editingMember
                ? "Update this member's personal information."
                : "Add a new person to the Tawassol Sihi membership database."}
            </p>

            <form onSubmit={handleSaveMember}>
              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>Full name *</label>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter full name"
                  style={styles.input}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="member@example.com"
                  style={styles.input}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>Phone number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="+212..."
                  style={styles.input}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>Club points</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.points}
                  onChange={(event) =>
                    setForm({ ...form, points: event.target.value })
                  }
                  style={styles.input}
                />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Additional information..."
                  rows={4}
                  style={{
                    ...styles.input,
                    resize: "vertical",
                    fontFamily: "Arial, sans-serif",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: 12,
                    marginBottom: 15,
                    border: "1px solid #703b43",
                    borderRadius: 7,
                    background: "#351e29",
                    color: "#ffaaaa",
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 9,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={styles.button}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    ...styles.button,
                    background: "#173b5c",
                    borderColor: colors.blue,
                    color: colors.brightBlue,
                    fontWeight: 600,
                    minWidth: 125,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving
                    ? "Saving..."
                    : editingMember
                      ? "Save Changes"
                      : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
