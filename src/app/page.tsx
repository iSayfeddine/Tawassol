
"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage("Sign-in failed. Check your email and password.");
        return;
      }

      setMessage("Sign-in successful. Your dashboard is coming next.");
    } catch {
      setMessage("Unable to connect. Please check your configuration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="brand-panel">
        <div className="brand">
          <Image
            src="/logo.png"
            alt="Tawassol Sihi logo"
            width={112}
            height={112}
            priority
            style={{
              width: 112,
              height: 112,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />

          <div className="brand-title-block">
            <div className="brand-name-ar" lang="ar" dir="rtl">
              التواصل الصحي
            </div>
            <div className="brand-name-en">Tawassol Sihi</div>
          </div>
        </div>

        <div className="brand-copy" lang="ar" dir="rtl">
          <div className="eyebrow brand-eyebrow-ar">
            مساحة تواصل صحي
          </div>

          <h1 className="brand-headline-ar">
            <span className="headline-white">معًا نتواصل،</span>
            <br />
            <span className="headline-blue">وبالعلم نرتقي.</span>
          </h1>

          <p className="brand-description-ar">
            مساحة تجمع فريق تواصل صحي لتنظيم المبادرات والأنشطة،
            وتبادل المعرفة الطبية، وتعزيز العمل الجماعي خدمةً
            للطلبة والمجتمع.
          </p>
        </div>

        <div className="brand-footer">
          TAWASSOL SIHI · PRIVATE BUREAU PLATFORM
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="eyebrow">WELCOME BACK</div>
          <h2>Sign in to Tawassol</h2>
          <p className="login-description">
            Access your bureau workspace using your authorized account.
          </p>

          <form onSubmit={handleLogin}>
            <label className="field-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              className="login-input"
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="login-input"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in securely"}
            </button>

            {message && (
              <p className="login-message" role="status">
                {message}
              </p>
            )}
          </form>

          <div className="login-note">
            Private access for authorized bureau members only.
            <br />
            Public registration is disabled.
          </div>
        </div>
      </section>
    </main>
  );
}
