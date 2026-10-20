import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { registerUser, loginUser, googleLogin } from "../services/auth.service";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export function Login({ isSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useAppStore((state) => state.navigate);
  const currentAddress = useAppStore((state) => state.currentAddress);
  const setAuth = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        await registerUser({ name: email.split("@")[0], email, password, role: "citizen", city: currentAddress });
        toast.success("OTP sent to your email");
        sessionStorage.setItem("pendingEmail", email);
        navigate("verify-otp");
        return;
      }

      const res = await loginUser({ email, password });
      const { user, accessToken } = res.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("role", user.role);
      setAuth(user.role, user);
      toast.success("Login successful");
      navigate(user.role === "admin" ? "admin-dashboard" : user.role === "authority" ? "authority-dashboard" : "citizen-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-6">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("landing")}
          className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-primary transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Home
        </button>

        <Card className="p-8 border-border-default">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {isSignup ? "Join CivicFix" : "Welcome Back"}
            </h1>
            <p className="text-sm text-text-muted mt-1">Improving your community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary ml-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" required className="input-base w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary ml-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" required className="input-base w-full" />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : isSignup ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border-default" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg-card px-2 text-text-muted font-medium">Or continue with</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              text={isSignup ? "signup_with" : "signin_with"}
              theme="filled_black"
              shape="pill"
              size="large"
              onSuccess={async (credentialResponse) => {
                try {
                  const res = await googleLogin({ credential: credentialResponse.credential });
                  const { user, accessToken, isNewUser } = res.data;
                  localStorage.setItem("accessToken", accessToken);
                  localStorage.setItem("role", user.role);
                  setAuth(user.role, user);
                  toast.success(isNewUser ? "Account created successfully" : "Welcome back");
                  navigate(user.role === "admin" ? "admin-dashboard" : user.role === "authority" ? "authority-dashboard" : "citizen-dashboard");
                } catch (err) {
                  toast.error(err.response?.data?.message || "Google authentication failed");
                }
              }}
              onError={() => toast.error("Google Sign In Failed")}
            />
          </div>

          {/* {!isSignup && (
            <div className="mt-6 pt-6 border-t border-border-default">
              <p className="text-xs text-text-muted text-center mb-2">Municipal Authority?</p>
              <button onClick={() => navigate('login')}
                className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center justify-center gap-1">
                Sign in to Authority Portal <ArrowLeft size={14} className="rotate-180" />
              </button>
            </div>
          )} */}
        </Card>
      </div>
    </div>
  );
}
