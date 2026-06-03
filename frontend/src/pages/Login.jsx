import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, ROLES } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState("cm@mh.gov.in");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome to Viksit Maharashtra 2047");
      nav("/");
    } catch (err) {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const quickRole = async (r) => {
    setLoading(true);
    try {
      await login(r.email);
      toast.success(`Signed in as ${r.name}`);
      nav("/");
    } catch {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left visual */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.78), rgba(15,23,42,0.85)), url('https://images.pexels.com/photos/31713110/pexels-photo-31713110.jpeg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#F97316] to-[#16A34A] flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg" style={{ fontFamily: "Manrope" }}>Government of Maharashtra</div>
            <div className="text-xs uppercase tracking-widest text-orange-300">Vikistat Maharashtra 2047</div>
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-orange-300 mb-3">Integrated Monitoring Platform</div>
          <h1 className="text-5xl font-bold leading-tight mb-4" style={{ fontFamily: "Manrope" }}>
            From <span className="text-orange-400">vision</span> to <span className="text-green-400">verification</span>.
          </h1>
          <p className="text-slate-300 text-sm max-w-md leading-relaxed">
            A statewide command center tracking 4 pillars, 16 themes, 100+ initiatives,
            500+ milestones and 150+ KPIs — across 36 districts toward 2029, 2035 and 2047.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 text-xs">
          <div><div className="text-2xl font-bold text-white">4</div><div className="text-slate-400 uppercase tracking-widest">Pillars</div></div>
          <div><div className="text-2xl font-bold text-white">16</div><div className="text-slate-400 uppercase tracking-widest">Themes</div></div>
          <div><div className="text-2xl font-bold text-white">36</div><div className="text-slate-400 uppercase tracking-widest">Districts</div></div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-600 mb-2">
            <ShieldCheck className="h-4 w-4" /> Secure Sign-in
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "Manrope" }}>
            Welcome back
          </h2>
          <p className="text-sm text-slate-500 mb-8 mt-2">
            Sign in to access the executive command center.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password"
                className="mt-1"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default password for all seeded users: <span className="font-mono">demo123</span></p>
            </div>
            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] uppercase tracking-widest text-slate-400">Quick role demo</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.slice(0, 6).map((r) => (
                <button
                  key={r.code}
                  onClick={() => quickRole(r)}
                  data-testid={`quick-role-${r.code}`}
                  className="text-left text-xs px-3 py-2 border border-slate-200 rounded-md hover:border-orange-500 hover:bg-orange-50 transition-colors"
                >
                  <div className="font-semibold text-slate-800">{r.name}</div>
                  <div className="text-[10px] text-slate-400">{r.code}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
