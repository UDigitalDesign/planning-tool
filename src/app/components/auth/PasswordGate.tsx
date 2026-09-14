import React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../services/supabaseClient";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

/**
 * The team shares one Supabase account. The email address is fixed here, so the
 * sign-in screen only ever asks for a password.
 *
 * This is not a front-end check: Supabase validates the password and only then
 * hands out a session. The RLS policies are scoped to `authenticated`, so
 * without that session the anon key returns zero rows.
 */
export const SHARED_ACCOUNT_EMAIL = "planning@u-digital.nl";

interface PasswordGateProps {
  children: (session: Session) => React.ReactNode;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: SHARED_ACCOUNT_EMAIL,
      password,
    });

    if (signInError) {
      setError("Wrong password");
      setPassword("");
    }
    setSubmitting(false);
  };

  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  if (session) {
    return <>{children(session)}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6"
      >
        <div className="space-y-1">
          <h1 className="text-lg font-medium text-foreground">Planning</h1>
          <p className="text-sm text-muted-foreground">
            Enter the team password to continue.
          </p>
        </div>

        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          disabled={submitting}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting || !password}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
};
