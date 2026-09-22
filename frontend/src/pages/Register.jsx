import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import FormInput from "../components/FormInput";
import Button from "../components/Button";
import Alert from "../components/Alert";
import RoleSwitcher from "../components/RoleSwitcher";

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "patient", age: "" });
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await register({
        ...form,
        age: form.role === "patient" && form.age ? Number(form.age) : undefined
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-bg p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-teal text-white flex items-center justify-center mb-3">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">Create your account</h1>
          <p className="text-gray-500 mt-1 text-center">Track medications safely with MedGuard AI</p>
        </div>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="space-y-4 bg-warm-card border border-warm-border rounded-2xl p-6">
          <RoleSwitcher value={form.role} onChange={(r) => set("role", r)} />
          <FormInput label="Full name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          <FormInput label="Email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
          <FormInput label="Password" type="password" minLength={8} required value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 8 characters" />
          {form.role === "patient" && (
            <FormInput label="Age (optional)" type="number" value={form.age} onChange={(e) => set("age", e.target.value)} />
          )}
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account? <Link to="/login" className="text-teal font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}
