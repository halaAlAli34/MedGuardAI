import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import FormInput from "../components/FormInput";
import Button from "../components/Button";
import Alert from "../components/Alert";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-bg p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-teal text-white flex items-center justify-center mb-3">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-center">Log in to MedGuard AI</p>
        </div>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

        <form onSubmit={handleSubmit} className="space-y-4 bg-warm-card border border-warm-border rounded-2xl p-6">
          <FormInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <FormInput label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Don't have an account? <Link to="/register" className="text-teal font-semibold">Sign up</Link>
        </p>

        
      </div>
    </div>
  );
}
